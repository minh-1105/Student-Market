# Hướng dẫn dùng LocalStack để test Student Market trước khi deploy AWS

Tài liệu này áp dụng cho repository `Student Market` trên Windows PowerShell. Mục tiêu là kiểm tra sớm các tích hợp AWS ở máy local, đặc biệt là S3 và luồng S3 → Lambda xử lý ảnh, trước khi tạo tài nguyên hoặc deploy lên tài khoản AWS thật.

## 1. LocalStack dùng để làm gì trong project này?

Kiến trúc AWS dự kiến của project có luồng:

```text
Frontend -- presigned upload --> S3 raw/*
                                  |
                                  | ObjectCreated
                                  v
                           image-processor Lambda
                                  |
                                  v
                            S3 processed/*
                                  |
                                  v
                              CloudFront
```

LocalStack phù hợp để kiểm tra:

- Backend kết nối đúng S3 endpoint local.
- Tạo bucket và object bằng AWS CLI.
- Presigned URL upload được file và hết hạn đúng cấu hình.
- Object chỉ được ghi vào key do backend sinh ra.
- Upload vào `raw/` kích hoạt image-processor Lambda.
- Processor tạo output trong `processed/`, không tự kích hoạt lặp vô hạn.
- MIME type, metadata, kích thước file và quy tắc đặt object key.
- Script/IaC có thể tạo lại hạ tầng từ đầu.

LocalStack **không thay thế hoàn toàn AWS thật**. Trước khi phát hành vẫn phải smoke test trên môi trường AWS dev/staging các phần IAM enforcement, API Gateway, VPC/RDS, Secrets Manager, CloudFront OAC, DNS, TLS, CORS từ trình duyệt và giới hạn dịch vụ.

PostgreSQL của backend không chạy trong LocalStack. Khi test đầy đủ, backend vẫn kết nối PostgreSQL local; chỉ các AWS SDK client mới trỏ vào LocalStack.

## 2. Trạng thái hiện tại của project

Tại ngày 28/10/2026:

- Backend đã tham chiếu package `AWSSDK.S3`.
- Backend đã có S3 presigned POST service và endpoint có kiểm tra JWT/ownership.
- Development đã được cấu hình dùng `student-market-local-images` tại `http://localhost:4566` với path-style addressing.
- Có Compose và script khởi tạo lặp lại được trong `aws/localstack/`.
- Bucket AWS dev thật đã được xóa; môi trường local không dùng AWS credential thật.
- Chưa có image-processor Lambda.
- Chưa có S3 event notification.
- Chưa có CloudFront distribution/OAC trong mã hạ tầng.

Do đó hiện tại có thể:

1. Chạy test hiện có của backend độc lập với LocalStack.
2. Khởi động LocalStack và smoke test S3 bằng AWS CLI.
3. Test presigned upload từ backend vào bucket S3 local.

Chưa thể test end-to-end upload → xử lý → hiển thị ảnh cho đến khi các thành phần còn thiếu được triển khai.

## 3. Lưu ý về thư mục `localstack`

Thư mục `localstack` cùng cấp với `student-flea-market-be` và `student-flea-market-fe` là bản clone mã nguồn upstream. Upstream hiện đã chuyển sang trạng thái archived/read-only và khuyến nghị chạy unified Docker image.

Không cần build mã nguồn trong thư mục này để test Student Market. File Compose trong đó là cấu hình tham khảo để chạy image `localstack/localstack`; hướng dẫn bên dưới chạy trực tiếp cùng image và truyền Auth Token rõ ràng:

```text
Student Market/
├── localstack/docker-compose.yml
├── student-flea-market-be/
└── student-flea-market-fe/
```

## 4. Điều kiện cần

- Docker Desktop đã được mở và Docker Engine đang chạy.
- AWS CLI đã cài.
- Có LocalStack account/Auth Token phù hợp với gói đang dùng.
- PowerShell đang ở thư mục gốc repository.

Kiểm tra:

```powershell
cd "C:\Users\minht\Student Market"
docker version
docker compose version
aws --version
```

Nếu `docker version` chỉ hiện phần Client hoặc báo không kết nối được daemon, mở Docker Desktop và chờ trạng thái Engine running.

LocalStack phiên bản hiện tại yêu cầu kích hoạt bằng Auth Token. Không ghi token vào Git. Khai báo token chỉ trong terminal hiện tại:

```powershell
$env:LOCALSTACK_AUTH_TOKEN = "<token-localstack-cua-ban>"
```

Lấy token tại trang quản lý Auth Token của LocalStack. Token này không phải AWS access key.

## 5. Khởi động LocalStack

Project có Compose riêng và script idempotent để khởi động S3 local:

```powershell
.\aws\localstack\Initialize-LocalStack.ps1
```

Script dùng `aws/localstack/docker-compose.yml`, chờ S3 sẵn sàng, tạo bucket
`student-market-local-images`, sau đó áp dụng CORS và lifecycle dev. Token được
đọc từ biến môi trường nếu image/gói LocalStack đang dùng yêu cầu kích hoạt;
không ghi token vào Compose hay Git.

Kiểm tra trạng thái:

```powershell
docker ps --filter "name=student-market-localstack"
Invoke-RestMethod "http://localhost:4566/_localstack/health"
docker logs student-market-localstack
```

Endpoint khuyến nghị cho ứng dụng là:

```text
http://localhost.localstack.cloud:4566
```

Nếu mạng/DNS của máy không phân giải được `localhost.localstack.cloud`, dùng fallback:

```text
http://localhost:4566
```

## 6. Cấu hình AWS CLI an toàn cho local

LocalStack chấp nhận credential giả. Không cần và không nên dùng credential của AWS thật.

Trong terminal đang thao tác:

```powershell
$env:AWS_ACCESS_KEY_ID = "test"
$env:AWS_SECRET_ACCESS_KEY = "test"
$env:AWS_SESSION_TOKEN = "test"
$env:AWS_DEFAULT_REGION = "ap-southeast-1"
$LocalStackEndpoint = "http://localhost:4566"
```

Xác nhận lệnh đang đi vào LocalStack:

```powershell
aws --endpoint-url=$LocalStackEndpoint sts get-caller-identity
```

Account local thường là `000000000000`. Luôn truyền `--endpoint-url=$LocalStackEndpoint` trong lệnh local. Không dùng tên `student-market-dev-*` hoặc `student-market-prod-*`; dùng tiền tố `student-market-local-*` để tránh nhầm môi trường.

## 7. Smoke test S3 có thể chạy ngay

Tạo bucket local:

```powershell
$Bucket = "student-market-local-images"

aws --endpoint-url=$LocalStackEndpoint s3api create-bucket `
  --bucket $Bucket `
  --region ap-southeast-1 `
  --create-bucket-configuration LocationConstraint=ap-southeast-1
```

Tạo và upload file thử vào đúng prefix dự kiến:

```powershell
Set-Content -Path "$env:TEMP\student-market-local-test.txt" `
  -Value "LocalStack S3 smoke test" `
  -Encoding utf8

aws --endpoint-url=$LocalStackEndpoint s3 cp `
  "$env:TEMP\student-market-local-test.txt" `
  "s3://$Bucket/raw/smoke-test/test.txt" `
  --content-type "text/plain"
```

Kiểm tra object:

```powershell
aws --endpoint-url=$LocalStackEndpoint s3api head-object `
  --bucket $Bucket `
  --key "raw/smoke-test/test.txt"

aws --endpoint-url=$LocalStackEndpoint s3 ls "s3://$Bucket/raw/" --recursive
```

Download và đối chiếu nội dung:

```powershell
aws --endpoint-url=$LocalStackEndpoint s3 cp `
  "s3://$Bucket/raw/smoke-test/test.txt" `
  "$env:TEMP\student-market-local-result.txt"

Get-Content "$env:TEMP\student-market-local-result.txt"
```

Nếu các lệnh trên thành công thì Docker, LocalStack Gateway, AWS CLI và S3 emulator đã hoạt động.

## 8. Cấu hình backend để dùng LocalStack

Khi triển khai S3 service, không hard-code LocalStack trong code production. Thêm cấu hình riêng, ví dụ:

```json
{
  "Aws": {
    "Region": "ap-southeast-1",
    "S3": {
      "BucketName": "student-market-local-images",
      "ServiceUrl": "http://localhost.localstack.cloud:4566",
      "ForcePathStyle": true
    },
    "CloudFrontBaseUrl": ""
  }
}
```

Ở môi trường local, S3 client cần các giá trị tương đương:

```csharp
new AmazonS3Config
{
    ServiceURL = serviceUrl,
    ForcePathStyle = true,
    AuthenticationRegion = region
};
```

Quy tắc cấu hình:

- Development/local có `ServiceUrl` và `ForcePathStyle=true`.
- AWS thật không dùng LocalStack endpoint; SDK dùng endpoint mặc định của Region.
- Credential local là `test`; production lấy credential từ Lambda execution role.
- Không lưu presigned URL vào database vì URL có hạn sử dụng. Chỉ lưu object key hoặc URL ổn định tạo từ CloudFront base URL.
- Nếu backend cũng chạy trong Docker, `localhost` bên trong container không phải máy host. Khi đó dùng tên service chung trong Docker network hoặc endpoint do LocalStack DNS cung cấp.

Sau khi code S3 service, chạy backend với biến local:

```powershell
$env:AWS_ACCESS_KEY_ID = "test"
$env:AWS_SECRET_ACCESS_KEY = "test"
$env:AWS_SESSION_TOKEN = "test"
$env:AWS_DEFAULT_REGION = "ap-southeast-1"
$env:Aws__S3__BucketName = "student-market-local-images"
$env:Aws__S3__ServiceUrl = "http://localhost.localstack.cloud:4566"
$env:Aws__S3__ForcePathStyle = "true"

dotnet run --project .\student-flea-market-be\StudentFleaMarket.API
```

Tên section ở trên là hợp đồng cấu hình đề xuất; phải đồng bộ với tên cấu hình thực tế khi S3 service được viết.

## 9. Test presigned upload sau khi endpoint được triển khai

Quy trình test mong muốn:

1. Đăng nhập backend và lấy JWT.
2. Gọi endpoint xin presigned URL với MIME/kích thước hợp lệ.
3. Backend tự sinh key nằm trong `raw/<user-id>/...`; client không được tùy ý chọn key.
4. Upload đúng `Content-Type` bằng URL nhận được.
5. Dùng `head-object` xác nhận object xuất hiện.
6. Thử lại với MIME không hợp lệ, file quá lớn, key của user khác và URL hết hạn; tất cả phải bị từ chối theo contract.

Ví dụ upload URL do API trả về:

```powershell
$UploadHeaders = @{ "Content-Type" = "image/jpeg" }

Invoke-WebRequest `
  -Method Put `
  -Uri $PresignedUrl `
  -Headers $UploadHeaders `
  -InFile ".\test-data\sample.jpg"
```

Header khi upload phải giống header đã được đưa vào chữ ký. Không in đầy đủ presigned URL vào log hoặc commit vào repository.

## 10. Test image-processor Lambda và S3 event

Chỉ thực hiện mục này sau khi repository có source code và gói deploy của image processor.

### 10.1. Tạo execution role local

LocalStack vẫn cần một role ARN trong cấu hình Lambda, dù credential và việc thực thi quyền local không hoàn toàn giống AWS thật:

```powershell
$LocalAccountId = aws --endpoint-url=$LocalStackEndpoint sts get-caller-identity `
  --query Account `
  --output text

aws --endpoint-url=$LocalStackEndpoint iam create-role `
  --role-name student-market-local-image-processor-role `
  --assume-role-policy-document file://aws/iam/lambda-trust-policy.json

$ProcessorRoleArn = "arn:aws:iam::${LocalAccountId}:role/student-market-local-image-processor-role"
```

Role local chỉ phục vụ integration test. Policy và trust policy production vẫn phải được review/deploy riêng trên AWS thật theo least privilege.

### 10.2. Tạo Lambda

Đóng gói processor theo runtime thực tế rồi tạo function. Ví dụ khung lệnh:

```powershell
aws --endpoint-url=$LocalStackEndpoint lambda create-function `
  --function-name student-market-local-image-processor `
  --runtime <runtime-thuc-te> `
  --handler <handler-thuc-te> `
  --role $ProcessorRoleArn `
  --zip-file fileb://<duong-dan-goi-zip>
```

Không sao chép nguyên placeholder. Runtime, handler và đường dẫn ZIP phải khớp implementation được chọn.

### 10.3. Cho S3 gọi Lambda

```powershell
aws --endpoint-url=$LocalStackEndpoint lambda add-permission `
  --function-name student-market-local-image-processor `
  --statement-id AllowLocalS3Invoke `
  --action lambda:InvokeFunction `
  --principal s3.amazonaws.com `
  --source-arn "arn:aws:s3:::$Bucket"
```

Tạo file `.localstack/s3-notification.json` với nội dung:

```json
{
  "LambdaFunctionConfigurations": [
    {
      "Id": "ProcessRawImages",
      "LambdaFunctionArn": "arn:aws:lambda:ap-southeast-1:000000000000:function:student-market-local-image-processor",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": [
            { "Name": "prefix", "Value": "raw/" }
          ]
        }
      }
    }
  ]
}
```

Áp dụng notification:

```powershell
aws --endpoint-url=$LocalStackEndpoint s3api put-bucket-notification-configuration `
  --bucket $Bucket `
  --notification-configuration file://.localstack/s3-notification.json
```

### 10.4. Kiểm tra end-to-end

Upload ảnh vào `raw/`, sau đó polling thay vì dùng một thời gian chờ cố định:

```powershell
aws --endpoint-url=$LocalStackEndpoint s3 cp `
  ".\test-data\sample.jpg" `
  "s3://$Bucket/raw/smoke-test/sample.jpg" `
  --content-type "image/jpeg"

$ProcessedKey = "processed/smoke-test/sample.webp"
$Found = $false

1..20 | ForEach-Object {
  if (-not $Found) {
    aws --endpoint-url=$LocalStackEndpoint s3api head-object `
      --bucket $Bucket `
      --key $ProcessedKey 2>$null

    if ($LASTEXITCODE -eq 0) {
      $Found = $true
    } else {
      Start-Sleep -Seconds 1
    }
  }
}

if (-not $Found) {
  throw "Image processor không tạo $ProcessedKey trong thời gian chờ."
}
```

Điều chỉnh tên output theo contract thật của processor. Ngoài việc object tồn tại, test nên kiểm tra:

- File thực sự là WebP/thumbnail mong đợi, không chỉ đổi phần mở rộng.
- Kích thước pixel và dung lượng nằm trong giới hạn.
- `Content-Type` đúng.
- Metadata cần thiết được giữ hoặc loại bỏ đúng yêu cầu.
- Upload lại cùng event không làm hỏng dữ liệu; processor phải idempotent.
- Không có object output nào quay lại `raw/`.
- Số lần invoke không tăng liên tục do event recursion.

Xem log:

```powershell
aws --endpoint-url=$LocalStackEndpoint logs describe-log-groups
docker logs student-market-localstack
```

## 11. CloudFront trên LocalStack

CloudFront hiện có emulator trong LocalStack nhưng theo bảng licensing chính thức không thuộc gói Hobby. API coverage cũng không đầy đủ, nên khả năng chạy phụ thuộc gói LocalStack và Auth Token của team.

Nếu gói hiện tại hỗ trợ CloudFront, có thể tạo distribution local sau khi S3 hoạt động:

```powershell
aws --endpoint-url=$LocalStackEndpoint cloudfront create-distribution `
  --origin-domain-name "$Bucket.s3.amazonaws.com"
```

Local CloudFront dùng domain mô phỏng và có thể cần cấu hình DNS/HTTPS/port 443 riêng. Không lấy kết quả CloudFront local làm release gate duy nhất.

Nếu gói không hỗ trợ CloudFront:

- Test backend tạo đúng `processed/<key>`.
- Test frontend với URL S3 local hoặc URL giả có cùng cấu trúc.
- Test logic ghép `CloudFrontBaseUrl + object key` bằng unit test.
- Sau đó tạo một AWS dev distribution thật và smoke test HTTPS, OAC, bucket policy, cache behavior, CORS và việc S3 URL trực tiếp vẫn private.

Đặc biệt, LocalStack không chứng minh bucket policy OAC production đã đúng. Không public S3 bucket để né bước kiểm tra này.

## 12. Thứ tự test khuyến nghị trước khi deploy

### Tầng 1 — Unit test, không cần LocalStack

- Validation MIME, kích thước, số lượng ảnh.
- Sinh object key an toàn theo user/item.
- Mapping URL processed.
- Authorization: user chỉ thao tác ảnh thuộc item của mình.
- Idempotency của image processor ở mức logic.

Chạy test hiện có:

```powershell
cd "C:\Users\minht\Student Market\student-flea-market-be"
.\scripts\verify.ps1
```

### Tầng 2 — Integration test với LocalStack

- Bucket được tạo tự động từ script/IaC.
- Backend tạo presigned URL dùng được.
- Upload tạo object trong `raw/`.
- S3 event gọi đúng processor.
- Processor tạo đúng object trong `processed/`.
- Không có recursion.
- Dọn và dựng lại môi trường từ đầu vẫn pass.

### Tầng 3 — Smoke test trên AWS dev/staging

- Lambda execution role thật có đúng quyền và không dư quyền rõ ràng.
- API Gateway gọi được API Lambda.
- Lambda kết nối PostgreSQL/RDS qua VPC.
- Secrets Manager/KMS hoạt động.
- S3 CORS hoạt động từ frontend thật.
- CloudFront OAC đọc được `processed/*` nhưng không public `raw/*`.
- DNS, TLS, cache headers và invalidation hoạt động.
- CloudWatch không ghi JWT, secret hoặc presigned URL đầy đủ.

Chỉ deploy production sau khi cả ba tầng đều đạt.

## 13. Dừng và reset môi trường

Dừng container, vẫn giữ dữ liệu trong Docker volume:

```powershell
docker stop student-market-localstack
```

Do container chạy với `--rm`, container sẽ bị xóa sau khi dừng nhưng volume `student-market-localstack-data` vẫn còn và được dùng lại ở lần chạy sau.

Muốn reset hoàn toàn dữ liệu local, trước tiên xác nhận đúng volume:

```powershell
docker volume inspect student-market-localstack-data
docker volume rm student-market-localstack-data
```

Lệnh `docker volume rm` xóa toàn bộ bucket, object, Lambda và tài nguyên LocalStack đã lưu trong volume đó; không thể khôi phục nếu không có bản sao.

## 14. Lỗi thường gặp

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Không kết nối được Docker daemon | Docker Desktop chưa chạy | Mở Docker Desktop, kiểm tra lại `docker version` |
| Container thoát ngay | Auth Token thiếu/sai hoặc image không kích hoạt được | Kiểm tra `docker logs`, khai báo lại token trong terminal |
| `Unable to locate credentials` | Chưa đặt credential giả | Đặt ba biến `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` |
| AWS CLI gọi nhầm AWS thật | Thiếu `--endpoint-url` | Dừng thao tác, luôn dùng `$LocalStackEndpoint` và tên `*-local-*` |
| `localhost.localstack.cloud` không resolve | DNS/proxy của máy chặn wildcard domain | Dùng `http://localhost:4566` cho S3 control/data plane cơ bản |
| Presigned URL trả `403` | Endpoint, host, region hoặc signed header không khớp | Dùng cùng endpoint khi ký và upload; gửi đúng `Content-Type` |
| Lambda không chạy | Thiếu Docker socket mount, package/handler sai | Kiểm tra `docker logs`, function config và gói ZIP |
| Lambda chạy lặp | Notification match cả output | Chỉ filter prefix `raw/`, ghi output vào `processed/` |
| CloudFront API bị từ chối | Gói LocalStack không có CloudFront hoặc token chưa kích hoạt | Bỏ qua emulation và smoke test trên AWS dev |
| Backend vẫn gọi AWS thật | S3 client chưa nhận `ServiceUrl` local | Kiểm tra dependency injection/config và `ForcePathStyle` |

## 15. Definition of Done cho pipeline ảnh local

- [ ] `scripts/verify.ps1` pass.
- [ ] LocalStack khởi động từ một lệnh có thể lặp lại.
- [ ] Không dùng AWS credential thật.
- [ ] Bucket local được tạo từ script/IaC, không phải thao tác tay trên Console.
- [ ] Presigned upload thành công với file hợp lệ.
- [ ] MIME sai, file quá lớn và user không sở hữu bị từ chối.
- [ ] Raw object không public.
- [ ] S3 event chỉ match `raw/`.
- [ ] Processor tạo đúng WebP/thumbnail trong `processed/`.
- [ ] Processor idempotent và không tạo recursion.
- [ ] Integration test có thể chạy lại sau khi reset volume.
- [ ] Các khác biệt IAM/CloudFront/VPC đã được ghi nhận để smoke test trên AWS dev.

## 16. Tài liệu chính thức

- [LocalStack — Installation](https://docs.localstack.cloud/aws/getting-started/installation/)
- [LocalStack — AWS CLI integration](https://docs.localstack.cloud/aws/integrations/aws-native-tools/aws-cli/)
- [LocalStack — S3](https://docs.localstack.cloud/aws/services/s3/)
- [LocalStack — Lambda](https://docs.localstack.cloud/aws/services/lambda/)
- [LocalStack — CloudFront và API coverage](https://docs.localstack.cloud/aws/services/cloudfront/)
- [LocalStack — Licensing](https://docs.localstack.cloud/aws/capabilities/licensing/)
- [AWS — S3 event notification cho Lambda](https://docs.aws.amazon.com/lambda/latest/dg/with-s3.html)

