"""Anonymous visitor polls. Only aggregate counts are public."""
import base64
import hashlib
import hmac
import json
import os
import re
import time
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

catalog_path = Path(__file__).with_name("polls.json")
if not catalog_path.exists():
    catalog_path = Path(__file__).resolve().parents[2] / "src/data/issue-polls.json"
CATALOG = json.loads(catalog_path.read_text())
POLLS = {poll["id"]: poll for poll in CATALOG}
UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
ddb = boto3.client("dynamodb")


def table():
    return os.environ["TABLE_NAME"]


def scope(poll):
    return f'{poll["id"]}#{poll["version"]}'


def record_key(poll, voter):
    digest = hashlib.sha256(f'{scope(poll)}:{voter}'.encode()).hexdigest()
    return f"VOTE#{scope(poll)}#{digest}"


def item(key):
    return ddb.get_item(TableName=table(), Key={"pk": {"S": key}}, ConsistentRead=True).get("Item", {})


def result(poll):
    counts = item(f"COUNT#{scope(poll)}")
    return {**poll, "total": int(counts.get("total", {"N": "0"})["N"]),
            "options": [{**option, "count": int(counts.get(option["id"], {"N": "0"})["N"])} for option in poll["options"]]}


def response(status, body, origin):
    headers = {"Content-Type": "application/json", "Cache-Control": "no-store", "Vary": "Origin"}
    if origin in os.environ["ALLOWED_ORIGINS"].split(","):
        headers.update({"Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "content-type"})
    return {"statusCode": status, "headers": headers, "body": json.dumps(body)}


def existing_vote(poll, key, option, origin):
    existing = item(key)
    if not existing:
        return None
    recorded = existing["option"]["S"]
    return response(200 if recorded == option else 409,
                    {"alreadyRecorded": True, "recordedOption": recorded, "poll": result(poll)}, origin)


def handler(event, context):
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    origin = headers.get("origin", "")
    method = event.get("requestContext", {}).get("http", {}).get("method", "")
    path = event.get("rawPath", "")
    reply = lambda status, body: response(status, body, origin)
    if origin and origin not in os.environ["ALLOWED_ORIGINS"].split(","):
        return reply(403, {"error": "This origin is not allowed."})
    if method == "OPTIONS":
        return reply(204, {})
    try:
        if method == "GET" and path == "/polls":
            return reply(200, {"polls": [result(poll) for poll in CATALOG]})
        match = re.fullmatch(r"/polls/([a-z-]+)/votes", path)
        if method != "POST" or not match or match[1] not in POLLS:
            return reply(404, {"error": "Poll route not found."})
        if not origin:
            return reply(403, {"error": "An allowed origin is required."})
        raw = event.get("body") or ""
        if len(raw) > 2048:
            return reply(413, {"error": "Request is too large."})
        try:
            if event.get("isBase64Encoded"):
                raw = base64.b64decode(raw, validate=True).decode("utf-8")
            if len(raw.encode()) > 1024:
                return reply(413, {"error": "Request is too large."})
            body = json.loads(raw)
        except (ValueError, UnicodeError):
            return reply(400, {"error": "Invalid request."})
        if not isinstance(body, dict) or set(body) != {"voterId", "option", "version"}:
            return reply(400, {"error": "Provide only a browser ID, option, and question version."})
        poll = POLLS[match[1]]
        voter, option = body["voterId"], body["option"]
        if not isinstance(voter, str) or not UUID.fullmatch(voter) or option not in [o["id"] for o in poll["options"]]:
            return reply(400, {"error": "Select a valid response."})
        if body["version"] != poll["version"]:
            return reply(409, {"error": "This question has changed. Reload the page before responding."})
        key = record_key(poll, voter)
        previous = existing_vote(poll, key, option, origin)
        if previous:
            return previous
        now = int(time.time())
        ip = event.get("requestContext", {}).get("http", {}).get("sourceIp", "")
        if not ip:
            return reply(400, {"error": "Request source is missing."})
        # Rotate the keyed IP digest hourly; never store or log the raw address.
        digest = hmac.new(os.environ["RATE_SALT"].encode(), f"{now // 3600}:{ip}".encode(), hashlib.sha256).hexdigest()
        try:
            ddb.transact_write_items(TransactItems=[
                {"Put": {"TableName": table(), "Item": {"pk": {"S": key}, "option": {"S": option}},
                         "ConditionExpression": "attribute_not_exists(pk)"}},
                {"Update": {"TableName": table(), "Key": {"pk": {"S": f"COUNT#{scope(poll)}"}},
                            "UpdateExpression": "ADD #answer :one, #total :one",
                            "ExpressionAttributeNames": {"#answer": option, "#total": "total"},
                            "ExpressionAttributeValues": {":one": {"N": "1"}}}},
                {"Update": {"TableName": table(), "Key": {"pk": {"S": f"RATE#{scope(poll)}#{now // 3600}#{digest}"}},
                            "UpdateExpression": "SET expiresAt = :expires ADD submissions :one",
                            "ConditionExpression": "attribute_not_exists(submissions) OR submissions < :limit",
                            "ExpressionAttributeValues": {":one": {"N": "1"}, ":limit": {"N": "60"}, ":expires": {"N": str(now + 86400)}}}}
            ])
        except ClientError as exc:
            if exc.response["Error"]["Code"] != "TransactionCanceledException":
                raise
            previous = existing_vote(poll, key, option, origin)
            if previous:
                return previous
            reasons = exc.response.get("CancellationReasons", [])
            if len(reasons) > 2 and reasons[2].get("Code") == "ConditionalCheckFailed":
                return reply(429, {"error": "Too many responses from this network. Please try again in an hour."})
            return reply(503, {"error": "The poll is busy. Please try again with the same response."})
        return reply(201, {"alreadyRecorded": False, "recordedOption": option, "poll": result(poll)})
    except ClientError as exc:
        print(json.dumps({"event": "poll_storage_error", "code": exc.response["Error"]["Code"]}))
        return reply(503, {"error": "Polls are temporarily unavailable. Please try again."})
