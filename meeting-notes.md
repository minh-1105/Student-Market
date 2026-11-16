## Meeting note (19/10/2026)

3 roles: Admin, User, AI Service
6 Features: 
1. Xác thực và quản lý tài khoản (Authentication & Authorization Profile)
- Đăng ký & Đăng nhập (JWT Flow): Hỗ trợ sinh viên/học sinh đăng ký tài khoản (hỗ trợ email thông thường hoặc email trường) và đăng nhập an toàn bằng JWT Access Token & Refresh Token.

- Quản lý Hồ sơ Sinh viên (Profile): Cập nhật ảnh đại diện (Avatar), số điện thoại, tên trường học (SchoolName), mã sinh viên (StudentCode) và khu vực/ký túc xá thường lui tới.

- Xác thực danh tính (Verification): Gửi mã OTP hoặc link kích hoạt qua email để chống tài khoản rác/ảo.

2. Phân hệ Quản lý tin đăng & Danh mục (Item & Catalog)
- Đăng tin thanh lý đồ cũ (Create listing):
 + Nhập thông tin: Tiêu đề, danh mục, mô tả chi tiết, giá bán (hoặc 0đ nếu tặng), độ mới (Condition: New 99%, Good, Fair...).

 + Thiết lập cờ "Cho phép đổi đồ" (IsExchangeEnabled) và địa điểm gặp mặt trực tiếp (Location - ví dụ: KTX Khu A, Cổng trường).

- Xử lý Tải ảnh Đa phương tiện lên Cloud (Cloud Media Upload):
+ Frontend xin chữ ký bảo mật (S3 Presigned URL) từ Backend .NET để upload ảnh trực tiếp lên Amazon S3.
+ Kích hoạt tiến trình ngầm (AWS Lambda) tự động nén, resize ảnh thumbnail và phân phối hiển thị tốc độ cao qua Amazon CloudFront.

- Tìm kiếm & Bộ lọc nâng cao (Search & Discovery):
+ Tìm kiếm theo từ khóa tiêu đề sản phẩm.
+ Lọc linh hoạt theo danh mục (Sách/Giáo trình, Đồ gia dụng phòng trọ, Đồ điện tử), khoảng giá, độ mới và trạng thái.

- Danh sách Yêu thích (Favorite / Wishlist): Lưu các món đồ quan tâm vào danh sách theo dõi cá nhân.

3. Trao đổi & Giao dịch (Trading & Transactions)
- Gửi Yêu cầu Đổi đồ (Exchange Request):
+ Cho phép người mua chọn một món đồ trong kho của mình để đề xuất đổi lấy món đồ của người khác (RequestedItem <=> OfferedItem).
+ Hỗ trợ thỏa thuận số tiền bù chênh lệch (AdditionalAmount) kèm ghi chú thương lượng.
+ Người bán có thể chấp nhận (Accepted) hoặc từ chối (Rejected) yêu cầu.

- Tạo & Quản lý Đơn giao dịch (Transaction Processing):
+ Khởi tạo giao dịch mua trực tiếp (BuyDirect) hoặc hoàn tất đổi đồ (Exchange).
+ Quản lý vòng đời đơn: Đang xử lý (Processing), Hoàn thành (Completed) hoặc Hủy giao dịch (Cancelled).
+ Lựa chọn phương thức thanh toán: Trả tiền mặt khi gặp nhận đồ (COD) hoặc chuyển khoản qua QR ngân hàng / Cổng thanh toán.

4. Trò chuyện Trực tiếp (Real-time Chat)
- Chat thương lượng 1 - 1: Người mua và người bán trao đổi tin nhắn trực tiếp xoay quanh sản phẩm đang quan tâm.
- Lịch sử hội thoại & Đánh dấu đã đọc: Cập nhật trạng thái tin nhắn mới nhất, số lượng tin chưa đọc và xem trước nội dung chat.

5. Đánh giá & Kiểm duyệt An toàn (Trust & Moderation)
- Đánh giá Uy tín (Review & Rating): Sau khi hoàn tất giao dịch, hai bên có thể chấm điểm từ 1 đến 5 sao kèm bình luận thực tế để xây dựng điểm tín nhiệm cho tài khoản.
- Báo cáo Vi phạm (Report System): Người dùng có thể báo cáo các bài đăng sai sự thật, lừa đảo hoặc tài khoản có hành vi quấy rối.
- Admin Dashboard (Dành cho Quản trị viên):
+ Quản lý, đóng/mở các danh mục sản phẩm trên sàn.
+ Tiếp nhận danh sách Report để xử lý vi phạm, ẩn/xóa tin đăng hoặc khóa tài khoản (Banned).

6. Tự động hóa & Tính năng AI (AWS AI & Background Pipeline)
- Kiểm duyệt ảnh tự động (AI Content Moderation): Quét ảnh tải lên qua Amazon Rekognition (hoặc Vision API) để phát hiện và chặn nội dung nhạy cảm, độc hại trước khi bài viết được hiển thị.
- Gợi ý Phân loại & Tag môn học (Smart Categorization): Sử dụng LLM mini (Bedrock / Gemini API) để tự động nhận diện danh mục và đề xuất tag phù hợp dựa trên tiêu đề bài đăng.

