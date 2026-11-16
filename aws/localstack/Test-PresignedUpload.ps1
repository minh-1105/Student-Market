param(
    [Parameter(Mandatory = $true)]
    [string]$AccessToken,

    [Parameter(Mandatory = $true)]
    [Guid]$ItemId,

    [Parameter(Mandatory = $true)]
    [string]$FilePath,

    [string]$ApiBaseUrl = "http://localhost:5033",
    [string]$LocalEndpoint = "http://localhost:4566",
    [string]$LocalBucket = "student-market-local-images",
    [int]$TimeoutSeconds = 30
)

$ErrorActionPreference = "Stop"
$resolvedFile = (Resolve-Path -LiteralPath $FilePath).Path
$file = Get-Item -LiteralPath $resolvedFile
$contentTypes = @{
    ".jpg" = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".png" = "image/png"
    ".webp" = "image/webp"
}
$extension = $file.Extension.ToLowerInvariant()
if (-not $contentTypes.ContainsKey($extension)) {
    throw "Only JPEG, PNG, and WebP files are supported."
}

$headers = @{ Authorization = "Bearer $AccessToken" }
$request = @{
    files = @(
        @{
            fileName = $file.Name
            contentType = $contentTypes[$extension]
            sizeBytes = $file.Length
        }
    )
} | ConvertTo-Json -Depth 4

$presign = Invoke-RestMethod `
    -Method Post `
    -Uri "$($ApiBaseUrl.TrimEnd('/'))/api/items/$ItemId/images/presign" `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $request
$upload = $presign.data.uploads[0]
if ($null -eq $upload) {
    throw "The backend did not return a presigned upload."
}

$responseFile = Join-Path $env:TEMP "sfm-presigned-upload-response.txt"
$curlArguments = @("-sS", "-o", $responseFile, "-w", "%{http_code}", "-X", "POST")
foreach ($field in $upload.formFields.PSObject.Properties) {
    $curlArguments += @("-F", ("{0}={1}" -f $field.Name, $field.Value))
}
$curlArguments += @(
    "-F",
    ("file=@{0};type={1}" -f $resolvedFile, $contentTypes[$extension]),
    $upload.uploadUrl
)

try {
    $uploadStatus = & curl.exe @curlArguments
    if ($uploadStatus -notin @("200", "201", "204")) {
        $responseBody = Get-Content -LiteralPath $responseFile -Raw
        throw "S3 upload failed with HTTP $uploadStatus. $responseBody"
    }
}
finally {
    if (Test-Path -LiteralPath $responseFile) {
        Remove-Item -LiteralPath $responseFile -Force
    }
}

$processedPrefix = "processed/items/$ItemId/$($upload.uploadId)"
$largeKey = "$processedPrefix/large.webp"
$thumbnailKey = "$processedPrefix/thumbnail.webp"
$ready = $false
foreach ($attempt in 1..$TimeoutSeconds) {
    aws --endpoint-url=$LocalEndpoint s3api head-object `
        --bucket $LocalBucket --key $largeKey *> $null
    $largeExists = $LASTEXITCODE -eq 0
    aws --endpoint-url=$LocalEndpoint s3api head-object `
        --bucket $LocalBucket --key $thumbnailKey *> $null
    $thumbnailExists = $LASTEXITCODE -eq 0
    if ($largeExists -and $thumbnailExists) {
        $ready = $true
        break
    }
    Start-Sleep -Seconds 1
}
if (-not $ready) {
    throw "Processed images were not created within $TimeoutSeconds seconds."
}

$large = aws --endpoint-url=$LocalEndpoint s3api head-object `
    --bucket $LocalBucket --key $largeKey --output json | ConvertFrom-Json
$thumbnail = aws --endpoint-url=$LocalEndpoint s3api head-object `
    --bucket $LocalBucket --key $thumbnailKey --output json | ConvertFrom-Json
if ($large.ContentType -ne "image/webp" -or $thumbnail.ContentType -ne "image/webp") {
    throw "The image processor returned an unexpected content type."
}

[pscustomobject]@{
    UploadHttpStatus = $uploadStatus
    ObjectKey = $upload.objectKey
    LargeKey = $largeKey
    LargeBytes = $large.ContentLength
    ThumbnailKey = $thumbnailKey
    ThumbnailBytes = $thumbnail.ContentLength
    ContentType = "image/webp"
}
