import importlib.util
import json
from pathlib import Path
from uuid import uuid4
import boto3
import pytest
from moto import mock_aws


@pytest.fixture
def app(monkeypatch):
    monkeypatch.setenv("AWS_DEFAULT_REGION", "us-west-2")
    monkeypatch.setenv("TABLE_NAME", "poll-tests")
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://patriotsinaction.com")
    monkeypatch.setenv("RATE_SALT", "test-salt-not-for-production")
    with mock_aws():
        boto3.client("dynamodb").create_table(TableName="poll-tests", BillingMode="PAY_PER_REQUEST", AttributeDefinitions=[{"AttributeName": "pk", "AttributeType": "S"}], KeySchema=[{"AttributeName": "pk", "KeyType": "HASH"}])
        spec = importlib.util.spec_from_file_location("issues_app", Path(__file__).with_name("app.py"))
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        yield module


def event(method="POST", poll="paper-voting", **values):
    return {"requestContext": {"http": {"method": method, "sourceIp": "192.0.2.1"}}, "rawPath": "/polls" if method == "GET" else f"/polls/{poll}/votes",
            "headers": {"origin": "https://patriotsinaction.com"}, "body": json.dumps({"voterId": str(uuid4()), "option": "yes", "version": "2026-10-26-v1", **values})}


def call(app, request):
    response = app.handler(request, None)
    return response["statusCode"], json.loads(response["body"])


def test_empty_results_are_real_zeroes(app):
    status, body = call(app, event("GET"))
    assert status == 200
    assert len(body["polls"]) == 3
    assert all(p["total"] == 0 and sum(o["count"] for o in p["options"]) == 0 for p in body["polls"])


@pytest.mark.parametrize("poll", ["paper-voting", "protect-children", "constitutional-law"])
def test_vote_retry_and_conflicting_second_choice(app, poll):
    request = event(poll=poll)
    status, first = call(app, request)
    assert status == 201 and first["poll"]["total"] == 1
    assert call(app, request)[0] == 200
    body = json.loads(request["body"])
    body["option"] = "no"
    request["body"] = json.dumps(body)
    status, conflict = call(app, request)
    assert status == 409 and conflict["recordedOption"] == "yes"
    assert conflict["poll"]["total"] == 1


def test_all_options_and_public_privacy(app):
    voters = []
    for option in ["yes", "yes", "no", "unsure"]:
        voter = str(uuid4())
        voters.append(voter)
        assert call(app, event(option=option, voterId=voter))[0] == 201
    status, body = call(app, event("GET"))
    assert status == 200 and body["polls"][0]["total"] == 4
    assert [o["count"] for o in body["polls"][0]["options"]] == [2, 1, 1]
    serialized = json.dumps(body)
    assert not any(v in serialized for v in voters)
    assert "192.0.2.1" not in serialized and "voterId" not in serialized
    records = app.ddb.scan(TableName="poll-tests")["Items"]
    assert "192.0.2.1" not in json.dumps(records)
    assert not any(v in json.dumps(records) for v in voters)


@pytest.mark.parametrize("values", [{"option": "other"}, {"voterId": "bad"}, {"voterId": None}, {"email": "not-accepted@example.com"}, {"option": {"yes": True}}])
def test_invalid_payload_cannot_increment(app, values):
    assert call(app, event(**values))[0] == 400
    assert call(app, event("GET"))[1]["polls"][0]["total"] == 0


def test_origin_version_and_bad_json(app):
    request = event()
    request["headers"]["origin"] = "https://example.com"
    assert call(app, request)[0] == 403
    request["headers"] = {}
    assert call(app, request)[0] == 403
    assert call(app, event(version="old"))[0] == 409
    request = event()
    request["body"] = "invalid-json"
    assert call(app, request)[0] == 400
    request["body"] = "a" * 3000
    assert call(app, request)[0] == 413
    assert call(app, event(poll="unknown"))[0] == 404


def test_rate_limit_rolls_back_vote_and_count_and_retries_are_free(app):
    first = event()
    assert call(app, first)[0] == 201
    rate = next(x for x in app.ddb.scan(TableName="poll-tests")["Items"] if x["pk"]["S"].startswith("RATE#"))
    app.ddb.update_item(TableName="poll-tests", Key={"pk": rate["pk"]}, UpdateExpression="SET submissions = :limit", ExpressionAttributeValues={":limit": {"N": "60"}})
    request = event()
    assert call(app, request)[0] == 429
    assert call(app, first)[0] == 200
    assert call(app, event("GET"))[1]["polls"][0]["total"] == 1
    assert not app.item(app.record_key(app.POLLS["paper-voting"], json.loads(request["body"])["voterId"]))
    assert call(app, event(poll="protect-children"))[0] == 201


def test_storage_failure_never_returns_fake_results(app, monkeypatch):
    from botocore.exceptions import ClientError
    def fail(**kwargs):
        raise ClientError({"Error": {"Code": "ServiceUnavailable"}}, "GetItem")
    monkeypatch.setattr(app.ddb, "get_item", fail)
    status, body = call(app, event("GET"))
    assert status == 503 and "polls" not in body
