"""Isolated poll API; reuses the confirmed PIA operations email topic."""


def template():
    ref = lambda name: {"Ref": name}
    att = lambda name, field: {"Fn::GetAtt": [name, field]}
    sub = lambda value: {"Fn::Sub": value}
    resources = {
        "Polls": {"Type": "AWS::DynamoDB::Table", "DeletionPolicy": "Retain", "UpdateReplacePolicy": "Retain", "Properties": {
            "BillingMode": "PAY_PER_REQUEST", "AttributeDefinitions": [{"AttributeName": "pk", "AttributeType": "S"}],
            "KeySchema": [{"AttributeName": "pk", "KeyType": "HASH"}], "SSESpecification": {"SSEEnabled": True},
            "PointInTimeRecoverySpecification": {"PointInTimeRecoveryEnabled": True}, "DeletionProtectionEnabled": True,
            "TimeToLiveSpecification": {"AttributeName": "expiresAt", "Enabled": True}}},
        "Role": {"Type": "AWS::IAM::Role", "Properties": {
            "AssumeRolePolicyDocument": {"Version": "2012-10-17", "Statement": [{"Effect": "Allow", "Principal": {"Service": "lambda.amazonaws.com"}, "Action": "sts:AssumeRole"}]},
            "Policies": [{"PolicyName": "PollStorage", "PolicyDocument": {"Version": "2012-10-17", "Statement": [
                {"Effect": "Allow", "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem"], "Resource": att("Polls", "Arn")},
                {"Effect": "Allow", "Action": ["logs:CreateLogStream", "logs:PutLogEvents"], "Resource": sub("arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}:log-group:/aws/lambda/${AWS::StackName}:*")}
            ]}}]}},
        "Logs": {"Type": "AWS::Logs::LogGroup", "Properties": {"LogGroupName": sub("/aws/lambda/${AWS::StackName}"), "RetentionInDays": 30}},
        "Function": {"Type": "AWS::Lambda::Function", "DependsOn": "Logs", "Properties": {
            "FunctionName": ref("AWS::StackName"), "Runtime": "python3.13", "Handler": "app.handler", "Role": att("Role", "Arn"), "Timeout": 8, "MemorySize": 128,
            "Code": {"S3Bucket": ref("CodeBucket"), "S3Key": ref("CodeKey")},
            "Environment": {"Variables": {"TABLE_NAME": ref("Polls"), "RATE_SALT": ref("RateSalt"), "ALLOWED_ORIGINS": {"Fn::Join": [",", ref("Origins")]}}}}},
        "Api": {"Type": "AWS::ApiGatewayV2::Api", "Properties": {"Name": ref("AWS::StackName"), "ProtocolType": "HTTP",
            "CorsConfiguration": {"AllowOrigins": ref("Origins"), "AllowMethods": ["GET", "POST", "OPTIONS"], "AllowHeaders": ["content-type"], "MaxAge": 600}}},
        "Integration": {"Type": "AWS::ApiGatewayV2::Integration", "Properties": {"ApiId": ref("Api"), "IntegrationType": "AWS_PROXY", "IntegrationUri": att("Function", "Arn"), "PayloadFormatVersion": "2.0", "TimeoutInMillis": 10000}},
        "Read": {"Type": "AWS::ApiGatewayV2::Route", "Properties": {"ApiId": ref("Api"), "RouteKey": "GET /polls", "Target": {"Fn::Join": ["/", ["integrations", ref("Integration")]]}}},
        "Vote": {"Type": "AWS::ApiGatewayV2::Route", "Properties": {"ApiId": ref("Api"), "RouteKey": "POST /polls/{pollId}/votes", "Target": {"Fn::Join": ["/", ["integrations", ref("Integration")]]}}},
        "Stage": {"Type": "AWS::ApiGatewayV2::Stage", "DependsOn": ["Read", "Vote"], "Properties": {"ApiId": ref("Api"), "StageName": "$default", "AutoDeploy": True,
            "DefaultRouteSettings": {"ThrottlingBurstLimit": 30, "ThrottlingRateLimit": 15},
            "RouteSettings": {"POST /polls/{pollId}/votes": {"ThrottlingBurstLimit": 6, "ThrottlingRateLimit": 3, "DetailedMetricsEnabled": True}}}},
        "Permission": {"Type": "AWS::Lambda::Permission", "Properties": {"Action": "lambda:InvokeFunction", "FunctionName": ref("Function"), "Principal": "apigateway.amazonaws.com", "SourceArn": sub("arn:${AWS::Partition}:execute-api:${AWS::Region}:${AWS::AccountId}:${Api}/*/*/*")}}
    }
    for name, namespace, metric, dimensions, threshold in [
        ("ApiErrors", "AWS/ApiGateway", "5xx", [{"Name": "ApiId", "Value": ref("Api")}], 3),
        ("FunctionErrors", "AWS/Lambda", "Errors", [{"Name": "FunctionName", "Value": ref("Function")}], 1),
        ("FunctionThrottles", "AWS/Lambda", "Throttles", [{"Name": "FunctionName", "Value": ref("Function")}], 3),
    ]:
        resources[name] = {"Type": "AWS::CloudWatch::Alarm", "Properties": {"AlarmDescription": f"PIA issue polls: {name}", "Namespace": namespace, "MetricName": metric, "Dimensions": dimensions,
            "Statistic": "Sum", "Period": 300, "EvaluationPeriods": 1, "Threshold": threshold, "ComparisonOperator": "GreaterThanOrEqualToThreshold", "TreatMissingData": "notBreaching", "AlarmActions": [ref("AlertsTopic")]}}
    return {"AWSTemplateFormatVersion": "2010-09-09", "Description": "PIA anonymous issue opinion polls and aggregate results",
        "Parameters": {"CodeBucket": {"Type": "String"}, "CodeKey": {"Type": "String"}, "RateSalt": {"Type": "String", "NoEcho": True, "MinLength": 32},
            "AlertsTopic": {"Type": "String"}, "Origins": {"Type": "CommaDelimitedList", "Default": "https://patriotsinaction.com,https://www.patriotsinaction.com,https://main.d1c230b674qax4.amplifyapp.com"}},
        "Resources": resources, "Outputs": {"ApiUrl": {"Value": att("Api", "ApiEndpoint")}, "TableName": {"Value": ref("Polls")}}}
