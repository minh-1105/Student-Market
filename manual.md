# Hướng dẫn chạy và triển khai Student Market

Tài liệu này phản ánh trạng thái hiện tại của project tại ngày 28/10/2026. Backend đang chạy trên .NET 8 và PostgreSQL. Phần chạy local đã sử dụng được; phần triển khai AWS vẫn còn các hạng mục bắt buộc phải hoàn thiện trước khi deploy.

## 1. Trạng thái hiện tại

Backend nằm trong thư mục `student-flea-market-be` và gồm các project:

```text
StudentFleaMarket.API             HTTP API, controllers, middleware
StudentFleaMarket.Application     Contracts, use-case interfaces, validation
StudentFleaMarket.Domain          Entities và enums
StudentFleaMarket.Infrastructure  EF Core, PostgreSQL, Identity, JWT
StudentFleaMarket.Tests           Automated tests
```

Backend hiện có:

- ASP.NET Core 8 Web API.
- PostgreSQL và Entity Framework Core 8.
- ASP.NET Core Identity và JWT bearer authentication.
- Đăng ký và đăng nhập.
- Đọc danh mục.
- Tìm kiếm, phân trang, xem, tạo, sửa và xóa mềm sản phẩm.
- FluentValidation, Problem Details, Serilog, CORS và health check.
- Migration `InitialSchemaAligned` đã khớp EF model.
- 8 bài kiểm thử tự động.

Các entity đã có nhưng chưa có API nghiệp vụ hoàn chỉnh:

- Favorite.
- ExchangeRequest.
- Transaction và Payment.
- Conversation và Message.
- Review và Report.

Các chức năng chưa được triển khai:

- Refresh token và email verification workflow.
- Seed role/category/admin.
- S3 presigned upload.
- Lambda resize/nén ảnh và CloudFront phân phối ảnh processed.
- Secrets Manager bootstrap.
- Lambda hosting adapter.
- PostgreSQL integration test.

## 2. Yêu cầu môi trường local

- Windows PowerShell.
- .NET SDK `8.0.427`. Project đã khóa phiên bản trong `student-flea-market-be/global.json`.
- PostgreSQL đang chạy và truy cập được.
- Git.

Kiểm tra:

```powershell
dotnet --version
psql --version
git --version
```

Kết quả `dotnet --version` trong thư mục backend phải là:

```text
8.0.427
```

## 3. Cấu hình backend

Chuyển vào backend:

```powershell
cd "C:\Users\minht\Student Market\student-flea-market-be"
```

Development mặc định đọc cấu hình từ:

```text
StudentFleaMarket.API/appsettings.Development.json
```

Không commit mật khẩu database hoặc JWT key thật. Nên dùng .NET user secrets:

```powershell
dotnet user-secrets set `
  "ConnectionStrings:DefaultConnection" `
  "Host=localhost;Port=5432;Database=StudentFleaMarketDb;Username=postgres;Password=<mat-khau>" `
  --project StudentFleaMarket.API

dotnet user-secrets set `
  "Jwt:Key" `
  "<chuoi-bi-mat-toi-thieu-32-byte>" `
  --project StudentFleaMarket.API
```

Cấu hình production tương ứng với các environment variable:

```text
ConnectionStrings__DefaultConnection
Jwt__Issuer
Jwt__Audience
Jwt__Key
Jwt__ExpiryMinutes
Cors__AllowedOrigins__0
```

`Jwt__Key` phải có ít nhất 32 byte. Backend sẽ từ chối khởi động nếu connection string hoặc JWT key không hợp lệ.

## 4. Restore, build và test

Project có script kiểm chứng dành cho Windows:

```powershell
.\scripts\verify.ps1
```

Script thực hiện:

1. Restore local tools, bao gồm `dotnet-ef` 8.
2. Restore NuGet packages.
3. Build toàn bộ solution.
4. Chạy automated tests.

Các lệnh tương đương:

```powershell
dotnet tool restore
dotnet msbuild StudentFleaMarket.sln /t:Restore /m:1
dotnet msbuild StudentFleaMarket.sln /t:Build /m:1 /p:Restore=false
dotnet test StudentFleaMarket.Tests\StudentFleaMarket.Tests.csproj `
  --no-build `
  --no-restore
```

Sử dụng `/m:1` vì môi trường Windows hiện tại từng gặp package-assets cache contention khi MSBuild chạy song song.

Kết quả chuẩn hiện tại:

```text
Build: 0 errors
Tests: 8 passed, 0 failed
```

## 5. Tạo database PostgreSQL

Nếu database chưa tồn tại, tạo database rỗng trước:

```powershell
createdb `
  --host localhost `
  --port 5432 `
  --username postgres `
  StudentFleaMarketDb
```

Lệnh sẽ hỏi password của PostgreSQL. Nếu `createdb` không nằm trong `PATH`, có thể tạo database `StudentFleaMarketDb` bằng pgAdmin.

Migration hiện tại dành cho database mới:

```text
StudentFleaMarket.Infrastructure/Persistence/Migrations/
20261027151631_InitialSchemaAligned.cs
```

Kiểm tra model có lệch migration không:

```powershell
dotnet ef migrations has-pending-model-changes `
  --project StudentFleaMarket.Infrastructure `
  --startup-project StudentFleaMarket.API
```

Áp dụng migration:

```powershell
dotnet ef database update `
  --project StudentFleaMarket.Infrastructure `
  --startup-project StudentFleaMarket.API
```

Liệt kê migration đã áp dụng:

```powershell
dotnet ef migrations list `
  --project StudentFleaMarket.Infrastructure `
  --startup-project StudentFleaMarket.API
```

Lưu ý:

- Chưa áp dụng migration lên PostgreSQL trong quá trình cập nhật tài liệu này.
- Migration `InitialSchemaAligned` phù hợp nhất với database mới.
- Nếu database đã áp dụng migration cũ, không xóa database hoặc chạy migration mới một cách mù quáng. Cần sao lưu và tạo migration chuyển đổi dữ liệu riêng.
- Dữ liệu PostgreSQL không nằm trong repository. Dữ liệu nằm trong PostgreSQL data directory hoặc Docker volume tùy cách cài đặt.

## 6. Chạy API local

```powershell
dotnet run --project StudentFleaMarket.API
```

Profile HTTP mặc định:

```text
http://localhost:5033
```

Kiểm tra health:

```powershell
Invoke-RestMethod http://localhost:5033/health
```

Kết quả mong đợi:

```text
Healthy
```

Swagger được bật trong môi trường Development. Truy cập:

```text
http://localhost:5033/swagger
```

Swagger hiện chưa khai báo JWT security scheme, vì vậy phù hợp để xem schema và thử endpoint public. Với endpoint cần JWT, dùng PowerShell hoặc file `.http` dưới đây.

Request mẫu nằm tại:

```text
StudentFleaMarket.API/StudentFleaMarket.API.http
```

## 7. API hiện có

| Method | Endpoint | Xác thực | Mục đích |
|---|---|---|---|
| `GET` | `/health` | Không | Kiểm tra process API |
| `POST` | `/api/auth/register` | Không | Đăng ký tài khoản |
| `POST` | `/api/auth/login` | Không | Đăng nhập và nhận JWT |
| `GET` | `/api/categories` | Không | Lấy danh mục |
| `GET` | `/api/items` | Không | Tìm kiếm và phân trang sản phẩm |
| `GET` | `/api/items/{id}` | Không | Xem chi tiết sản phẩm |
| `POST` | `/api/items` | JWT | Tạo sản phẩm |
| `PUT` | `/api/items/{id}` | JWT, chủ sản phẩm | Cập nhật sản phẩm |
| `DELETE` | `/api/items/{id}` | JWT, chủ sản phẩm | Xóa mềm sản phẩm |

Endpoint `/weatherforecast` không còn tồn tại.

## 8. Chạy và dùng thử feature cơ bản

Các lệnh trong mục này giả định:

- PostgreSQL đang chạy và migration đã được áp dụng.
- API đang chạy tại `http://localhost:5033` trong một terminal riêng.
- PowerShell hiện tại đang ở thư mục `student-flea-market-be`.

Khai báo base URL dùng chung:

```powershell
$BaseUrl = "http://localhost:5033"
```

### 8.1. Kiểm tra API

```powershell
Invoke-RestMethod "$BaseUrl/health"
```

Kết quả mong đợi:

```text
Healthy
```

### 8.2. Tạo category mẫu

Project chưa có seed data hoặc endpoint tạo category. Trước khi tạo sản phẩm, thêm ít nhất một category vào PostgreSQL:

```powershell
@'
INSERT INTO "Categories" ("Name", "Slug", "Description", "Order", "CreatedAt")
VALUES ('Books', 'books', 'Textbooks and learning materials', 1, NOW())
ON CONFLICT ("Slug") DO NOTHING;
'@ | psql `
  --host localhost `
  --port 5432 `
  --username postgres `
  --dbname StudentFleaMarketDb
```

Kiểm tra category qua API:

```powershell
$CategoryResult = Invoke-RestMethod "$BaseUrl/api/categories"
$CategoryResult.data | Format-Table id, name, slug, order
$CategoryId = $CategoryResult.data[0].id
```

Không tiếp tục nếu `$CategoryId` rỗng, vì `POST /api/items` sẽ trả `404 Category was not found`.

### 8.3. Đăng ký tài khoản

Đăng ký:

```powershell
$RegisterBody = @{
  fullName = "Sinh viên Demo"
  email = "student@example.com"
  password = "StrongPass1"
  schoolName = "Demo University"
  studentCode = "S001"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "$BaseUrl/api/auth/register" `
  -ContentType "application/json" `
  -Body $RegisterBody
```

Nếu email đã tồn tại, API trả `409 Conflict`. Có thể bỏ qua bước đăng ký và đăng nhập bằng tài khoản cũ, hoặc đổi email/student code mẫu.

### 8.4. Đăng nhập và lấy JWT

Đăng nhập:

```powershell
$LoginBody = @{
  email = "student@example.com"
  password = "StrongPass1"
} | ConvertTo-Json

$LoginResult = Invoke-RestMethod `
  -Method Post `
  -Uri "$BaseUrl/api/auth/login" `
  -ContentType "application/json" `
  -Body $LoginBody

$AccessToken = $LoginResult.data.accessToken
$Headers = @{ Authorization = "Bearer $AccessToken" }
```

Kiểm tra token đã nhận:

```powershell
$LoginResult.data | Select-Object userId, fullName, email, expiresAtUtc
```

Không in hoặc lưu `$AccessToken` vào log, tài liệu hay Git.

### 8.5. Tạo sản phẩm

```powershell
$CreateItemBody = @{
  categoryId = $CategoryId
  title = "Used ASP.NET Core textbook"
  description = "Used for one semester, still in good condition"
  price = 50000
  condition = 3
  isExchangeEnabled = $true
  location = "Campus A"
  imageUrls = @()
} | ConvertTo-Json

$CreatedItem = Invoke-RestMethod `
  -Method Post `
  -Uri "$BaseUrl/api/items" `
  -Headers $Headers `
  -ContentType "application/json" `
  -Body $CreateItemBody

$ItemId = $CreatedItem.data.id
$CreatedItem.data
```

`condition` nhận giá trị từ `1` đến `5`. Upload S3 chưa được triển khai, vì vậy ví dụ để `imageUrls` rỗng. Nếu truyền ảnh, URL phải là HTTP hoặc HTTPS hợp lệ.

### 8.6. Xem, tìm kiếm và phân trang sản phẩm

Các endpoint đọc sản phẩm không cần JWT:

```powershell
# Xem chi tiết sản phẩm vừa tạo
Invoke-RestMethod "$BaseUrl/api/items/$ItemId"

# Danh sách trang đầu
$Items = Invoke-RestMethod "$BaseUrl/api/items?page=1&pageSize=20"
$Items.data.items | Format-Table id, title, price, sellerName, categoryName

# Tìm theo tiêu đề và category
Invoke-RestMethod `
  "$BaseUrl/api/items?search=ASP.NET&categoryId=$CategoryId&page=1&pageSize=20"
```

Response danh sách nằm trong `data.items`; metadata phân trang gồm `page`, `pageSize`, `totalCount` và `totalPages`.

### 8.7. Cập nhật sản phẩm

Endpoint update nhận toàn bộ dữ liệu sản phẩm, không phải partial update:

```powershell
$UpdateItemBody = @{
  categoryId = $CategoryId
  title = "Used ASP.NET Core textbook - updated"
  description = "Updated description"
  price = 45000
  condition = 4
  isExchangeEnabled = $false
  location = "Campus B"
  status = 1
  imageUrls = @()
} | ConvertTo-Json

$UpdatedItem = Invoke-RestMethod `
  -Method Put `
  -Uri "$BaseUrl/api/items/$ItemId" `
  -Headers $Headers `
  -ContentType "application/json" `
  -Body $UpdateItemBody

$UpdatedItem.data
```

`status` nhận giá trị từ `1` đến `4`. Chỉ tài khoản tạo sản phẩm mới có thể update; tài khoản khác sẽ nhận `403 Forbidden`.

### 8.8. Xóa mềm sản phẩm

```powershell
Invoke-RestMethod `
  -Method Delete `
  -Uri "$BaseUrl/api/items/$ItemId" `
  -Headers $Headers
```

API trả `204 No Content`. Sau khi xóa mềm, endpoint chi tiết trả `404` và sản phẩm không còn xuất hiện trong danh sách:

```powershell
try {
  Invoke-RestMethod "$BaseUrl/api/items/$ItemId"
} catch {
  $_.Exception.Response.StatusCode.value__
}
```

Kết quả mong đợi là `404`.

### 8.9. Dùng file `.http`

Mở file:

```text
StudentFleaMarket.API/StudentFleaMarket.API.http
```

Chạy request register/login, sao chép `data.accessToken` từ response đăng nhập và thay:

```text
@token = replace-with-access-token
```

Sau đó chạy request tạo sản phẩm. Category ID trong request phải tồn tại trong database.

### 8.10. Response và lỗi thường gặp khi dùng thử

Response thành công thường có dạng:

```json
{
  "data": {},
  "message": "Item created."
}
```

Lỗi validation và nghiệp vụ dùng `ProblemDetails`, kèm `status`, `title`, `detail`, `traceId` và có thể có `errors`.

| HTTP status | Trường hợp phổ biến |
|---|---|
| `400` | Dữ liệu không hợp lệ, password yếu, giá âm hoặc URL ảnh sai |
| `401` | Thiếu/sai JWT hoặc đăng nhập sai |
| `403` | Tài khoản inactive hoặc sửa/xóa sản phẩm của người khác |
| `404` | Không tìm thấy category hoặc sản phẩm |
| `409` | Email đã được đăng ký |

## 9. Quy trình thay đổi schema

Sau khi sửa entity hoặc `AppDbContext`:

```powershell
dotnet msbuild StudentFleaMarket.sln /t:Build /m:1 /p:Restore=false

dotnet ef migrations add <TenMigration> `
  --project StudentFleaMarket.Infrastructure `
  --startup-project StudentFleaMarket.API `
  --output-dir Persistence\Migrations

dotnet ef migrations has-pending-model-changes `
  --project StudentFleaMarket.Infrastructure `
  --startup-project StudentFleaMarket.API
```

Trước khi commit migration:

- Đọc file `Up` và `Down`.
- Kiểm tra kiểu dữ liệu, nullability, khóa ngoại, index và delete behavior.
- Chạy `scripts/verify.ps1`.
- Không chỉnh snapshot thủ công trừ khi đã hiểu rõ hậu quả.
- Không xóa migration đã được áp dụng ở môi trường dùng chung.

## 10. Trạng thái triển khai AWS

Backend chưa sẵn sàng để deploy lên AWS Lambda. Không sử dụng các lệnh Lambda cũ trong lịch sử tài liệu.

Các blocker hiện tại:

- Chưa cài `Amazon.Lambda.AspNetCoreServer.Hosting`.
- Chưa gọi `AddAWSLambdaHosting(...)` trong `Program.cs`.
- Chưa cài và tích hợp `AWSSDK.SecretsManager`.
- Runtime hiện đọc trực tiếp `Jwt__Key`, chưa đọc secret ARN từ Secrets Manager.
- Chưa có service tạo S3 presigned URL dù project có package `AWSSDK.S3`.
- Chưa có image-processor Lambda, S3 event notification hoặc CloudFront distribution/OAC.
- Backend bắt buộc cần PostgreSQL nhưng bộ quyền AWS được mô tả hiện tại không có quyền tạo/quản lý RDS hoặc VPC.
- Chưa có Lambda execution role được kiểm chứng.
- Chưa có cấu hình VPC/security group để Lambda truy cập PostgreSQL private.
- Chưa có integration test trên hạ tầng AWS.

Vì vậy, chỉ triển khai AWS sau khi hoàn thành checklist ở mục 13.

## 11. Phạm vi quyền AWS hiện có

Các managed policy đã được cung cấp:

- `AmazonAPIGatewayAdministrator`
- `AmazonS3FullAccess`
- `AWSLambda_FullAccess`
- `CloudWatchFullAccess`
- `SecretsManagerReadWrite`

Các quyền này cho phép quản lý API Gateway, Lambda, S3, CloudWatch và Secrets Manager ở mức rộng, nhưng không tự động cung cấp:

- Quyền tạo IAM role.
- Lambda execution role đúng least privilege.
- RDS PostgreSQL.
- VPC, subnet và security group.
- Quyền runtime để Lambda đọc secret hoặc truy cập bucket.
- Quyền tạo/quản lý CloudFront distribution, Origin Access Control hoặc invalidation.

CloudFront là thành phần bắt buộc của pipeline ảnh mục tiêu. Nếu account chưa có quyền CloudFront, administrator phải cấp quyền giới hạn cho distribution/OAC của Student Market; không thay thế bằng cách public S3 bucket.

Không gắn toàn bộ năm managed policy vào Lambda execution role. Execution role chỉ nên có đúng quyền runtime cần thiết.

## 12. Kiến trúc AWS dự kiến

```text
Frontend
    | HTTPS/JSON + JWT
API Gateway HTTP API
    |
Lambda ASP.NET Core 8
    |-- PostgreSQL/RDS trong VPC
    |-- tạo presigned upload cho S3 raw/*
    |-- Secrets Manager cho JWT và database secret
    `-- CloudWatch Logs

Frontend -- presigned PUT/POST --> S3 private bucket/raw/*
                                      |
                                      | ObjectCreated event
                                      v
                              Lambda image processor
                                      |
                                      | resize/nén/WebP
                                      v
                              S3 private bucket/processed/*
                                      |
                                      | private origin + OAC
                                      v
                                  CloudFront CDN
```

Yêu cầu bổ sung:

- PostgreSQL/RDS phải tồn tại và Lambda phải có network route tới database.
- Execution role cần quyền ghi CloudWatch Logs.
- Nếu dùng S3 upload, role chỉ được truy cập đúng bucket/prefix của project.
- API Lambda và image-processor Lambda dùng execution role riêng; processor chỉ đọc `raw/*`, ghi `processed/*` và ghi log.
- S3 event chỉ match `raw/` để output trong `processed/` không kích hoạt Lambda lặp vô hạn.
- CloudFront dùng S3 REST endpoint và OAC; bucket policy chỉ cho đúng distribution ARN đọc `processed/*`.
- Raw upload không được public hoặc phân phối qua CloudFront.
- Nếu dùng Secrets Manager, role chỉ được đọc đúng secret ARN cần thiết.
- API Gateway và S3 CORS chỉ cho phép frontend origin thực tế.
- Không lưu record ứng dụng trong Secrets Manager hoặc file JSON trên S3.

## 13. Checklist trước khi deploy AWS

### Thay đổi code bắt buộc

- [ ] Thêm Lambda hosting adapter tương thích .NET 8.
- [ ] Điều kiện hóa `UseHttpsRedirection()` cho môi trường Lambda nếu cần.
- [ ] Thêm Secrets Manager configuration provider hoặc bootstrap code.
- [ ] Thêm S3 presigned upload service và kiểm tra quyền sở hữu sản phẩm.
- [ ] Validate MIME, kích thước, số ảnh và sinh object key ở backend; không nhận key tùy ý từ client.
- [ ] Thêm image-processor Lambda để kiểm tra nội dung thật, resize, nén và tạo WebP/thumbnail.
- [ ] Bảo đảm processor idempotent và không trigger lại trên output `processed/`.
- [ ] Trả URL ảnh dựa trên `CloudFrontBaseUrl` + object key; không lưu presigned URL vào database.
- [ ] Không log JWT, password, database secret hoặc presigned URL đầy đủ.

### Hạ tầng bắt buộc

- [ ] Có PostgreSQL/RDS và migration strategy.
- [ ] Có VPC, subnet và security group phù hợp.
- [ ] Có Lambda execution role theo least privilege.
- [ ] Có private S3 image bucket với public access bị chặn.
- [ ] Có lifecycle cho multipart upload dở, raw file và ảnh orphan.
- [ ] Có S3 notification chỉ cho prefix `raw/` và permission gọi đúng image-processor Lambda.
- [ ] Có image-processor execution role theo least privilege.
- [ ] Có CloudFront distribution dùng OAC và private S3 REST origin.
- [ ] Bucket policy giới hạn quyền đọc `processed/*` bằng `AWS:SourceArn` của đúng distribution.
- [ ] Có quyền deploy CloudFront/OAC; nếu thiếu phải được administrator cấp trước.
- [ ] Có Secrets Manager secret và KMS policy phù hợp.
- [ ] Có API Gateway HTTP API và Lambda invoke permission giới hạn bằng source ARN.
- [ ] Có CloudWatch log retention.

### Kiểm chứng bắt buộc

- [ ] `scripts/verify.ps1` chạy thành công.
- [ ] Migration được thử trên database staging mới.
- [ ] `/health` trả `200` qua API Gateway.
- [ ] Register/login/JWT hoạt động qua API Gateway.
- [ ] CRUD sản phẩm hoạt động với PostgreSQL staging.
- [ ] Upload ảnh hoạt động mà bucket vẫn private.
- [ ] Lambda tạo được WebP/thumbnail và không có event recursion.
- [ ] Ảnh processed trả `200` qua CloudFront HTTPS; raw object và S3 URL trực tiếp không public.
- [ ] User không thể presign/upload vào sản phẩm hoặc prefix của user khác.
- [ ] CloudWatch không chứa dữ liệu nhạy cảm.

## 14. Frontend

Frontend nằm trong `student-flea-market-fe` và phải đọc API base URL từ biến môi trường phù hợp của frontend.

Không giả định frontend đã hỗ trợ static export. Trước khi đưa lên S3 phải xác nhận:

- Build sinh thư mục static output.
- Không phụ thuộc SSR, API routes hoặc middleware phía server.
- Có chiến lược HTTPS và routing fallback.
- CORS backend/S3 khớp đúng frontend origin.
- URL ảnh sản phẩm dùng CloudFront base URL từ biến môi trường/configuration, không hard-code domain.

Nếu frontend được static export lên S3, đặt CloudFront phía trước để có HTTPS và giữ bucket private. S3 website endpoint chỉ nên dùng cho demo nội bộ; bucket ảnh luôn dùng S3 REST origin với OAC.

## 15. Lỗi thường gặp

| Hiện tượng | Nguyên nhân có thể | Cách xử lý |
|---|---|---|
| API không khởi động | Thiếu connection string hoặc JWT key ngắn hơn 32 byte | Kiểm tra user secrets/environment variables |
| `database update` thất bại | PostgreSQL chưa chạy, sai password hoặc database không truy cập được | Kiểm tra connection string và PostgreSQL service |
| `relation does not exist` | Chưa áp dụng migration | Chạy `dotnet ef database update` |
| `401 Unauthorized` | Thiếu JWT, token hết hạn hoặc issuer/audience sai | Đăng nhập lại và kiểm tra cấu hình JWT |
| `403 Forbidden` | User không phải chủ sản phẩm hoặc account inactive | Kiểm tra claim user và quyền sở hữu |
| Build thất bại nhưng không có error rõ ràng | MSBuild package-assets cache contention | Dùng `scripts/verify.ps1` hoặc `/m:1` |
| API HTTP cảnh báo HTTPS port | Chạy profile chỉ có HTTP trong Development | Dùng profile HTTPS hoặc bỏ redirect ở môi trường phù hợp |
| Lambda trả `500` | Adapter/config/secret/database network chưa hoàn chỉnh | Không deploy trước khi hoàn thành checklist AWS |
| Upload S3 trả `403` | URL hết hạn hoặc `Content-Type`/header không khớp chữ ký | Xin URL mới và gửi đúng các header backend trả về |
| Image processor chạy lặp | S3 event match cả prefix output | Chỉ trigger `raw/`, ghi kết quả vào `processed/` |
| CloudFront trả `403` | OAC/bucket policy/origin path sai hoặc object chưa tồn tại | Kiểm tra distribution ARN, bucket policy, origin và processed key |

## 16. Quy tắc an toàn

- Không commit access key, database password, JWT key hoặc secret value.
- Không dùng AWS root user để triển khai.
- Không chạy migration phá hủy dữ liệu production nếu chưa sao lưu và review SQL.
- Không xóa bucket, database, Lambda hoặc secret chỉ để thử quy trình.
- Không dùng S3 hay Secrets Manager thay cho transactional database.
- Không public bucket để xử lý lỗi CloudFront; sửa OAC và bucket policy theo đúng distribution.
- Luôn kiểm tra đúng AWS account, Region và resource name trước thao tác thay đổi hạ tầng.

## 17. Tài liệu liên quan trong repository

- `README.md`: tổng quan repository.
- `database-schema.md`: schema chuẩn.
- `worklog.md`: nhật ký kỹ thuật.
- `worklog-vi.md`: nhật ký tiếng Việt.
- `AWSsetup.md`: ghi chú thiết lập AWS bổ sung.
- `localstack-guide-vi.md`: hướng dẫn chạy LocalStack và kiểm thử S3/Lambda trước khi deploy AWS.
- `student-flea-market-be/README.md`: hướng dẫn riêng cho backend.
- `student-flea-market-be/StudentFleaMarket.API/StudentFleaMarket.API.http`: request API mẫu.

## 18. Tài liệu AWS chính thức

- [AWS Lambda execution role](https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html)
- [Deploy ASP.NET Core applications to Lambda](https://docs.aws.amazon.com/lambda/latest/dg/csharp-package-asp.html)
- [API Gateway HTTP API với Lambda](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html)
- [S3 presigned URL](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
- [Upload object bằng S3 presigned URL](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [S3 trigger cho Lambda](https://docs.aws.amazon.com/lambda/latest/dg/with-s3-tutorial.html)
- [CloudFront Origin Access Control cho S3](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
- [AWS Secrets Manager với .NET](https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieving-secrets-net-sdk.html)
- [Lambda kết nối RDS](https://docs.aws.amazon.com/lambda/latest/dg/services-rds.html)
