# Nhật ký công việc

## 2026-10-27 - Xây dựng nền tảng backend .NET 8

Repository: `student-flea-market-be`  
Branch làm việc: `main`  
Commit nền đã đồng bộ: `origin/main` tại `4a7d5bb`

### Công việc đã hoàn thành

- Làm sạch trạng thái Git của backend. Trạng thái cũ gồm `.gitignore` và `README.md` bị xóa đã được bảo toàn trong stash `WIP before backend implementation 2026-10-27`.
- Fetch trạng thái remote, phát hiện branch `origin/aws-tien` đã bị xóa và chuyển sang `main` chứa ERD v2.1 mới nhất.
- Cài đặt .NET SDK `8.0.427` và khóa phiên bản bằng `global.json`.
- Thay solution `.slnx` bằng `StudentFleaMarket.sln` tương thích với .NET 8.
- Kết nối API với Application và Infrastructure qua dependency injection.
- Cấu hình PostgreSQL, Entity Framework Core và ASP.NET Core Identity.
- Cấu hình đăng ký, đăng nhập và xác thực JWT.
- Thêm FluentValidation, global exception middleware, Problem Details, Serilog, CORS và health check.
- Thêm API cho đăng ký, đăng nhập, danh mục và CRUD sản phẩm.
- Thêm project kiểm thử xUnit và script `scripts/verify.ps1`.

## 2026-10-27 - Chuẩn hóa cơ sở dữ liệu

Tài liệu chuẩn được sử dụng: `database-schema.md`.

### Các vấn đề đã phát hiện

- Bảng người dùng chưa thể hiện đúng tên `IsEmailVerified`; email, mật khẩu băm và `UpdatedAt` chưa có ràng buộc null phù hợp ở tầng cơ sở dữ liệu.
- `Category` thiếu thời điểm tạo `CreatedAt`.
- `ExchangeRequest.OfferedItemId` và `AdditionalAmount` chưa cho phép null, đồng thời thiếu `ExpiresAt`.
- `Transaction` sử dụng `InitiatorId`, `CounterpartyId`, `Amount`, `Type` thay vì `BuyerId`, `SellerId`, `TotalAmount`, `Method`.
- `Payment.Amount` dùng `decimal` thay vì số nguyên theo đơn vị tiền nhỏ nhất; thiếu `PaymentUrl`.
- `Message` thiếu `BuyerId`.
- Quan hệ Transaction–Review chỉ cho phép một đánh giá cho mỗi giao dịch, khiến hai bên không thể đánh giá lẫn nhau.
- Một số index và check constraint phục vụ truy vấn và bảo vệ tính toàn vẹn dữ liệu còn thiếu.

### Các thay đổi đã thực hiện

- Chuẩn hóa bảng `Users` trên ASP.NET Core Identity; ánh xạ `EmailConfirmed` thành cột `IsEmailVerified`.
- Đặt email và mật khẩu băm là bắt buộc, đồng thời tạo unique index cho email đã chuẩn hóa.
- Thêm `Category.CreatedAt`.
- Sửa nullability của yêu cầu trao đổi, thêm ngày hết hạn và các ràng buộc số tiền/mặt hàng trao đổi.
- Chuẩn hóa các trường giao dịch theo tài liệu.
- Thêm ràng buộc người mua khác người bán và tổng tiền không âm.
- Đổi số tiền thanh toán sang `int`, thêm `PaymentUrl` và các index cần thiết.
- Thêm `BuyerId` và index truy vấn cho tin nhắn.
- Chuyển quan hệ Transaction–Review thành một-nhiều.
- Ngăn tự đánh giá và ngăn đánh giá trùng cùng cặp người dùng trong một giao dịch.
- Thêm ràng buộc báo cáo phải có ít nhất một đối tượng bị báo cáo.
- Bổ sung index theo trạng thái, thời gian tạo, thời gian hết hạn và trạng thái đã đọc.
- Thay migration cũ bằng migration mới `InitialSchemaAligned`.
- Thêm bốn bài kiểm thử EF metadata để phát hiện schema bị lệch trong tương lai.

### Kết quả kiểm chứng

- Build .NET 8 thành công, không có lỗi biên dịch.
- Tổng cộng 8/8 bài kiểm thử đã vượt qua.
- EF Core xác nhận model hiện tại khớp migration, không có thay đổi đang chờ tạo migration.
- `git diff --check` không phát hiện lỗi whitespace.
- Migration mới chưa được áp dụng vào PostgreSQL thực tế.

### Các phần mở rộng được giữ lại

- Các bảng kỹ thuật của ASP.NET Core Identity phục vụ đăng nhập và phân quyền.
- `Conversation` và `ItemImage`, vì tài liệu cho phép sử dụng mô hình hội thoại đã tồn tại trong dự án.
- Giá sản phẩm, hình ảnh, xóa mềm, thứ tự danh mục và người xử lý báo cáo để không làm mất chức năng hiện có.
- Database hiện là mô hình mở rộng tương thích với schema, không phải bản sao tối giản loại bỏ mọi trường bổ sung.

### Bước tiếp theo

- Xác nhận PostgreSQL đang chạy và thông tin kết nối chính xác.
- Áp dụng migration `InitialSchemaAligned` lên database mới.
- Seed role và category mặc định.
- Bổ sung integration test cho PostgreSQL, khóa ngoại, unique index và delete behavior.
- Tiếp tục triển khai Favorite, ExchangeRequest, Transaction, Payment, Message, Review và Report ở tầng API.

## 2026-10-28 - Cloud Media Upload

### Mục tiêu

Xây dựng luồng upload ảnh sản phẩm trực tiếp từ frontend lên Amazon S3 bằng presigned URL. Sau khi upload, AWS Lambda tự động kiểm tra, nén, chuyển WebP và tạo thumbnail; ảnh đã xử lý được phân phối qua Amazon CloudFront trong khi S3 bucket vẫn private.

```text
Frontend → Backend .NET cấp presigned URL → S3 raw/*
                                              │ S3 ObjectCreated
                                              ▼
                                     Lambda image processor
                                              │ resize/nén/WebP
                                              ▼
                                         S3 processed/*
                                              │ OAC
                                              ▼
                                         CloudFront CDN
```

### Công việc đã hoàn thành hôm nay

- Cập nhật `AWSsetup.md` để đưa CloudFront vào phạm vi AWS hiện có, bổ sung kiến trúc S3 → Lambda → CloudFront và yêu cầu Origin Access Control.
- Cập nhật `manual.md` với checklist triển khai, kiểm chứng, bảo mật và xử lý lỗi cho presigned upload, image processor và CloudFront.
- Kiểm tra AWS CLI `2.36.49`, profile `default`, Region `ap-southeast-1` và xác nhận principal triển khai hiện tại hoạt động đúng account.
- Tách runtime policy template của API Lambda và image-processor Lambda trong `aws/iam`.
- Cập nhật deployer policy để chỉ quản lý và `iam:PassRole` cho đúng hai role/function của Student Market.
- Tạo IAM role `student-market-dev-api-role` trên AWS.
- Gắn inline policy `student-market-dev-api-runtime` cho API role, gồm quyền CloudWatch Logs, VPC ENI và `s3:PutObject` vào `raw/*` để tạo presigned upload.
- Tạo IAM role `student-market-dev-image-processor-role` trên AWS.
- Gắn inline policy `student-market-dev-image-processor-runtime`, chỉ cho phép ghi CloudWatch Logs, đọc `raw/*` và ghi `processed/*`.
- Xác nhận cả hai role có trust policy chỉ cho `lambda.amazonaws.com` assume và có ARN riêng biệt.
- Xác nhận không có managed policy rộng như `AmazonS3FullAccess` hoặc `CloudFrontFullAccess` được gắn vào runtime role.
- Kiểm tra toàn bộ trust/runtime/deployer policy template hợp lệ về cú pháp JSON.
- Cấu hình `.gitignore` để các file `aws/iam/*.generated.json` chứa account/resource thực tế không được commit.

### Kết quả và phần còn lại

- Phần IAM nền tảng cho hai Lambda đã hoàn thành.
- API Lambda và image-processor Lambda chưa được deploy nên chưa thể kiểm tra function-to-role binding.
- Private S3 image bucket, S3 event notification, Lambda xử lý ảnh và CloudFront distribution/OAC chưa được tạo.
- API role chưa có quyền đọc database secret vì RDS/managed secret chưa tồn tại; quyền này sẽ được thêm bằng ARN cụ thể sau khi tạo RDS.

### Tài liệu và quyền AWS

- [x] Cập nhật `AWSsetup.md` với `CloudFrontFullAccess`, kiến trúc CloudFront/OAC và pipeline xử lý ảnh.
- [x] Cập nhật `manual.md` với checklist triển khai, kiểm chứng và xử lý lỗi CloudFront.
- [x] Xác nhận `CloudFrontFullAccess`, quyền S3/Lambda và `iam:PassRole` hoạt động trong đúng AWS account/Region.
- [x] Xác nhận có execution role riêng cho API Lambda và image-processor Lambda.
- [x] Tách runtime policy template cho `student-market-dev-api-role` và `student-market-dev-image-processor-role` trong repository.
- [x] Giới hạn API role ở VPC/secret/log/presigned `raw/*`; giới hạn processor role ở log, đọc `raw/*` và ghi `processed/*`.
- [x] Mở rộng deployer policy để chỉ quản lý và pass đúng hai role/function của dự án.
- [x] Tạo `student-market-dev-api-role` và gắn inline policy `student-market-dev-api-runtime` trên AWS.
- [x] Tạo `student-market-dev-image-processor-role` và gắn inline policy `student-market-dev-image-processor-runtime` trên AWS.
- [x] Không gắn `AmazonS3FullAccess`, `CloudFrontFullAccess` hoặc các policy deployer rộng vào Lambda runtime role; cả hai role không có managed policy đính kèm.

### Backend .NET - Presigned upload

- [x] Thêm contracts cho request/response tạo presigned upload trong tầng Application.
- [x] Thêm FluentValidation cho MIME, kích thước file và dữ liệu upload.
- [x] Chỉ cho phép JPEG, PNG hoặc WebP; giới hạn dung lượng và số ảnh trên mỗi sản phẩm.
- [x] Thêm `IMediaUploadService` và implementation S3 trong Infrastructure.
- [x] Chuyển/thêm package AWS SDK S3 vào đúng project Infrastructure và đăng ký dependency injection.
- [x] Thêm cấu hình `MediaStorage` gồm bucket, Region, thời hạn URL, giới hạn file và CloudFront base URL.
- [x] Thêm endpoint có JWT, ví dụ `POST /api/items/{itemId}/images/presign`.
- [x] Kiểm tra sản phẩm tồn tại, tài khoản đang hoạt động và user hiện tại là chủ sản phẩm.
- [x] Backend tự sinh object key `raw/users/{userId}/items/{itemId}/{uploadId}.{ext}`; không nhận key tùy ý từ client.
- [x] Presigned URL chỉ có hiệu lực ngắn và ký đúng `Content-Type`/header bắt buộc.
- [x] Không log presigned URL đầy đủ, JWT, credential hoặc dữ liệu ảnh.
- [x] Bổ sung unit test cho validation, ownership, key generation và thời hạn URL.

#### Kết quả triển khai Backend .NET

- Thêm batch contract `PresignItemImagesRequest` và response chứa URL S3, HTTP method, signed form fields, object key, upload ID, kích thước yêu cầu, thời điểm hết hạn và CloudFront processed base URL khi đã cấu hình.
- Endpoint `POST /api/items/{id}/images/presign` yêu cầu JWT; chỉ tài khoản active và đúng seller của item chưa bị xóa mới được cấp quyền upload.
- Validation chặn request rỗng, path traversal trong tên file, MIME/đuôi file không khớp, file rỗng, file vượt giới hạn và batch vượt số ảnh cho phép.
- Backend tự tạo UUID và object key dưới `raw/users/{userId}/items/{itemId}/`; client không thể truyền bucket hoặc key tùy ý.
- Dùng S3 presigned POST thay cho upload xuyên API. Signed POST policy cố định object key, `Content-Type`, đúng kích thước file đã khai báo và thời hạn ngắn; không cấp ACL public.
- Chuyển `AWSSDK.S3` từ project API sang Infrastructure, đăng ký `IAmazonS3` bằng AWS default credential chain/Lambda execution role và không lưu access key trong cấu hình.
- Thêm cấu hình `MediaStorage` mặc định: Region `ap-southeast-1`, URL hết hạn sau 10 phút, tối đa 10 MiB/file và 8 ảnh/item; bucket/CloudFront có thể override bằng environment variables.
- Cập nhật README và file HTTP mẫu để frontend biết cách gọi endpoint và submit toàn bộ signed fields bằng `FormData` trực tiếp tới S3.
- Thêm 12 test cho metadata hợp lệ/không hợp lệ, số lượng ảnh, ownership, trạng thái tài khoản, item không tồn tại, sinh key và tính thời hạn.
- Chạy `student-flea-market-be/scripts/verify.ps1`: restore/build thành công; 20/20 test vượt qua, 0 test lỗi.
- `git diff --check` không phát hiện lỗi whitespace; kiểm tra format trên toàn bộ file đã thêm/sửa cho tính năng này đã vượt qua.
- Chưa smoke test upload thật end-to-end vì S3 event notification, image-processor Lambda và CloudFront chưa được tạo; môi trường development đang được chuyển sang LocalStack.

### Amazon S3

- [x] Đã xóa bucket AWS thật `student-market-dev-images-<OLD_AWS_ACCOUNT_ID>` tại `ap-southeast-1` sau khi xác nhận không có object, version hoặc delete marker; kiểm tra lại trả `404 Not Found`.
- [x] Chốt prefix `raw/` cho ảnh upload và `processed/` cho ảnh đã xử lý; không tạo placeholder object để tránh kích hoạt event ngoài ý muốn.
- [x] Cấu hình CORS dev chỉ cho `http://localhost:3000` và `http://localhost:5173`, method `POST`, header upload cần thiết và expose `ETag`.
- [ ] Thêm lifecycle xóa multipart upload dở, raw file và ảnh orphan theo thời hạn đã thống nhất.
- [ ] Cấu hình S3 `ObjectCreated` notification chỉ match prefix `raw/`.
- [ ] Cấp quyền cho S3 gọi đúng image-processor Lambda.

#### Kết quả thiết lập S3 AWS trước khi chuyển local

- Bucket dùng `BucketOwnerEnforced`, ACL bị vô hiệu hóa và policy status xác nhận `IsPublic: false`.
- Bật mã hóa mặc định SSE-S3 (`AES256`) và bucket policy từ chối mọi request không dùng TLS.
- Smoke test ghi/đọc metadata object dưới `raw/` thành công, xác nhận object được mã hóa `AES256`; object kiểm thử đã được xóa sau khi xác minh.
- Lifecycle đã hủy incomplete multipart upload sau 7 ngày. Chưa tự xóa `raw/` hoặc ảnh orphan vì image processor chưa được deploy và chưa chốt retention.
- Gắn tag `Project=StudentMarket`, `Environment=dev`, `ManagedBy=aws-cli`.
- Đồng bộ `MediaStorage:BucketName` của backend sang tên bucket có hậu tố AWS account; Region giữ `ap-southeast-1`.
- Thêm cấu hình tái sử dụng trong `aws/s3/`: CORS, lifecycle, TLS bucket policy và README vận hành.
- Chưa bật CloudTrail S3 data events, server access logging hoặc CloudWatch request metrics cho dev vì các tính năng này phát sinh chi phí log/storage/metrics; cần bật khi có log destination chung.
- Khởi động lại API: `/health` và Swagger trả `200`; chạy lại 20/20 test backend thành công.

#### Chuyển development sang LocalStack

- [x] Dừng API dùng S3 client cũ để tránh gọi nhầm AWS thật.
- [x] Đổi `MediaStorage` development sang bucket `student-market-local-images`, endpoint `http://localhost:4566` và path-style addressing.
- [x] Backend dùng credential giả `test`/`test` khi có `MediaStorage:ServiceUrl`, không đọc AWS profile thật trong chế độ LocalStack.
- [x] Thêm `aws/localstack/docker-compose.yml`, script `Initialize-LocalStack.ps1` và tài liệu vận hành.
- [x] Script có thể tạo bucket local idempotently, áp dụng CORS riêng cho LocalStack và lifecycle dùng chung từ `aws/s3`.
- [x] Đã chạy container LocalStack và xác nhận health `healthy`, không còn failing streak.
- [x] Backend và image-processor build thành công; toàn bộ 27/27 test vượt qua.
- [x] Đã smoke test presigned POST qua endpoint backend với JWT trên LocalStack; phần gọi từ giao diện frontend được tách sang bước nghiên cứu frontend tiếp theo.
- [x] Đã smoke test S3 `raw/` → Lambda → hai ảnh WebP trong `processed/` trên LocalStack.

### AWS Lambda - Xử lý ảnh

- [x] Tạo project/function riêng `student-market-<env>-image-processor`, tách khỏi Lambda ASP.NET Core API; chưa deploy AWS.
- [x] Chuẩn bị execution role IaC chỉ được đọc `raw/*`, ghi `processed/*`, ghi CloudWatch Logs và gửi event lỗi tới DLQ.
- [x] Kiểm tra `Content-Length`, MIME khai báo, magic bytes và giới hạn pixel trước khi decode.
- [x] Auto-orient ảnh và loại bỏ metadata không cần thiết.
- [x] Tạo `large.webp` và `thumbnail.webp` trong `processed/items/{itemId}/{uploadId}/`.
- [x] Thiết lập `Content-Type: image/webp` và cache header immutable cho object processed.
- [x] Bảo đảm xử lý idempotent khi S3 gửi lại cùng event bằng output key cố định.
- [x] Bảo đảm output `processed/*` không kích hoạt lại Lambda bằng notification filter `raw/`.
- [x] Chuẩn bị timeout, memory, reserved concurrency, structured logging, log retention, DLQ và alarm trong SAM template.

#### Kết quả chuẩn bị image pipeline trước deploy

- Thêm `StudentFleaMarket.ImageProcessor` dùng Magick.NET x64 (Apache-2.0), chạy .NET 8 Lambda Event Function On-Demand.
- Thêm unit test cho raw key, giới hạn MIME/pixel và kích thước hai biến thể; tổng test backend hiện là 27/27.
- Mở rộng LocalStack sang `s3,lambda,iam,logs,sts`, thêm Docker network, Docker socket và script idempotent publish Lambda + cấu hình S3 notification `raw/`.
- Thêm `aws/iac/media-pipeline.yaml` cho private/versioned/encrypted S3, Lambda, prefix-scoped IAM, DLQ, CloudWatch alarms/log retention, CloudFront OAC và tùy chọn audit logging.
- `sam validate --lint` thành công; `sam build` thành công. Artifact Lambda khoảng 17 MiB nén và 41,41 MiB giải nén.
- `dotnet list package --vulnerable --include-transitive` không phát hiện package có lỗ hổng theo nguồn NuGet hiện tại.

### Amazon CloudFront

- [ ] Tạo distribution dùng S3 REST endpoint làm private origin.
- [ ] Tạo Origin Access Control (OAC) và bật ký request tới S3.
- [ ] Thêm bucket policy chỉ cho `cloudfront.amazonaws.com` đọc `processed/*`, giới hạn bằng `AWS:SourceArn` của đúng distribution.
- [ ] Không cho CloudFront truy cập hoặc phân phối prefix `raw/*`.
- [ ] Redirect HTTP sang HTTPS và bật compression/cache behavior phù hợp cho ảnh.
- [x] Dùng object key chứa UUID/version để tránh phải invalidation khi thay ảnh.
- [x] Cấu hình domain CloudFront qua `MediaStorage:CloudFrontBaseUrl`, không hard-code trong source code hoặc entity.

### Tích hợp frontend và kiểm chứng end-to-end

- [ ] Frontend gọi endpoint presign bằng JWT và metadata của file.
- [ ] Frontend upload trực tiếp lên URL được ký với đúng method/header; ảnh không đi xuyên backend.
- [x] Xác nhận object xuất hiện trong `raw/*`, Lambda chạy và tạo WebP/thumbnail trong `processed/*` trên LocalStack.
- [ ] Xác nhận ảnh processed trả `200` qua CloudFront HTTPS.
- [ ] Xác nhận S3 URL trực tiếp và raw object không public.
- [ ] Xác nhận user không thể presign/upload vào sản phẩm hoặc prefix của user khác.
- [ ] Test URL hết hạn, MIME sai, file quá lớn, token sai và object không tồn tại.
- [ ] Kiểm tra CloudWatch không chứa secret, JWT hoặc presigned URL đầy đủ.
- [x] Chạy `student-flea-market-be/scripts/verify.ps1`; toàn bộ build và 27/27 test vượt qua.

### Điều kiện hoàn thành

- [ ] Upload ảnh trực tiếp từ frontend lên private S3 hoạt động bằng presigned URL.
- [ ] Lambda tự động tạo ảnh WebP và thumbnail mà không có event recursion.
- [ ] CloudFront phân phối ảnh processed qua HTTPS bằng OAC.
- [ ] Raw object không public và Lambda runtime tuân theo least privilege.
- [ ] Các test backend và smoke test AWS đều thành công.

## 2026-10-28 - Khởi tạo PostgreSQL local

- [x] Xác nhận PostgreSQL 18 đang chạy và pgAdmin 4 kết nối được tới server `PostgreSQL 18`.
- [x] Tạo database local `StudentFleaMarketDb`.
- [x] Sinh SQL migration idempotent từ EF Core cho migration `20261027151631_InitialSchemaAligned`.
- [x] Mở và thực thi script trong pgAdmin 4 Query Tool; transaction hoàn tất bằng `COMMIT`.
- [x] Kiểm tra `__EFMigrationsHistory`: migration đang ở phiên bản EF Core `8.0.30`.
- [x] Kiểm tra schema `public` đã có 19 bảng, bao gồm các bảng nghiệp vụ, Identity và bảng lịch sử migration.

### Ghi chú

- Chưa nạp seed data; database hiện mới có schema.
- Không ghi mật khẩu PostgreSQL vào source code hoặc worklog. Lệnh `dotnet ef database update` trực tiếp chưa dùng được do mật khẩu trong cấu hình dev không khớp; migration được chạy qua phiên pgAdmin đã xác thực.

## 2026-11-03 - Hoàn tất môi trường LocalStack và CORS local

### Công việc đã hoàn thành

- [x] Khởi động LocalStack bằng Docker và xác nhận container `student-market-localstack` ở trạng thái `healthy`.
- [x] Cấu hình 5 service local: S3, Lambda, IAM, CloudWatch Logs và STS.
- [x] Tạo bucket `student-market-local-images` tại Region `ap-southeast-1`.
- [x] Tạo IAM execution role `student-market-local-image-processor-role` và Lambda .NET 8 `student-market-local-image-processor`.
- [x] Cấu hình S3 notification `s3:ObjectCreated:*` chỉ cho prefix `raw/` và cấp resource-based permission để S3 invoke Lambda.
- [x] Tách CORS thành hai file độc lập:
  - `aws/s3/cors.dev.json` giữ nguyên cho AWS thật, chỉ cho presigned `POST` từ frontend local;
  - `aws/localstack/cors.local.json` dành riêng cho LocalStack, cho phép `GET`, `HEAD`, `POST` và preview từ LocalStack Web App.
- [x] Thêm gateway CORS trong Docker Compose cho Lambda, IAM, Logs và STS bằng `EXTRA_CORS_ALLOWED_ORIGINS`; không tắt CSRF/CORS checks.
- [x] Cập nhật initializer để đọc Auth Token từ `.env.localstack` đã được Git ignore, không ghi token vào source code hoặc worklog.
- [x] Sửa các lỗi tương thích Windows PowerShell: probe resource chưa tồn tại, JSON UTF-8 BOM và chờ Lambda chuyển sang `Active` trước khi nối notification.
- [x] Xác nhận preflight từ `https://app.localstack.cloud` trả `204`, đúng `Access-Control-Allow-Origin` và cho phép các AWS signing headers cần thiết.
- [x] Chạy smoke test end-to-end sau khi recreate container: upload PNG vào `raw/`, Lambda tạo đúng hai output cố định trong `processed/`.
- [x] Xác nhận `large.webp` có kích thước 58.840 byte, `thumbnail.webp` có kích thước 9.602 byte, cả hai trả `Content-Type: image/webp`.
- [x] Xác nhận preview object từ origin LocalStack Web App trả HTTP `200` và `Access-Control-Allow-Origin: https://app.localstack.cloud`.

### Kết quả cuối ngày

- Môi trường local S3 → Lambda → processed images → CloudWatch Logs đã hoạt động.
- LocalStack Resource Browser có thể gọi các service đang bật qua gateway CORS; S3 object có CORS riêng để preview ảnh.
- Output key cố định giúp xử lý idempotent khi S3/LocalStack giao cùng event nhiều lần.
- Phạm vi LocalStack và CORS local của ngày hôm nay đã hoàn tất.

### Phần không thuộc phạm vi hoàn tất hôm nay

- Đã kiểm thử endpoint backend cấp presigned POST và upload trực tiếp bằng script; chưa nối thao tác này vào giao diện frontend.
- Chưa deploy API Lambda, image processor, S3 media bucket hoặc CloudFront lên AWS thật.
- Chưa tạo CloudFront distribution/OAC hoặc kiểm chứng URL processed qua CloudFront HTTPS.

## 2026-11-03 - Hoàn tất presigned media pipeline trên LocalStack

### Luồng đã kiểm chứng

- [x] Dùng PostgreSQL test tách biệt, áp dụng migration và tạo user/item thật qua API.
- [x] Gọi `POST /api/items/{itemId}/images/presign` bằng JWT của đúng seller.
- [x] Submit toàn bộ signed form fields và file WebP trực tiếp tới LocalStack S3; upload trả HTTP `204`.
- [x] Xác nhận raw object nằm đúng key do backend sinh dưới `raw/users/{userId}/items/{itemId}/{uploadId}.webp` và có kích thước 300.310 byte.
- [x] Xác nhận S3 `ObjectCreated` với filter `raw/` gọi image-processor Lambda.
- [x] Xác nhận Lambda tạo `large.webp` 308.072 byte và `thumbnail.webp` 51.788 byte, cả hai có `Content-Type: image/webp`.
- [x] Chạy lại bằng script tái sử dụng `aws/localstack/Test-PresignedUpload.ps1`; kết quả tiếp tục thành công.
- [x] Test âm qua HTTP: thiếu JWT trả `401`, user khác seller trả `403`, MIME không hỗ trợ trả `400`, file vượt 10 MiB trả `400`.
- [x] Bổ sung initializer áp dụng S3 Block Public Access, `BucketOwnerEnforced` và default SSE-S3 (`AES256`).
- [x] Chạy `student-flea-market-be/scripts/verify.ps1`: build thành công và 27/27 test vượt qua.

### Giới hạn cần kiểm tra lại trên AWS thật

- LocalStack vẫn trả `200` cho unsigned object GET dù metadata Block Public Access đã bật; không dùng hành vi này làm bằng chứng raw object private. Khi deploy AWS phải kiểm tra anonymous GET trả `403` và đánh giá đầy đủ IAM/bucket policy.
- CloudFront/OAC, HTTPS/custom domain, CloudWatch production và function-to-role binding thật chưa thể được chứng minh bằng LocalStack.
- Script không in JWT hoặc presigned URL đầy đủ; code hiện tại cũng không chủ động log các giá trị này.

## 2026-11-03 - Nghiên cứu tích hợp frontend sau presigned pipeline

### Hiện trạng và blocker

- `PostItemModal` hiện chỉ đổi sang màn hình thành công bằng `setTimeout`; chưa gọi API tạo item, chưa có file input và chưa upload ảnh.
- Trang chủ render `Navbar` và `HeroBanner` mà không truyền callback mở luồng đăng tin; `PostItemModal` chưa được mount trong trang chủ nên người dùng chưa thể bắt đầu luồng này.
- Category frontend dùng slug chuỗi từ mock data (`books`, `electronics`, ...), trong khi backend yêu cầu `CategoryId` số nguyên tồn tại trong database.
- Condition frontend dùng chuỗi hiển thị (`99% New`, `90% Good`, ...), trong khi backend yêu cầu số nguyên từ 1 đến 5.
- Frontend vẫn hiển thị toàn bộ sản phẩm từ `MOCK_PRODUCTS`; chưa gọi `GET /api/items` hoặc `GET /api/categories`.
- Contract auth đang lệch: frontend mong `AuthResultDto` có access token, refresh token và `user`, đồng thời gọi verify/resend/refresh/logout; backend hiện trả `ApiResponse<AuthResponse>` chỉ có access token và chưa có các endpoint refresh/OTP/logout tương ứng.
- Axios client hiện trả toàn bộ wrapper HTTP nhưng auth store đọc như DTO trực tiếp; cần thống nhất cơ chế unwrap `ApiResponse<T>` trước khi tích hợp media.
- Upload Lambda tạo `processed/*`, nhưng backend chưa có endpoint finalize/confirm để ghi URL processed vào `ItemImages`; vì vậy item chưa sở hữu ảnh sau khi upload thành công.
- Xử lý ảnh là bất đồng bộ; frontend cần trạng thái `creating → uploading → processing → ready/error`, không được báo “đăng tin thành công” ngay khi S3 vừa nhận raw object.

### Thứ tự triển khai đề xuất

1. Chốt contract auth giữa frontend và backend; ưu tiên sửa backend/DTO để frontend không phải đoán response và không gọi endpoint chưa tồn tại.
2. Thay mock category bằng `GET /api/categories`, ánh xạ condition UI sang giá trị 1–5 và tạo typed API client cho `ApiResponse<T>`.
3. Mount `PostItemModal` từ trang chủ, nối callback từ HeroBanner/Navbar và giữ auth guard trước khi mở form.
4. Thêm file picker hỗ trợ JPEG/PNG/WebP, tối đa 8 ảnh và 10 MiB/file; có preview, xóa ảnh, alt text, keyboard focus và thông báo lỗi theo từng file.
5. Gọi `POST /api/items` trước để lấy item ID; sau đó gọi `/api/items/{id}/images/presign` bằng JWT.
6. Upload trực tiếp từng file bằng `FormData`, giữ nguyên mọi signed field backend trả về và không gửi JWT/Authorization tới S3.
7. Bổ sung backend finalize/status API hoặc cơ chế tương đương để xác nhận Lambda hoàn tất và lưu `large.webp`/`thumbnail.webp` vào `ItemImages`.
8. Chỉ hiển thị thành công khi item và ảnh đã được backend xác nhận; hỗ trợ retry từng file và không tạo item trùng khi retry.
9. Test component và E2E với LocalStack: thành công, CORS, sai owner, URL hết hạn, MIME sai, file quá lớn, partial failure và retry/idempotency.

### Quyết định chưa nên tự giả định

- Chưa triển khai UI upload cho đến khi chốt auth response và endpoint finalize image, vì làm trước sẽ tạo luồng chỉ upload được raw object nhưng không gắn ảnh bền vững vào sản phẩm.
- Cần quyết định item được tạo ở trạng thái draft/pending trước upload hay xóa mềm khi toàn bộ upload thất bại.
- Production dùng CloudFront URL; local cần backend trả media URL/status phù hợp thay vì frontend tự ghép URL LocalStack.

### Checklist sửa API giữa backend và frontend

#### Chuẩn hóa response và lỗi

- [ ] Chốt một envelope duy nhất `ApiResponse<T>` gồm `data`, `message` và metadata cần thiết; frontend không được đọc wrapper như DTO trực tiếp.
- [ ] Thêm typed helper trong Axios để unwrap `response.data.data`; các store/component chỉ nhận DTO đã unwrap.
- [ ] Chuẩn hóa lỗi backend theo Problem Details hoặc error DTO thống nhất gồm status, code, message và validation errors.
- [ ] Sửa frontend error mapper để không phụ thuộc đồng thời vào cả `message`, `Message` và nhiều shape không xác định.
- [ ] Xuất OpenAPI từ backend và dùng làm nguồn kiểm chứng/generate type để hạn chế contract drift.

#### Authentication

- [ ] Chốt login dùng `email` hay `identifier`; hiện backend nhận `email`, frontend gửi `identifier` hỗ trợ email/username.
- [ ] Đồng bộ register DTO: frontend hiện gửi username, confirmPassword và phoneNumber; backend chỉ nhận fullName, email, password, schoolName và studentCode.
- [ ] Chốt response login/register: backend hiện trả userId, fullName, email, accessToken và expiresAt; frontend mong accessToken, refreshToken, token type, hai expiry và object `user` đầy đủ.
- [ ] Quyết định và triển khai thống nhất email verification; frontend đang gọi verify/resend nhưng backend chưa có endpoint tương ứng.
- [ ] Bổ sung refresh-token rotation và logout/revoke phía backend hoặc xóa toàn bộ logic refresh/logout không tồn tại khỏi frontend.
- [ ] Nếu dùng refresh cookie, backend phải phát cookie `Secure`, `HttpOnly`, `SameSite` phù hợp; Axios bật `withCredentials` và CORS chỉ cho đúng origin.
- [ ] Đồng bộ role/status (`Student`/`User`, `Admin`, giá trị số và `roleName`) để admin guard không suy đoán sai.
- [ ] Thêm integration test cho register → login → refresh → logout và test role Admin ở cả backend lẫn frontend.

#### Category và item

- [ ] Frontend gọi `GET /api/categories`; bỏ category slug mock khỏi payload và gửi `CategoryId` số nguyên.
- [ ] Tạo mapping condition hiển thị ↔ giá trị backend 1–5 tại một module dùng chung phía frontend.
- [ ] Tạo typed DTO cho `GET /api/items`, paging result, `GET /api/items/{id}`, create/update/delete item.
- [ ] Thay `MOCK_PRODUCTS` bằng dữ liệu API và có loading, empty, error, retry states; dữ liệu mock chỉ được dùng trong fixture/test.
- [ ] Xác nhận format price, status, image list và thời gian giữa DTO backend với ProductCard/admin pages.
- [ ] Chốt trạng thái item khi mới tạo và khi upload ảnh thất bại: draft/pending, retry hay soft-delete.

#### Media upload

- [ ] Frontend gọi create item để lấy item ID, sau đó gọi endpoint presign bằng JWT.
- [ ] Frontend gửi đúng file name, MIME và byte length; không tự truyền bucket/object key.
- [ ] Upload S3 bằng `FormData` chứa nguyên signed fields; không gắn Authorization header vào request S3.
- [ ] Bổ sung backend endpoint finalize/status để lưu processed URLs vào `ItemImages` và xác nhận ảnh thuộc đúng item/user.
- [ ] Chốt cách frontend biết Lambda xử lý xong: polling status, callback/event hoặc API đọc item trả trạng thái ảnh.
- [ ] Trả media URL phù hợp theo môi trường: LocalStack local và CloudFront production; frontend không tự ghép URL từ bucket/key.
- [ ] Test partial failure, retry/idempotency, URL hết hạn, sai MIME/kích thước, sai owner và giới hạn tổng số ảnh.

#### Cấu hình và quality gate

- [ ] Dùng cùng base path/casing cho endpoint (`/api/auth`, `/api/items`, `/api/categories`) trong code, HTTP examples và tài liệu.
- [ ] Kiểm tra `NEXT_PUBLIC_API_URL` local/staging/production và backend CORS tương ứng; không fallback production về localhost.
- [ ] Thêm contract/integration test chạy backend cùng PostgreSQL test và LocalStack, sau đó chạy frontend E2E trên đúng API đó.
- [ ] Quality gate cuối: backend 27/27+ test, frontend lint/typecheck/unit/component/E2E, presigned smoke test và production build đều thành công.

## 2026-11-04 - Kế hoạch sửa frontend trên main

Frontend được đánh giá tại `origin/main`, commit `751a6f7e02bcea3d938fe8a1f74af928c98b388e`.
Đã thực hiện trên local `main` ngày 2026-11-03. Production build sau khi sửa tạo
16 route static/SSG, bao gồm static route `/policies`, và xuất artifact vào `out`.

### Chuẩn bị Git an toàn

- [x] Bảo toàn thay đổi chưa commit trên `harry-dev`: `.gitignore` và `README.md` đang bị xóa; `DESIGN.md` và `summay.md` đang là file mới.
- [x] Stash cả tracked/untracked vào `stash@{0}` với tên `codex-preserve-harry-dev-before-main-fixes-2026-11-03`; không ghi đè working tree cũ.
- [x] Fast-forward local `main` tới `origin/main` và xác nhận HEAD là `751a6f7` trước khi sửa.

### Sửa lỗi lint đang chặn pipeline

- [x] Sửa toàn bộ 20 lỗi ESLint; `npm run lint` trả exit code `0`.
- [x] Loại bỏ `setState` đồng bộ trong `useEffect` tại admin layout, login page và Navbar; chuyển sang derived/initial state và callback mở search.
- [x] Chuyển `handleClose` thành callback ổn định trước effect trong `AuthPromptModal`, sửa dependency và khôi phục focus khi đóng.
- [x] Thay các kiểu `any` trong login, register và auth store bằng `unknown`, `AxiosError` và payload lỗi API có kiểu.
- [x] Escape quote/apostrophe trong JSX.
- [x] Xóa các import và biến không sử dụng trong admin pages, HeroBanner, PostItemModal và Navbar.
- [x] Thay điều hướng nội bộ bằng Next router hoặc `location.replace` với URL tuyệt đối ở interceptor ngoài React.
- [x] Thay toàn bộ `<img>` do ứng dụng khai báo bằng `next/image`; static export dùng `images.unoptimized`.
- [x] Giảm toàn bộ 28 warning về 0, không tắt ESLint rule.

### Dependency và bảo mật chuỗi cung ứng

- [x] Chạy lại `npm audit` trên lockfile của main. `npm ci` ban đầu in số liệu cũ 30 lỗ hổng, nhưng hai lần audit độc lập sau cài đặt đều xác nhận `found 0 vulnerabilities`; không còn package gốc cần nâng theo advisory hiện tại.
- [ ] Nâng dependency theo từng nhóm tương thích, ưu tiên critical/high; không chạy `npm audit fix --force` nếu chưa xem breaking changes.
- [x] Chạy lại `npm ci`, `npm audit`, lint, typecheck và production build thành công.
- [x] Xác nhận `package-lock.json` không thay đổi; không chạy `npm audit fix --force` và không nâng package khi audit hiện tại đã sạch.

### Auth và bảo mật phía trình duyệt

- [ ] Không lưu refresh token dài hạn trong `localStorage`; thống nhất backend dùng cookie `Secure`, `HttpOnly`, `SameSite` phù hợp hoặc cơ chế rotation an toàn hơn.
- [x] Loại bỏ cookie access token và role do JavaScript tự tạo; frontend hiện không có middleware/SSR cần đọc các cookie này.
- [x] Xác nhận client luôn xóa auth state trong `finally` khi logout API lỗi; việc thu hồi token thực tế phía backend cần integration test riêng.
- [x] Ghi rõ admin redirect chỉ là UX guard và mọi admin API phải kiểm tra role/policy ở backend.
- [x] Rà soát code frontend hiện tại: không có lệnh log JWT, refresh token, credential hoặc presigned URL đầy đủ.

### Cấu hình API và CORS production

- [x] Thêm `.env.example` và `DEPLOYMENT.md`; production không còn fallback về `http://localhost:5033/api` mà dùng URL cấu hình hoặc same-origin `/api`.
- [ ] Cấu hình backend CORS bằng đúng Amplify/custom-domain origin, không dùng wildcard khi có credential.
- [ ] Cập nhật tham số CORS của S3 production cho đúng frontend origin dùng presigned POST; giữ LocalStack CORS ở file riêng.
- [ ] Kiểm thử login, refresh, logout và xử lý lỗi mạng với API production/staging URL.

### Chuẩn bị deploy frontend

- [x] Chốt mô hình hiện tại là Amplify static export; nếu bổ sung SSR/server actions phải đổi nền tảng hoặc đánh giá lại hỗ trợ Next.js runtime.
- [x] Thêm `output: "export"` và `images.unoptimized: true`.
- [x] Thay redirect `/policies` bằng static page tương thích export; xác nhận thư mục `out` được tạo.
- [x] Thêm `amplify.yml`: `npm ci` → lint → typecheck → build, artifact `out`; tài liệu hóa app root cho cả repo độc lập và monorepo.
- [x] Tài liệu hóa rõ không đặt secret, access key hoặc private configuration trong `NEXT_PUBLIC_*`.

### Hiệu năng và trải nghiệm người dùng

- [x] Phát hiện asset mang đuôi WebP nhưng payload là PNG; chuyển đúng sang WebP, giảm từ 3.242.818 byte xuống 300.310 byte (giảm khoảng 90,7%). Đo LCP thực tế sau deploy vẫn còn chờ.
- [ ] Kiểm tra responsive cho storefront, auth modal, admin portal và policy pages trên mobile/tablet/desktop.
- [ ] Kiểm tra accessibility: keyboard navigation, focus trap/restore, label, contrast, alt text và Escape behavior của modal.
- [ ] Xác nhận các trang admin không hiển thị dữ liệu mock như dữ liệu production khi API chưa kết nối.

### Bổ sung test và quality gate

- [ ] Thêm unit test cho API client refresh queue, auth store, login/register error mapping và route guard.
- [ ] Thêm component test cho Navbar, auth modal, post item modal và admin authorization state.
- [ ] Thêm E2E tối thiểu cho đăng nhập, đăng ký/xác minh email, truy cập admin, tìm kiếm và mở luồng đăng sản phẩm.
- [x] Thêm GitHub Actions quality gate hiện có: `npm ci` → lint → typecheck → audit high → build. Sẽ chèn bước test sau khi bổ sung test suite.
- [ ] Xác nhận cuối ngày: lint không lỗi, TypeScript/build thành công, các test vượt qua và không còn vulnerability critical/high chưa được chấp nhận bằng biên bản.

### Kết quả kiểm chứng sau khi sửa

- `npm run lint`: thành công, 0 lỗi và 0 warning.
- `npm run typecheck`: thành công.
- `npm audit --audit-level=high`: `found 0 vulnerabilities`.
- `npm run build`: thành công; sinh 16 route static/SSG và thư mục `out`.
- Chưa đánh dấu hoàn tất toàn bộ kế hoạch vì còn cần backend hỗ trợ HttpOnly refresh cookie, cấu hình/kiểm thử CORS production, responsive/accessibility QA toàn diện và unit/component/E2E test.

## 2026-11-11 - Đối chiếu nhánh `tien`, chuẩn bị cấu hình deploy AWS và lưu ảnh upload vào `ItemImage`

Repository: `student-flea-market-be` (và thư mục `aws/` ở workspace)  
Branch làm việc: `Minh` (thay đổi chưa commit)

### Đối chiếu với nhánh `origin/tien`

- [x] So sánh working tree với `origin/tien`: backend local đã có đủ toàn bộ code của `tien` (auth, quyền bán hàng/cấm tài khoản, Moderator, tin đăng + `ItemCode`, tìm kiếm không dấu, danh mục, yêu thích, đổi đồ/giao dịch/thanh toán, xác nhận bàn giao hai bên, chat SignalR, review/trust level, report, kiểm duyệt). Migrations giống hệt.
- [x] Local có thêm phần media mà `tien` chưa có: presigned POST lên S3, Lambda `StudentFleaMarket.ImageProcessor` (raw → WebP), project `StudentFleaMarket.Tests`.
- [x] Build solution thành công, 0 lỗi, 0 warning.

### Rà soát cấu hình AWS

- [x] Pipeline ảnh đã đủ cấu hình: `MediaStorage` trong appsettings, `aws/iac/media-pipeline.yaml` (S3 private, Lambda trigger `raw/`, IAM theo prefix, DLQ, alarm, CloudFront OAC), policy IAM mẫu và cấu hình LocalStack.
- [x] Phát hiện còn thiếu: Lambda hosting adapter cho API, IaC cho API (Lambda + API Gateway), connection string/JWT secret khi deploy, CORS production, chưa ghi ảnh đã upload vào DB.
- [x] Thống nhất: chưa chạy LocalStack, chỉ chuẩn bị cấu hình để deploy sau.

### Chuẩn bị cấu hình deploy API

- [x] Thêm package `Amazon.Lambda.AspNetCoreServer.Hosting` 2.2.1 và `AddAWSLambdaHosting(LambdaEventSource.HttpApi)` trong `Program.cs` (không ảnh hưởng khi chạy local bằng Kestrel).
- [x] CORS đọc từ `Cors:AllowedOrigins` (mảng hoặc chuỗi phân tách dấu phẩy); để trống thì giữ `AllowAnyOrigin` như cũ. Thêm section `Cors` vào `appsettings.json`.
- [x] Tạo `aws/iac/api.yaml` (SAM): Lambda .NET 8 + HTTP API, tham số NoEcho cho `DbConnectionString`/`JwtSecretKey`, nhận output của media stack, VPC tùy chọn, quyền S3 chỉ trên `raw/*`, log group + alarm, output `ApiBaseUrl`.
- [x] Bổ sung hướng dẫn deploy API vào `aws/iac/README.md`.
- [ ] Chạy `sam validate --lint` (máy chưa cài SAM CLI).
- [ ] Quyết định hướng cho chat realtime: SignalR không chạy qua HTTP API + Lambda (cần API Gateway WebSocket hoặc chạy container).
- [ ] Cân nhắc chuyển secret sang Secrets Manager/SSM; cân nhắc `SkipDatabaseSeed=true` nếu muốn chạy migration thủ công thay vì lúc cold start.

### Lưu ảnh upload vào `ItemImage`

- [x] Thêm endpoint `POST /api/Items/sell/{id}/images/confirm`, body `{ "objectKeys": [...] }` (lấy từ response presign).
- [x] Kiểm tra quyền chủ tin, object key đúng dạng `raw/users/{userId}/items/{itemId}/{uploadId}.{ext}` của chính user + tin, `HEAD` object trên S3 (tồn tại, dung lượng hợp lệ), giới hạn `MaxImagesPerItem`.
- [x] Ghi `ItemImage` với `ImageUrl = <base>/processed/items/{itemId}/{uploadId}/large.webp`; ảnh đầu tiên thành ảnh chính nếu tin chưa có; `Order` nối tiếp; gọi lại không tạo trùng. Response trả kèm `thumbnailUrl`.
- [x] `processedImageBaseUrl` của presign không còn `null` khi thiếu CloudFront (dùng LocalStack khi dev hoặc S3 regional endpoint).
- [x] Thêm quyền `s3:GetObject` trên `raw/*` cho API trong `aws/iac/api.yaml` và `aws/iam/api-lambda-runtime-policy.*.json`; ghi chú cần S3 gateway endpoint nếu API chạy trong VPC.
- [x] Thêm validator `ConfirmItemImagesRequestValidator`, 9 unit test mới; cập nhật README backend và `StudentFleaMarket.API.http`.
- [ ] Kiểm thử end-to-end với S3/LocalStack thật.
- [ ] FE: gọi confirm sau khi upload, hiển thị placeholder/retry vì Lambda xử lý ảnh bất đồng bộ.

### Kết quả kiểm chứng

- `dotnet build StudentFleaMarket.slnx`: thành công, 0 lỗi, 0 warning.
- `dotnet test StudentFleaMarket.Tests`: 28/28 test vượt qua.

## 2026-11-16 - Review tổng thể trước khi deploy lên AWS (giao việc cho Codex)

Repository: `student-flea-market-be` (branch `Minh`), `student-flea-market-fe` (branch `main`), thư mục `aws/`, `Production/` ở workspace.
Kiến trúc đích giữ nguyên theo `aws.md` mục 1.1: **FE trên Vercel → API Gateway HTTP API → Lambda API (.NET) → Supabase (transaction pooler)**; ảnh: S3 `raw/` → Lambda ImageProcessor → `processed/` → CloudFront.

### Đã làm trong ngày

- [x] Chẩn đoán "FE không kết nối được BE": do backend chưa chạy. CORS, route FE ↔ BE, login đều đúng khi BE chạy.
- [x] Thêm `run-dev.bat` (bật BE + FE, chờ `/health`, mở trình duyệt) và `stop-dev.bat` ở gốc workspace.
- [x] User-secrets dev hiện trỏ **Supabase transaction mode** và `SkipDatabaseSeed=true` (đổi lúc 10:31 16/11). Đã seed demo lên Supabase 1 lần qua session mode → `minh/linh/tu` (mật khẩu demo, xem `Production/supabase.md`) đăng nhập được, 25 tin đăng mẫu.
- [x] FE: đảo nội dung bên phải bỏ giới hạn `max-w-[1500px]`, khung đảo cố định trên `lg+` (chỉ nội dung trong `<main>` cuộn), ẩn thanh cuộn (`.no-scrollbar` trong `globals.css`), reset cuộn khi đổi route (`AppShell.tsx`).

### Hiện trạng đã kiểm chứng (16/11)

| Hạng mục | Kết quả |
|---|---|
| Stack CloudFormation trên `ap-southeast-1` (profile `student-market`) | **Chưa có stack nào** — chưa deploy gì |
| IAM | User `<iam-user>` có `AdministratorAccess`, đủ quyền `sam deploy` (aws.md mục 5.1) |
| SAM CLI | Đã cài (`C:\Program Files\Amazon\AWSSAMCLI`) |
| `sam validate --lint` `api.yaml`, `media-pipeline.yaml` | Chỉ lỗi **W2531**: runtime `dotnet8` deprecated từ 10/11/2026, **chặn tạo mới từ 01/02/2027**, chặn update từ 03/03/2027 |
| BE `dotnet test` | 28/28 pass |
| FE `npm run build` (static export), `lint`, `typecheck` | Pass |
| FE `npm audit --audit-level=high` | **Fail** (`body-parser` high, `@hono/node-server`... kéo theo từ package `shadcn` nằm trong `dependencies`) → CI `.github/workflows` sẽ đỏ |
| Migration trên Supabase | Không còn migration pending |
| Git | BE: ~198 file thay đổi chưa commit trên `Minh`; FE: ~61 file chưa commit trên `main`. Vercel build từ GitHub nên phải commit/push trước |

### Việc cần làm — P0 (chặn deploy / chặn chức năng chính trên production)

#### P0-1. Gửi email OTP trên Lambda (đăng ký đang bị chặn)

Vấn đề: `appsettings.json` đặt `Email:LogOnly = true`, còn `aws/iac/api.yaml` **không truyền** biến `Email__*`. Trên Lambda, OTP chỉ được ghi ra CloudWatch → user mới không xác thực email được → không đăng nhập được.

- [x] `aws/iac/api.yaml`: thêm tham số `EmailUsername`, `EmailPassword` (`NoEcho`), `EmailFromEmail` (mặc định `no-reply@studentfleamarket.local` → app tự gửi bằng `EmailUsername`), `EmailLogOnly` (mặc định `'false'`), `EmailSmtpHost` (`smtp.gmail.com`), `EmailSmtpPort` (`587`). Condition `HasSmtpCredentials`: để trống `EmailUsername` thì `Email__LogOnly` bị ép về `'true'` (không gọi SMTP với credential rỗng).
- [x] Truyền vào `Environment.Variables`: `Email__Host`, `Email__Port`, `Email__UseSsl=true`, `Email__Username`, `Email__Password`, `Email__FromEmail`, `Email__LogOnly`, `Email__LogOnFailure=false` (SMTP lỗi thì trả lỗi, không âm thầm ghi OTP ra log).
- [x] `Production/deploy.ps1`: đọc `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL` (tùy chọn) từ `deploy.secrets.env`; thiếu username → cảnh báo; có username mà thiếu password → dừng. Comment đầu file đã liệt kê key mới.
- [x] Không đổi code `EmailSender`, không commit giá trị thật.
- [ ] **Người dùng:** thêm `SMTP_USERNAME=` và `SMTP_PASSWORD=` (Gmail App Password) vào `Production/deploy.secrets.env` — hiện file mới có `DB_CONNECTION_TRANSACTION`, `JWT_SECRET_KEY`.
- [ ] Sau deploy: `POST /api/Auth/register` → mail OTP tới hộp thư thật; log không in mật khẩu.
- Kiểm chứng 16/11: `sam validate --lint aws/iac/api.yaml` chỉ còn W2531 (runtime `dotnet8`, xem P1-1); `deploy.ps1` parse không lỗi.

#### P0-2. Chặn dùng JWT secret mặc định ngoài Development

Vấn đề: `appsettings.json` có `Jwt:SecretKey = "CHANGE_ME_PLEASE_..."` dài > 32 ký tự nên qua được check trong `Program.cs`. Nếu quên truyền `Jwt__SecretKey`, production ký token bằng key công khai trong repo.

- [ ] `StudentFleaMarket.API/Program.cs`: nếu `!IsDevelopment()` và `SecretKey` bắt đầu bằng `CHANGE_ME` → `throw InvalidOperationException` (thông điệp rõ ràng).
- [ ] Thêm unit test hoặc ghi rõ trong README nếu khó test `Program.cs`.

#### P0-3. FE: sửa `npm audit` high để CI xanh

- Nguồn lỗi (đã xác nhận bằng `npm ls`): `shadcn@4.21.2 → @modelcontextprotocol/sdk → express → body-parser` và `→ @hono/node-server`. `src/` không import gì từ `shadcn` lúc runtime.
- [ ] `student-flea-market-fe/package.json`: chuyển `shadcn` (CLI) từ `dependencies` sang `devDependencies`.
- [ ] Chạy `npm audit fix` (**không** dùng `--force`) để nâng `body-parser`/`@hono/node-server` trong lockfile. Lưu ý `npm audit` vẫn quét cả devDependencies, nên chỉ chuyển nhóm là chưa đủ.
- [ ] Nếu vẫn còn lỗi high chỉ nằm trong devDependencies: đổi bước CI thành `npm audit --omit=dev --audit-level=high` trong `.github/workflows/*.yml` và ghi lý do.
- Tiêu chí xong: `npm ci && npm run lint && npm run typecheck && npm audit --audit-level=high && npm run build` pass.

#### P0-4. Đổi mật khẩu tài khoản mặc định trên Supabase

- [ ] Làm theo `Production/supabase.md` mục 5: đổi mật khẩu `admin@gmail.com` (<mật khẩu: xem `Production/supabase.md`>) và `moderator@gmail.com` (<mật khẩu: xem `Production/supabase.md`>) trước khi public link. Việc này **người dùng tự làm** (thao tác trên DB thật), Codex chỉ cập nhật tài liệu nếu cần.
- [ ] Quyết định có giữ user demo `minh/linh/tu` (mật khẩu demo, xem `Production/supabase.md`) trên DB production hay xóa sau buổi demo.

#### P0-5. Commit và push code (người dùng xác nhận trước)

- [ ] BE: review và commit thay đổi trên branch `Minh`, mở PR vào `main`.
- [ ] FE: tách branch từ `main` trước khi commit (không commit thẳng `main`), push, mở PR.
- [ ] Đảm bảo không commit: `Production/` (đã gitignore ở workspace), `deploy.secrets.env`, `account.txt`, user-secrets, `aws/iam/*.generated.json`.

### Việc cần làm — P1 (nên làm trước khi demo)

#### P1-1. Runtime Lambda `dotnet8` hết hạn

Deploy bằng `dotnet8` vẫn được tới **01/02/2027** (tạo mới) và **03/03/2027** (update). Chọn **một** trong hai, ưu tiên (a):

- [ ] (a) Nâng cả solution lên **.NET 10** (máy đã có SDK `10.0.402`): `TargetFramework net10.0` cho mọi project, nâng package `Microsoft.*`/EF Core/Npgsql/Amazon.Lambda.* lên bản tương thích net10, `Runtime: dotnet10` + `BuildMethod: dotnet10` trong cả 2 template. Chạy lại build + test + `sam validate --lint`.
- [ ] (b) Nếu chưa nâng kịp: giữ `dotnet8`, thêm `Metadata.cfn-lint.config.ignore_checks: [W2531]` cho 2 function để `sam validate --lint` pass, và ghi deadline vào `aws.md`.

#### P1-2. Chống spam/brute-force

- [ ] `api.yaml` → `HttpApi`: thêm `DefaultRouteSettings` với `ThrottlingBurstLimit` (vd. 50) và `ThrottlingRateLimit` (vd. 20) để giới hạn toàn API.
- [ ] `Program.cs`: thêm `AddRateLimiter` (có sẵn trong .NET 8, không cần package) với policy fixed-window theo IP cho `Auth/login`, `Auth/register`, `Auth/send-verification-code`, `Auth/resend-verification-code` (vd. 10 request/phút). Lấy IP từ header `X-Forwarded-For` / request context của API Gateway. Ghi chú: limiter in-memory chỉ tính theo từng Lambda instance.
- [ ] Trả `429` với body `ApiResponse.Fail(..., "TOO_MANY_REQUESTS")` cho đồng nhất.

#### P1-3. Output và tài liệu deploy

- [ ] `api.yaml`: thêm output `FrontendApiUrl` = `ApiBaseUrl` + `/api` (đúng giá trị dán vào Vercel `NEXT_PUBLIC_API_URL`).
- [ ] `deploy.ps1`: tham số `-FrontendOrigins` mặc định là `http://localhost:3000`; thêm cảnh báo nếu không có origin `https://` khi deploy, và nhắc phải truyền **cùng** giá trị cho cả 2 stack (S3 CORS + API CORS).
- [ ] Cập nhật `aws.md` mục 1 "Trạng thái hiện tại" sau khi deploy thật.

#### P1-4. Kiểm thử end-to-end trên AWS thật (sau khi deploy)

- [ ] `.\Production\deploy.ps1 -FrontendOrigins "https://<project>.vercel.app"` (media trước, API sau — script đã làm đúng thứ tự).
- [ ] `curl <ApiBaseUrl>/health`; preflight CORS từ origin Vercel; login; search; tạo tin; presign → upload S3 → confirm → ảnh WebP xuất hiện qua CloudFront.
- [ ] Đặt `NEXT_PUBLIC_API_URL` trên Vercel = output `FrontendApiUrl`, redeploy FE, test lại trên domain production.
- [ ] Kiểm tra FE hiển thị placeholder/retry khi ảnh chưa xử lý xong (việc còn mở từ 11/11).
- [ ] Ghi kết quả (cold start, lỗi gặp phải) vào worklog.

### Việc cần làm — P2 (tùy chọn)

- [ ] Chuyển `DbConnectionString`, `JwtSecretKey`, `EmailPassword` sang SSM Parameter Store (SecureString) thay vì tham số CloudFormation.
- [ ] Giảm cold start: bật SnapStart cho `ApiFunction` (hỗ trợ .NET 8+) hoặc publish ReadyToRun.
- [ ] Chat realtime: FE hiện **không dùng SignalR** (polling 30s cho unread). `MapHub("/hubs/chat")` không chạy được qua HTTP API + Lambda; giữ nguyên và ghi rõ trong README, hoặc chuyển sang API Gateway WebSocket nếu cần realtime.
- [ ] `UseHttpsRedirection` log cảnh báo `Failed to determine the https port` khi chạy profile `http` — có thể chỉ bật khi không chạy trong Lambda.
- [ ] CI backend: GitHub Actions chạy `dotnet build` + `dotnet test` + `sam validate --lint`.
- [ ] Lịch giữ Supabase không bị tạm dừng sau 7 ngày (gọi `/health` có truy vấn DB định kỳ) và `pg_dump` sao lưu định kỳ (aws.md mục 13.5).

### Kiểm tra quyền IAM và quota (16/11)

- [x] `<iam-user>`: quyền đủ (group `flea-market` có `AdministratorAccess`, không boundary, không SCP). Simulate `allowed` cho mọi action của 2 stack + Amplify. Chi tiết: `aws.md` mục 5.3.
- [x] **Blocker đã sửa:** quota Lambda concurrency của tài khoản = 10 → `ReservedConcurrentExecutions: 5` của ImageProcessor sẽ làm stack media lỗi. `media-pipeline.yaml`: `ProcessorReservedConcurrency` mặc định `0` (không reserve, condition `ReserveProcessorConcurrency`). Lint chỉ còn W2531.
- [ ] **Người dùng:** xin nâng quota Lambda concurrency (`L-B99A9384`) lên 1000 (lệnh ở `aws.md` 5.3).
- [ ] **Người dùng:** bật MFA cho `<iam-user>`.

### Phương án phụ: frontend trên Amplify (đã chuẩn bị 16/11)

- [x] FE: viết lại `amplify.yml` (Node 22, chặn build nếu `NEXT_PUBLIC_API_URL` trống/không HTTPS, lint → typecheck → build, cache `.next/cache`), thêm `customHttp.yml` (security headers, cache `_next/static`), `amplify-rules.json` (rewrite `/<*>` → `/<*>.html`, `404-200`), cập nhật `DEPLOYMENT.md`.
- [x] `Production/amplify-deploy.ps1`: manual deploy không cần GitHub (build local → zip `out/` → `create-app`/`create-branch` nếu chưa có → `create-deployment` → upload → `start-deployment` → chờ `SUCCEED`). Có `-DryRun`, `-SkipBuild`, `-ApiUrl`, `-Delete`.
- [x] Sửa lỗi zip: `ZipFile::CreateFromDirectory` trên PowerShell 5.1 ghi `\` vào tên entry (121/162 file) → tự tạo entry với `/`. Dry-run: 162/162 file, 0 entry có `\`.
- [x] `aws.md` mục 10.1: khi nào dùng, các bước chuyển, hoàn tác; sửa thông tin cũ "thiếu quyền Amplify".
- [ ] Chưa chạy thật trên Amplify (chưa có stack API). Lần đầu chạy cần kiểm tra: rewrite (mở thẳng `/marketplace`, F5), header từ `--custom-headers`, CORS với origin `https://main.<app-id>.amplifyapp.com`.

### Quy ước cho Codex khi làm các mục trên

- Không commit/push, không chạy `sam deploy`, không ghi vào Supabase nếu người dùng chưa xác nhận.
- Không in hoặc commit secret (`deploy.secrets.env`, user-secrets, `account.txt`).
- Mỗi mục xong: chạy lại `dotnet build`, `dotnet test`, `sam validate --lint` (BE) hoặc `lint/typecheck/build/audit` (FE), rồi đánh dấu `[x]` kèm kết quả kiểm chứng ngay dưới mục.

## 2026-11-16 - Font tiếng Việt, trang hồ sơ, ảnh đại diện trên S3

Repository: `student-flea-market-fe` (branch `main`), `student-flea-market-be` (branch `Minh`). Tất cả thay đổi **chưa commit**.

### 1. FE: thiết kế lại font (tiếng Việt + tiếng Anh)

- [x] Bỏ `@import` Google Fonts (chặn render) trong `globals.css`, chuyển sang `next/font/google` trong `src/app/layout.tsx` (self-host, subset `latin`, `latin-ext`, `vietnamese`, không layout shift). Bỏ `preconnect` thừa.
- [x] Thay font:
  - `font-sans`: Plus Jakarta Sans → **Be Vietnam Pro** (400–800), thiết kế cho tiếng Việt, dấu chồng (ế, ỗ, ẫ) đặt chuẩn.
  - `font-serif` (tiêu đề, giá tiền): Newsreader → **Fraunces** (variable, có trục `opsz`, `SOFT`, đủ weight tới 900 → hết faux-bold ở `font-extrabold` của giá).
  - `font-display` (wordmark FLea, trang auth): Cormorant Garamond → **Fraunces** với `SOFT 100`.
  - Từ 3 family xuống 2.
- [x] `@theme inline` trỏ `--font-sans/serif/display` tới biến CSS của next/font.
- [x] `h1–h4` line-height tối thiểu 1.25 (không cắt dấu tiếng Việt hai tầng), `text-wrap: balance` cho heading, `pretty` cho đoạn văn; `.tabular` thêm `lining-nums`.
- [x] Không phải sửa component nào (class `font-serif`/`font-display`/`font-sans` giữ nguyên).
- Kiểm chứng: `next build` thành công; CSS build ra đúng `--font-be-vietnam`, `--font-fraunces`. Chưa kiểm tra bằng mắt trên trình duyệt.

### 2. FE: trang hồ sơ `/profile`

Backend đã có sẵn `GET/PUT /api/Profile` và `POST /api/Profile/change-password` — chỉ làm FE.

- [x] Tạo `src/app/profile/page.tsx` (song ngữ, responsive, bọc `RequireAuth`):
  - Thẻ thông tin: avatar, họ tên, huy hiệu đã xác minh, @username, email, MSSV, nơi ở, "thành viên từ".
  - Form thông tin: họ tên, SĐT; nhóm **Sinh viên** (trường, **mã số sinh viên**); nhóm **Nơi ở** (ký túc xá/địa chỉ → `dormitory`, khu vực → `commonArea`). Validate họ tên ≥ 2 ký tự, SĐT 9–15 số (khớp validator BE). Nút Lưu chỉ bật khi có thay đổi, có Hoàn tác.
  - Đổi mật khẩu: nhập mật khẩu hiện tại + mới + nhập lại, nút ẩn/hiện, checklist realtime (≥ 6 ký tự, có chữ, có số, khác mật khẩu cũ). Sai mật khẩu cũ → báo "Mật khẩu hiện tại không đúng". Thành công → BE thu hồi mọi refresh token → FE `logout()` và chuyển `/auth?reason=password-changed`.
  - Vào trang tự gọi `GET /api/Profile` để làm mới user trong store.
- [x] `src/lib/api.ts`: thêm `profileApi` (`get`, `update`, `changePassword`).
- [x] Điểm vào: thẻ user ở đầu `Sidebar.tsx` thành link `/profile` (active nền đen, icon `UserCog`); avatar trên `TopBar.tsx` thành link `/profile`.
- [x] `src/app/auth/page.tsx`: hiển thị thông báo khi `?reason=password-changed`.
- [x] `src/components/ui.tsx`: `Avatar` thêm size `xl`.
- Kiểm chứng: `tsc --noEmit`, `eslint`, `next build` pass (route `/profile` static).

### 3. Ảnh đại diện lưu trên S3 (BE + Lambda + FE)

Không cần migration: cột `Users.AvatarUrl` đã có, giờ lưu URL ảnh đã xử lý (CloudFront/LocalStack/S3 regional).

Luồng giống ảnh tin đăng: `POST presign` → browser POST thẳng lên S3 `raw/users/{userId}/avatars/{uploadId}.{ext}` (private) → `POST confirm` → Lambda cắt vuông → `processed/avatars/{userId}/{uploadId}/large.webp` (512px) + `thumbnail.webp` (128px) → CloudFront. IAM/CloudFormation hiện tại đã bao prefix `raw/*`, `processed/*` → không phải sửa hạ tầng.

**Lambda `StudentFleaMarket.ImageProcessor`**
- [x] `MediaObjectKey.cs`: nhận thêm key avatar (5 segment), `IsAvatar`, `ProcessedPrefix` = `processed/avatars/{userId}/{uploadId}`. Key ảnh tin đăng giữ nguyên.
- [x] `ImageTransformer.cs`: thêm `ImageShape { Listing, Avatar }`; avatar center-crop vuông, 512/128px. Overload cũ giữ nguyên (mặc định `Listing`).
- [x] `S3ImageProcessor.cs`: truyền `ImageShape.Avatar` khi key là avatar.

**API**
- [x] `MediaUploadContracts.cs`: `PresignAvatarRequest`, `ConfirmAvatarRequest`, `IAvatarUploadService`, `MediaUploadLimits.MaxAvatarSizeBytes` (min(5 MB, giới hạn chung)); `MediaUploadRules.CreateAvatarObjectKey`, `TryParseAvatarObjectKey` (chỉ nhận key của đúng user), `AvatarProcessedPrefix`.
- [x] `MediaUploadValidator.cs`: tách rule file dùng chung (`ImageFileRules`), thêm `PresignAvatarRequestValidator`, `ConfirmAvatarRequestValidator`.
- [x] `Infrastructure/Media/S3AvatarUploadService.cs` (mới): presign 1 file, confirm (kiểm tra key thuộc user + `HEAD` object trên S3 + dung lượng) rồi ghi `AvatarUrl`, remove (đặt null). Tách helper `MediaUrls.Root` dùng chung với `S3MediaUploadService`. Đăng ký DI trong `MediaServiceCollectionExtensions.cs`.
- [x] `ProfileController.cs`: `POST /api/Profile/avatar/presign`, `POST /api/Profile/avatar/confirm`, `DELETE /api/Profile/avatar`.
- [x] `StudentFleaMarket.Tests/AvatarUploadTests.cs` (mới): key khớp giữa API ↔ Lambda, chặn key của user khác/sai dạng, validate presign, crop vuông 512/128.
- Kiểm chứng: build API thành công (build ra thư mục tạm vì API đang chạy khóa DLL); `dotnet test` **39/39 pass**.

**FE**
- [x] `src/lib/api.ts`: `profileApi.uploadAvatar` (presign → POST S3 → confirm; tên file chuẩn hóa `avatar.{ext}` theo MIME), `profileApi.removeAvatar`, `validateAvatar` (jpg/png/webp, ≤ 5 MB), `waitForImage` (poll tối đa ~20 s chờ Lambda xử lý xong).
- [x] `/profile`: nút camera trên avatar, preview local + spinner, giữ preview tới khi ảnh CDN sẵn sàng rồi mới cập nhật store (sidebar/topbar không bị ảnh hỏng); nút "Gỡ ảnh"; đổi ảnh không làm mất nội dung đang sửa trong form.
- [x] `Avatar` trong `ui.tsx`: ảnh lỗi → tự quay về chữ cái đầu.
- [ ] **Chưa chạy được** `tsc`/`eslint`/`build` cho phần FE avatar (shell bị lỗi classifier cuối phiên). Cần chạy: `npx tsc --noEmit && npx eslint src/app/profile src/components/ui.tsx src/lib/api.ts && npm run build`.

**Việc còn lại**
- [ ] **Deploy lại Lambda ImageProcessor** (LocalStack: chạy lại script publish Lambda; AWS: `sam deploy` stack media). Chưa deploy thì avatar nằm mãi ở `raw/` và không hiển thị.
- [ ] Restart API để nạp endpoint mới.
- [ ] Smoke test end-to-end: chọn ảnh → presign → upload → confirm → `processed/avatars/...` có 2 file WebP vuông → hiển thị qua CloudFront.
- [ ] Ảnh avatar cũ không bị xóa khi đổi ảnh → cân nhắc lifecycle/job dọn `processed/avatars/` orphan.

### Ghi chú để sau: trường `AvatarUrl` trong `PUT /api/Profile`

- `UpdateProfileRequestDto.AvatarUrl` (`ProfileDtos.cs`) cho client ghi thẳng một chuỗi bất kỳ vào `Users.AvatarUrl`; validator chỉ giới hạn 500 ký tự, không kiểm tra scheme/domain. `null` = giữ nguyên, `""` = xóa.
- FE hiện **không** gửi trường này. Đây là phần còn sót từ trước khi có luồng upload S3.
- Rủi ro: ai có token đều gọi API đặt avatar là link ngoài → ảnh không qua kiểm duyệt/Lambda, tracking pixel lộ IP người xem, link hỏng/nặng.
- [ ] **Khi cần**: bỏ `AvatarUrl` khỏi `UpdateProfileRequestDto`, validator và `ProfileService.UpdateProfileAsync`; bỏ `avatarUrl?` trong `UpdateProfileRequest` ở FE `src/lib/api.ts`. Avatar chỉ đổi qua `/avatar/presign` + `/avatar/confirm` và `DELETE /avatar`. Client cũ gửi thừa trường sẽ bị ASP.NET bỏ qua, không lỗi.
