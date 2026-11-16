# IAM policies cho Student Market dev

> **⚠️ Lỗi thời (15/11/2026).** Tài liệu này mô tả kiến trúc cũ (Amplify, RDS trong VPC, Secrets
> Manager) và quy trình **tạo execution role bằng tay**. Cách deploy hiện tại dùng AWS SAM
> (`aws/iac/api.yaml`, `aws/iac/media-pipeline.yaml`): CloudFormation **tự tạo** hai execution role,
> nên không cần chạy các lệnh `create-role` / `put-role-policy` bên dưới.
>
> - Các file `*.generated.json` chứa account cũ `<OLD_AWS_ACCOUNT_ID>` — không dùng cho account hiện tại `<AWS_ACCOUNT_ID>`.
> - `lambda-trust-policy.json`, `*-runtime-policy.template.json`: không còn dùng (runtime policy nay nằm trong template SAM).
> - `student-market-sam-deploy-policy.template.json`: vẫn dùng được nếu cần user deploy không có quyền admin (xem `aws.md` mục 5.2).
> - Trạng thái IAM thực tế: `aws/IAM_ROLES_AND_POLICIES.md`.

Bộ policy này bám theo kiến trúc trong `manual.md`: Amplify Hosting, API Gateway
HTTP API, Lambda trong VPC, RDS PostgreSQL, Secrets Manager, S3 media pipeline,
CloudFront và CloudWatch Logs. API Lambda và image-processor Lambda bắt buộc dùng
hai execution role khác nhau.

## Các file

- `lambda-trust-policy.json`: trust policy dùng chung để AWS Lambda assume từng role.
- `api-lambda-runtime-policy.template.json`: runtime policy của role
  `student-market-dev-api-role`; cho phép ghi log, tạo ENI trong VPC, đọc đúng
  secret RDS và tạo presigned upload cho `raw/*`.
- `image-processor-runtime-policy.template.json`: runtime policy của role
  `student-market-dev-image-processor-role`; chỉ đọc `raw/*`, ghi `processed/*`
  và ghi CloudWatch Logs.
- `student-market-deployer-policy.template.json`: policy cho user/role triển khai môi
  trường dev. Không gắn policy này vào Lambda.

## Thay placeholder

Các file `.template.json` chưa thể đưa thẳng lên IAM. Trước khi dùng, thay:

- `ACCOUNT_ID`: AWS account ID gồm 12 chữ số.
- `DB_SECRET_ARN`: ARN đầy đủ lấy từ
  `DBInstances[0].MasterUserSecret.SecretArn` sau khi tạo RDS.
- `IMAGE_BUCKET_NAME`: tên private S3 bucket chứa ảnh, ví dụ
  `student-market-dev-images-ACCOUNT_ID`.

Ví dụ PowerShell:

```powershell
$AwsProfile = "default"
$AwsRegion = "ap-southeast-1"
$AccountId = aws sts get-caller-identity `
  --profile $AwsProfile --query Account --output text
$ImageBucketName = "student-market-dev-images-$AccountId"
$DbSecretArn = aws rds describe-db-instances `
  --db-instance-identifier student-market-dev-postgres `
  --query "DBInstances[0].MasterUserSecret.SecretArn" `
  --output text --region $AwsRegion --profile $AwsProfile

(Get-Content .\aws\iam\api-lambda-runtime-policy.template.json -Raw) `
  .Replace("ACCOUNT_ID", $AccountId) `
  .Replace("DB_SECRET_ARN", $DbSecretArn) `
  .Replace("IMAGE_BUCKET_NAME", $ImageBucketName) |
  Set-Content .\aws\iam\api-lambda-runtime-policy.generated.json -Encoding utf8

(Get-Content .\aws\iam\image-processor-runtime-policy.template.json -Raw) `
  .Replace("ACCOUNT_ID", $AccountId) `
  .Replace("IMAGE_BUCKET_NAME", $ImageBucketName) |
  Set-Content .\aws\iam\image-processor-runtime-policy.generated.json -Encoding utf8

(Get-Content .\aws\iam\student-market-deployer-policy.template.json -Raw) `
  .Replace("ACCOUNT_ID", $AccountId) |
  Set-Content .\aws\iam\student-market-deployer-policy.generated.json -Encoding utf8
```

Không commit các file `*.generated.json`, vì chúng chứa thông tin tài khoản và ARN
resource thực tế.

## Tạo hai execution role riêng

Tạo role cho API Lambda:

```powershell
$ApiRoleName = "student-market-dev-api-role"

aws iam create-role `
  --role-name $ApiRoleName `
  --assume-role-policy-document file://aws/iam/lambda-trust-policy.json `
  --profile $AwsProfile

aws iam put-role-policy `
  --role-name $ApiRoleName `
  --policy-name student-market-dev-api-runtime `
  --policy-document file://aws/iam/api-lambda-runtime-policy.generated.json `
  --profile $AwsProfile
```

Tạo role cho image-processor Lambda:

```powershell
$ImageRoleName = "student-market-dev-image-processor-role"

aws iam create-role `
  --role-name $ImageRoleName `
  --assume-role-policy-document file://aws/iam/lambda-trust-policy.json `
  --profile $AwsProfile

aws iam put-role-policy `
  --role-name $ImageRoleName `
  --policy-name student-market-dev-image-processor-runtime `
  --policy-document file://aws/iam/image-processor-runtime-policy.generated.json `
  --profile $AwsProfile
```

API runtime policy đã bao gồm quyền tương đương cần thiết từ
`AWSLambdaBasicExecutionRole` và `AWSLambdaVPCAccessExecutionRole`, nên không cần
gắn thêm hai managed policy đó. Image processor không chạy trong VPC và không được
đọc database secret. Policy deployer không có quyền `iam:AttachRolePolicy`; cách
này tránh việc gắn nhầm managed policy có quyền quá rộng vào execution role.

Nếu RDS/managed secret chưa tồn tại, có thể tạo API role trước với log, VPC và S3
permissions nhưng tạm bỏ statement `ReadOnlyTheRdsManagedSecret`. Khi RDS đã tạo,
regenerate policy bằng đúng `DB_SECRET_ARN` rồi chạy lại `put-role-policy`; không
dùng wildcard cho toàn bộ Secrets Manager.

## Kiểm chứng role và Lambda

Xác nhận hai role tồn tại và có ARN khác nhau:

```powershell
aws iam get-role --role-name $ApiRoleName `
  --query "Role.Arn" --output text --profile $AwsProfile

aws iam get-role --role-name $ImageRoleName `
  --query "Role.Arn" --output text --profile $AwsProfile
```

Sau khi deploy hai function, xác nhận mỗi function dùng đúng role:

```powershell
aws lambda get-function-configuration `
  --function-name student-market-dev-api `
  --query Role --output text --region $AwsRegion --profile $AwsProfile

aws lambda get-function-configuration `
  --function-name student-market-dev-image-processor `
  --query Role --output text --region $AwsRegion --profile $AwsProfile
```

Kết quả hợp lệ phải là hai ARN khác nhau, kết thúc lần lượt bằng
`student-market-dev-api-role` và `student-market-dev-image-processor-role`.

## Tạo policy cho người/role deploy

Việc tạo customer-managed policy cần được thực hiện bởi administrator hoặc một
principal đã có quyền quản trị IAM:

```powershell
aws iam create-policy `
  --policy-name student-market-dev-deployer `
  --policy-document file://aws/iam/student-market-deployer-policy.generated.json `
  --profile $AwsProfile
```

Sau đó administrator gắn policy này vào đúng user/role triển khai. Policy deployer
vẫn phải dùng `Resource: "*"` cho một số thao tác EC2 discovery/networking vì các
API đó không hỗ trợ giới hạn resource đồng đều. Quyền được giới hạn thêm theo
Region `ap-southeast-1`; sau khi đã biết VPC, subnet, security group và endpoint ID,
nên thay các wildcard bằng ARN cụ thể hoặc kiểm soát bằng tag.

Kết nối GitHub/GitLab/Bitbucket trong Amplify có cơ chế ủy quyền riêng. Nếu account
dùng AWS CodeConnections hoặc một Amplify service role, administrator phải cấp
thêm đúng quyền cho connection/role đó; không thêm quyền repository vào Lambda.

Nếu secret dùng customer-managed KMS key thay vì key mặc định của Secrets Manager,
thêm `kms:Decrypt` cho đúng key ARN vào runtime policy.

## API Gateway gọi Lambda

Đây là resource-based permission trên Lambda, không phải policy của execution role:

```powershell
aws lambda add-permission `
  --function-name student-market-dev-api `
  --statement-id apigateway-http-api-invoke `
  --action lambda:InvokeFunction `
  --principal apigateway.amazonaws.com `
  --source-arn "arn:aws:execute-api:ap-southeast-1:$AccountId`:$ApiId/*" `
  --region $AwsRegion --profile $AwsProfile
```

Không cấp `lambda:InvokeFunction` công khai với principal `*`.
