# AWS Free Tier và kế hoạch triển khai Student Market

> Cập nhật ngày 28/10/2026. Kiến trúc hiện tại dùng PostgreSQL và bổ sung pipeline ảnh S3 → Lambda → CloudFront. Các quyền CloudFront phải được xác nhận trước khi deploy.

## 1. Phạm vi AWS hiện có

Các AWS managed policy đã được cấp:

| Managed policy | Service có thể sử dụng | Vai trò trong dự án |
|---|---|---|
| `AmazonS3FullAccess` | Amazon S3 | Lưu ảnh sản phẩm và có thể host frontend tĩnh |
| `AWSLambda_FullAccess` | AWS Lambda | Chạy ASP.NET Core API theo mô hình serverless |
| `AmazonDynamoDBFullAccess` | Amazon DynamoDB | Đã được cấp nhưng không dùng trong kiến trúc PostgreSQL hiện tại |
| `AmazonAPIGatewayAdministrator` | Amazon API Gateway | Cung cấp HTTP API để frontend gọi Lambda |
| `CloudWatchFullAccess` | Amazon CloudWatch | Log, metric, dashboard và alarm |
| `CloudFrontFullAccess` | Amazon CloudFront | Tạo và quản lý distribution, Origin Access Control và cache invalidation cho ảnh processed |

Pipeline ảnh dùng **Amazon CloudFront** để phân phối ảnh đã xử lý qua HTTPS/CDN. `CloudFrontFullAccess` là quyền rộng dành cho principal triển khai ở môi trường development; không gắn policy này vào execution role của Lambda. Khi chuyển sang staging/production, nên thay bằng policy giới hạn theo distribution và Origin Access Control (OAC) của dự án.

Plan hiện tại không dùng Cognito, EC2, ECS, OpenSearch, Route 53 hoặc SES. Backend tiếp tục dùng PostgreSQL theo source code hiện tại; việc triển khai database trên AWS cần RDS/VPC hoặc một PostgreSQL endpoint có thể truy cập an toàn từ runtime của API.

### Lưu ý về quyền

Các policy trên đều có quyền rất rộng và phù hợp hơn cho tài khoản development/sandbox. Không gắn chúng vào Lambda runtime.

Mỗi Lambda vẫn cần một **execution role** riêng. Danh sách trên không cho thấy quyền quản trị IAM, vì vậy cần:

1. Dùng một execution role có sẵn; hoặc
2. Nhờ người quản trị tạo role và cho phép `iam:PassRole` đối với đúng role đó.

Execution role của API tối thiểu chỉ nên có:

- Ghi log vào log group của Lambda.
- Tạo presigned upload cho đúng bucket và prefix `raw/` của Student Market.
- Đọc đúng secret/configuration cần thiết và kết nối PostgreSQL theo kiến trúc deploy đã duyệt.

Execution role của Lambda xử lý ảnh chỉ nên có:

- Đọc object trong `raw/*`.
- Ghi object trong `processed/*`.
- Xóa object `raw/*` chỉ khi lifecycle đã được thống nhất.
- Ghi CloudWatch Logs.

Không gắn `AmazonS3FullAccess`, `AWSLambda_FullAccess` hoặc `CloudWatchFullAccess` vào runtime role. CloudFront truy cập S3 bằng OAC và bucket policy giới hạn theo đúng distribution ARN, không dùng access key tĩnh.

## 2. Trạng thái repository

- Frontend: Next.js 16, React 19, TypeScript và Tailwind CSS; hiện vẫn là trang mặc định.
- Backend: ASP.NET Core 8, đã tách Domain, Application, Infrastructure, API và Tests.
- PostgreSQL/EF Core, Identity, JWT, validation, logging, health check và migration `InitialSchemaAligned` đã có.
- API hiện có đăng ký, đăng nhập, danh mục và CRUD sản phẩm có kiểm tra ownership.
- AWS SDK S3 đã có package nhưng chưa có service tạo presigned upload.
- Chưa có Lambda hosting adapter, Lambda xử lý ảnh, S3 event notification, CloudFront distribution hoặc Infrastructure as Code hoàn chỉnh.
- Frontend vẫn ở giai đoạn khởi tạo và chưa có flow upload ảnh.

PostgreSQL là datastore hiện tại của dự án. Không chuyển sang DynamoDB nếu chưa có ADR và kế hoạch migration riêng.

## 3. Free Tier của các service trong phạm vi

### Chương trình AWS Free Tier mới

Khách hàng AWS mới có thể nhận `100 USD` credit khi đăng ký và kiếm thêm tối đa `100 USD`. Free plan kết thúc sau 6 tháng hoặc khi hết credit, tùy điều kiện nào đến trước. Credit có hạn dùng tối đa 12 tháng kể từ ngày tạo account nếu account được nâng lên Paid plan.

### Quota liên quan

| Service | Hạn mức Free Tier chính | Áp dụng cho Student Market | Lưu ý |
|---|---:|---|---|
| AWS Lambda | 1 triệu request và 400.000 GB-second/tháng | Chạy toàn bộ backend API | Tính gộp theo account. Memory cao hoặc request chạy lâu sẽ tiêu quota nhanh. |
| S3 Standard | Với khách hàng đủ điều kiện: 5 GB, 20.000 GET và 2.000 PUT/tháng trong thời hạn ưu đãi | Ảnh sản phẩm và frontend static | Storage, request và data transfer đều được tính riêng. Tránh versioning nếu chưa có lifecycle. |
| CloudFront | Phụ thuộc chương trình Free Tier/credit của account | Phân phối ảnh processed | Request, data transfer và invalidation có cách tính phí riêng; kiểm tra Billing trước khi bật production. |
| API Gateway | 1 triệu REST API call và 1 triệu HTTP API call/tháng trong 12 tháng cho khách hàng mới | Public endpoint gọi Lambda | Chọn HTTP API vì đơn giản và thường rẻ hơn REST API. |
| CloudWatch | Có quota miễn phí theo log, metric, alarm và API | Theo dõi Lambda/API Gateway | Log nhiều hoặc giữ log vô thời hạn có thể phát sinh phí. |

Hạn mức cụ thể phụ thuộc ngày tạo account, Region và account plan. Phải kiểm tra Billing/Free Tier của chính account trước khi deploy.

## 4. Kiến trúc AWS mục tiêu

```text
Người dùng
    │
    ▼
Next.js frontend
    │ HTTPS/JSON + JWT
    ▼
API Gateway HTTP API → Lambda ASP.NET Core API → PostgreSQL
                              │
                              │ presigned upload
                              ▼
                         S3 private bucket
                         ├── raw/*
                         │     │ S3 event
                         │     ▼
                         │  Lambda image processor
                         │     │ resize/nén/WebP
                         └── processed/*
                                   │ private origin + OAC
                                   ▼
                              CloudFront CDN

API Lambda và image-processor Lambda đều ghi log vào CloudWatch.
```

### Nơi chạy frontend

Có hai lựa chọn trong phạm vi hiện tại:

1. **Deploy frontend ngoài AWS hoặc chạy local:** giữ S3/CloudFront chỉ cho ảnh sản phẩm; đây là lựa chọn đơn giản cho giai đoạn hiện tại.
2. **Static export trên S3 + CloudFront:** chỉ dùng khi frontend không phụ thuộc SSR, API routes hoặc middleware phía server. Nên dùng CloudFront để có HTTPS và không public trực tiếp bucket.

CloudFront cho ảnh là một phần của kiến trúc mục tiêu. Nếu quyền chưa được cấp, hoàn thành S3 + Lambda trước và coi CDN là deployment gate, không thay bằng public S3 bucket.

### Authentication không dùng Cognito

Backend tự triển khai auth:

- `POST /api/auth/register`: validate dữ liệu và để ASP.NET Core Identity hash password trước khi lưu.
- `POST /api/auth/login`: kiểm tra password qua ASP.NET Core Identity và phát access token JWT thời hạn ngắn.
- Refresh token phải được random, chỉ lưu bản hash cùng expiry/revocation state trong PostgreSQL và rotate sau mỗi lần dùng.
- Secret ký JWT không được commit hoặc lưu trong frontend. Với phạm vi service hiện tại, cấu hình bằng Lambda environment variable được mã hóa mặc định và giới hạn quyền đọc; khi có quyền phù hợp nên chuyển sang Secrets Manager/SSM.
- API không tin `userId` do client gửi; lấy danh tính từ JWT đã xác thực.

Tự quản lý password/token có rủi ro cao hơn Cognito. Cần test kỹ hashing, token expiry, refresh rotation, logout và authorization.

## 5. Thiết kế từng service

### Amazon S3

Tạo tối đa hai bucket:

- `student-market-<env>-images`: private, lưu ảnh sản phẩm.
- `student-market-<env>-web`: chỉ tạo nếu dùng static website hosting.

Luồng ảnh:

1. Frontend gọi `POST /uploads/presign`.
2. Backend kiểm tra JWT, MIME, dung lượng, số ảnh và quyền sở hữu sản phẩm.
3. Backend trả presigned PUT/POST có thời hạn ngắn cho một key trong `raw/`.
4. Frontend upload trực tiếp lên S3; file không đi xuyên backend.
5. S3 event kích hoạt Lambda xử lý ảnh.
6. Lambda kiểm tra nội dung thật, resize, nén và ghi WebP vào `processed/`.
7. Frontend hiển thị ảnh processed qua CloudFront.
8. PostgreSQL chỉ lưu object key/trạng thái xử lý; không lưu presigned URL.

Quy tắc:

- Raw key: `raw/users/{userId}/items/{itemId}/{uploadId}.{ext}`.
- Processed key: `processed/items/{itemId}/{uploadId}/{variant}.webp`.
- Chỉ nhận JPEG, PNG hoặc WebP; giới hạn dung lượng và số ảnh/listing.
- Chặn public access cho bucket ảnh.
- CORS chỉ cho origin frontend cần thiết.
- S3 notification chỉ match prefix `raw/` để tránh Lambda tự kích hoạt lại khi ghi `processed/`.
- Lifecycle xóa multipart upload dở, raw file và ảnh orphan sau thời gian hợp lý.
- Dùng UUID/key bất biến và `Cache-Control` dài cho ảnh processed để không phải invalidation thường xuyên.

### AWS Lambda xử lý ảnh

- Dùng một function riêng, ví dụ `student-market-<env>-image-processor`, tách khỏi Lambda ASP.NET Core API.
- Trigger bằng S3 `ObjectCreated` với prefix `raw/`; không trigger trên `processed/`.
- Kiểm tra `Content-Length`, MIME khai báo, magic bytes và giới hạn kích thước/pixel trước khi decode.
- Auto-orient, bỏ metadata không cần thiết, tạo ít nhất bản `large.webp` và `thumbnail.webp`.
- Xử lý idempotent: cùng một input event phải ghi lại cùng output key, không tạo record trùng.
- Không log presigned URL, JWT hoặc dữ liệu ảnh.

### Amazon CloudFront

- Dùng S3 REST endpoint làm private origin, không dùng S3 website endpoint cho bucket ảnh.
- Dùng Origin Access Control (OAC) và chế độ ký request tới S3.
- Bucket policy chỉ cho principal `cloudfront.amazonaws.com` đọc `processed/*`, giới hạn bằng `AWS:SourceArn` của đúng distribution.
- Redirect HTTP sang HTTPS và chỉ expose ảnh processed; raw upload không được phục vụ qua CDN.
- Dùng object key có UUID/version và cache dài; chỉ tạo invalidation khi thật sự ghi đè cùng key.
- Ghi domain distribution vào `MediaStorage:CloudFrontBaseUrl`, không hard-code trong entity hoặc source code.

### AWS Lambda

- Một Lambda ASP.NET Core cho MVP để giảm số resource.
- Route theo module: Auth, Profiles, Listings, Favorites, Orders và Uploads.
- API Lambda cần VPC/network path nếu PostgreSQL được đặt trong RDS private subnet. Lambda xử lý ảnh không cần vào VPC nếu chỉ dùng S3 và CloudWatch.
- Bắt đầu với memory thấp-vừa, đo duration rồi điều chỉnh.
- Structured logging; không log password, JWT, refresh token hoặc presigned URL đầy đủ.
- Giới hạn timeout và kích thước request; ảnh không đi xuyên Lambda.

### Amazon API Gateway

- Dùng HTTP API.
- Route `ANY /{proxy+}` tới Lambda hoặc khai báo route rõ ràng bằng IaC.
- CORS chỉ cho origin frontend, method và header cần thiết.
- Cấu hình throttling phù hợp để tránh spam và Lambda usage bất ngờ.
- Dùng stage `dev` trước; chỉ thêm `prod` khi MVP ổn định.

### PostgreSQL

- EF Core model và migration là nguồn triển khai schema hiện tại.
- Nếu dùng RDS private, API Lambda cần subnet, security group và network route phù hợp; image-processor Lambda không cần truy cập database trong phiên bản đầu.
- Connection string/database credential phải lấy từ secret hoặc configuration được bảo vệ, không commit vào repository.
- Chỉ lưu object key và trạng thái ảnh; không lưu presigned URL có thời hạn.

### Amazon CloudWatch

- Log group riêng cho Lambda, retention 7-14 ngày ở dev.
- Theo dõi Lambda errors, duration, throttles và concurrent executions.
- Theo dõi API Gateway 4xx/5xx và latency.
- Theo dõi lỗi của cả API Lambda và image-processor Lambda.
- Theo dõi CloudFront 4xx/5xx, cache hit rate và data transfer khi CDN được bật.
- Tạo alarm ở ngưỡng nhỏ cho lỗi/throttle; kiểm tra chi phí log định kỳ.

## 6. Kế hoạch cho repository

### Giai đoạn 0 - Xác minh quyền và thiết kế

- [ ] Xác nhận các managed policy hiện có hoạt động ở Region được chọn.
- [ ] Xác nhận quyền CloudFront/OAC; nếu thiếu, nhờ admin cấp quyền giới hạn theo distribution của dự án.
- [ ] Xác nhận có execution role riêng cho API Lambda và image-processor Lambda cùng quyền `iam:PassRole` phù hợp.
- [ ] Chốt frontend chạy ngoài AWS hay static export qua S3 + CloudFront.
- [ ] Chốt PostgreSQL endpoint, network path và secret strategy.
- [ ] Bật Free Tier usage alerts/budget nếu account cho phép.

**Hoàn thành khi:** quyền deploy, execution role, Region và data model đều đã chốt.

### Giai đoạn 1 - Chuẩn hóa backend

- [x] Tách project thành Domain, Application, Infrastructure, API và test.
- [x] Thêm health endpoint, global error handling, JWT, FluentValidation, Serilog và OpenAPI.
- [x] Cấu hình EF Core/Npgsql và migration theo PostgreSQL schema.
- [ ] Thêm Lambda ASP.NET Core hosting adapter tương thích .NET 8.
- [ ] Thêm AWS SDK/configuration cần thiết vào đúng project Infrastructure/API.

**Hoàn thành khi:** API skeleton chạy local, build và unit test thành công.

### Giai đoạn 2 - Auth bằng JWT + PostgreSQL

- [x] Tạo register/login endpoints.
- [ ] Tạo refresh/logout endpoints.
- [x] Hash password bằng ASP.NET Core Identity và không trả password hash qua API.
- [x] Cấu hình JWT authentication/authorization.
- [ ] Lưu refresh token hash và expiry trong PostgreSQL.
- [ ] Test sai password, token hết hạn, refresh reuse và truy cập trái quyền.
- [ ] Frontend có login/register/logout và giữ access token an toàn trong bộ nhớ.

**Hoàn thành khi:** auth hoạt động end-to-end mà không cần Cognito.

### Giai đoạn 3 - Sản phẩm và pipeline ảnh S3/Lambda/CloudFront

- [x] CRUD sản phẩm với ownership.
- [ ] Tạo presigned upload endpoint.
- [ ] Validate MIME, kích thước, số ảnh và object key.
- [ ] Tạo image-processor Lambda và S3 event chỉ cho prefix `raw/`.
- [ ] Tạo WebP/thumbnail trong `processed/` và xử lý idempotent.
- [ ] Tạo CloudFront distribution với OAC cho private S3 origin.
- [ ] Chỉ phục vụ `processed/*`; xác nhận raw object không public.
- [ ] Frontend có danh sách, chi tiết và form tạo/sửa listing.
- [ ] Test user không thể sửa listing hoặc upload vào prefix của user khác.

**Hoàn thành khi:** người dùng upload trực tiếp lên S3, Lambda tự xử lý và ảnh hiển thị qua CloudFront HTTPS mà bucket vẫn private.

### Giai đoạn 4 - Favorite và order MVP

- [ ] Thêm favorite/unfavorite.
- [ ] Thêm order/reservation state machine tối thiểu.
- [ ] Query order theo buyer và seller.
- [ ] Dùng pagination phù hợp với PostgreSQL query hiện tại.
- [ ] Thêm idempotency cho tạo order/chuyển state.

**Hoàn thành khi:** marketplace có luồng giao dịch cơ bản, chưa có thanh toán thật.

### Giai đoạn 5 - Hạ tầng và deploy

- [ ] Viết AWS SAM/CloudFormation cho S3, Lambda, API Gateway, CloudFront/OAC và CloudWatch; RDS/network có thể ở stack riêng.
- [ ] Tham chiếu execution role có sẵn thay vì tự tạo IAM resource nếu không có quyền IAM.
- [ ] Tạo riêng stack/resource `dev`; chưa tạo `prod` sớm.
- [ ] CI chạy frontend lint/build và backend build/test.
- [ ] Deploy, chạy smoke test rồi kiểm tra CloudWatch và Billing.
- [ ] Ghi lệnh teardown để tránh resource thử nghiệm bị bỏ quên.

**Hoàn thành khi:** stack có thể được dựng lại bằng IaC và API demo hoạt động.

### Giai đoạn 6 - Hardening

- [ ] Rà CORS, authorization, rate limit, validation và security headers.
- [ ] Test auth, ownership, upload và order transitions.
- [ ] Kiểm tra S3 public access, CORS và lifecycle.
- [ ] Kiểm tra CloudFront OAC, bucket policy, cache behavior và raw prefix không thể truy cập.
- [ ] Kiểm tra S3 event không tạo vòng lặp Lambda.
- [ ] Kiểm tra log retention và dữ liệu nhạy cảm trong log.
- [ ] Viết runbook deploy, rollback, rotate JWT secret và xử lý khi Free Tier/credit hết hạn.

## 7. Thứ tự ưu tiên hai sprint đầu

1. Xác minh Lambda execution role và `iam:PassRole`.
2. Xác nhận quyền CloudFront/OAC và hai Lambda execution role.
3. Hoàn thiện presigned upload endpoint trên backend hiện tại.
4. Tạo private S3 bucket với `raw/` và `processed/`.
5. Deploy image-processor Lambda và kiểm tra S3 event không lặp.
6. Tạo CloudFront distribution + OAC và kiểm tra ảnh processed qua HTTPS.
7. Sau khi pipeline ảnh ổn định mới tích hợp frontend và deploy API Lambda/API Gateway.

## 8. Nguồn AWS chính thức

- [AWS Free Tier](https://aws.amazon.com/free/)
- [AWS Free Tier FAQs](https://aws.amazon.com/free/free-tier-faqs/)
- [AWS Lambda Pricing](https://aws.amazon.com/lambda/pricing/)
- [Amazon API Gateway Pricing](https://aws.amazon.com/api-gateway/pricing/)
- [Amazon S3 Pricing](https://aws.amazon.com/s3/pricing/)
- [Amazon CloudFront Pricing](https://aws.amazon.com/cloudfront/pricing/)
- [Amazon CloudWatch Pricing](https://aws.amazon.com/cloudwatch/pricing/)
- [Upload object bằng S3 presigned URL](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [S3 trigger cho Lambda](https://docs.aws.amazon.com/lambda/latest/dg/with-s3-tutorial.html)
- [Giới hạn truy cập S3 bằng CloudFront OAC](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
- [AWS managed policies and permissions](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_job-functions.html)
