# LocalStack S3 for Student Market

This setup replaces the deleted AWS dev bucket during local development. It runs an S3-compatible endpoint on the developer machine and never uses credentials from the real AWS profile.

## Start and initialize

1. Start Docker Desktop.
2. Get a LocalStack Auth Token from
   <https://app.localstack.cloud/workspace/auth-tokens>. Current LocalStack images
   require a token to start. Never commit or paste the token into source files.
3. Configure the token using either option below.

   Set it only for the current PowerShell session:

   ```powershell
   $env:LOCALSTACK_AUTH_TOKEN = "your-token"
   ```

   Or create `.env.localstack` in the workspace root, `aws/localstack`, or the
   local `localstack` directory. The repository ignores `.env*` files:

   ```dotenv
   LOCALSTACK_AUTH_TOKEN=your-token
   ```

4. From the workspace root, run:

```powershell
.\aws\localstack\Initialize-LocalStack.ps1
```

The script starts `student-market-localstack`, waits for S3 health, creates
`student-market-local-images`, applies the development CORS and lifecycle files
from `aws/s3`, publishes the .NET image processor, and wires an `ObjectCreated`
notification for `raw/` only.

LocalStack uses `aws/localstack/cors.local.json`, which additionally permits `GET`
and `HEAD` from the LocalStack Web App so objects can be previewed in the resource
browser. The real AWS dev bucket continues to use the narrower `aws/s3/cors.dev.json`.

The Compose configuration also sets LocalStack gateway CORS for the Web App and the
two local frontend origins. This gateway-level configuration applies to service APIs
such as Lambda, IAM, Logs, and STS. These services do not have bucket-style CORS
documents of their own. Keep `DISABLE_CORS_CHECKS=0`; do not disable LocalStack's
CSRF protections to make the Resource Browser work.

The LocalStack container enables `s3`, `lambda`, `iam`, `logs`, and `sts`. Lambda
execution uses the Docker socket and the dedicated
`student-market-localstack-network`; no AWS resource is created.

To initialize S3 without rebuilding the Lambda while debugging the API:

```powershell
.\aws\localstack\Initialize-LocalStack.ps1 -SkipImagePipeline
```

The backend Development configuration uses:

- endpoint `http://localhost:4566`;
- path-style addressing;
- local placeholder credentials `test`/`test`;
- bucket `student-market-local-images`;
- region `ap-southeast-1`.

The placeholder credentials are accepted only by LocalStack and are not AWS credentials. Production must leave `MediaStorage:ServiceUrl` empty and obtain temporary credentials through its Lambda execution role.

The initializer also applies S3 Block Public Access, `BucketOwnerEnforced`
ownership, and default SSE-S3 (`AES256`) encryption. These controls keep the
local bucket aligned with the production security model; direct public access to
`raw/*` must never be used by the frontend.

## Smoke test through the backend presigned endpoint

Start the backend with its Development configuration, authenticate, and create an
item owned by that user. Then run:

```powershell
.\aws\localstack\Test-PresignedUpload.ps1 `
  -AccessToken "<JWT>" `
  -ItemId "<owned-item-guid>" `
  -FilePath ".\sample.webp"
```

The script never prints the JWT or full presigned URL. It requests a signed POST,
submits every returned form field directly to LocalStack S3, waits for Lambda,
and verifies that both `large.webp` and `thumbnail.webp` exist with
`Content-Type: image/webp`.

## Smoke test the image event

Upload a JPEG, PNG, or WebP using the same raw-key shape produced by the API:

```powershell
$Endpoint = "http://localhost:4566"
$Bucket = "student-market-local-images"
$UserId = "11111111-1111-1111-1111-111111111111"
$ItemId = "22222222-2222-2222-2222-222222222222"
$UploadId = "33333333-3333-3333-3333-333333333333"

aws --endpoint-url=$Endpoint s3 cp .\sample.jpg `
  "s3://$Bucket/raw/users/$UserId/items/$ItemId/$UploadId.jpg" `
  --content-type image/jpeg

aws --endpoint-url=$Endpoint s3 ls `
  "s3://$Bucket/processed/items/$ItemId/$UploadId/"
```

The expected outputs are `large.webp` and `thumbnail.webp`. Re-uploading the
same raw key overwrites the same processed keys, so event retries are safe.

## Stop

```powershell
docker compose -f aws/localstack/docker-compose.yml down
```

The named volume preserves local objects. Removing `student-market-localstack-data` deletes all LocalStack state and cannot be undone.
