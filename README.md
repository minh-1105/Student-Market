# Student Flea Market

Student Flea Market là nền tảng chợ đồ cũ dành cho sinh viên, hỗ trợ trao đổi giáo trình, tài liệu học tập và các vật dụng đã qua sử dụng.

Repository gồm hai ứng dụng độc lập:

- `student-flea-market-fe`: giao diện web xây dựng bằng Next.js.
- `student-flea-market-be`: REST API xây dựng bằng ASP.NET Core.

## Kiến trúc tổng thể

```text
Người dùng
    │ HTTPS
    ▼
Next.js Frontend ── REST/JSON + JWT ──▶ ASP.NET Core Web API
    │                                      │
    │ upload qua presigned URL             │ EF Core/Npgsql
    ▼                                      ▼
Amazon S3 ──▶ Amazon CloudFront         PostgreSQL
```

S3, CloudFront, PostgreSQL, JWT và các lớp nghiệp vụ là kiến trúc mục tiêu; một số thành phần chưa được triển khai đầy đủ. Xem [summary.md](./summary.md) để biết cấu trúc, luồng giao tiếp và trạng thái chi tiết.

## Công nghệ

### Frontend

- Next.js 16, App Router, React 19 và TypeScript.
- Tailwind CSS 4, shadcn/ui và Base UI.
- TanStack Query cho server state; Zustand cho client state.
- React Hook Form và Zod cho form và validation.
- Axios cho HTTP client; Lucide React cho icon.

### Backend

- ASP.NET Core Web API, target .NET 10.
- Entity Framework Core và Npgsql cho PostgreSQL.
- JWT Bearer, FluentValidation và Mapster.
- AWS SDK for S3, Serilog, OpenAPI và Swagger UI.
- Định hướng Clean Architecture để tách API, Application, Domain và Infrastructure.

## Cấu trúc repository

```text
Student Market/
├── student-flea-market-be/
│   ├── StudentFleaMarket.slnx
│   └── StudentFleaMarket.API/
├── student-flea-market-fe/
│   ├── public/
│   └── src/
│       ├── app/
│       ├── components/
│       └── lib/
├── .gitignore
├── README.md
└── summary.md
```

## Yêu cầu

- .NET SDK 10.
- Node.js và npm.
- PostgreSQL khi lớp dữ liệu được cấu hình.

## Chạy cục bộ

### Backend

```powershell
cd student-flea-market-be/StudentFleaMarket.API
dotnet restore
dotnet run
```

Trong môi trường Development, API sử dụng:

- HTTP: `http://localhost:5033`
- HTTPS: `https://localhost:7030`

Swagger UI được cung cấp bởi backend để kiểm tra API.

### Frontend

Mở một terminal khác tại thư mục gốc:

```powershell
cd student-flea-market-fe
npm install
npm run dev
```

Sau đó mở `http://localhost:3000` trong trình duyệt.

Frontend hiện chưa khai báo base URL của API; cần cấu hình URL backend trước khi tích hợp các request thực tế.

## Định hướng tính năng

- Đăng ký, đăng nhập và xác thực bằng access token/refresh token.
- Đăng, tìm kiếm và quản lý sản phẩm dành cho sinh viên.
- Upload ảnh trực tiếp lên Amazon S3 bằng presigned URL.
- Phân phối và cache nội dung qua Amazon CloudFront.
- Validation tập trung, xử lý lỗi thống nhất và logging có cấu trúc.

## Trạng thái hiện tại

| Thành phần | Trạng thái |
|---|---|
| Next.js, Tailwind và shadcn/ui | Đã khởi tạo và cấu hình cơ bản |
| ASP.NET Core API | Đã có endpoint mẫu và Swagger/OpenAPI |
| Tính năng marketplace | Chưa triển khai |
| PostgreSQL và EF Core | Đã có package, chưa có DbContext/migration |
| JWT và refresh token | Chưa triển khai |
| S3 và CloudFront | Chưa triển khai service/cấu hình |

<!-- ## Lưu ý bảo mật

- Không commit secret, access key, connection string hoặc file môi trường.
- Dùng biến môi trường hoặc secret manager cho cấu hình nhạy cảm.
- Presigned URL nên có thời hạn ngắn và giới hạn loại tệp, kích thước cùng quyền sở hữu.
- Cấu hình CORS phù hợp khi frontend và backend chạy ở các origin khác nhau. -->
