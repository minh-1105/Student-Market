# Kiến trúc Student Market
 
## 1. Tổng quan
 
Student Market là nền tảng chợ đồ cũ dành cho sinh viên. Repository gồm hai ứng dụng độc lập:
 
```text
Student Market/
├── student-flea-market-be/   # Backend REST API
├── student-flea-market-fe/   # Frontend web application
└── summary.md                # Tài liệu kiến trúc này
```
 
Frontend phụ trách giao diện và tương tác người dùng. Backend cung cấp API, nghiệp vụ, xác thực, dữ liệu và tích hợp hạ tầng. Hai phần có thể phát triển, kiểm thử và triển khai độc lập.
 
## 2. Kiến trúc tổng thể
 
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
 
> S3, CloudFront, PostgreSQL, JWT và các lớp nghiệp vụ là kiến trúc mục tiêu trong README/dependencies; chúng chưa được triển khai đầy đủ.
 
## 3. Frontend (`student-flea-market-fe`)
 
### Công nghệ
 
- Next.js 16, App Router, React 19 và TypeScript `strict`.
- Tailwind CSS 4, shadcn/ui và Base UI.
- TanStack Query cho server state; Zustand cho client state.
- React Hook Form và Zod cho form/validation.
- Axios làm HTTP client; Lucide React cung cấp icon.
 
### Cấu trúc hiện tại
 
```text
student-flea-market-fe/
├── public/                  # Tài nguyên tĩnh
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Trang chủ
│   │   └── globals.css      # Tailwind và design tokens
│   ├── components/ui/       # UI dùng lại
│   └── lib/utils.ts         # Tiện ích dùng chung
├── components.json
├── next.config.ts
├── package.json
└── tsconfig.json
```
 
App Router ánh xạ `src/app` thành route. `page.tsx` hiện vẫn là trang mặc định Next.js. Khi mở rộng, nên nhóm mã trong `src/features` và tách `hooks`, `stores`, `schemas`, `types`; đây là đề xuất, chưa phải cấu trúc hiện có.
 
## 4. Backend (`student-flea-market-be`)
 
### Công nghệ
 
- ASP.NET Core Web API, target framework thực tế là .NET 10 (`net10.0`).
- Entity Framework Core và Npgsql cho PostgreSQL.
- JWT Bearer, FluentValidation và Mapster.
- AWS SDK for S3, Serilog, OpenAPI và Swagger UI.
 
### Cấu trúc hiện tại
 
```text
student-flea-market-be/
├── StudentFleaMarket.slnx
└── StudentFleaMarket.API/
    ├── Program.cs
    ├── StudentFleaMarket.API.csproj
    ├── appsettings.json
    ├── appsettings.Development.json
    ├── StudentFleaMarket.API.http
    └── Properties/launchSettings.json
```
 
Backend hiện là API tối giản. `Program.cs` mới đăng ký OpenAPI/Swagger, HTTPS redirection và endpoint `GET /weatherforecast`. Chưa có DbContext, migration, authentication middleware, domain model hay API nghiệp vụ.
 
### Clean Architecture mục tiêu
 
```text
API              Controllers/Endpoints, middleware, auth
 │
 ▼
Application      Use cases, DTO, validation, interfaces
 │
 ▼
Domain           Entity, value object, luật nghiệp vụ
 
Infrastructure   EF Core, PostgreSQL, S3, logging
```
 
Quy tắc phụ thuộc nên là `API → Application → Domain`. `Infrastructure` hiện thực interface của lớp trong. `Domain` không phụ thuộc framework, database hoặc AWS.
 
## 5. Luồng giao tiếp chính
 
1. Frontend gọi REST API qua Axios; interceptor dự kiến gắn JWT.
2. Backend xác thực, validate request, thực thi use case và truy cập PostgreSQL qua EF Core.
3. Backend trả DTO; TanStack Query cache dữ liệu và cập nhật giao diện.
4. Với ảnh, frontend xin presigned URL, tải trực tiếp lên S3; CloudFront phân phối nội dung.
5. Auth dự kiến dùng access token và refresh-token rotation.
 
## 6. Chạy cục bộ
 
```powershell
# Backend
cd student-flea-market-be/StudentFleaMarket.API
dotnet restore
dotnet run
 
# Frontend
cd student-flea-market-fe
npm install
npm run dev
```
 
API dùng `http://localhost:5033` hoặc `https://localhost:7030` trong Development. Frontend chưa khai báo base URL của API.
 
## 7. Trạng thái triển khai
 
| Thành phần | Trạng thái |
|---|---|
| Next.js, Tailwind, shadcn UI | Đã khởi tạo/cấu hình cơ bản |
| Tính năng marketplace | Chưa triển khai |
| ASP.NET Core API | Có endpoint mẫu |
| PostgreSQL/EF Core | Có package, chưa có DbContext/migration |
| JWT/refresh token | Có package JWT, chưa triển khai |
| Validation/Mapster | Có package, chưa áp dụng |
| S3/CloudFront | Có AWS SDK S3, chưa có service/cấu hình |
| Serilog | Có package, chưa cấu hình pipeline |
| Docker/Compose | Nêu trong README, chưa có file cấu hình |
 
## 8. Lưu ý kỹ thuật
 
- README backend ghi .NET 8, nhưng project file target .NET 10; cần thống nhất.
- Secret phải nằm trong biến môi trường hoặc secret manager, không commit.
- Cần cấu hình CORS khi frontend và backend chạy khác origin.
- API nên dùng DTO, xử lý lỗi tập trung và response format nhất quán.
- Presigned URL cần thời hạn ngắn và kiểm tra MIME type, kích thước, quyền sở hữu.
- Nên có unit test, integration test và end-to-end test.
 
