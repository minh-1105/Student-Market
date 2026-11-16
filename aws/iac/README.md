# Student Market media pipeline IaC

`media-pipeline.yaml` is an AWS SAM/CloudFormation template for the deploy-time
image pipeline. It does not create anything until an operator explicitly runs a
deployment command.

The stack contains:

- a versioned, encrypted, private S3 media bucket with ACLs disabled;
- CORS for exact frontend origins and lifecycle cleanup for incomplete uploads
  and noncurrent versions;
- a .NET 8 image processor invoked only for `ObjectCreated` events under `raw/`;
- a least-privilege execution role that reads `raw/*` and writes `processed/*`;
- structured JSON logs with bounded retention, error/throttle/duration alarms,
  and an encrypted failure queue with a depth alarm;
- CloudFront with OAC and a bucket policy that permits reads only under
  `processed/*`;
- optional S3 access logs, CloudTrail S3 data events, and detailed S3 request
  metrics. These are disabled by default because they add storage, request,
  CloudTrail, and CloudWatch charges.

The template deliberately does not expire current `raw/*` objects. Product
retention and recovery requirements must be approved before adding that rule.

## Local build and validation

Run these commands from the workspace root:

```powershell
sam build --template-file .\aws\iac\media-pipeline.yaml
sam validate --lint --template-file .\aws\iac\media-pipeline.yaml
```

`sam validate --lint` performs local schema and lint validation. Security and
compliance validation with `cfn-guard` remains a separate check; do not treat a
successful SAM validation as proof that an account can deploy the stack.

## Deployment inputs to decide later

Before a future deployment, replace the local defaults and review a change set:

- `Environment`;
- `FrontendOrigins` with HTTPS production origins;
- log and version retention;
- reserved concurrency;
- whether paid audit logging and detailed S3 metrics are required.

The deployed API must use the stack outputs:

- `MediaStorage__BucketName=<MediaBucketName>`;
- `MediaStorage__Region=<stack-region>`;
- `MediaStorage__ServiceUrl=`;
- `MediaStorage__ForcePathStyle=false`;
- `MediaStorage__CloudFrontBaseUrl=<CloudFrontBaseUrl>`.

Use an IAM/Lambda execution role for AWS credentials. Never copy LocalStack's
`test` credentials or endpoint into an AWS environment.

## API stack (`api.yaml`)

`api.yaml` deploys the ASP.NET Core API as a .NET 8 Lambda (executable-assembly
hosting via `AddAWSLambdaHosting(LambdaEventSource.HttpApi)`) behind an API
Gateway HTTP API. Deploy `media-pipeline.yaml` first, then pass its outputs:

```powershell
sam build --template-file .\aws\iac\api.yaml
sam deploy --template-file .\.aws-sam\build\template.yaml `
  --stack-name student-market-dev --capabilities CAPABILITY_IAM --guided
```

Parameters:

| Parameter | Value |
|---|---|
| `DbConnectionString` | Npgsql connection string to RDS/PostgreSQL (NoEcho). |
| `JwtSecretKey` | Random secret, >= 32 chars (NoEcho). |
| `MediaBucketName`, `CloudFrontBaseUrl` | Outputs of the media stack. |
| `FrontendOrigins` | Comma-separated HTTPS frontend origins (API CORS). |
| `SubnetIds`, `SecurityGroupIds` | Private subnets/SG that reach RDS; empty = no VPC. |
| `SkipDatabaseSeed` | `false` runs pending EF migrations + base seed on cold start. |

Notes:

- Secrets are passed as Lambda environment variables (encrypted at rest). Move
  them to Secrets Manager/SSM once the account allows it.
- A Lambda inside a VPC has no internet/S3 access without a NAT gateway or an
  S3 gateway endpoint. Presigning is local, but `POST .../images/confirm` calls
  S3 `HeadObject` on `raw/*`, so add an S3 gateway endpoint (free) to the VPC.
- SignalR (`/hubs/chat`) does not work through HTTP API + Lambda: WebSockets
  are unsupported and hub connections are per-instance. Chat REST endpoints
  work; realtime needs a separate design (API Gateway WebSocket API or a
  container host).
