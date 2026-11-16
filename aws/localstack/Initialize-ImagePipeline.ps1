param(
    [string]$LocalEndpoint = "http://localhost:4566",
    [string]$LocalBucket = "student-market-local-images"
)

$ErrorActionPreference = "Stop"
$FunctionName = "student-market-local-image-processor"
$RoleName = "student-market-local-image-processor-role"
$WorkspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ProjectPath = Join-Path $WorkspaceRoot "student-flea-market-be\StudentFleaMarket.ImageProcessor\StudentFleaMarket.ImageProcessor.csproj"
$TrustPolicyPath = (Resolve-Path (Join-Path $WorkspaceRoot "aws\iam\lambda-trust-policy.json")).Path
$ArtifactRoot = Join-Path $WorkspaceRoot ".localstack\image-processor"
$PublishDirectory = Join-Path $ArtifactRoot "publish"
$ZipPath = Join-Path $ArtifactRoot "image-processor.zip"
$EnvironmentPath = Join-Path $ArtifactRoot "environment.json"
$NotificationPath = Join-Path $ArtifactRoot "s3-notification.json"
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

New-Item -ItemType Directory -Path $ArtifactRoot -Force | Out-Null
if (Test-Path -LiteralPath $PublishDirectory) {
    $ResolvedPublishDirectory = (Resolve-Path -LiteralPath $PublishDirectory).Path
    if (-not $ResolvedPublishDirectory.StartsWith($ArtifactRoot, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to clear publish directory outside the LocalStack artifact root."
    }
    Remove-Item -LiteralPath $ResolvedPublishDirectory -Recurse -Force
}

dotnet publish $ProjectPath `
    --configuration Release `
    --runtime linux-x64 `
    --self-contained false `
    --output $PublishDirectory
if ($LASTEXITCODE -ne 0) {
    throw "Image processor publish failed."
}

Compress-Archive -Path (Join-Path $PublishDirectory "*") -DestinationPath $ZipPath -Force

$Environment = @{
    Variables = @{
        AWS_ENDPOINT_URL = "http://localhost.localstack.cloud:4566"
        MAX_SOURCE_BYTES = "10485760"
        MAX_PIXELS = "40000000"
        LARGE_MAX_WIDTH = "1600"
        THUMBNAIL_MAX_WIDTH = "480"
        WEBP_QUALITY = "82"
    }
}
$EnvironmentJson = $Environment | ConvertTo-Json -Depth 4
[System.IO.File]::WriteAllText($EnvironmentPath, $EnvironmentJson, $Utf8NoBom)

$TrustPolicyUri = "file://$($TrustPolicyPath.Replace('\', '/'))"
$ZipUri = "fileb://$($ZipPath.Replace('\', '/'))"
$EnvironmentUri = "file://$($EnvironmentPath.Replace('\', '/'))"

$PreviousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
aws --endpoint-url=$LocalEndpoint iam get-role --role-name $RoleName *> $null
$RoleExists = $LASTEXITCODE -eq 0
$ErrorActionPreference = $PreviousErrorActionPreference
if (-not $RoleExists) {
    aws --endpoint-url=$LocalEndpoint iam create-role `
        --role-name $RoleName `
        --assume-role-policy-document $TrustPolicyUri | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Local image processor role could not be created."
    }
}

$RoleArn = aws --endpoint-url=$LocalEndpoint iam get-role `
    --role-name $RoleName `
    --query "Role.Arn" `
    --output text
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($RoleArn)) {
    throw "Local image processor role ARN could not be read."
}

$PreviousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
aws --endpoint-url=$LocalEndpoint lambda get-function --function-name $FunctionName *> $null
$FunctionExists = $LASTEXITCODE -eq 0
$ErrorActionPreference = $PreviousErrorActionPreference
if ($FunctionExists) {
    aws --endpoint-url=$LocalEndpoint lambda update-function-code `
        --function-name $FunctionName `
        --zip-file $ZipUri | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Local image processor code could not be updated."
    }
    aws --endpoint-url=$LocalEndpoint lambda wait function-updated-v2 `
        --function-name $FunctionName
    if ($LASTEXITCODE -ne 0) {
        throw "Local image processor code update did not become ready."
    }
    aws --endpoint-url=$LocalEndpoint lambda update-function-configuration `
        --function-name $FunctionName `
        --runtime dotnet8 `
        --handler "StudentFleaMarket.ImageProcessor::StudentFleaMarket.ImageProcessor.Function::FunctionHandler" `
        --role $RoleArn `
        --timeout 60 `
        --memory-size 1024 `
        --environment $EnvironmentUri | Out-Null
}
else {
    aws --endpoint-url=$LocalEndpoint lambda create-function `
        --function-name $FunctionName `
        --runtime dotnet8 `
        --architectures x86_64 `
        --handler "StudentFleaMarket.ImageProcessor::StudentFleaMarket.ImageProcessor.Function::FunctionHandler" `
        --role $RoleArn `
        --zip-file $ZipUri `
        --timeout 60 `
        --memory-size 1024 `
        --environment $EnvironmentUri | Out-Null
}
if ($LASTEXITCODE -ne 0) {
    throw "Local image processor function could not be configured."
}

aws --endpoint-url=$LocalEndpoint lambda wait function-active-v2 `
    --function-name $FunctionName
if ($LASTEXITCODE -ne 0) {
    throw "Local image processor function did not become active."
}

$FunctionArn = aws --endpoint-url=$LocalEndpoint lambda get-function-configuration `
    --function-name $FunctionName `
    --query "FunctionArn" `
    --output text
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($FunctionArn)) {
    throw "Local image processor function ARN could not be read."
}

$PreviousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
aws --endpoint-url=$LocalEndpoint lambda remove-permission `
    --function-name $FunctionName `
    --statement-id "AllowLocalS3Invoke" *> $null
$ErrorActionPreference = $PreviousErrorActionPreference
aws --endpoint-url=$LocalEndpoint lambda add-permission `
    --function-name $FunctionName `
    --statement-id "AllowLocalS3Invoke" `
    --action "lambda:InvokeFunction" `
    --principal "s3.amazonaws.com" `
    --source-arn "arn:aws:s3:::$LocalBucket" | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Local S3 invoke permission could not be configured."
}

$Notification = @{
    LambdaFunctionConfigurations = @(
        @{
            Id = "raw-image-created"
            LambdaFunctionArn = $FunctionArn
            Events = @("s3:ObjectCreated:*")
            Filter = @{
                Key = @{
                    FilterRules = @(
                        @{ Name = "prefix"; Value = "raw/" }
                    )
                }
            }
        }
    )
}
$NotificationJson = $Notification | ConvertTo-Json -Depth 8
[System.IO.File]::WriteAllText($NotificationPath, $NotificationJson, $Utf8NoBom)
$NotificationUri = "file://$($NotificationPath.Replace('\', '/'))"
aws --endpoint-url=$LocalEndpoint s3api put-bucket-notification-configuration `
    --bucket $LocalBucket `
    --notification-configuration $NotificationUri
if ($LASTEXITCODE -ne 0) {
    throw "Local S3 notification could not be configured."
}

Write-Host "Local image pipeline is ready: s3://$LocalBucket/raw/ -> $FunctionName -> processed/"
