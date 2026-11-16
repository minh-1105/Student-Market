using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using StudentFleaMarket.Domain.Entities;
using StudentFleaMarket.Domain.Enums;

namespace StudentFleaMarket.Infrastructure.Persistence;

/// <summary>
/// Nạp dữ liệu khởi tạo (seed) vào database: tài khoản Admin + Moderator mặc định
/// và danh mục sản phẩm.
/// Chạy tự động khi khởi động API (idempotent — không ghi đè dữ liệu đã có).
/// <para>
/// Mật khẩu KHÔNG nằm trong source code: đọc từ cấu hình <c>Seed:AdminPassword</c> và
/// <c>Seed:ModeratorPassword</c> (user-secrets khi dev, biến môi trường <c>Seed__AdminPassword</c>
/// khi deploy). Thiếu cấu hình thì bỏ qua tạo tài khoản đó và ghi cảnh báo.
/// </para>
/// </summary>
public static class DatabaseSeeder
{
    /// <summary>Tài khoản Admin mặc định.</summary>
    private const string DefaultAdminUsername = "admin";
    private const string DefaultAdminEmail = "admin@gmail.com";
    private const string DefaultAdminFullName = "Administrator";

    /// <summary>Tài khoản Moderator (kiểm duyệt viên) mặc định.</summary>
    private const string DefaultModeratorUsername = "moderator";
    private const string DefaultModeratorEmail = "moderator@gmail.com";
    private const string DefaultModeratorFullName = "Moderator";

    public const string AdminPasswordKey = "Seed:AdminPassword";
    public const string ModeratorPasswordKey = "Seed:ModeratorPassword";

    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger(typeof(DatabaseSeeder));

        await SeedAdminAsync(db, config[AdminPasswordKey], logger);
        await SeedModeratorAsync(db, config[ModeratorPasswordKey], logger);
        await SeedCategoriesAsync(db);
    }

    private static async Task SeedAdminAsync(AppDbContext db, string? password, ILogger logger)
    {
        var adminExists = await db.Users.AnyAsync(u => u.Username == DefaultAdminUsername);

        if (adminExists)
            return;

        if (string.IsNullOrWhiteSpace(password))
        {
            logger.LogWarning("Bỏ qua tạo tài khoản admin mặc định: chưa cấu hình {Key}.", AdminPasswordKey);
            return;
        }

        // Tái sử dụng PasswordHasher của Infrastructure để hash giống hệt format lưu trong DB.
        var hasher = new Services.PasswordHasher();

        var admin = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            FullName = DefaultAdminFullName,
            Email = DefaultAdminEmail,
            Username = DefaultAdminUsername,
            PasswordHash = hasher.Hash(password),
            Role = (int)UserRole.Admin,
            Status = (int)UserStatus.Active,
            // Admin seed không cần OTP — đánh dấu đã xác thực để đăng nhập được ngay.
            IsEmailVerified = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.Users.Add(admin);
        await db.SaveChangesAsync();
    }

    /// <summary>
    /// Seed tài khoản kiểm duyệt viên — chia sẻ công việc quản trị với Admin.
    /// Moderator có sẵn quyền đăng tin bán (không cần xin duyệt) nên
    /// SellerStatus được set luôn là Approved.
    /// </summary>
    private static async Task SeedModeratorAsync(AppDbContext db, string? password, ILogger logger)
    {
        var moderatorExists = await db.Users.AnyAsync(u => u.Username == DefaultModeratorUsername);

        if (moderatorExists)
            return;

        if (string.IsNullOrWhiteSpace(password))
        {
            logger.LogWarning("Bỏ qua tạo tài khoản moderator mặc định: chưa cấu hình {Key}.", ModeratorPasswordKey);
            return;
        }

        var hasher = new Services.PasswordHasher();

        var moderator = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            FullName = DefaultModeratorFullName,
            Email = DefaultModeratorEmail,
            Username = DefaultModeratorUsername,
            PasswordHash = hasher.Hash(password),
            Role = (int)UserRole.Moderator,
            Status = (int)UserStatus.Active,
            IsEmailVerified = true,
            // Moderator được phép đăng tin nhờ vai trò (SellerPermission.CanSell)
            // -> không cần SellerStatus = Approved.
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.Users.Add(moderator);
        await db.SaveChangesAsync();
    }

    private static async Task SeedCategoriesAsync(AppDbContext db)
    {
        var categories = new (string Name, string Slug, int Order)[]
        {
            ("Sách", "sach", 1),
            ("Giáo dụng & Tài liệu", "giao-duc-tai-lieu", 2),
            ("Thời trang", "thoi-trang", 3),
            ("Đồ gia dụng", "do-gia-dung", 4),
            ("Điện tử", "dien-tu", 5),
            ("Thể thao & Sức khỏe", "the-thao-suc-khoe", 6),
            ("Xe cộ & Phụ kiện", "xe-co-phu-kien", 7),
            ("Nhạc cụ", "nhac-cu", 8),
            ("Khác", "khac", 9)
        };

        var existingSlugs = await db.Category.Select(c => c.Slug).ToListAsync();

        var missing = categories
            .Where(c => !existingSlugs.Contains(c.Slug))
            .Select(c => new Category
            {
                Id = 0,
                Name = c.Name,
                Slug = c.Slug,
                Order = c.Order
            })
            .ToList();

        if (missing.Count == 0)
            return;

        db.Category.AddRange(missing);
        await db.SaveChangesAsync();
    }
}
