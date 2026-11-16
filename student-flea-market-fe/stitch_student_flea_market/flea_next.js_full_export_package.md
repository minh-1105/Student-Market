# Hướng dẫn Xuất & Tích hợp Toàn bộ Dự án FLea vào Next.js (App Router + Tailwind CSS)

Dự án **FLea - Student Flea Market** bao gồm các màn hình chính:
1. **Dynamic Island Auth & Cell Split Portal** (Màn hình đăng nhập đảo động mô phỏng phân bào tế bào).
2. **Blog & Discover Dashboard** (Màn hình khám phá, tin tức, bài viết sinh viên kèm chi tiết bài đọc).
3. **Post an Item** (Màn hình đăng bài bán đồ, đổi đồ, tặng 0đ kèm Live Preview thời gian thực).

---

## 1. Cấu trúc thư mục khuyến nghị (Next.js 14/15 App Router)

```text
flea-marketplace/
├── package.json
├── tailwind.config.ts
├── postcss.config.js
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── page.tsx                    // Màn hình Blog & Discover
│   ├── post-item/
│   │   └── page.tsx                // Màn hình Đăng tin bán đồ
│   └── auth/
│       └── page.tsx                // Màn hình Xác thực đảo động / Phân bào
└── components/
    ├── Sidebar.tsx                 // Hòn đảo Sidebar bên trái
    ├── ListingPreview.tsx          // Card xem trước bài đăng trực tiếp
    └── BlogDetailModal.tsx         // Modal đọc chi tiết bài viết blog
```

---

## 2. Cài đặt Thư viện Phụ trợ

Cài đặt Lucide React để sử dụng bộ icon đồng nhất:
```bash
npm install lucide-react clsx tailwind-merge
```

---

## 3. Cấu hình Tailwind CSS (`tailwind.config.ts`)

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: '#f9f9f9',
        'surface-dim': '#dadada',
        'surface-container': '#f3f3f3',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        serif: ['var(--font-serif)', 'serif'],
      },
      borderRadius: {
        'island': '36px',
      }
    },
  },
  plugins: [],
};
export default config;
```

---

## 4. Root Layout (`app/layout.tsx`)

```tsx
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Newsreader } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
});

export const metadata: Metadata = {
  title: 'FLea - Chợ Đồ Cũ Sinh Viên',
  description: 'Nền tảng mua bán, trao đổi và tặng đồ 0đ dành cho học sinh, sinh viên.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${jakarta.variable} ${newsreader.variable}`}>
      <body className="min-h-screen bg-[#dadada] text-neutral-800 antialiased font-sans p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        {children}
      </body>
    </html>
  );
}
```

---

## 5. Component Sidebar Dùng Chung (`components/Sidebar.tsx`)

```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Tag, 
  MessageSquare, 
  Bookmark, 
  Layers, 
  RefreshCw, 
  Star, 
  Flag, 
  Settings, 
  LogOut 
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Marketplace', href: '/marketplace', icon: Tag },
    { label: 'Messages', href: '/messages', icon: MessageSquare, badge: 3 },
    { label: 'Favorites', href: '/favorites', icon: Bookmark },
    { label: 'My Listings', href: '/post-item', icon: Layers },
    { label: 'Transactions', href: '/transactions', icon: RefreshCw },
    { label: 'Reviews', href: '/reviews', icon: Star },
    { label: 'Reports', href: '/reports', icon: Flag },
  ];

  return (
    <aside className="w-72 bg-[#f3f3f3] rounded-[36px] p-6 shadow-xl flex flex-col justify-between border border-white/70">
      <div>
        {/* Brand Logo */}
        <h1 className="font-serif text-4xl font-bold tracking-tight mb-8 px-2 text-neutral-900">
          FLea
        </h1>

        {/* User Card */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/80 shadow-sm border border-black/5 mb-6">
          <div className="w-10 h-10 rounded-full bg-neutral-300 overflow-hidden relative">
            <img 
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120" 
              alt="Avatar" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-neutral-900 truncate">Minh Tran</p>
            <p className="text-xs text-neutral-500 flex items-center gap-1">🏛 FPT University</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-neutral-900 text-white shadow-md'
                    : 'text-neutral-600 hover:bg-neutral-200/60 hover:text-neutral-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 stroke-[1.8]" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                    isActive ? 'bg-white text-neutral-900' : 'bg-neutral-900 text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Controls */}
      <div className="pt-4 border-t border-neutral-200 space-y-1">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-neutral-600 hover:bg-neutral-200/50 transition-colors"
        >
          <Settings className="w-5 h-5 stroke-[1.8]" /> Settings
        </Link>
        <Link
          href="/auth"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-neutral-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-5 h-5 stroke-[1.8]" /> Sign Out
        </Link>
      </div>
    </aside>
  );
}
```

---

## 6. Màn hình Đăng bài bán đồ (`app/post-item/page.tsx`)

```tsx
'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Search, Plus, Bell, Heart, Upload, Tag, RefreshCw } from 'lucide-react';

export default function PostItemPage() {
  const [title, setTitle] = useState('Sony WH-1000XM4 Headphones');
  const [category, setCategory] = useState('Electronics');
  const [condition, setCondition] = useState('Like New');
  const [price, setPrice] = useState('2,800,000');
  const [description, setDescription] = useState(
    'Headphones in great condition, used for about 6 months. Full box and accessories included.'
  );
  const [listingType, setListingType] = useState<'sell' | 'exchange'>('sell');

  return (
    <div className="w-full max-w-[1500px] flex gap-6 items-stretch">
      {/* Cột trái: Sidebar */}
      <Sidebar />

      {/* Cột phải: Content Island */}
      <main className="flex-1 bg-[#f3f3f3] rounded-[36px] p-8 shadow-xl border border-white/70 flex flex-col justify-between">
        <div>
          {/* Header Bar */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search for items, categories, or users..."
                className="w-full pl-12 pr-4 py-3 bg-[#e8e8e8]/70 rounded-full text-sm outline-none focus:ring-2 focus:ring-neutral-400"
              />
            </div>
            <button className="flex items-center gap-2 px-5 py-3 bg-neutral-900 text-white rounded-full text-sm font-semibold hover:bg-black transition-colors shadow-md">
              <Plus className="w-4 h-4" /> Post an Item
            </button>
            <button className="p-3 bg-[#e8e8e8]/70 rounded-full hover:bg-neutral-200 transition-colors">
              <Bell className="w-5 h-5 text-neutral-700" />
            </button>
            <div className="w-11 h-11 rounded-full overflow-hidden bg-neutral-300">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120"
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Form Header */}
          <div className="mb-6">
            <h2 className="font-serif text-3xl font-bold text-neutral-900">Post an Item</h2>
            <p className="text-sm text-neutral-500 mt-1">
              Create a new listing to sell, exchange, or give away an item.
            </p>
          </div>

          {/* Grid: Form (Trái) & Preview (Phải) */}
          <div className="grid grid-cols-12 gap-8 items-start">
            {/* Form Fields */}
            <div className="col-span-8 space-y-5">
              {/* Photos */}
              <div>
                <div className="flex justify-between items-center text-xs font-semibold text-neutral-600 mb-2">
                  <span>Add Photos *</span>
                  <span>3/10</span>
                </div>
                <div className="flex gap-3">
                  <div className="w-32 h-28 border-2 border-dashed border-neutral-300 rounded-2xl flex flex-col items-center justify-center p-3 text-center cursor-pointer hover:border-neutral-500 transition-colors">
                    <Upload className="w-5 h-5 text-neutral-500 mb-1" />
                    <span className="text-xs font-bold">Add Photos</span>
                    <span className="text-[10px] text-neutral-400 mt-0.5">PNG, JPG up to 10MB</span>
                  </div>
                  {/* Photo Thumbnails */}
                  <div className="w-28 h-28 rounded-2xl overflow-hidden bg-neutral-200 border border-neutral-300 relative group">
                    <img
                      src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=300&h=300"
                      alt="Thumbnail 1"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-2">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-[#e8e8e8]/70 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-neutral-400"
                />
              </div>

              {/* Category & Condition */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-2">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-[#e8e8e8]/70 rounded-2xl text-sm outline-none"
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="Textbooks">Textbooks</option>
                    <option value="Clothing">Clothing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-2">Condition *</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="w-full px-4 py-3 bg-[#e8e8e8]/70 rounded-2xl text-sm outline-none"
                  >
                    <option value="Brand New">Brand New</option>
                    <option value="Like New">Like New</option>
                    <option value="Used">Used</option>
                  </select>
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-2">Price *</label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full px-4 py-3 bg-[#e8e8e8]/70 rounded-2xl text-sm outline-none font-semibold"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">₫</span>
                  </div>
                  <div className="flex-1 px-4 py-3 bg-[#e8e8e8]/50 rounded-2xl text-xs text-neutral-500 flex items-center">
                    💡 Set price to 0 ₫ to give away for free.
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <div className="flex justify-between items-center text-xs font-semibold text-neutral-600 mb-2">
                  <span>Description *</span>
                  <span>{description.length}/1000</span>
                </div>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-[#e8e8e8]/70 rounded-2xl text-sm outline-none resize-none focus:ring-2 focus:ring-neutral-400"
                />
              </div>

              {/* Listing Type Radio Cards */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-2">Listing Type *</label>
                <div className="grid grid-cols-2 gap-4">
                  <div
                    onClick={() => setListingType('sell')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                      listingType === 'sell'
                        ? 'border-neutral-900 bg-white/70 shadow-sm'
                        : 'border-transparent bg-[#e8e8e8]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Tag className="w-5 h-5 text-neutral-700" />
                      <div>
                        <p className="text-sm font-bold text-neutral-900">Sell</p>
                        <p className="text-xs text-neutral-500">Sell the item for a set price.</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      listingType === 'sell' ? 'border-neutral-900' : 'border-neutral-400'
                    }`}>
                      {listingType === 'sell' && <div className="w-2.5 h-2.5 bg-neutral-900 rounded-full" />}
                    </div>
                  </div>

                  <div
                    onClick={() => setListingType('exchange')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                      listingType === 'exchange'
                        ? 'border-neutral-900 bg-white/70 shadow-sm'
                        : 'border-transparent bg-[#e8e8e8]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <RefreshCw className="w-5 h-5 text-neutral-700" />
                      <div>
                        <p className="text-sm font-bold text-neutral-900">Exchange</p>
                        <p className="text-xs text-neutral-500">Request to exchange for items.</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      listingType === 'exchange' ? 'border-neutral-900' : 'border-neutral-400'
                    }`}>
                      {listingType === 'exchange' && <div className="w-2.5 h-2.5 bg-neutral-900 rounded-full" />}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Listing Preview Card */}
            <div className="col-span-4 bg-white/80 rounded-3xl p-5 border border-white shadow-lg sticky top-8">
              <h3 className="text-sm font-bold text-neutral-900 mb-1">Listing Preview</h3>
              <p className="text-xs text-neutral-500 mb-4">This is how your listing will appear.</p>

              <div className="rounded-2xl overflow-hidden bg-neutral-100 border border-black/5 relative group mb-4">
                <img
                  src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&h=400"
                  alt="Product preview"
                  className="w-full h-48 object-cover"
                />
                <button className="absolute top-3 right-3 p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors">
                  <Heart className="w-4 h-4" />
                </button>
              </div>

              <h4 className="font-bold text-neutral-900 text-base mb-1 truncate">{title || 'Product Title'}</h4>
              <p className="font-serif text-xl font-extrabold text-neutral-900 mb-3">{price || '0'} ₫</p>

              <div className="flex items-center gap-2 py-2 border-t border-b border-neutral-100 mb-3">
                <div className="w-6 h-6 rounded-full bg-neutral-300 overflow-hidden" />
                <span className="text-xs font-semibold text-neutral-800">Minh Tran</span>
                <span className="text-[11px] text-neutral-400 ml-auto">Just now</span>
              </div>

              <p className="text-xs text-neutral-600 line-clamp-2 mb-4">{description}</p>

              <div className="flex gap-2">
                <span className="px-3 py-1 bg-neutral-100 rounded-full text-[11px] font-semibold text-neutral-700">
                  🏷 {category}
                </span>
                <span className="px-3 py-1 bg-neutral-100 rounded-full text-[11px] font-semibold text-neutral-700">
                  ✨ {condition}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-6 mt-8 border-t border-neutral-200">
          <button className="px-6 py-3 rounded-full bg-neutral-200 text-neutral-800 font-semibold text-sm hover:bg-neutral-300 transition-colors">
            Save as Draft
          </button>
          <button className="px-8 py-3 rounded-full bg-neutral-900 text-white font-semibold text-sm hover:bg-black transition-colors shadow-lg">
            Post Listing
          </button>
        </div>
      </main>
    </div>
  );
}
```

---

## 7. Màn hình Blog & Khám phá (`app/page.tsx`)

```tsx
'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Search, Bell, Clock, Calendar, ArrowRight, ShieldCheck, Bookmark, RefreshCw, Activity } from 'lucide-react';

export default function DiscoverPage() {
  const [selectedBlog, setSelectedBlog] = useState<any | null>(null);

  const blogs = [
    {
      id: 1,
      title: "A Student’s Guide to FLea",
      description: "Buy, give away, or swap items with fellow students — save money, reduce waste, and keep things in the campus community.",
      date: "Jan 18, 2025",
      readTime: "5 min read",
      image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&h=380",
      content: "FLea được tạo ra nhằm mục đích giúp sinh viên trao đổi giáo trình, đồ gia dụng phòng trọ và đồ công nghệ với chi phí tối ưu nhất..."
    },
    {
      id: 2,
      title: "How to Be a Trusted Seller",
      description: "Simple tips to build a great rating, communicate clearly, and complete smooth, safe transactions on FLea.",
      date: "Jan 15, 2025",
      readTime: "4 min read",
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&h=380",
      content: "Minh bạch về tình trạng sản phẩm, chụp ảnh thật từ nhiều góc và phản hồi tin nhắn nhanh là 3 yếu tố cốt lõi giúp bạn đạt Trust Score 5.0."
    },
    {
      id: 3,
      title: "Give, Swap, Reuse: A More Sustainable Campus",
      description: "See how students are giving away and swapping items on FLea to extend item life and create a more sustainable campus.",
      date: "Jan 10, 2025",
      readTime: "6 min read",
      image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&h=380",
      content: "Hàng trăm chiếc quạt điện, ấm đun nước và sách vở đã không bị vứt bỏ vào cuối mỗi kỳ chuyển trọ nhờ tính năng Tặng 0đ và Đổi đồ."
    }
  ];

  return (
    <div className="w-full max-w-[1500px] flex gap-6 items-stretch">
      <Sidebar />

      <main className="flex-1 bg-[#f3f3f3] rounded-[36px] p-8 shadow-xl border border-white/70 flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-serif text-4xl font-bold text-neutral-900">Discover</h2>
              <p className="text-sm text-neutral-500 mt-1">
                Student stories, tips, and guides for buying, giving away, and swapping on FLea.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-3 bg-[#e8e8e8]/70 rounded-full hover:bg-neutral-200 transition-colors">
                <Bell className="w-5 h-5 text-neutral-700" />
              </button>
              <div className="w-11 h-11 rounded-full overflow-hidden bg-neutral-300">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120"
                  alt="Alex Chen"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative mb-8">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search blogs, tips, or topics (e.g., 'swap', 'seller rating', 'report')..."
              className="w-full pl-12 pr-4 py-3.5 bg-[#e8e8e8]/70 rounded-full text-sm outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>

          {/* 3 Featured Blog Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {blogs.map((b) => (
              <div
                key={b.id}
                onClick={() => setSelectedBlog(b)}
                className="bg-white/80 rounded-3xl overflow-hidden border border-white shadow-md hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="h-44 overflow-hidden bg-neutral-200">
                    <img
                      src={b.image}
                      alt={b.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="font-serif text-xl font-bold text-neutral-900 mb-2 leading-snug group-hover:text-black">
                      {b.title}
                    </h3>
                    <p className="text-xs text-neutral-600 line-clamp-3 leading-relaxed mb-4">
                      {b.description}
                    </p>
                  </div>
                </div>
                <div className="px-5 pb-5 pt-2 flex items-center justify-between text-[11px] text-neutral-400 border-t border-neutral-100">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{b.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{b.readTime}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white/70 border border-white shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-600 mb-1">
                <Activity className="w-4 h-4" /> Recent Activity
              </div>
              <p className="text-sm font-bold text-neutral-900 mt-2 truncate">You bought “Calculus Textbook”</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Completed 2 hours ago</p>
            </div>

            <div className="p-5 rounded-2xl bg-white/70 border border-white shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-600 mb-1">
                <Bookmark className="w-4 h-4" /> Saved Items
              </div>
              <p className="text-xl font-bold text-neutral-900 mt-1">8 items</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Items you’ve favorited</p>
            </div>

            <div className="p-5 rounded-2xl bg-white/70 border border-white shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-600 mb-1">
                <RefreshCw className="w-4 h-4" /> Ongoing Transactions
              </div>
              <p className="text-xl font-bold text-neutral-900 mt-1">1 active</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">“Desk Lamp” — awaiting pickup</p>
            </div>

            <div className="p-5 rounded-2xl bg-white/70 border border-white shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-600 mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Trust Score
              </div>
              <p className="text-xl font-bold text-neutral-900 mt-1">4.9 / 5</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Based on 27 seller ratings</p>
            </div>
          </div>
        </div>

        {/* Modal đọc chi tiết blog */}
        {selectedBlog && (
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setSelectedBlog(null)}
          >
            <div 
              className="bg-white rounded-3xl max-w-2xl w-full p-8 max-h-[85vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-serif text-3xl font-bold mb-3">{selectedBlog.title}</h2>
              <div className="flex gap-4 text-xs text-neutral-500 mb-6">
                <span>{selectedBlog.date}</span>
                <span>•</span>
                <span>{selectedBlog.readTime}</span>
              </div>
              <img src={selectedBlog.image} alt={selectedBlog.title} className="w-full h-64 object-cover rounded-2xl mb-6" />
              <p className="text-neutral-700 leading-relaxed text-sm whitespace-pre-line mb-6">
                {selectedBlog.content}
              </p>
              <button 
                onClick={() => setSelectedBlog(null)}
                className="w-full py-3 bg-neutral-900 text-white rounded-full font-semibold text-sm hover:bg-black transition-colors"
              >
                Close Article
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
```
