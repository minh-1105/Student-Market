'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Calendar, Clock, Bookmark, Layers, BadgeCheck, Activity, ArrowRight } from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import { Modal, Avatar } from '@/components/ui';
import { ItemCard, ItemGrid } from '@/components/items/ItemCard';
import { ItemDetailModal } from '@/components/items/ItemDetailModal';
import { itemsApi, favoritesApi, sellerApi, type ItemSummary } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { formatDate } from '@/lib/format';
import { useLang, tr } from '@/lib/i18n';

import { useT } from '@/lib/i18n';
interface ArticleText {
  title: string;
  description: string;
  content: string;
}
interface Article {
  id: number;
  date: string;
  readMin: number;
  image: string;
  vi: ArticleText;
  en: ArticleText;
}

const ARTICLES: Article[] = [
  {
    id: 1,
    date: '2026-01-18',
    readMin: 5,
    image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
    en: {
      title: 'A student’s guide to FLea',
      description: 'Buy, give away, or swap items with fellow students — save money, cut waste and keep things in the campus community.',
      content:
        'FLea helps students trade textbooks, dorm essentials and tech at the lowest cost.\n\n1. Find items by category or keyword in the Marketplace.\n2. Save the ones you like to Favorites.\n3. Meet in person, check the item, then pay.\n4. Want to sell? Request seller access — once approved you can post right away.',
    },
    vi: {
    title: 'Cẩm nang dùng FLea cho sinh viên',
    description: 'Mua, tặng hoặc đổi đồ với bạn cùng trường — tiết kiệm tiền, giảm rác thải và giữ đồ dùng trong cộng đồng.',
    content:
      'FLea giúp sinh viên trao đổi giáo trình, đồ dùng phòng trọ và đồ công nghệ với chi phí thấp nhất.\n\n1. Tìm đồ theo danh mục hoặc từ khóa trong Chợ đồ.\n2. Lưu món ưng ý vào Yêu thích để xem lại.\n3. Hẹn gặp trực tiếp, kiểm tra món đồ rồi mới thanh toán.\n4. Muốn bán? Gửi yêu cầu trở thành người bán, khi được duyệt là đăng tin được ngay.',
    },
  },
  {
    id: 2,
    date: '2026-01-15',
    readMin: 4,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    en: {
      title: 'How to be a trusted seller',
      description: 'Simple tips to earn great reviews, communicate clearly and finish deals smoothly and safely.',
      content:
        'Being honest about condition, posting real photos from several angles and replying fast are the three things that earn great reviews.\n\nMention small flaws (scratches, missing accessories) in the description. Meet in busy places like the dorm lobby or campus gate, and be on time.',
    },
    vi: {
    title: 'Làm sao để trở thành người bán uy tín',
    description: 'Vài mẹo đơn giản để có đánh giá tốt, trao đổi rõ ràng và hoàn tất giao dịch suôn sẻ, an toàn.',
    content:
      'Minh bạch về tình trạng sản phẩm, chụp ảnh thật từ nhiều góc và phản hồi nhanh là ba yếu tố cốt lõi giúp bạn được đánh giá cao.\n\nGhi rõ lỗi nhỏ (trầy xước, thiếu phụ kiện) ngay trong mô tả. Hẹn gặp ở nơi đông người như sảnh KTX hoặc cổng trường, và giữ đúng giờ hẹn.',
    },
  },
  {
    id: 3,
    date: '2026-01-10',
    readMin: 6,
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80',
    en: {
      title: 'Give, swap, reuse: a greener campus',
      description: 'Students give away and swap items on FLea to extend their life and cut waste every moving season.',
      content:
        'At the end of each term, fans, kettles and books get left behind when students move out.\n\nWith free (0 ₫) listings and the “open to swaps” option you can pass on things that still work instead of throwing them away. Just set the price to 0 when posting, or turn on swaps.',
    },
    vi: {
    title: 'Tặng, đổi, tái sử dụng: vì một campus xanh hơn',
    description: 'Sinh viên đang tặng và đổi đồ trên FLea để kéo dài vòng đời món đồ và giảm rác thải mỗi mùa chuyển trọ.',
    content:
      'Cuối mỗi kỳ, rất nhiều quạt điện, ấm đun nước và sách vở bị bỏ lại khi sinh viên chuyển trọ.\n\nVới tin Tặng 0đ và tùy chọn Nhận đổi đồ, bạn có thể trao lại những món còn dùng tốt cho bạn khác thay vì vứt đi. Chỉ cần đặt giá 0đ khi đăng tin, hoặc bật Nhận đổi đồ.',
    },
  },
];

interface Metrics {
  favorites: number | null;
  listings: number | null;
  sellerStatus: string | null;
}

export default function DiscoverPage() {
  const t = useT();
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  const lang = useLang((s) => s.lang);
  const [query, setQuery] = useState('');
  const [article, setArticle] = useState<Article | null>(null);
  const [latest, setLatest] = useState<ItemSummary[] | null>(null);
  const [metrics, setMetrics] = useState<Metrics>({ favorites: null, listings: null, sellerStatus: null });
  const [openItem, setOpenItem] = useState<string | null>(null);

  useEffect(() => {
    itemsApi
      .search({ sortBy: 'newest', pageSize: 4 })
      .then((r) => setLatest(r.items))
      .catch(() => setLatest([]));
  }, []);

  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return;
    Promise.allSettled([favoritesApi.list(1, 1), itemsApi.mine({ pageSize: 1 }), sellerApi.status()]).then(([f, m, s]) =>
      setMetrics({
        favorites: f.status === 'fulfilled' ? f.value.totalCount : null,
        listings: m.status === 'fulfilled' ? m.value.totalCount : null,
        sellerStatus: s.status === 'fulfilled' ? (s.value.canSell ? tr('Đã được duyệt', 'Approved') : s.value.sellerStatusName) : null,
      })
    );
  }, [isInitialized, isAuthenticated]);

  const articles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? ARTICLES.filter((a) => `${a[lang].title} ${a[lang].description} ${a[lang].content}`.toLowerCase().includes(q)) : ARTICLES;
  }, [query, lang]);

  const metricCards = [
    { icon: Bookmark, label: t('Tin đã lưu', 'Saved items'), value: metrics.favorites, unit: t('món', 'items'), href: '/favorites' },
    { icon: Layers, label: t('Tin của tôi', 'My listings'), value: metrics.listings, unit: t('tin', 'listings'), href: '/my-listings' },
    { icon: BadgeCheck, label: t('Quyền bán', 'Seller access'), value: metrics.sellerStatus, unit: '', href: '/post-item' },
    { icon: Activity, label: t('Thành viên từ', 'Member since'), value: user ? formatDate(user.createdAt) : null, unit: '', href: '/my-listings' },
  ];

  return (
    <AppShell>
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-4xl font-bold text-neutral-900">{t('Khám phá', 'Discover')}</h1>
          <p className="text-sm text-neutral-500 mt-1">{t('Câu chuyện, mẹo và hướng dẫn mua, tặng, đổi đồ trên FLea.', 'Stories, tips and guides for buying, giving away and swapping on FLea.')}</p>
        </div>
        {isAuthenticated && user ? (
          <Avatar name={user.fullName} url={user.avatarUrl} size="lg" />
        ) : (
          <Link href="/auth" className="btn btn-outline hidden sm:inline-flex">
            {t('Đăng nhập', 'Sign in')}
          </Link>
        )}
      </div>

      <div role="search" className="relative mb-8">
        <label htmlFor="blog-search" className="sr-only">
          {t('Tìm bài viết', 'Search articles')}
        </label>
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" aria-hidden="true" />
        <input
          id="blog-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('Tìm bài viết, mẹo hoặc chủ đề (vd: đổi đồ, uy tín, người bán)...', 'Search articles, tips or topics (e.g. swap, trust, seller)...')}
          className="field !rounded-full pl-12 py-3.5"
        />
      </div>

      {articles.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {articles.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setArticle(a)}
              className="article-card text-left bg-[#f0f0f0] rounded-3xl overflow-hidden border border-white/80 cursor-pointer group flex flex-col"
            >
              <div className="h-44 overflow-hidden bg-neutral-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-5 flex-1">
                <h2 className="font-serif text-xl font-bold text-neutral-900 mb-2 leading-snug">{a[lang].title}</h2>
                <p className="text-xs text-neutral-600 line-clamp-3 leading-relaxed">{a[lang].description}</p>
              </div>
              <div className="px-5 pb-5 pt-3 flex items-center justify-between text-[11px] text-neutral-500 border-t border-neutral-100">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" aria-hidden="true" /> {formatDate(a.date)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" /> {t(`${a.readMin} phút đọc`, `${a.readMin} min read`)}
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-neutral-500 mb-8">{t('Không có bài viết phù hợp.', 'No matching articles.')}</p>
      )}

      {/* Quick metrics (real data when signed in) */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
        {metricCards.map(({ icon: Icon, label, value, unit, href }) => (
          <Link key={label} href={isAuthenticated ? href : '/auth'} className="metric-card p-5 rounded-2xl bg-white/70 border border-white shadow-sm">
            <span className="flex items-center gap-2 text-xs font-semibold text-neutral-600">
              <Icon className="w-4 h-4" aria-hidden="true" /> {label}
            </span>
            <p className="text-xl font-bold text-neutral-900 mt-2 tabular truncate">
              {!isAuthenticated ? '—' : value === null ? '…' : `${value}${unit ? ` ${unit}` : ''}`}
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">{isAuthenticated ? t('Xem chi tiết', 'View details') : t('Đăng nhập để xem', 'Sign in to view')}</p>
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-neutral-900">{t('Mới đăng trên chợ', 'New on the marketplace')}</h2>
        <Link href="/marketplace" className="text-sm font-semibold text-neutral-900 inline-flex items-center gap-1 group">
          {t('Xem tất cả', 'See all')} <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
        </Link>
      </div>
      {latest === null ? (
        <p className="text-sm text-neutral-500">{t('Đang tải...', 'Loading...')}</p>
      ) : latest.length === 0 ? (
        <p className="text-sm text-neutral-500 py-8 text-center rounded-3xl bg-white/60 border border-dashed border-neutral-300">
          {t('Chợ chưa có tin nào. Hãy là người đầu tiên', 'No listings yet. Be the first to')}{' '}
          <Link href="/post-item" className="font-semibold text-neutral-900 underline">
            {t('đăng tin', 'post one')}
          </Link>
          .
        </p>
      ) : (
        <ItemGrid>
          {latest.map((it) => (
            <ItemCard key={it.id} item={it} onOpen={(i) => setOpenItem(i.id)} />
          ))}
        </ItemGrid>
      )}

      <Modal open={!!article} onClose={() => setArticle(null)} title={article ? article[lang].title : ''} size="lg">
        {article && (
          <>
            <p className="flex gap-3 text-xs text-neutral-500 mb-6">
              <span>{formatDate(article.date)}</span>
              <span aria-hidden="true">•</span>
              <span>{t(`${article.readMin} phút đọc`, `${article.readMin} min read`)}</span>
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={article.image} alt="" className="w-full h-64 object-cover rounded-2xl mb-6" />
            <p className="text-neutral-700 leading-relaxed text-sm whitespace-pre-line mb-6">{article[lang].content}</p>
            <button type="button" onClick={() => setArticle(null)} className="btn btn-primary w-full">
              {t('Đóng bài viết', 'Close article')}
            </button>
          </>
        )}
      </Modal>
      <ItemDetailModal itemId={openItem} onClose={() => setOpenItem(null)} />
    </AppShell>
  );
}
