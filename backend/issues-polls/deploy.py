"""Deploy only the isolated PIA poll stack. No private values are printed."""
import argparse
import hashlib
import io
import json
import secrets
import time
import zipfile
from pathlib import Path
import boto3
from botocore.exceptions import ClientError
from infrastructure import template

parser = argparse.ArgumentParser()
parser.add_argument("--deploy", action="store_true")
args = parser.parse_args()
if not args.deploy:
    print(json.dumps(template(), indent=2))
    raise SystemExit(0)
root = Path(__file__).resolve().parents[2]
session = boto3.Session(profile_name="pia", region_name="us-west-2")
identity = session.client("sts").get_caller_identity()
assert identity["Arn"].endswith(":user/pia-cli"), "Use the PIA CLI identity"
account = identity["Account"]
cf, s3, sns = session.client("cloudformation"), session.client("s3"), session.client("sns")
topic = f"arn:aws:sns:us-west-2:{account}:patriot-paper-pledges-Alerts-Dw5ZEd6jsf0T"
subscriptions = sns.list_subscriptions_by_topic(TopicArn=topic)["Subscriptions"]
assert any(s["Protocol"] == "email" and s["Endpoint"] == "erik@patriotsinaction.com" and s["SubscriptionArn"].startswith("arn:") for s in subscriptions), "Operations alert subscription is not confirmed"
bucket = f"pia-issues-poll-artifacts-{account}-us-west-2"
try:
    s3.head_bucket(Bucket=bucket)
except ClientError as exc:
    if exc.response["Error"]["Code"] not in ("404", "NoSuchBucket"):
        raise
    s3.create_bucket(Bucket=bucket, CreateBucketConfiguration={"LocationConstraint": "us-west-2"})
    s3.put_public_access_block(Bucket=bucket, PublicAccessBlockConfiguration={k: True for k in ["BlockPublicAcls", "IgnorePublicAcls", "BlockPublicPolicy", "RestrictPublicBuckets"]})
    s3.put_bucket_encryption(Bucket=bucket, ServerSideEncryptionConfiguration={"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]})
    s3.put_bucket_tagging(Bucket=bucket, Tagging={"TagSet": [{"Key": "Project", "Value": "pia-counties"}]})
archive = io.BytesIO()
with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as z:
    z.write(Path(__file__).with_name("app.py"), "app.py")
    z.write(root / "src/data/issue-polls.json", "polls.json")
code = archive.getvalue()
key = "lambda/" + hashlib.sha256(code).hexdigest() + ".zip"
s3.put_object(Bucket=bucket, Key=key, Body=code, ContentType="application/zip")
stack = "pia-issues-polls"
exists = True
try:
    cf.describe_stacks(StackName=stack)
except ClientError as exc:
    if "does not exist" not in str(exc):
        raise
    exists = False
params = [{"ParameterKey": "CodeBucket", "ParameterValue": bucket}, {"ParameterKey": "CodeKey", "ParameterValue": key}, {"ParameterKey": "AlertsTopic", "ParameterValue": topic},
          {"ParameterKey": "RateSalt", **({"UsePreviousValue": True} if exists else {"ParameterValue": secrets.token_hex(32)})}]
kwargs = dict(StackName=stack, TemplateBody=json.dumps(template()), Parameters=params, Capabilities=["CAPABILITY_IAM"], Tags=[{"Key": "Project", "Value": "pia-counties"}])
try:
    (cf.update_stack if exists else cf.create_stack)(**kwargs)
except ClientError as exc:
    if "No updates are to be performed" not in str(exc):
        raise
while True:
    detail = cf.describe_stacks(StackName=stack)["Stacks"][0]
    status = detail["StackStatus"]
    print(status, flush=True)
    if status in ("CREATE_COMPLETE", "UPDATE_COMPLETE"):
        break
    if status.endswith("FAILED") or "ROLLBACK" in status:
        for event in cf.describe_stack_events(StackName=stack)["StackEvents"]:
            if "FAILED" in event["ResourceStatus"]:
                print(event["LogicalResourceId"], event.get("ResourceStatusReason", ""))
        raise SystemExit("Deployment failed")
    time.sleep(15)
outputs = {o["OutputKey"]: o["OutputValue"] for o in detail["Outputs"]}
(root / "src/data/issues-poll-api.json").write_text(json.dumps({"url": outputs["ApiUrl"]}, indent=2) + "\n")
(root / "docs/issues-polls-deployment.json").write_text(json.dumps({"stack": stack, "region": "us-west-2", "api": outputs["ApiUrl"], "table": outputs["TableName"], "artifactsBucketPattern": "pia-issues-poll-artifacts-<account>-us-west-2", "alertsTopicName": topic.rsplit(":", 1)[1], "status": status}, indent=2) + "\n")
print(json.dumps({"api": outputs["ApiUrl"], "status": status}))
