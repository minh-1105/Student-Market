# Tổng quan kiến trúc Student Market theo quyền AWS hiện có

> Cập nhật ngày 26/10/2026. Tài liệu này lấy năm AWS managed policy dưới đây làm ranh giới triển khai. Có policy không đồng nghĩa mọi service được policy nhắc tới đều có thể được tạo hoặc dùng đầy đủ.

## 1. Phạm vi quyền AWS

Tài khoản dự án hiện được cấp:

1. `AmazonAPIGatewayAdministrator`
2. `AmazonS3FullAccess`
3. `AWSLambda_FullAccess`
4. `CloudWatchFullAccess`
5. `SecretsManagerReadWrite`

| Policy | Khả năng dùng cho dự án | Giới hạn quan trọng |
|---|---|---|
| `AmazonAPIGatewayAdministrator` | Tạo, sửa và xóa API trong API Gateway | Không cấp quyền chạy Lambda hoặc truy cập dữ liệu |
| `AmazonS3FullAccess` | Quản lý bucket/object; lưu ảnh sản phẩm; có thể host frontend tĩnh cho demo | Quyền rất rộng; không nên gắn trực tiếp vào Lambda runtime |
| `AWSLambda_FullAccess` | Tạo, cập nhật, gọi và quản lý Lambda; pass một execution role có sẵn cho Lambda | Không cho tạo/chỉnh sửa IAM role tổng quát |
| `CloudWatchFullAccess` | Quản lý log, metric, dashboard và alarm | Là quyền của principal triển khai, không thay thế quyền ghi log trong execution role của Lambda |
| `SecretsManagerReadWrite` | Tạo, cập nhật và đọc secret | Không phải database; không tự cấp cho Lambda quyền đọc secret |

Các policy này phù hợp cho môi trường development/sandbox nhưng rộng hơn nguyên tắc least privilege. Khi kiến trúc ổn định, nên nhờ quản trị viên thay bằng customer-managed policy giới hạn theo project, Region và resource ARN.

`CloudWatchFullAccess` vẫn dùng được với quyền hiện tại, nhưng AWS đang khuyến nghị chuyển sang `CloudWatchFullAccessV2`. Việc đổi policy cần do quản trị viên có quyền thực hiện.

## 2. Kiến trúc khả dụng

```text
Người dùng
    │
    ├── Next.js frontend
    │     ├── chạy local/host ngoài AWS có HTTPS (khuyến nghị)
    │     └── hoặc static export trên S3 (chỉ phù hợp demo)
    │
    │ HTTPS + REST/JSON + JWT
    ▼
API Gateway HTTP API
    │
    ▼
AWS Lambda - ASP.NET Core API
    ├── S3 private bucket
    │     └── ảnh sản phẩm qua presigned URL
    ├── Secrets Manager
    │     └── JWT signing secret và app secret
    └── CloudWatch
          └── log, metric và alarm

Datastore nghiệp vụ: CHƯA CÓ QUYỀN/SERVICE PHÙ HỢP
```

Kiến trúc này có thể triển khai API mẫu, health check, secret management, logging và luồng upload ảnh. Nó chưa đủ để triển khai hoàn chỉnh user, refresh token, listing, favorite hoặc order.

Không đưa các service sau vào kiến trúc hiện tại vì không có policy tương ứng:

- DynamoDB.
- RDS/PostgreSQL và các quyền EC2/VPC/security group cần thiết.
- CloudFront.
- Cognito.
- Amplify.
- Route 53.
- ECS/EC2.

## 3. Giới hạn bắt buộc

### Datastore còn thiếu

S3 là object storage và Secrets Manager là nơi lưu secret; cả hai không nên được dùng thay database giao dịch. Không lưu toàn bộ marketplace trong JSON trên S3 và không lưu user/listing/order dưới dạng secret.

Để hoàn thiện marketplace, cần chọn một hướng rồi xin thêm quyền:

- **DynamoDB:** quyền tạo/quản lý table cho deployer và quyền CRUD giới hạn theo table/index cho Lambda.
- **RDS PostgreSQL:** quyền RDS, EC2/VPC, subnet/security group, networking và quyền runtime liên quan.

Trước khi có datastore, không công bố register/login/CRUD marketplace là tính năng hoàn chỉnh.

### Lambda execution role

Lambda luôn cần execution role riêng. Năm policy hiện có cho phép pass một role phù hợp tới Lambda nhưng không cung cấp quyền tạo IAM role tổng quát. Cần dùng role có sẵn hoặc nhờ quản trị viên tạo `student-market-dev-lambda-role`.

Role runtime tối thiểu cần:

- Trust principal `lambda.amazonaws.com`.
- Ghi log vào đúng CloudWatch log group.
- Đọc/ghi đúng S3 bucket ảnh và prefix cần thiết.
- `secretsmanager:GetSecretValue` và `secretsmanager:DescribeSecret` cho đúng secret.
- `kms:Decrypt` cho đúng key nếu secret dùng customer-managed KMS key.

Không gắn cả năm managed policy vào execution role của Lambda.

### Frontend trên S3

S3 chỉ host được output tĩnh. Nếu dùng lựa chọn này, Next.js phải cấu hình `output: "export"`; SSR, middleware và API routes không hoạt động. S3 website endpoint không phải lựa chọn production phù hợp cho luồng đăng nhập vì phạm vi hiện tại không có CloudFront/Amplify để cung cấp frontend HTTPS hoàn chỉnh.

Khuyến nghị: chạy frontend local trong giai đoạn phát triển hoặc deploy trên một nền tảng ngoài AWS có HTTPS; dùng S3 riêng cho ảnh sản phẩm.

## 4. Trạng thái repository hiện tại

### Frontend (`student-flea-market-fe`)

- Next.js 16, React 19, TypeScript `strict` và App Router.
- Tailwind CSS 4, shadcn/ui và Base UI.
- Có dependency TanStack Query, Zustand, Axios, React Hook Form và Zod.
- `page.tsx` vẫn là trang mặc định Next.js.
- Chưa có homepage Student Market, login/register, product grid hoặc form đăng tin.
- Chưa có `NEXT_PUBLIC_API_BASE_URL`, HTTP client, auth state hoặc query provider.
- Chưa cấu hình static export cho S3.

### Backend (`student-flea-market-be`)

- ASP.NET Core Web API, target `.NET 10` (`net10.0`).
- Hiện mới có endpoint mẫu `GET /weatherforecast`.
- Có package EF Core/Npgsql nhưng chưa có `DbContext` hoặc migration.
- Có AWS SDK S3 nhưng chưa có Lambda ASP.NET Core hosting adapter.
- Chưa có code đọc Secrets Manager.
- JWT, FluentValidation, Mapster và Serilog mới ở mức dependency, chưa tạo pipeline nghiệp vụ hoàn chỉnh.
- Chưa có domain model, repository, test hoặc Infrastructure as Code hoàn chỉnh.

## 5. Thiết kế theo từng service

### Amazon API Gateway

- Dùng HTTP API làm public entry point cho backend.
- Tích hợp với một Lambda ASP.NET Core cho MVP.
- Chỉ cho phép frontend origin, method và header cần thiết trong CORS.
- Cấu hình throttling để hạn chế spam và chi phí ngoài dự kiến.
- Dùng stage `dev` trước; chỉ thêm `prod` khi luồng nghiệp vụ đã hoàn thiện.
- Lambda resource-based permission phải giới hạn `source-arn` theo đúng API/stage.

### AWS Lambda

- Một function cho API MVP để giảm số resource và độ phức tạp vận hành.
- Bổ sung `Amazon.Lambda.AspNetCoreServer.Hosting` và cấu hình `LambdaEventSource.HttpApi`.
- Thêm endpoint `GET /health` không phụ thuộc datastore.
- Ảnh không đi xuyên Lambda; Lambda chỉ xác thực và tạo presigned URL.
- Không đặt function trong VPC khi chưa có resource yêu cầu VPC.
- Không log password, JWT, secret, refresh token hoặc presigned URL đầy đủ.
- Giới hạn timeout, memory và kích thước request; theo dõi số liệu trước khi điều chỉnh.

### Amazon S3

Tách bucket theo mục đích:

- `student-market-<env>-images-<account-id>`: bucket private lưu ảnh.
- `student-market-<env>-web-<account-id>`: chỉ tạo nếu cần frontend static demo.

Luồng upload ảnh:

1. Frontend gọi `POST /uploads/presign`.
2. Lambda xác thực người dùng, quyền sở hữu, MIME type, kích thước và số lượng ảnh.
3. Lambda trả presigned PUT URL có thời hạn ngắn.
4. Frontend upload trực tiếp lên S3.
5. Sau khi có datastore, chỉ lưu object key; không lưu presigned URL.

Quy tắc an toàn:

- Bật Block Public Access cho bucket ảnh.
- Mã hóa server-side.
- CORS chỉ cho origin frontend cần thiết.
- Object key: `users/{userId}/listings/{listingId}/{uuid}.webp`.
- Chỉ nhận JPEG, PNG hoặc WebP; kiểm tra MIME, magic bytes và dung lượng.
- Lifecycle xóa multipart upload dở và ảnh orphan theo chính sách đã duyệt.

### AWS Secrets Manager

- Lưu JWT signing secret và app secret; không commit vào source hoặc frontend.
- Lambda environment variable chỉ giữ ARN/name của secret, không giữ plaintext secret.
- Backend đọc secret một lần khi cold start và cache trong process.
- Execution role chỉ được đọc đúng secret cần thiết.
- Không log secret hoặc toàn bộ response từ Secrets Manager.
- Chưa triển khai automatic rotation nếu chưa có IAM/runtime permission phù hợp.

### Amazon CloudWatch

- Log group riêng cho Lambda.
- Retention 7-14 ngày cho môi trường `dev`.
- Theo dõi Lambda errors, duration, throttles và concurrent executions.
- Theo dõi API Gateway 4xx/5xx và latency.
- Tạo alarm cho lỗi và throttle ở ngưỡng phù hợp.
- Rà log định kỳ để tránh dữ liệu nhạy cảm và chi phí lưu trữ không cần thiết.

## 6. Luồng giao tiếp mục tiêu

### Gọi API

1. Frontend đọc public API URL từ `NEXT_PUBLIC_API_BASE_URL`.
2. Frontend gọi API Gateway qua HTTPS.
3. API Gateway chuyển request tới Lambda.
4. Lambda validate request, xác thực JWT và thực thi nghiệp vụ khả dụng.
5. Lambda trả response JSON; frontend quản lý server state bằng TanStack Query.
6. Log và metric được gửi tới CloudWatch.

### Xác thực

Secrets Manager chỉ giải quyết việc giữ signing secret. Register/login/refresh/logout vẫn cần datastore để lưu user, password hash và refresh-token state.

Khi datastore được cấp:

- Hash password bằng Argon2id hoặc bcrypt.
- Access token có thời hạn ngắn.
- Refresh token được tạo ngẫu nhiên, chỉ lưu bản hash và rotate sau mỗi lần dùng.
- Backend lấy `userId` từ token đã xác thực, không tin `userId` do client gửi.
- Kiểm thử token hết hạn, refresh reuse, logout và authorization theo ownership.

## 7. Cấu hình môi trường

### Frontend

```env
NEXT_PUBLIC_API_BASE_URL=https://<api-id>.execute-api.<region>.amazonaws.com
```

Đây là public endpoint, không phải secret.

### Lambda

```text
ASPNETCORE_ENVIRONMENT=Production
Storage__ImageBucket=student-market-dev-images-<account-id>
Auth__JwtSecretArn=arn:aws:secretsmanager:<region>:<account-id>:secret:student-market/dev/jwt-...
```

Không đặt secret plaintext trong environment variable.

## 8. Kế hoạch triển khai

### Giai đoạn 0 - Xác minh quyền

- [ ] Xác nhận caller identity, Region và năm policy trong phiên AWS hiện tại.
- [ ] Xác nhận có execution role cho Lambda và có thể `iam:PassRole` đúng role đó.
- [ ] Chốt nơi host frontend.
- [ ] Chọn datastore mục tiêu và xin thêm quyền trước khi làm CRUD/auth hoàn chỉnh.

### Giai đoạn 1 - Hạ tầng tối thiểu

- [ ] Tạo bucket ảnh private, encryption, CORS và lifecycle.
- [ ] Tạo JWT secret trong Secrets Manager.
- [ ] Thêm Lambda hosting adapter và `/health` vào backend.
- [ ] Package và deploy Lambda bằng execution role có sẵn.
- [ ] Tạo API Gateway HTTP API và Lambda invoke permission giới hạn theo source ARN.
- [ ] Cấu hình CloudWatch log retention và alarm cơ bản.

### Giai đoạn 2 - Tích hợp frontend

- [ ] Cấu hình `NEXT_PUBLIC_API_BASE_URL`.
- [ ] Tạo Axios client và TanStack Query provider.
- [ ] Kiểm tra `/health` từ frontend qua API Gateway.
- [ ] Cấu hình CORS chính xác cho API Gateway và S3.

### Giai đoạn 3 - Upload ảnh

- [ ] Tạo presigned upload endpoint.
- [ ] Validate MIME, magic bytes, dung lượng, số ảnh và object key.
- [ ] Upload trực tiếp từ frontend lên S3.
- [ ] Kiểm thử user không thể ghi vào prefix của user khác.

### Giai đoạn 4 - Bổ sung datastore

- [ ] Cập nhật kiến trúc và execution role theo datastore được duyệt.
- [ ] Triển khai user/auth, listing, favorite và order.
- [ ] Viết unit, integration và end-to-end test.
- [ ] Chỉ sau bước này mới công bố marketplace là MVP hoàn chỉnh.

## 9. Tiêu chí hoàn thành hạ tầng hiện tại

- Caller identity và Region đúng môi trường `dev`.
- Lambda dùng execution role tối thiểu, không dùng năm full-access policy làm runtime role.
- `GET /health` trả `200` qua API Gateway.
- Bucket ảnh private, bật Block Public Access và chỉ cho CORS origin cần thiết.
- Presigned URL có thời hạn ngắn và bị giới hạn theo object key hợp lệ.
- JWT secret không xuất hiện trong source, log hoặc environment variable plaintext.
- CloudWatch có log retention và alarm cơ bản.
- Frontend gọi đúng API URL qua HTTPS.
- Tài liệu ghi rõ datastore chưa có và CRUD/auth chưa hoàn chỉnh.

## 10. Nguồn AWS chính thức

- [AmazonAPIGatewayAdministrator](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonAPIGatewayAdministrator.html)
- [AmazonS3FullAccess](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonS3FullAccess.html)
- [AWSLambda_FullAccess](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambda_FullAccess.html)
- [CloudWatchFullAccess](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/CloudWatchFullAccess.html)
- [CloudWatch managed policies](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/managed-policies-cloudwatch.html)
- [SecretsManagerReadWrite](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/SecretsManagerReadWrite.html)
- [Lambda execution role](https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html)
- [Hosting static website trên S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)
- [S3 presigned URL](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
- [Secrets Manager với .NET](https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieving-secrets-net-sdk.html)

