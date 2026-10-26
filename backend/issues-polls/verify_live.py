"""Exercise the live API with temporary records; remove only these test votes."""
import argparse
import hashlib
import json
from pathlib import Path
import urllib.error
import urllib.request
from uuid import uuid4
import boto3

parser = argparse.ArgumentParser()
parser.add_argument("--exercise", action="store_true", help="Submit and clean up temporary test responses")
args = parser.parse_args()
root = Path(__file__).resolve().parents[2]
deployment = json.loads((root / "docs/issues-polls-deployment.json").read_text())
catalog = json.loads((root / "src/data/issue-polls.json").read_text())
origin = "https://patriotsinaction.com"


def request(path, body=None, method=None, headers=None):
    req = urllib.request.Request(deployment["api"] + path, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Origin": origin, "Content-Type": "application/json", **(headers or {})}, method=method)
    try:
        response = urllib.request.urlopen(req, timeout=20)
    except urllib.error.HTTPError as exc:
        response = exc
    raw = response.read()
    return response.status, json.loads(raw) if raw else {}, dict(response.headers)


status, before, headers = request("/polls")
assert status == 200 and len(before["polls"]) == 3
assert headers.get("access-control-allow-origin") == origin
assert "no-store" in headers.get("cache-control", "")
assert request("/polls/paper-voting/votes", method="OPTIONS", headers={"Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"})[0] == 204
report = {"publicResults": True, "cors": True, "temporaryVotes": 0, "cleanup": None}
if args.exercise:
    ddb = boto3.Session(profile_name="pia", region_name=deployment["region"]).client("dynamodb")
    generated = []
    try:
        for poll, option in zip(catalog, ["yes", "no", "unsure"]):
            voter = str(uuid4())
            scope = f'{poll["id"]}#{poll["version"]}'
            key = f"VOTE#{scope}#{hashlib.sha256(f'{scope}:{voter}'.encode()).hexdigest()}"
            body = {"voterId": voter, "option": option, "version": poll["version"]}
            generated.append((key, scope, option))
            path = f'/polls/{poll["id"]}/votes'
            status, result, _ = request(path, body)
            assert status == 201 and result["recordedOption"] == option, (status, result)
            assert request(path, body)[0] == 200
            alternative = "no" if option != "no" else "yes"
            assert request(path, {**body, "option": alternative})[0] == 409
            assert request(path, {**body, "voterId": "invalid"})[0] == 400
            assert request(path, body, headers={"Origin": "https://example.com"})[0] == 403
            report["temporaryVotes"] += 1
    finally:
        for key, scope, option in generated:
            record = ddb.get_item(TableName=deployment["table"], Key={"pk": {"S": key}}, ConsistentRead=True).get("Item")
            if not record:
                continue
            assert record["option"]["S"] == option
            ddb.transact_write_items(TransactItems=[
                {"Delete": {"TableName": deployment["table"], "Key": {"pk": {"S": key}}, "ConditionExpression": "#option = :expected",
                            "ExpressionAttributeNames": {"#option": "option"}, "ExpressionAttributeValues": {":expected": {"S": option}}}},
                {"Update": {"TableName": deployment["table"], "Key": {"pk": {"S": f"COUNT#{scope}"}}, "UpdateExpression": "ADD #answer :negative, #total :negative",
                            "ConditionExpression": "#answer >= :one AND #total >= :one", "ExpressionAttributeNames": {"#answer": option, "#total": "total"},
                            "ExpressionAttributeValues": {":negative": {"N": "-1"}, ":one": {"N": "1"}}}}
            ])
        report["cleanup"] = all(not ddb.get_item(TableName=deployment["table"], Key={"pk": {"S": key}}, ConsistentRead=True).get("Item") for key, _, _ in generated)
        assert report["cleanup"]
status, after, _ = request("/polls")
assert status == 200
report["totalsBefore"] = {p["id"]: p["total"] for p in before["polls"]}
report["totalsAfter"] = {p["id"]: p["total"] for p in after["polls"]}
(root / "coverage/issues").mkdir(parents=True, exist_ok=True)
(root / "coverage/issues/live-api.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
