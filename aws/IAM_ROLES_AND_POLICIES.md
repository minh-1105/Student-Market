# IAM roles và policies hiện tại của Student Market

> Ảnh chụp trạng thái AWS tại ngày **2026-11-15**. Account: **`<AWS_ACCOUNT_ID>`**.
> Region workload: `ap-southeast-1`. AWS CLI profile: `student-market`.
> Tài liệu này không chứa giá trị secret hay access key.
>
> **Thay đổi so với bản 2026-11-03:** bản cũ mô tả account `<OLD_AWS_ACCOUNT_ID>` (user `<old-iam-user>`,
> group `student-market`, 2 execution role tạo tay). Dự án đã chuyển sang account
> `<AWS_ACCOUNT_ID>`; account cũ không còn là nơi triển khai.

## 1. Phạm vi và cách đọc tài liệu

Tài liệu mô tả trạng thái IAM lấy trực tiếp từ AWS bằng các lệnh chỉ đọc (mục 9), gồm:

- IAM user và group của account;
- AWS-managed policy, inline policy và customer-managed policy;
- execution role mà template IaC sẽ tạo cho hai Lambda của Student Market;
- service-linked role do AWS quản lý và các role không thuộc dự án;
- đối chiếu với template trong `aws/iac/` và `aws/iam/`.

AWS-managed policy có thể được AWS cập nhật mà không sửa repository; phần mô tả các policy
này là snapshot tại thời điểm kiểm tra.

## 2. Tổng quan

| Thành phần | Số lượng | Ghi chú |
|---|---:|---|
| IAM user | 3 | `<iam-user>` (deploy), `nhat-minh`, `minh-tho` |
| IAM group | 1 | `flea-market` — thành viên: `<iam-user>`, `nhat-minh` |
| AWS-managed policy gắn với group | 7 | Có `AdministratorAccess` (bao trùm 6 policy còn lại) |
| Inline policy (user/group) | 0 | |
| Customer-managed policy | 2 | Sinh ra từ các bài lab, không thuộc dự án (mục 6) |
| Execution role của dự án | **0** | Chưa deploy; CloudFormation sẽ tạo 2 role (mục 4) |
| Service-linked role | 4 | RDS, Resource Explorer, Support, Trusted Advisor |
| Role khác (không thuộc dự án) | 3 | Lambda tutorial, RDS monitoring, VPC Flow Logs |
| Permissions boundary | 0 | Không user nào có boundary |
| MFA | 0 / 3 user | Chưa user nào bật MFA |

Tại thời điểm kiểm tra, account **chưa có** resource nào của Student Market:

- không có CloudFormation stack (`student-market-dev`, `student-market-dev-media`);
- không có Lambda function, API Gateway HTTP API, S3 bucket, CloudFront distribution, SQS queue
  trong `ap-southeast-1`.

Đã có một budget: `AWS-FreeTier-Budget` — COST, MONTHLY, giới hạn **$100**.

## 3. User và group

### 3.1 IAM user `<iam-user>` — user triển khai

| Thuộc tính | Giá trị |
|---|---|
| ARN | `arn:aws:iam::<AWS_ACCOUNT_ID>:user/<iam-user>` |
| Ngày tạo | 2026-11-12 |
| Group | `flea-market` |
| Policy gắn trực tiếp | Không có (managed hoặc inline) |
| Access key | 1, Active (tạo 2026-11-12) — dùng cho profile `student-market` |
| Đăng nhập console | Có |
| MFA | Chưa bật |
| Permissions boundary | Không có |

Mọi quyền của `<iam-user>` đến từ group `flea-market`. Quyết định của dự án: giữ quyền admin cho
user này vì đây là account dev/sandbox của đồ án, ưu tiên đơn giản.

### 3.2 Group `flea-market`

Không có inline policy. Có 7 AWS-managed policy:

| Policy | Ghi chú |
|---|---|
| `AdministratorAccess` | `*:*` trên `Resource: "*"`. Bao trùm toàn bộ các policy bên dưới |
| `IAMFullAccess` | `iam:*` — đã nằm trong `AdministratorAccess` |
| `AmazonAPIGatewayAdministrator` | `apigateway:*` — trùng |
| `CloudFrontFullAccess` | `cloudfront:*` và một số quyền liên quan — trùng |
| `SecretsManagerReadWrite` | `secretsmanager:*` — trùng |
| `AmazonS3FullAccess` | `s3:*`, `s3-object-lambda:*` — trùng |
| `AWSLambda_FullAccess` | `lambda:*` và `iam:PassRole` cho Lambda — trùng |

Vì đã có `AdministratorAccess`, 6 policy còn lại không cấp thêm quyền nào; chúng chỉ làm danh sách
dài hơn. Có thể gỡ cho gọn mà không ảnh hưởng triển khai.

Thành viên: `<iam-user>`, `nhat-minh` — cả hai đều có toàn quyền account.

### 3.3 IAM user `nhat-minh`

| Thuộc tính | Giá trị |
|---|---|
| Ngày tạo | 2026-10-05 |
| Group | `flea-market` (admin) |
| Policy gắn trực tiếp | `IAMUserChangePassword` |
| Access key | 1, Active |
| Đăng nhập console | Có |
| MFA | Chưa bật |

### 3.4 IAM user `minh-tho`

| Thuộc tính | Giá trị |
|---|---|
| Ngày tạo | 2026-10-05 |
| Group | Không có |
| Policy gắn trực tiếp | `IAMUserChangePassword` |
| Access key | Không có |
| Đăng nhập console | Có |
| MFA | Chưa bật |

User này chỉ được đổi mật khẩu của chính mình; không có quyền gì với resource của dự án.

## 4. Execution role của Student Market

Hai role **chưa tồn tại**. Chúng được định nghĩa trong template và do CloudFormation tạo khi
deploy; tên role được **sinh tự động** (template không đặt `RoleName`), dạng:

| Role | Tạo bởi | Tên dự kiến |
|---|---|---|
| Role của Lambda API | SAM, từ `Policies:` của `ApiFunction` trong `aws/iac/api.yaml` | `student-market-dev-ApiFunctionRole-<chuỗi ngẫu nhiên>` |
| Role của ImageProcessor | `ImageProcessorRole` trong `aws/iac/media-pipeline.yaml` | `student-market-dev-media-ImageProcessorRole-<chuỗi ngẫu nhiên>` |

Cả hai chỉ tin `lambda.amazonaws.com` (`sts:AssumeRole`). Xóa stack thì role bị xóa theo.

### 4.1 Role của Lambda API (`api.yaml`)

| Nguồn quyền | Nội dung |
|---|---|
| `AWSLambdaVPCAccessExecutionRole` (AWS-managed) | Ghi CloudWatch Logs; tạo/xóa ENI khi Lambda gắn VPC. Hiện Lambda chạy ngoài VPC nên phần ENI không dùng tới |
| Inline `CreatePresignedRawImageUploads` | `s3:PutObject` trên `<MediaBucketName>/raw/*` — để ký presigned POST cho trình duyệt upload |
| Inline `VerifyRawImageUploads` | `s3:GetObject` trên `<MediaBucketName>/raw/*` — kiểm tra object khi `confirm` upload |

Không có quyền đọc `processed/*`, liệt kê hay xóa object. Không có quyền Secrets Manager:
`DbConnectionString` và `JwtSecretKey` được truyền làm biến môi trường qua tham số `NoEcho`.

### 4.2 Role của ImageProcessor (`media-pipeline.yaml`)

| Policy | Statement | Nội dung |
|---|---|---|
| `image-processor-runtime` (inline trong role) | `WriteFunctionLogs` | `logs:CreateLogStream`, `logs:PutLogEvents` chỉ trên log group `/aws/lambda/student-market-dev-media-image-processor` (log group do template tạo sẵn) |
| | `SendFailedEventsToDlq` | `sqs:SendMessage` chỉ trên `ImageProcessorFailureQueue` |
| `image-processor-s3` (`AWS::IAM::Policy` riêng) | `ReadRawImages` | `s3:GetObject` trên `MediaBucket/raw/*` |
| | `WriteProcessedImages` | `s3:PutObject` trên `MediaBucket/processed/*` |

Quyền S3 được tách thành policy riêng để tránh vòng phụ thuộc khi CloudFormation tạo S3
notification. Role không có quyền VPC, database hay Secrets Manager.

## 5. Service-linked role do AWS quản lý

AWS tạo và duy trì các role này (path `/aws-service-role/...`). Không gắn policy của dự án và
không sửa trust policy thủ công.

| Role | Service | Lần dùng gần nhất |
|---|---|---|
| `AWSServiceRoleForRDS` | `rds.amazonaws.com` | Chưa ghi nhận |
| `AWSServiceRoleForResourceExplorer` | `resource-explorer-2.amazonaws.com` | Chưa ghi nhận |
| `AWSServiceRoleForSupport` | `support.amazonaws.com` | Chưa ghi nhận |
| `AWSServiceRoleForTrustedAdvisor` | `trustedadvisor.amazonaws.com` | Chưa ghi nhận |

## 6. Role và policy không thuộc dự án

Các identity sau được tạo từ những lần thực hành trước đó, không được template Student Market
dùng tới:

| Tên | Loại | Ngày tạo | Trust / gắn kèm |
|---|---|---|---|
| `http-function-url-tutorial-role-3rxqgipu` | Role (`/service-role/`) | 2026-10-06 | `lambda.amazonaws.com`; gắn `AWSLambdaBasicExecutionRole-88e82df8-…` |
| `rds-monitoring-role` | Role | 2026-10-06 | `monitoring.rds.amazonaws.com`; gắn `AmazonRDSEnhancedMonitoringRole` |
| `VPCFlowLogs-Cloudwatch-1792557442781` | Role (`/service-role/`) | 2026-10-21 | `vpc-flow-logs.amazonaws.com`; gắn `VPCFlowLogs-CloudWatch-Policy-1792557628838` |
| `AWSLambdaBasicExecutionRole-88e82df8-748b-419a-aa55-154d9689d8f5` | Customer-managed policy | — | Gắn vào role tutorial ở trên |
| `VPCFlowLogs-CloudWatch-Policy-1792557628838` | Customer-managed policy | — | Gắn vào role VPC Flow Logs ở trên |

Không role nào có lần dùng gần nhất. Nếu không còn cần, có thể xóa để account gọn hơn
(xóa role trước, sau đó xóa customer-managed policy).

## 7. Ghi chú bảo mật

- **Chưa có MFA** cho cả 3 user, trong đó 2 user có toàn quyền account và có access key đang
  hoạt động (`<iam-user>`, `nhat-minh`). Bật MFA cho đăng nhập console là thay đổi rẻ nhất để giảm
  rủi ro mất tài khoản.
- **Group `flea-market` có 6 policy thừa** (mục 3.2). Gỡ đi không làm thay đổi quyền.
- **Runtime role của Lambda đã scope hẹp** theo prefix S3, log group và queue cụ thể; không dùng
  policy `FullAccess`. Giữ nguyên nguyên tắc này khi sửa template.
- Khi cần đưa secret ra khỏi biến môi trường, dùng SSM Parameter Store SecureString (miễn phí) và
  chỉ cấp quyền đọc đúng ARN parameter cho role của Lambda API (xem `aws.md` mục 13).

## 8. File nguồn trong repository

| File | Vai trò | Trạng thái |
|---|---|---|
| `aws/iac/api.yaml` | Định nghĩa role của Lambda API (qua `Policies:` của SAM) | **Nguồn chính** |
| `aws/iac/media-pipeline.yaml` | Định nghĩa `ImageProcessorRole` và `ImageProcessorS3Policy` | **Nguồn chính** |
| `aws/iam/student-market-deployer-policy.template.json` | Policy triển khai scope theo dự án | Chưa dùng — group đang có `AdministratorAccess` |
| `aws/iam/student-market-sam-deploy-policy.template.json` | Policy cho `sam deploy` | Chưa dùng — như trên |
| `aws/iam/lambda-trust-policy.json` | Trust policy cho quy trình tạo role thủ công | Cũ — template IaC đã tự tạo role |
| `aws/iam/*-runtime-policy.template.json` | Runtime policy cho quy trình tạo role thủ công | Cũ — còn quyền RDS secret/VPC không còn dùng |
| `aws/iam/*-runtime-policy.generated.json` | Bản đã điền placeholder | **Cũ** — chứa account ID cũ `<OLD_AWS_ACCOUNT_ID>` |
| `aws/iam/README.md` | Hướng dẫn tạo role thủ công | Cũ — không cần cho cách deploy bằng SAM |

## 9. Lệnh kiểm tra lại

Các lệnh sau chỉ đọc dữ liệu:

```powershell
$P = "--profile", "student-market", "--region", "ap-southeast-1"
aws sts get-caller-identity @P
aws iam list-users @P
aws iam list-groups-for-user --user-name <iam-user> @P
aws iam list-attached-group-policies --group-name flea-market @P
aws iam get-group --group-name flea-market @P
aws iam list-roles @P --query "Roles[].RoleName"
aws iam list-policies --scope Local @P
aws budgets describe-budgets --account-id <AWS_ACCOUNT_ID> @P
aws cloudformation list-stacks @P

# Sau khi deploy: xem hai execution role do CloudFormation tạo
aws cloudformation describe-stack-resource --stack-name student-market-dev `
  --logical-resource-id ApiFunctionRole @P
aws cloudformation describe-stack-resource --stack-name student-market-dev-media `
  --logical-resource-id ImageProcessorRole @P
```

Khi audit lại, luôn đọc phiên bản mặc định mới nhất của AWS-managed policy thay vì giả định nội
dung không thay đổi.
