# Hướng dẫn AWS cho Student Flea Market

> Cập nhật: 15/11/2026 · Region: **ap-southeast-1 (Singapore)** · Tài khoản: `<AWS_ACCOUNT_ID>`
> (profile AWS CLI `student-market`, IAM user `<iam-user>`). Tài khoản cũ `<OLD_AWS_ACCOUNT_ID>` không còn dùng để deploy.
>
> Tài liệu này dành cho cả nhóm: đọc phần 1–3 để hiểu tổng quan, phần 4 để chạy local,
> phần 5–8 khi chuẩn bị deploy, phần 13 cho kế hoạch tối ưu chi phí.

---

## 1. Tóm tắt nhanh

- **Backend**: ASP.NET Core 8 chạy trên **AWS Lambda**, được gọi qua **API Gateway (HTTP API)**.
- **Ảnh tin đăng**: trình duyệt upload thẳng lên **S3** (không đi qua backend) → một **Lambda xử lý ảnh** đổi sang WebP → phân phối qua **CloudFront**.
- **Database**: PostgreSQL trên **Supabase** (gói Free, region Singapore). Lambda **không** cần vào VPC.
- **Frontend**: Next.js build ra trang tĩnh (`output: 'export'`), host trên **Vercel** (gói Hobby).
- **Hạ tầng dạng code (IaC)**: 2 template AWS SAM trong `aws/iac/`.

**Trạng thái hiện tại:** code và template đã sẵn sàng, **chưa deploy gì lên AWS**. Đang chờ bổ sung quyền IAM (xem phần 5).

### 1.0. Mỗi phần chạy ở đâu?

| Nơi chạy | Thành phần | Chi phí |
|---|---|---|
| **Vercel** (Hobby) | Frontend Next.js (trang tĩnh) | Miễn phí |
| **Supabase** (Free) | Database PostgreSQL — **chỉ dùng làm database**, không dùng Auth/Storage của Supabase | Miễn phí |
| **AWS** | API backend + toàn bộ phần xử lý ảnh (chi tiết bên dưới) | ~$0–3/tháng, trừ vào $170 credit |

**AWS chạy những gì** — gồm 2 stack:

**Stack API** (`aws/iac/api.yaml`, tên stack `student-market-dev`)

| Dịch vụ | Vai trò |
|---|---|
| **Lambda** (API .NET 8) | Chạy toàn bộ backend: đăng nhập/JWT, tin đăng, danh mục, chat (REST), tạo link upload ảnh. Kết nối Supabase qua pooler |
| **API Gateway** (HTTP API) | Địa chỉ HTTPS công khai để frontend trên Vercel gọi vào, đã cấu hình CORS |
| **CloudWatch** | Log và alarm báo lỗi của API |

**Stack ảnh** (`aws/iac/media-pipeline.yaml`, tên stack `student-market-dev-media`)

| Dịch vụ | Vai trò |
|---|---|
| **S3** | Lưu ảnh. `raw/`: ảnh gốc trình duyệt upload thẳng lên; `processed/`: ảnh WebP đã xử lý. Bucket luôn private |
| **Lambda** (ImageProcessor) | Tự chạy khi có ảnh mới trong `raw/`, tạo `large.webp` (1600px) và `thumbnail.webp` (480px) |
| **SQS** | Lưu lại các lần xử lý ảnh bị lỗi để xem lại |
| **CloudFront** | CDN phân phối ảnh `processed/` qua HTTPS |
| **CloudWatch** | Log và alarm của Lambda xử lý ảnh (lỗi, throttle, chạy lâu, hàng đợi lỗi) |

**Phần quản lý đi kèm**

- **IAM**: mỗi Lambda có role riêng, chỉ đúng quyền cần dùng; một IAM user dùng để deploy.
- **CloudFormation**: AWS SAM dùng để tạo/cập nhật/xóa 2 stack trên.
- **Budgets / Cost Explorer**: theo dõi credit (xem phần 13).

**Không chạy trên AWS:** frontend (Vercel), database (Supabase). Dự án **không dùng** RDS, VPC, NAT Gateway,
EC2, Cognito. Amplify chỉ là phương án phụ cho frontend (phần 10.1), mặc định không dùng.

**Luồng chính:**

1. Người dùng mở web trên **Vercel** → frontend gọi **API Gateway** → **Lambda API** → đọc/ghi **Supabase**.
2. Đăng ảnh: Lambda API cấp link upload → trình duyệt upload thẳng lên **S3** `raw/` → **Lambda ImageProcessor**
   tạo ảnh WebP vào `processed/` → người dùng xem ảnh qua **CloudFront**.

### 1.1. Quyết định hạ tầng (cập nhật 13/11/2026)

Dự án là **đồ án môn học**, ngân sách là **$170 credit** của gói AWS Free (xem phần 13). Vì vậy:

| Thành phần | Chọn | Lý do | Thay cho |
|---|---|---|---|
| Frontend | **Vercel** (Hobby, miễn phí) | Không cần quyền Amplify, hỗ trợ Next.js sẵn, không tốn credit AWS | AWS Amplify |
| Database | **Supabase PostgreSQL** (Free) | RDS là khoản tốn credit nhiều nhất; Supabase miễn phí và vẫn là PostgreSQL nên code không đổi | AWS RDS |
| API + ảnh | **AWS** (Lambda, API Gateway, S3, CloudFront) | Gần như nằm hết trong mức miễn phí | — |

Hệ quả:

- **Không cần** quyền RDS, VPC, Amplify ở phần 5.2. Chỉ cần quyền CloudFormation/SAM, IAM role, SQS.
- Deploy `api.yaml` với `SubnetIds`/`SecurityGroupIds` **để trống** → Lambda chạy ngoài VPC, không cần NAT
  hay VPC endpoint.
- Chi phí AWS dự kiến **~$0–3/tháng** (phương án A ở phần 13.2).
- Nếu sau này môn học yêu cầu toàn bộ chạy trên AWS: chuyển DB sang RDS theo phương án B (phần 13), chỉ đổi
  connection string và tham số VPC.

### 1.2. Việc cần lưu ý với Supabase và Vercel

**Supabase**

1. **Tạo project ở region Singapore** (`ap-southeast-1`), cùng region với Lambda để giảm độ trễ.
2. **Lambda phải dùng connection pooler, không dùng direct connection.** Direct connection
   (`db.<project>.supabase.co:5432`) chỉ có **IPv6**, Lambda ngoài VPC không kết nối được.
   Lấy chuỗi kết nối tại **Project Settings → Database → Connection string**:

   | Dùng cho | Chế độ pooler | Cổng | Ghi chú |
   |---|---|---|---|
   | Lambda API (runtime) | **Transaction** | `6543` | Nhiều Lambda chạy song song không làm hết connection |
   | EF migration / seed | **Session** | `5432` (host pooler) | Migration cần session đầy đủ |

   Connection string cho Lambda (transaction mode):
   ```
   Host=aws-0-ap-southeast-1.pooler.supabase.com;Port=6543;Database=postgres;Username=postgres.<project-ref>;Password=...;SSL Mode=Require;Trust Server Certificate=true;No Reset On Close=true;Maximum Pool Size=5
   ```
   `No Reset On Close=true` là bắt buộc khi đi qua pooler transaction mode. Host chính xác lấy từ dashboard.
3. **Migration nên chạy tay** bằng connection string session mode từ máy dev, rồi deploy API với
   `SkipDatabaseSeed=true`. Lý do: chạy migration lúc Lambda khởi động qua transaction pooler dễ lỗi,
   và làm cold start chậm.
4. **Giới hạn gói Free:** DB **500 MB**, project **tự tạm dừng sau 7 ngày không có truy cập**.
   → Vào dashboard bấm *Restore* trước buổi demo, hoặc truy cập API định kỳ. Ảnh nằm trên S3 nên
   500 MB là đủ cho đồ án.
5. Chỉ dùng Supabase như **PostgreSQL thuần**. Không dùng Supabase Auth/Storage, vì API đã có JWT riêng
   và ảnh đã dùng S3.
6. Sao lưu: gói Free **không có** backup tự khôi phục được. Định kỳ chạy `pg_dump` (lệnh ở phần 13.5, B1).

**Vercel**

1. Import repo, đặt **Root Directory** = `student-flea-market-fe`. Vercel tự nhận Next.js, không cần `amplify.yml`.
2. Đặt biến môi trường **trước khi build**: `NEXT_PUBLIC_API_URL=<ApiBaseUrl>/api`. Biến `NEXT_PUBLIC_*`
   được gắn vào lúc build, nên đổi giá trị thì phải **redeploy**.
3. **CORS:** điền đúng domain production (ví dụ `https://student-market.vercel.app`) vào `FrontendOrigins`
   cho **cả hai** stack. Không dùng `https://*.vercel.app`. Link preview của Vercel sẽ bị CORS chặn
   (chấp nhận được, chỉ test trên domain production).
4. Token đang lưu ở `localStorage` và gửi qua header `Authorization`, nên frontend và API khác domain
   **không** gặp vấn đề cookie bên thứ ba.
5. Gói Hobby chỉ dành cho mục đích phi thương mại, phù hợp đồ án.

### 1.3. Kết nối Vercel, Supabase và AWS

#### Sơ đồ kết nối

```
  ┌──────────────┐  (1) NEXT_PUBLIC_API_URL   ┌──────────────────────┐  (3) DbConnectionString  ┌──────────────┐
  │   Vercel     │ ─────────────────────────▶ │ AWS: API Gateway     │ ───────────────────────▶ │  Supabase    │
  │  (frontend)  │ ◀── (2) CORS cho phép ──── │      + Lambda API    │   pooler :6543, SSL      │  PostgreSQL  │
  └──────┬───────┘     domain Vercel          └──────────┬───────────┘                          └──────────────┘
         │                                               │ (4) MediaBucketName, CloudFrontBaseUrl
         │ (5) upload ảnh thẳng lên S3 (CORS S3)         ▼
         └─────────────────────────────────────▶ ┌──────────────────────┐
         ◀──── (6) tải ảnh qua CloudFront ─────── │ AWS: S3 + CloudFront │
                                                  └──────────────────────┘
```

**Vercel và Supabase không kết nối trực tiếp với nhau.** Frontend chỉ gọi API trên AWS; chỉ Lambda API
mới biết connection string của Supabase. → **Không** đặt bất kỳ key/mật khẩu Supabase nào vào Vercel.

#### Giá trị nào lấy ở đâu, dán vào đâu

| Giá trị | Lấy ở đâu | Dán vào đâu |
|---|---|---|
| Connection string **transaction mode** (`:6543`) | Supabase → Project Settings → Database | Tham số `DbConnectionString` khi deploy `api.yaml` |
| Connection string **session mode** (`:5432` host pooler) | như trên | Chỉ dùng trên máy dev để chạy migration (phần 7, bước 1) |
| `MediaBucketName`, `CloudFrontBaseUrl` | Output stack `student-market-dev-media` | Tham số cùng tên khi deploy `api.yaml` |
| `ApiBaseUrl` | Output stack `student-market-dev` | Vercel → Settings → Environment Variables: `NEXT_PUBLIC_API_URL=<ApiBaseUrl>/api` |
| Domain production Vercel (`https://<ten-project>.vercel.app`) | Vercel → project → Domains | Tham số `FrontendOrigins` của **cả hai** stack |

Xem lại output của stack:

```powershell
aws cloudformation describe-stacks --stack-name student-market-dev-media --query "Stacks[0].Outputs" --profile student-market --region ap-southeast-1
aws cloudformation describe-stacks --stack-name student-market-dev       --query "Stacks[0].Outputs" --profile student-market --region ap-southeast-1
```

#### Thứ tự thiết lập

Vercel cần URL của API, còn API lại cần domain của Vercel cho CORS. Cách gỡ: **tạo project Vercel trước
để có domain** (domain `<ten-project>.vercel.app` biết ngay khi tạo), rồi mới deploy API.

| Bước | Làm gì | Kết quả |
|---|---|---|
| 1 | Tạo project Supabase (Singapore), chạy migration + seed từ máy dev (phần 7, bước 1) | Connection string transaction mode |
| 2 | Tạo project Vercel, đặt Root Directory = `student-flea-market-fe`. Lần build đầu chưa gọi được API cũng không sao | Domain production Vercel |
| 3 | Deploy stack ảnh với `FrontendOrigins=<domain Vercel>` | `MediaBucketName`, `CloudFrontBaseUrl` |
| 4 | Deploy stack API với connection string, 2 output ở bước 3, `FrontendOrigins=<domain Vercel>`, `SkipDatabaseSeed=true`, **để trống** `SubnetIds`/`SecurityGroupIds` | `ApiBaseUrl` |
| 5 | Vercel: đặt `NEXT_PUBLIC_API_URL=<ApiBaseUrl>/api` rồi **Redeploy** | Frontend gọi được API |
| 6 | Kiểm tra theo mục "Kiểm tra từng kết nối" bên dưới | |

> **Mỗi lần `sam build` ghi đè thư mục `.aws-sam/build`.** Luôn chạy `sam build` của đúng template ngay trước
> `sam deploy` stack đó, nếu không sẽ deploy nhầm template của stack kia.

> **Cập nhật lại tham số** (đổi domain, đổi mật khẩu DB…): chạy lại `sam deploy --guided` và nhập lại.
> Tham số bí mật (`DbConnectionString`, `JwtSecretKey`) phải nhập lại mỗi lần. Kiểm tra `samconfig.toml`
> **không** chứa mật khẩu trước khi commit.

#### Kết nối (3): Lambda API → Supabase

- Dùng **pooler transaction mode** (`:6543`), username dạng `postgres.<project-ref>`, có `SSL Mode=Require`
  và `No Reset On Close=true` (mẫu đầy đủ ở phần 1.2).
- Lambda **không có IP cố định** → trong Supabase **Database → Network Restrictions** phải để cho phép mọi IP
  (mặc định). Bảo vệ bằng mật khẩu mạnh + SSL. Nên bật **Enforce SSL** trong Supabase.
- **Test trước trên máy dev**, trước khi deploy:
  ```powershell
  cd student-flea-market-be
  $env:ConnectionStrings__DefaultConnection = "<connection string transaction mode>"
  $env:SkipDatabaseSeed = "true"
  dotnet run --project .\StudentFleaMarket.API --launch-profile http
  # Mở http://localhost:5033/health và thử gọi một API đọc dữ liệu
  ```
- Mật khẩu DB chỉ nằm trong: tham số deploy (NoEcho) và máy dev của người deploy. **Không** commit vào
  `appsettings*.json`, `samconfig.toml` hay tài liệu.

#### Kết nối (1) và (2): Vercel → API

- `NEXT_PUBLIC_API_URL` **bắt buộc** đặt trên Vercel. Nếu thiếu, code sẽ dùng mặc định `/api`
  (`src/lib/api-client.ts`) → frontend gọi vào chính Vercel và nhận **404**.
- Giá trị phải kết thúc bằng `/api`, **không** có dấu `/` ở cuối:
  `https://xxxx.execute-api.ap-southeast-1.amazonaws.com/api`.
- Biến `NEXT_PUBLIC_*` được gắn vào lúc build → đổi giá trị thì phải **Redeploy** trên Vercel.
- CORS của API do ASP.NET Core xử lý qua `Cors__AllowedOrigins` (lấy từ `FrontendOrigins`). Origin phải
  **khớp chính xác**: có `https://`, **không** có `/` ở cuối. Nhiều domain thì cách nhau bằng dấu phẩy.
- Nếu `FrontendOrigins` để trống, API cho phép mọi domain — **không** để trống trên AWS.

#### Kết nối (4), (5), (6): ảnh

- Lambda API cần `MediaBucketName` và `CloudFrontBaseUrl` (output stack ảnh). Thiếu `MediaBucketName` thì API
  không khởi động.
- Trình duyệt upload **thẳng lên S3** → CORS của bucket (trong `media-pipeline.yaml`) cũng phải có domain Vercel.
  Đây là nơi hay bị quên nhất.
- Ảnh hiển thị qua CloudFront. Frontend đang đặt `images.unoptimized: true` trong `next.config.ts`, nên
  **không** cần khai báo domain CloudFront cho Next.js.

#### Kiểm tra từng kết nối

```powershell
# Lambda → Supabase: API sống và đọc được DB
curl.exe -i "<ApiBaseUrl>/health"
curl.exe -i "<ApiBaseUrl>/api/Items/categories"

# CORS của API: phải thấy header Access-Control-Allow-Origin: https://<ten-project>.vercel.app
curl.exe -i -X OPTIONS "<ApiBaseUrl>/api/Items/categories" `
  -H "Origin: https://<ten-project>.vercel.app" `
  -H "Access-Control-Request-Method: GET"
```

> Trong Windows PowerShell 5.1, dùng `curl.exe` (không phải `curl`, vì `curl` là alias của `Invoke-WebRequest`).
> `/api/Items/categories` là endpoint GET công khai (không cần đăng nhập) và có đọc database.

Trên trình duyệt (mở domain Vercel, bật DevTools → tab Network):

- [ ] Request API đi tới `execute-api.ap-southeast-1.amazonaws.com`, **không** phải `vercel.app/api`.
- [ ] Đăng nhập thành công, không có lỗi CORS trong Console.
- [ ] Đăng tin có ảnh: request `presign` → POST lên S3 trả `204` → `confirm` thành công.
- [ ] Ảnh hiển thị từ domain `*.cloudfront.net` (có thể chậm vài giây lần đầu).

#### Lỗi kết nối thường gặp

| Hiện tượng | Nguyên nhân | Cách xử lý |
|---|---|---|
| Frontend gọi `https://<vercel>/api/...` và nhận 404 | Thiếu `NEXT_PUBLIC_API_URL` lúc build | Đặt biến trên Vercel rồi **Redeploy** |
| Lỗi CORS khi gọi API | `FrontendOrigins` sai (thiếu `https://`, thừa `/` cuối, sai domain, đang dùng link preview) | Sửa tham số, deploy lại `api.yaml` |
| Lỗi CORS khi upload ảnh | CORS của S3 chưa có domain Vercel | Deploy lại `media-pipeline.yaml` với `FrontendOrigins` đúng |
| API trả 500, log có `Network is unreachable` / timeout tới Supabase | Dùng direct connection (IPv6) thay vì pooler | Đổi sang host `*.pooler.supabase.com` |
| Log có `prepared statement ... already exists` / lỗi lạ khi qua pooler | Thiếu `No Reset On Close=true` hoặc đang chạy migration qua transaction mode | Thêm tham số; migration chạy bằng session mode |
| Log có `password authentication failed` | Sai username (pooler cần `postgres.<project-ref>`) hoặc sai mật khẩu | Copy lại connection string từ Supabase |
| API đột nhiên lỗi kết nối DB sau một thời gian không dùng | Supabase Free tự tạm dừng sau 7 ngày | Vào Supabase dashboard bấm **Restore** |

---

## 2. Kiến trúc

```
                         ┌─────────────────────────┐
  Người dùng ──HTTPS──▶  │  Vercel (Frontend tĩnh)  │
                         └────────────┬────────────┘
                                      │ gọi API (JWT)
                                      ▼
                         ┌─────────────────────────┐        ┌──────────────┐     Supabase PostgreSQL
                         │ API Gateway (HTTP API)  │──────▶ │ Lambda API   │──▶  (pooler :6543, SSL)
                         └─────────────────────────┘        │ (.NET 8)     │
                                                            └──────┬───────┘
                                                                   │ tạo link upload (presign)
   Trình duyệt ──POST ảnh trực tiếp──────────────────────────────▶ │
                                                                   ▼
                         ┌──────────────────────────────────────────────────┐
                         │ S3 bucket (private)                              │
                         │   raw/...        ← ảnh gốc người dùng upload      │
                         │   processed/...  ← ảnh WebP đã xử lý              │
                         └──────┬───────────────────────────────▲──────────┘
                     sự kiện    │ ObjectCreated (chỉ raw/)       │ ghi WebP
                                ▼                                │
                         ┌─────────────────────────┐             │
                         │ Lambda ImageProcessor   │─────────────┘
                         └─────────────────────────┘
                                                            ┌──────────────┐
   Trình duyệt ◀──── ảnh processed qua HTTPS/CDN ────────── │  CloudFront  │ (chỉ đọc processed/)
                                                            └──────────────┘
```

Nguyên tắc bảo mật chính:

- Bucket **luôn private**. Không ai đọc được `raw/` từ bên ngoài; CloudFront chỉ đọc `processed/`.
- Lambda chỉ có đúng quyền cần dùng (least privilege), **không** gắn các policy `*FullAccess`.
- Không có access key nào trong code hay appsettings. Trên AWS, Lambda lấy quyền từ **IAM role**.

---

## 3. Các thành phần và file liên quan

| Thành phần | Vị trí | Ghi chú |
|---|---|---|
| API backend | `student-flea-market-be/StudentFleaMarket.API` | Đã có adapter Lambda (`AddAWSLambdaHosting`). Chạy local vẫn dùng Kestrel như bình thường. |
| Upload ảnh (presign + confirm) | `StudentFleaMarket.Infrastructure/Media` | Dịch vụ S3, cấu hình section `MediaStorage`. |
| Lambda xử lý ảnh | `student-flea-market-be/StudentFleaMarket.ImageProcessor` | Tạo `large.webp` (1600px) và `thumbnail.webp` (480px). |
| Template ảnh | `aws/iac/media-pipeline.yaml` | S3, Lambda xử lý ảnh, SQS lưu lỗi, alarm, CloudFront. |
| Template API | `aws/iac/api.yaml` | Lambda API, HTTP API, log, alarm. |
| Policy IAM | `aws/iam/` | Policy cho các role Lambda và cho người deploy. |
| LocalStack (giả lập AWS) | `aws/localstack/` | Chạy S3 + Lambda trên máy. |
| Frontend | `student-flea-market-fe` | Deploy trên Vercel. `amplify.yml` giữ lại phòng khi quay về Amplify. |
| Database | Supabase (ngoài AWS) | Xem phần 1.2. |

---

## 4. Chạy local (không cần tài khoản AWS)

### 4.1. Chỉ chạy API, không cần upload ảnh

```powershell
cd student-flea-market-be
dotnet run --project .\StudentFleaMarket.API --launch-profile http
```

Cần PostgreSQL local và connection string trong user-secrets (xem README của backend).

### 4.2. Chạy cả luồng upload ảnh bằng LocalStack

1. Mở Docker Desktop.
2. Lấy LocalStack Auth Token tại <https://app.localstack.cloud/workspace/auth-tokens> và lưu vào file
   `.env.localstack` (file này đã bị Git ignore, **không commit**):
   ```dotenv
   LOCALSTACK_AUTH_TOKEN=your-token
   ```
3. Từ thư mục gốc workspace:
   ```powershell
   .\aws\localstack\Initialize-LocalStack.ps1          # S3 + Lambda xử lý ảnh
   .\aws\localstack\Initialize-LocalStack.ps1 -SkipImagePipeline   # chỉ S3
   ```
4. Chạy API như mục 4.1. Cấu hình `appsettings.Development.json` đã trỏ sẵn tới
   `http://localhost:4566`, bucket `student-market-local-images`.

Dừng LocalStack: `docker compose -f aws/localstack/docker-compose.yml down`

> Credential `test/test` chỉ dùng cho LocalStack. **Không** copy endpoint hay credential này lên AWS thật.

---

## 5. Quyền IAM cần có trước khi deploy

### 5.1. Đã đủ — không cần xin thêm quyền

- IAM user deploy `<iam-user>` thuộc group `flea-market`, có `AdministratorAccess`, nên đã chạy được
  `sam deploy` (CloudFormation, SAM transform, IAM, Lambda, S3, CloudFront, SQS, CloudWatch).
- **Execution role cho Lambda không cần tạo trước.** CloudFormation tự tạo 2 role khi deploy
  (role của Lambda API từ `Policies:` trong `api.yaml`, `ImageProcessorRole` trong
  `media-pipeline.yaml`), tên sinh tự động, xóa stack thì role bị xóa theo.
- Chi tiết user, group, role và policy: `aws/IAM_ROLES_AND_POLICIES.md`.

### 5.2. Khi đổi sang user deploy không có quyền admin

Gắn policy scope theo dự án thay cho `AdministratorAccess`:

| Nhóm | Dùng để làm gì | File policy |
|---|---|---|
| CloudFormation + SAM transform, IAM role `student-market-*`, SQS | Chạy `sam deploy` cho 2 stack | `aws/iam/student-market-sam-deploy-policy.template.json` |

Cách làm: mở file, thay `ACCOUNT_ID` bằng `<AWS_ACCOUNT_ID>`, rồi gắn vào IAM user/group dùng để deploy.
Kiểm tra sau khi gắn (kết quả phải là `allowed`):

```powershell
aws iam simulate-principal-policy --profile student-market `
  --policy-source-arn arn:aws:iam::<AWS_ACCOUNT_ID>:user/<ten-user> `
  --action-names cloudformation:CreateChangeSet `
  --resource-arns arn:aws:cloudformation:ap-southeast-1:aws:transform/Serverless-2016-10-31
```

### 5.3. Kết quả kiểm tra quyền và quota (16/11/2026)

**Quyền IAM của `<iam-user>`: đủ, không cần bổ sung.**

- Không có policy gắn trực tiếp vào user, không permissions boundary. Tài khoản không thuộc AWS Organizations
  nên không có SCP chặn.
- Group `flea-market` (thành viên: `<iam-user>`, `nhat-minh`) gắn `AdministratorAccess` + 6 policy AWS-managed
  (`AmazonAPIGatewayAdministrator`, `CloudFrontFullAccess`, `IAMFullAccess`, `SecretsManagerReadWrite`,
  `AmazonS3FullAccess`, `AWSLambda_FullAccess`). 6 policy này **thừa** vì đã nằm trong `AdministratorAccess`.
- `simulate-principal-policy` trả `allowed` cho toàn bộ action cần dùng: CloudFormation change set, IAM
  CreateRole/PassRole, Lambda, API Gateway, S3, CloudFront (distribution + OAC), SQS, CloudWatch Logs/Alarm,
  Amplify (CreateApp/CreateDeployment), Budgets, Cost Explorer, SSM, SES.

**Quota Lambda: cần xử lý trước khi deploy.**

- `ConcurrentExecutions` của tài khoản = **10** (mức mặc định của tài khoản mới). AWS luôn giữ tối thiểu 10
  concurrency không reserve, nên **mọi** `ReservedConcurrentExecutions` đều làm stack lỗi.
- Đã sửa `media-pipeline.yaml`: `ProcessorReservedConcurrency` mặc định `0` = không reserve. Sau khi quota
  được nâng có thể đặt lại `5`.
- Nên xin nâng quota (miễn phí, thường được duyệt trong vài giờ tới vài ngày). Với 10 concurrency, API và
  ImageProcessor dùng chung, dễ bị throttle khi demo nhiều người:
  ```powershell
  aws service-quotas request-service-quota-increase --profile student-market --region ap-southeast-1 `
    --service-code lambda --quota-code L-B99A9384 --desired-value 1000
  ```

**Khuyến nghị bảo mật (không chặn deploy)**

- Bật **MFA** cho `<iam-user>` (hiện chưa có). Root account đã bật MFA, không có access key: tốt.
- Access key `AKIA…SAZL` của `<iam-user>` có quyền admin và đang active từ 12/11. Không để key trong repo, không
  chia sẻ. Xoay key định kỳ, xóa key nếu không dùng.
- `nhat-minh` cũng có full admin qua group. Nếu thành viên chỉ cần deploy, chuyển sang policy ở mục 5.2.
- Có thể gỡ 6 policy thừa khỏi group cho gọn (không ảnh hưởng quyền).

---

## 6. Chuẩn bị máy để deploy

1. Cài **AWS CLI v2**, **AWS SAM CLI** và **.NET 8 SDK**.
2. Cấu hình credential của IAM user dùng để deploy:
   ```powershell
   aws configure --profile student-market
   # Region: ap-southeast-1   (LƯU Ý: không phải ap-southeast-2)
   aws sts get-caller-identity --profile student-market
   ```
3. Khi đổi sang IAM user khác: chỉ cần chạy lại `aws configure`, gắn lại quyền ở phần 5 cho user mới.
   Code và template **không** phụ thuộc vào IAM user.

---

## 7. Các bước deploy (theo đúng thứ tự)

### Bước 1 — Database

Dùng **Supabase** (phần 1.2):

1. Tạo project Supabase ở region Singapore.
2. Chạy migration từ máy dev bằng connection string **session mode**:
   ```powershell
   cd student-flea-market-be
   $env:ConnectionStrings__DefaultConnection = "<connection string session mode>"
   dotnet ef database update --project .\StudentFleaMarket.Infrastructure --startup-project .\StudentFleaMarket.API
   ```
   Seed admin/danh mục: chạy API local một lần với `SkipDatabaseSeed=false` trỏ vào Supabase (session mode).
3. Chuẩn bị connection string **transaction mode** (cổng `6543`) cho bước 3.

> Phương án dự phòng: RDS PostgreSQL trong VPC (cần quyền RDS, xem phần 13.2 phương án B).

### Bước 2 — Pipeline ảnh

```powershell
sam build    --template-file .\aws\iac\media-pipeline.yaml
sam validate --lint --template-file .\aws\iac\media-pipeline.yaml
sam deploy   --template-file .\.aws-sam\build\template.yaml `
             --stack-name student-market-dev-media `
             --capabilities CAPABILITY_IAM --guided --profile student-market
```

Ghi lại 2 output: **`MediaBucketName`** và **`CloudFrontBaseUrl`**.

### Bước 3 — API

```powershell
sam build  --template-file .\aws\iac\api.yaml
sam deploy --template-file .\.aws-sam\build\template.yaml `
           --stack-name student-market-dev `
           --capabilities CAPABILITY_IAM --guided --profile student-market
```

Tham số cần nhập:

| Tham số | Giá trị |
|---|---|
| `DbConnectionString` | Connection string **transaction mode** ở bước 1 (ẩn, không hiện ra log) |
| `JwtSecretKey` | Chuỗi ngẫu nhiên ≥ 32 ký tự (nên 64) |
| `MediaBucketName`, `CloudFrontBaseUrl` | Output của bước 2 |
| `FrontendOrigins` | Domain frontend, cách nhau bằng dấu phẩy (tạm để localhost, cập nhật ở bước 5) |
| `SubnetIds`, `SecurityGroupIds` | **Để trống** (Supabase không cần VPC). Chỉ điền khi dùng RDS |
| `SkipDatabaseSeed` | `true`: migration và seed đã chạy tay ở bước 1 |

Ghi lại output **`ApiBaseUrl`**.

> Nếu API nằm trong VPC: cần thêm **S3 gateway endpoint** (miễn phí) cho VPC, vì API gọi S3 khi xác nhận ảnh.

### Bước 4 — Frontend trên Vercel

1. Tạo project Vercel, import repo, đặt **Root Directory** = `student-flea-market-fe`.
2. Đặt biến môi trường **trước khi build**:
   ```
   NEXT_PUBLIC_API_URL=<ApiBaseUrl>/api
   ```
3. Deploy. Ghi lại domain production (ví dụ `https://<ten-project>.vercel.app`).

### Bước 5 — Cập nhật CORS bằng domain frontend thật

Khi có domain production Vercel, deploy lại **cả hai** stack với
`FrontendOrigins=<domain đó>`:

- `media-pipeline.yaml`: để trình duyệt upload thẳng lên S3.
- `api.yaml`: để trình duyệt gọi API.

### Bước 6 — Kiểm tra sau deploy

- [ ] `GET <ApiBaseUrl>/health` trả `{"status":"ok"}`.
- [ ] Đăng nhập, refresh token, đăng xuất từ domain frontend.
- [ ] Upload ảnh: presign → POST lên S3 → confirm → ảnh hiện qua CloudFront.
- [ ] Mở trực tiếp URL S3 của ảnh `raw/` phải bị từ chối (`403`).
- [ ] CloudWatch Logs không chứa JWT, mật khẩu hay link presign đầy đủ.

---

## 8. Luồng upload ảnh (dành cho frontend)

```
1. POST /api/Items/sell/{itemId}/images/presign        (có JWT)
   body: { "files": [{ "fileName": "a.jpg", "contentType": "image/jpeg", "sizeBytes": 123456 }] }
   → trả về uploadUrl, formFields, objectKey cho từng ảnh

2. POST thẳng lên uploadUrl bằng FormData
   - append TOÀN BỘ formFields trước
   - append file sau cùng với key "file"
   - KHÔNG gửi header Authorization tới S3

3. POST /api/Items/sell/{itemId}/images/confirm        (có JWT)
   body: { "objectKeys": ["<objectKey từ bước 1>"] }
   → ảnh được lưu vào tin đăng, trả về imageUrl + thumbnailUrl
```

Giới hạn: chỉ JPEG/PNG/WebP, tối đa **10 MB/ảnh** và **8 ảnh/tin**. Link presign hết hạn sau **10 phút**.

> Lambda xử lý ảnh chạy **sau** khi upload, nên `imageUrl` có thể chưa tải được trong vài giây đầu.
> Frontend nên hiện placeholder và thử tải lại.

---

## 9. Biến cấu hình của API

Trên AWS, các giá trị này được template `api.yaml` đặt thành biến môi trường của Lambda.
(Dấu `__` thay cho dấu `:` trong appsettings.)

| Biến môi trường | Ý nghĩa |
|---|---|
| `ConnectionStrings__DefaultConnection` | Chuỗi kết nối PostgreSQL |
| `Jwt__SecretKey` | Khóa ký JWT |
| `MediaStorage__BucketName` | Tên bucket ảnh (**bắt buộc**, thiếu thì API không khởi động) |
| `MediaStorage__Region` | `ap-southeast-1` |
| `MediaStorage__ServiceUrl` | Để **trống** trên AWS (chỉ dùng cho LocalStack) |
| `MediaStorage__CloudFrontBaseUrl` | Domain CloudFront (`https://...`) |
| `Cors__AllowedOrigins` | Domain frontend, cách nhau bằng dấu phẩy. Để trống = cho phép mọi domain (chỉ dùng local) |
| `SkipDatabaseSeed` | `true` nếu muốn tự chạy migration bằng tay |

---

## 10. Frontend: Amplify hay Vercel?

| | Amplify | Vercel |
|---|---|---|
| Đã cấu hình sẵn | Có (`amplify.yml`, `customHttp.yml`, `amplify-rules.json`, script `Production/amplify-deploy.ps1`) | Không cần cấu hình |
| Quyền | Đủ (user `<iam-user>` có `AdministratorAccess`) | Không cần quyền AWS |
| Cùng hệ thống AWS | Có | Không |
| Domain cho CORS | Cố định: `https://main.<app-id>.amplifyapp.com` | Domain chính cố định, link preview thay đổi |

**Phương án chính: Vercel** (xem phần 1.1): không tốn credit AWS.
Chỉ thêm domain production vào CORS, **không** dùng `https://*.vercel.app`.

### 10.1. Phương án phụ: frontend trên Amplify (cập nhật 16/11/2026)

Chuẩn bị sẵn để chuyển sang trong vài phút khi cần. **Chưa tạo app Amplify nào.**

**Khi nào dùng**

- Vercel lỗi build/deploy, bị chặn (gói Hobby với repo của organization, xem `Production/vercel.md` mục 1.3), hoặc hết hạn mức.
- Môn học yêu cầu toàn bộ hệ thống chạy trên AWS.

**Cách làm: manual deploy, không kết nối GitHub**

`Production/amplify-deploy.ps1` build FE trên máy với `NEXT_PUBLIC_API_URL` lấy từ output stack API, zip `out/`,
tạo app Amplify (nếu chưa có), gắn rewrite rule + header, upload và chờ deploy xong.

- Không cần cấp quyền GitHub cho Amplify → tránh vấn đề repo organization.
- Build chạy trên máy → **không tốn phút build** Amplify. Chi phí chỉ còn lưu trữ + băng thông (~$0, vài GB/tháng).
- Nhược điểm: không tự build khi push. Mỗi lần cập nhật FE phải chạy lại script.

**Các bước chuyển sang Amplify**

1. Stack API đã deploy (phần 7, bước 3).
2. Chạy thử, chỉ build và zip:
   ```powershell
   .\Production\amplify-deploy.ps1 -DryRun
   ```
3. Deploy thật. Script in ra URL `https://main.<app-id>.amplifyapp.com`:
   ```powershell
   .\Production\amplify-deploy.ps1
   ```
4. Thêm origin Amplify vào CORS của **cả hai** stack. Có thể giữ **cả Vercel lẫn Amplify** cùng lúc (cách nhau bằng dấu phẩy) để chuyển qua lại không phải deploy lại backend:
   ```powershell
   .\Production\deploy.ps1 -FrontendOrigins "https://<vercel-domain>,https://main.<app-id>.amplifyapp.com"
   ```
5. Kiểm tra: mở thẳng `https://main.<app-id>.amplifyapp.com/marketplace` và F5 (không được 404), đăng nhập,
   tìm kiếm, đăng tin có ảnh.

**Cập nhật FE sau này:** chạy lại `.\Production\amplify-deploy.ps1`. Script cũng đồng bộ lại rewrite rule và header.

**Hoàn tác:** `.\Production\amplify-deploy.ps1 -Delete` (hỏi xác nhận bằng tên app), rồi bỏ origin Amplify khỏi
`FrontendOrigins`. `teardown.ps1` **không** xóa app Amplify.

**Muốn tự build khi push (tùy chọn):** tạo app trong Amplify Console bằng *Connect repository* thay cho script.
`amplify.yml` trong repo FE đã sẵn sàng (Node 22, chặn build khi thiếu `NEXT_PUBLIC_API_URL`). Vẫn phải áp
dụng `amplify-rules.json` (lệnh trong `student-flea-market-fe/DEPLOYMENT.md`). Cách này tốn phút build và cần cấp
quyền GitHub cho Amplify.

---

## 11. Hạn chế đã biết

- **Chat realtime (SignalR) không chạy trên Lambda + HTTP API.** Các API chat dạng REST vẫn hoạt động bình thường.
  Muốn có realtime cần chọn thêm hướng khác (API Gateway WebSocket, hoặc chạy API trong container).
- Secret (DB, JWT) đang truyền qua biến môi trường Lambda (được mã hóa khi lưu). Nên chuyển sang
  Secrets Manager/SSM khi có thời gian.
- Lần đầu Lambda khởi động có thể chậm vài giây (cold start), đặc biệt khi chạy migration.

---

## 12. Lỗi thường gặp

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| `sam deploy` báo `AccessDenied` / `not authorized` | Thiếu quyền CloudFormation/SAM | Gắn policy ở phần 5.2 |
| Tài nguyên bị tạo ở Sydney | Region mặc định là `ap-southeast-2` | `aws configure` lại với `ap-southeast-1` hoặc thêm `--region ap-southeast-1` |
| API không khởi động: `MediaStorage:BucketName is required` | Thiếu biến `MediaStorage__BucketName` | Kiểm tra tham số `MediaBucketName` khi deploy |
| Trình duyệt báo lỗi CORS khi upload ảnh | Domain frontend chưa có trong CORS của S3 | Deploy lại `media-pipeline.yaml` với `FrontendOrigins` đúng |
| Trình duyệt báo lỗi CORS khi gọi API | Domain frontend chưa có trong `Cors__AllowedOrigins` | Deploy lại `api.yaml` với `FrontendOrigins` đúng |
| Confirm ảnh báo `UPLOAD_NOT_FOUND` | Chưa upload xong lên S3, hoặc gửi sai `objectKey` | Chỉ gọi confirm sau khi S3 trả `204` |
| Confirm ảnh bị timeout (API trong VPC) | VPC không có đường ra S3 | Thêm S3 gateway endpoint cho VPC |
| Ảnh `imageUrl` trả 403/404 ngay sau khi upload | Lambda chưa xử lý xong | Chờ vài giây rồi tải lại; nếu vẫn lỗi, xem log Lambda ImageProcessor và hàng đợi SQS lỗi |

---

## 13. Kế hoạch tối ưu chi phí (đề xuất — chưa áp dụng)

> Giá dưới đây là **ước tính** cho region `ap-southeast-1`, tính bằng USD/tháng, ở quy mô demo/đồ án
> (vài trăm người dùng, vài nghìn ảnh). Kiểm tra lại bằng [AWS Pricing Calculator](https://calculator.aws/)
> trước khi chốt.

### 13.0. Bối cảnh: đồ án môn học, gói Free, còn **$170 credit**

Tài khoản đang dùng **gói Free theo mô hình credit** (áp dụng cho tài khoản tạo sau 15/07/2025, không còn
"12 tháng miễn phí" kiểu cũ). Toàn bộ ngân sách của dự án là số credit còn lại: **$170**.

**Kết luận: khả thi và còn dư**, nếu chọn database hợp lý.

| Phương án | Chi phí/tháng | $170 dùng được khoảng |
|---|---|---|
| **A** — PostgreSQL free bên ngoài (Neon/Supabase) + serverless trên AWS | ~$0–3 | Gần như không tốn |
| **B** — RDS `db.t4g.micro` bật 24/7 | ~$20–28 | ~6–8 tháng, sát giới hạn |
| **B tiết kiệm** — RDS chỉ bật khi làm/demo (~8h/ngày, ngày thường) | ~$8–12 | Dư thoải mái |

Phần serverless (Lambda, API Gateway, S3, CloudFront) gần như nằm hết trong mức **miễn phí vĩnh viễn**,
nên ở quy mô đồ án, gần như toàn bộ credit sẽ đi vào **RDS**.

**Những điều cần biết về gói Free** (đối chiếu lại trong **Billing → Free Tier**):

1. **Hạn dùng mới là giới hạn thật, không phải số tiền.** Credit và gói Free chỉ có hiệu lực
   **6 tháng kể từ ngày tạo tài khoản**. Hết hạn mà không nâng lên gói trả phí thì tài khoản bị đóng,
   kèm theo tài nguyên. → Ghi lại ngày hết hạn và đảm bảo buổi demo/chấm diễn ra **trước** ngày đó.
2. **Gói Free không trừ vào thẻ.** Hết credit thì tài khoản bị tạm ngưng chứ không bị tính tiền.
   Đây là lưới an toàn tốt, nhưng **không nâng lên gói trả phí** trừ khi thật sự cần.
3. **Có thể nhận thêm credit.** AWS tặng thêm khoảng $20 cho mỗi hoạt động hoàn thành (tối đa $100):
   tạo Budget, tạo RDS, chạy Lambda, dùng Bedrock, chạy EC2. Nên làm nốt các hoạt động còn thiếu,
   nhất là tạo Budget (vừa được credit vừa nằm sẵn trong kế hoạch). Riêng EC2, nhớ terminate ngay sau khi xong.

**Khuyến nghị cho đồ án:**

- Phát triển hằng ngày bằng **LocalStack** (phần 4) và **phương án A**.
- Nếu môn học yêu cầu "toàn bộ trên AWS": chuyển sang RDS khoảng **2–4 tuần trước buổi chấm**
  và stop RDS khi không dùng. Như vậy cả đợt tốn khoảng **$15–40**.
- **Tuyệt đối không tạo NAT Gateway** (~$45/tháng) và để RDS **không public**.

### 13.1. Chi phí nằm ở đâu?

| Thành phần | Mức chi phí ở quy mô demo | Ghi chú |
|---|---|---|
| **RDS PostgreSQL** | **Cao nhất** (~$18–25) | Tính tiền theo giờ, kể cả khi không ai dùng |
| **NAT Gateway** (nếu lỡ tạo) | **Rất cao** (~$45+) | Bẫy phổ biến khi đưa Lambda vào VPC. **Không dùng.** |
| Public IPv4 (RDS public, NAT…) | ~$3.6 / địa chỉ | AWS tính phí mọi IPv4 public |
| Lambda (API + xử lý ảnh) | ~$0–1 | Trả theo request × thời gian chạy |
| API Gateway HTTP API | ~$0–1 | Trả theo số request |
| S3 + CloudFront | ~$0–1 | CloudFront có 1 TB/tháng miễn phí vĩnh viễn |
| CloudWatch Logs + Alarm | ~$0–2 | Tăng nếu log level quá chi tiết |
| Amplify | ~$0–2 | Phút build + dung lượng phục vụ |
| SQS (hàng đợi lỗi) | ~$0 | |

**Kết luận:** gần như toàn bộ hóa đơn sẽ đến từ **database** và các tài nguyên "chạy theo giờ"
(RDS, NAT, IPv4). Phần serverless còn lại gần như bằng 0 ở quy mô này.

### 13.2. Các phương án tổng thể

| Phương án | Database | Ước tính/tháng | Phù hợp khi |
|---|---|---|---|
| **A — Rẻ nhất** | PostgreSQL bên ngoài gói free (Neon/Supabase…), kết nối qua SSL. Lambda **không** vào VPC | **~$0–3** | Demo, đồ án, chưa cần RDS |
| **B — Cân bằng (khuyến nghị nếu bắt buộc dùng AWS)** | RDS `db.t4g.micro`, Single-AZ, 20 GB gp3, **không public**; Lambda vào VPC + S3 gateway endpoint (miễn phí) | **~$20–28** | Cần toàn bộ hệ thống trên AWS |
| C — Production thật | RDS Multi-AZ hoặc Aurora Serverless v2, RDS Proxy, Secrets Manager | $80+ | Không cần cho giai đoạn hiện tại |

> **Khuyến nghị (theo ngân sách $170 ở mục 13.0):** dev/demo dùng **A**. Khi cần nộp/chấm trên AWS thì
> chuyển sang **B** và chỉ bật RDS khi dùng. Chỉ cần đổi connection string và tham số
> `SubnetIds`/`SecurityGroupIds`, code không đổi. Phương án **C** nằm ngoài ngân sách đồ án.

### 13.3. Việc cần làm — xếp theo mức ưu tiên

**Ưu tiên 1 — Chống phát sinh chi phí ngoài ý muốn (làm ngay khi bắt đầu deploy)**

1. **AWS Budgets** (2 budget đầu miễn phí, và được thêm credit theo mục 13.0). Hiện account đã có
   `AWS-FreeTier-Budget` (COST, theo tháng, $100) — **chưa có** 2 budget theo kế hoạch dưới đây:
   - Budget theo tháng: cảnh báo email ở mức **$10** và **$30**.
   - Budget tổng: theo dõi credit đã dùng, cảnh báo khi vượt **50%** (~$85) và **80%** (~$135) của $170.
2. Bật **Cost Anomaly Detection** (miễn phí).
3. Bật tag `Project=StudentMarket` làm **cost allocation tag** (Billing → Cost allocation tags) để
   lọc chi phí theo dự án. Template đã gắn tag này cho S3; cần bổ sung tag cho Lambda, API, log group.
4. **Không tạo NAT Gateway.** Lambda API trong VPC chỉ cần gọi RDS và S3:
   - S3 → dùng **S3 gateway endpoint** (miễn phí).
   - Nếu sau này cần Secrets Manager/SSM từ trong VPC → cân nhắc interface endpoint (~$7–8/tháng/endpoint)
     hoặc đọc secret lúc deploy thay vì lúc chạy.
5. RDS đặt `PubliclyAccessible=false` (tránh phí IPv4 public, đồng thời an toàn hơn).

**Ưu tiên 2 — Database (khoản lớn nhất)**

6. Nếu dùng RDS: `db.t4g.micro` (Graviton, rẻ hơn t3), **Single-AZ**, storage **gp3 20 GB**,
   tắt Performance Insights trả phí, backup retention **1–3 ngày** cho dev.
7. **Stop RDS khi không dùng** (cuối tuần, ngoài giờ demo). Lưu ý: RDS tự bật lại sau 7 ngày —
   có thể dùng EventBridge Scheduler + Lambda nhỏ để tự stop/start theo lịch.
8. Không dùng RDS Proxy ở giai đoạn này (tính theo vCPU của DB, tối thiểu đáng kể).
   Thay vào đó giới hạn connection pool của Npgsql (`Maximum Pool Size=5`) và giới hạn
   reserved concurrency của Lambda API để không làm quá tải DB micro.

**Ưu tiên 3 — Lambda**

9. **Chuyển sang `arm64` (Graviton)**: rẻ hơn ~20% mỗi GB-giây.
   - API: chỉ cần đổi `Architectures: [arm64]` trong `api.yaml`.
   - ImageProcessor: đang dùng `Magick.NET-Q8-x64` → phải đổi sang gói `Magick.NET-Q8-arm64`
     (hoặc `AnyCPU`) rồi test lại trên LocalStack trước khi đổi template.
10. **Tinh chỉnh memory** bằng AWS Lambda Power Tuning (thử 512 / 768 / 1024 MB). Với .NET,
    giảm memory quá thấp thường làm cold start chậm hơn và **tốn hơn**, nên đo trước khi giảm.
11. Đặt `SkipDatabaseSeed=true` sau lần deploy đầu tiên → cold start không phải chạy migration,
    giảm thời gian tính tiền và độ trễ. Migration chạy thủ công khi có thay đổi schema.
12. Bật **ReadyToRun** khi publish (`<PublishReadyToRun>true</PublishReadyToRun>`) để giảm cold start.
13. Đặt `ReservedConcurrentExecutions` cho API (ví dụ 10) — vừa bảo vệ DB, vừa chặn chi phí tăng
    đột biến nếu bị spam request.

**Ưu tiên 4 — S3 / CloudFront / ảnh**

14. Giảm `NoncurrentVersionRetentionDays` từ 30 xuống **7** cho môi trường dev.
15. Ảnh `processed/` không thay đổi sau khi tạo → ImageProcessor nên ghi
    `Cache-Control: public, max-age=31536000, immutable` để CloudFront ít phải lấy lại từ S3.
16. Ảnh gốc `raw/` chỉ cần cho việc xử lý lại. Đề xuất (cần nhóm duyệt — template hiện ghi
    *"do not add raw expiry until product retention is approved"*):
    - chuyển `raw/` sang **S3 Standard-IA** sau 30 ngày, hoặc
    - xóa `raw/` sau 30–90 ngày.
17. Giữ `PriceClass_200` cho CloudFront: người dùng ở Việt Nam, `PriceClass_100` không có edge châu Á
    nên ảnh sẽ chậm hơn mà gần như không tiết kiệm được (đang nằm trong 1 TB miễn phí).
18. Giữ `EnableAuditLogging=false` và `EnableDetailedS3Metrics=false` ở dev (cả hai đều tính phí).

**Ưu tiên 5 — Log và giám sát**

19. Log retention dev: **7 ngày** (hiện là 14). Prod: 30 ngày.
20. `ApplicationLogLevel: WARN` ở prod (hiện là `INFO`) — CloudWatch tính tiền theo GB log ghi vào.
21. Số alarm hiện có (≈5) nằm trong 10 alarm miễn phí — không cần thay đổi.

**Ưu tiên 6 — Frontend và secret**

22. Amplify: chỉ auto-build nhánh `main`, **tắt preview cho pull request** để tiết kiệm phút build.
    (Phương án rẻ hơn nữa: vì frontend là trang tĩnh `out/`, có thể host bằng S3 + CloudFront sẵn có.)
23. Khi chuyển secret ra khỏi biến môi trường (xem phần 11): dùng **SSM Parameter Store
    SecureString (standard tier — miễn phí)** thay cho Secrets Manager ($0.40/secret/tháng),
    trừ khi cần tự động xoay vòng mật khẩu.

**Ưu tiên 7 — Thói quen của nhóm**

24. Phát triển hằng ngày dùng **LocalStack** (phần 4), không deploy lên AWS để thử từng thay đổi nhỏ.
25. Chỉ giữ **một** môi trường trên AWS (`dev`). Xóa stack khi không cần:
    `sam delete --stack-name <tên-stack> --profile student-market`
    (bucket ảnh có `DeletionPolicy: Retain` → phải xóa tay nếu muốn hết hẳn chi phí lưu trữ).
26. Chat realtime: nếu sau này cần, ưu tiên **API Gateway WebSocket** (trả theo dùng) thay vì
    chạy container 24/7 (ECS/App Runner tốn tối thiểu vài chục USD/tháng).

### 13.4. Thứ tự thực hiện gợi ý

| Giai đoạn | Việc làm | Thay đổi file |
|---|---|---|
| Ngay bây giờ | Ghi lại ngày hết hạn gói Free, làm nốt các hoạt động nhận credit (mục 13.0) | Không (làm trên console) |
| Trước deploy | Budgets $10/$30, Anomaly Detection, cost tag (mục 1–3) | Không (làm trên console) |
| 2–4 tuần trước buổi chấm | Nếu bắt buộc: chuyển sang RDS (phương án B), stop khi không dùng | Tham số deploy |
| Khi deploy | Chọn DB theo phương án A/B, không NAT, RDS private (4–8) | Tham số deploy |
| Sau deploy ổn định | `SkipDatabaseSeed=true`, log 7 ngày, noncurrent 7 ngày (11, 14, 19) | Tham số deploy |
| Tối ưu thêm | arm64, ReadyToRun, power tuning, Cache-Control (9–10, 12, 15) | `api.yaml`, `media-pipeline.yaml`, `.csproj`, ImageProcessor |
| Cần nhóm duyệt | Vòng đời `raw/`, chuyển secret sang SSM (16, 23) | `media-pipeline.yaml`, `api.yaml` |
| Sau buổi chấm | Sao lưu dữ liệu, xóa toàn bộ tài nguyên, kiểm tra hóa đơn (mục 13.5) | Không |

### 13.5. Quản lý và dọn tài nguyên sau khi sử dụng

> Các lệnh dưới đây dùng profile `student-market`, region `ap-southeast-1`. Thay `<...>` bằng giá trị thật.
> Xóa là **không khôi phục được** — luôn sao lưu trước (bước B1).

#### A. Hằng ngày / hằng tuần — tạm dừng, không xóa

Chỉ RDS là tài nguyên tính tiền theo giờ. Các thành phần serverless không dùng thì không tốn, nên **không cần tắt**.

```powershell
# Dừng RDS khi nghỉ làm (chỉ còn trả tiền storage ~$3/tháng)
aws rds stop-db-instance  --db-instance-identifier <db-id> --profile student-market --region ap-southeast-1
# Bật lại khi cần (mất ~5 phút)
aws rds start-db-instance --db-instance-identifier <db-id> --profile student-market --region ap-southeast-1
# Kiểm tra trạng thái
aws rds describe-db-instances --db-instance-identifier <db-id> --query "DBInstances[0].DBInstanceStatus" --profile student-market --region ap-southeast-1
```

- RDS bị stop sẽ **tự bật lại sau 7 ngày**. Nếu nghỉ dài, dùng **EventBridge Scheduler** để tự stop
  (ví dụ 23:00 mỗi ngày), hoặc đặt lịch nhắc trong nhóm.
- Phân công **một người phụ trách** bật/tắt RDS để tránh việc "tưởng người khác đã tắt".

#### B. Sau buổi chấm / khi kết thúc môn — dọn toàn bộ

Làm **đúng thứ tự** để không bị kẹt phụ thuộc giữa các tài nguyên:

| Bước | Việc làm | Ghi chú |
|---|---|---|
| B1 | **Sao lưu** database và ảnh về máy | Xem lệnh bên dưới |
| B2 | Xóa project **Vercel** và **Supabase** (nếu không giữ làm portfolio) | Ngoài AWS, không tốn credit nhưng nên dọn sau khi `pg_dump` |
| B3 | Xóa stack API: `sam delete --stack-name student-market-dev` | Xóa Lambda API, HTTP API, log group, alarm |
| B4 | Xóa stack ảnh: `sam delete --stack-name student-market-dev-media` | Xóa Lambda xử lý ảnh, SQS, CloudFront, alarm. CloudFront cần ~15 phút để tắt |
| B5 | **Làm trống rồi xóa tay** bucket ảnh và bucket audit log | Hai bucket có `DeletionPolicy: Retain` nên **không** bị xóa theo stack |
| B6 | Xóa **RDS** (nếu dùng phương án B) | Chọn **không** tạo final snapshot nếu đã `pg_dump` ở B1 |
| B7 | Xóa VPC endpoint, security group, subnet group đã tạo thêm cho RDS | Không xóa default VPC |
| B8 | Xóa stack `aws-sam-cli-managed-default` và bucket artifact của SAM | SAM tự tạo khi chạy `--guided` |
| B9 | Xóa tham số SSM / secret (nếu có), **vô hiệu hóa access key** của IAM user deploy | |
| B10 | Kiểm tra tài nguyên còn sót và hóa đơn (mục C) | |

Lệnh tham khảo:

```powershell
# B1 — sao lưu DB về máy (cần cài PostgreSQL client)
pg_dump "host=<rds-endpoint> port=5432 dbname=<db> user=<user> sslmode=require" -Fc -f student-market.dump
# B1 — tải ảnh đã xử lý về máy (nếu cần giữ)
aws s3 sync s3://<MediaBucketName>/processed ./backup-images --profile student-market

# B3, B4 — xóa stack
sam delete --stack-name student-market-dev       --profile student-market --region ap-southeast-1
sam delete --stack-name student-market-dev-media --profile student-market --region ap-southeast-1

# B6 — xóa RDS không tạo snapshot (đã có pg_dump ở B1)
aws rds delete-db-instance --db-instance-identifier <db-id> --skip-final-snapshot --delete-automated-backups --profile student-market --region ap-southeast-1
```

> **B5 — bucket đang bật versioning:** `aws s3 rm --recursive` chỉ ẩn object, **không** xóa các phiên bản cũ,
> nên bucket vẫn tốn tiền và không xóa được. Cách đơn giản nhất: S3 Console → chọn bucket → **Empty**
> (xóa cả mọi phiên bản) → **Delete**.

> **Snapshot RDS:** snapshot còn lại sau khi xóa DB **vẫn tính phí lưu trữ**. Nếu đã `pg_dump` thì không cần
> giữ snapshot; nếu muốn giữ, ghi nhớ xóa sau khi môn học kết thúc.

#### C. Kiểm tra tài nguyên còn sót

Làm sau mỗi lần deploy thử và sau khi dọn xong:

```powershell
# Tài nguyên còn gắn tag dự án
aws resourcegroupstaggingapi get-resources --tag-filters Key=Project,Values=StudentMarket --profile student-market --region ap-southeast-1
# Các "bẫy chi phí": NAT Gateway, Elastic IP, ổ EBS rời, EC2 đang chạy
aws ec2 describe-nat-gateways --filter Name=state,Values=available --profile student-market --region ap-southeast-1
aws ec2 describe-addresses --profile student-market --region ap-southeast-1
aws ec2 describe-volumes  --filters Name=status,Values=available --profile student-market --region ap-southeast-1
aws ec2 describe-instances --filters Name=instance-state-name,Values=running --profile student-market --region ap-southeast-1
# Log group còn sót (Lambda có thể tự tạo lại nếu bị gọi sau khi xóa stack)
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/student-market --profile student-market --region ap-southeast-1
```

Checklist thêm:

- [ ] Lặp lại các lệnh trên với `--region ap-southeast-2`, vì trước đây có lỗi tạo nhầm tài nguyên ở Sydney (xem phần 12).
- [ ] Tài nguyên tạo ra khi làm **hoạt động nhận credit** (EC2, RDS, Lambda, Bedrock…) đã bị xóa hết.
- [ ] **Billing → Bills**: xem chi phí theo từng service và region. Dữ liệu cập nhật chậm tới **24 giờ**,
      nên kiểm tra lại **1–2 ngày sau** khi dọn.
- [ ] **Cost Explorer**: lọc theo tag `Project=StudentMarket`, chi phí theo ngày phải về ~$0.
- [ ] Giữ lại Budgets (miễn phí) cho tới khi đóng tài khoản.

#### D. Khi gói Free sắp hết hạn

- Trước ngày hết hạn (mục 13.0), hoàn tất bước **B1**: khi tài khoản bị đóng, **mọi dữ liệu trên AWS sẽ mất**.
- Nếu không cần tiếp tục: không cần nâng lên gói trả phí, chỉ cần dọn theo mục B để tránh rủi ro.
- Nếu muốn giữ dự án làm portfolio: dùng phương án A (DB bên ngoài) + host frontend tĩnh trên Vercel/Netlify
  (miễn phí), không phụ thuộc vào tài khoản AWS.

---

## 14. Tài liệu chi tiết hơn

- `supabase.md` — thiết lập database PostgreSQL trên Supabase.
- `AWSsetup.md` — Free Tier và kế hoạch triển khai ban đầu.
- `aws/IAM_ROLES_AND_POLICIES.md` — chi tiết role và policy.
- `aws/iac/README.md` — tham số và lưu ý của 2 template.
- `aws/localstack/README.md` — vận hành LocalStack.
- `student-flea-market-fe/DEPLOYMENT.md` — deploy frontend.
- `worklog-vi.md` — nhật ký công việc.
