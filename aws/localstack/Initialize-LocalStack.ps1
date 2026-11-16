param(
    [switch]$SkipImagePipeline
)

$LocalEndpoint = "http://localhost:4566"
$LocalBucket = "student-market-local-images"
$WorkspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$LocalStackEnvironmentCandidates = @(
    (Join-Path $WorkspaceRoot ".env.localstack"),
    (Join-Path $WorkspaceRoot "aws\localstack\.env.localstack"),
    (Join-Path $WorkspaceRoot "localstack\.env.localstack")
)
$LocalStackEnvironmentFile = $LocalStackEnvironmentCandidates |
    Where-Object { Test-Path -LiteralPath $_ } |
    Select-Object -First 1
$ComposeArguments = @()

if ([string]::IsNullOrWhiteSpace($env:LOCALSTACK_AUTH_TOKEN)) {
    if (-not [string]::IsNullOrWhiteSpace($LocalStackEnvironmentFile)) {
        $ComposeArguments += @("--env-file", $LocalStackEnvironmentFile)
    }
    else {
        throw @"
LocalStack requires an auth token. Set LOCALSTACK_AUTH_TOKEN in this terminal or
create an ignored .env.localstack file in one of these locations:

$($LocalStackEnvironmentCandidates -join [Environment]::NewLine)

The file must contain:

LOCALSTACK_AUTH_TOKEN=your-token

Get the token from https://app.localstack.cloud/workspace/auth-tokens and never
commit or paste it into source files.
"@
    }
}

$env:AWS_ACCESS_KEY_ID = "test"
$env:AWS_SECRET_ACCESS_KEY = "test"
$env:AWS_SESSION_TOKEN = "test"
$env:AWS_DEFAULT_REGION = "ap-southeast-1"

docker compose @ComposeArguments -f aws/localstack/docker-compose.yml up -d
if ($LASTEXITCODE -ne 0) {
    throw "LocalStack container could not be started."
}

$Ready = $false
foreach ($Attempt in 1..30) {
    try {
        $Health = Invoke-RestMethod "$LocalEndpoint/_localstack/health"
        if ($Health.services.s3 -in @("available", "running")) {
            $Ready = $true
            break
        }
    }
    catch {
        # The gateway may refuse connections while the container is starting.
    }

    Start-Sleep -Seconds 1
}

if (-not $Ready) {
    throw "LocalStack S3 did not become ready within 30 seconds. Check Docker logs."
}

aws --endpoint-url=$LocalEndpoint s3api head-bucket --bucket $LocalBucket 2>$null
if ($LASTEXITCODE -ne 0) {
    aws --endpoint-url=$LocalEndpoint s3api create-bucket `
        --bucket $LocalBucket `
        --region ap-southeast-1 `
        --create-bucket-configuration LocationConstraint=ap-southeast-1
    if ($LASTEXITCODE -ne 0) {
        throw "Local S3 bucket could not be created."
    }
}

aws --endpoint-url=$LocalEndpoint s3api put-bucket-cors `
    --bucket $LocalBucket `
    --cors-configuration file://aws/localstack/cors.local.json
if ($LASTEXITCODE -ne 0) {
    throw "Local S3 CORS configuration could not be applied."
}

aws --endpoint-url=$LocalEndpoint s3api put-public-access-block `
    --bucket $LocalBucket `
    --public-access-block-configuration `
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
if ($LASTEXITCODE -ne 0) {
    throw "Local S3 public access block could not be applied."
}

aws --endpoint-url=$LocalEndpoint s3api put-bucket-ownership-controls `
    --bucket $LocalBucket `
    --ownership-controls "Rules=[{ObjectOwnership=BucketOwnerEnforced}]"
if ($LASTEXITCODE -ne 0) {
    throw "Local S3 ownership controls could not be applied."
}

aws --endpoint-url=$LocalEndpoint s3api put-bucket-encryption `
    --bucket $LocalBucket `
    --server-side-encryption-configuration `
    "Rules=[{ApplyServerSideEncryptionByDefault={SSEAlgorithm=AES256},BucketKeyEnabled=false}]"
if ($LASTEXITCODE -ne 0) {
    throw "Local S3 default encryption could not be applied."
}

aws --endpoint-url=$LocalEndpoint s3api put-bucket-lifecycle-configuration `
    --bucket $LocalBucket `
    --lifecycle-configuration file://aws/s3/lifecycle.dev.json
if ($LASTEXITCODE -ne 0) {
    throw "Local S3 lifecycle configuration could not be applied."
}

Write-Host "LocalStack S3 is ready: $LocalEndpoint/$LocalBucket"

if (-not $SkipImagePipeline) {
    & (Join-Path $PSScriptRoot "Initialize-ImagePipeline.ps1") `
        -LocalEndpoint $LocalEndpoint `
        -LocalBucket $LocalBucket
}
