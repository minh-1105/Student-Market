'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PackageSearch } from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import { TopBar } from '@/components/shell/TopBar';
import { PageHeader, Loading, Notice, EmptyState, Pagination } from '@/components/ui';
import { ItemCard, ItemGrid } from '@/components/items/ItemCard';
import { ItemDetailModal } from '@/components/items/ItemDetailModal';
import { itemsApi, favoritesApi, apiError, SORT_OPTIONS, type Category, type ItemSummary, type PagedResult } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';

import { useT } from '@/lib/i18n';
function Marketplace() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const keyword = params.get('q') || '';
  const { isAuthenticated } = useAuthStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState('newest');
  const [exchangeOnly, setExchangeOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PagedResult<ItemSummary> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openItem, setOpenItem] = useState<string | null>(null);

  // Reset to page 1 whenever the filters change.
  const filterKey = `${keyword}|${categoryId}|${sortBy}|${exchangeOnly}`;
  const [lastKey, setLastKey] = useState(filterKey);
  if (lastKey !== filterKey) {
    setLastKey(filterKey);
    setPage(1);
  }

  useEffect(() => {
    itemsApi.categories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    itemsApi
      .search({ keyword, categoryIds: categoryId ? [categoryId] : undefined, sortBy, exchangeOnly, page, pageSize: 12 })
      .then((r) => {
        if (!cancelled) {
          setResult(r);
          setError(null);
        }
      })
      .catch((e) => !cancelled && setError(apiError(e, t('Không tải được danh sách tin.', 'Could not load listings.'))));
    return () => {
      cancelled = true;
    };
  }, [keyword, categoryId, sortBy, exchangeOnly, page, t]);

  const setFavorite = useCallback((id: string, isFavorited: boolean) => {
    setResult((r) => r && { ...r, items: r.items.map((it) => (it.id === id ? { ...it, isFavorited } : it)) });
  }, []);

  const toggleFavorite = async (item: ItemSummary) => {
    if (!isAuthenticated) return router.push('/auth?redirect=/marketplace');
    try {
      const r = await favoritesApi.toggle(item.id);
      setFavorite(item.id, r.isFavorited);
    } catch (e) {
      setError(apiError(e));
    }
  };

  return (
    <>
      <TopBar key={keyword} initialQuery={keyword} />
      <PageHeader
        title={keyword ? t(`Kết quả cho “${keyword}”`, `Results for “${keyword}”`) : t('Chợ đồ', 'Marketplace')}
        subtitle={t('Giáo trình, đồ điện tử, đồ KTX từ bạn bè cùng trường. Tin giá 0đ là đồ tặng miễn phí.', 'Textbooks, electronics and dorm gear from fellow students. 0 ₫ listings are free giveaways.')}
      />

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-1 flex-1" role="group" aria-label={t('Danh mục', 'Categories')}>
          {[{ id: null as number | null, name: t('Tất cả', 'All') }, ...categories].map((c) => (
            <button
              key={c.id ?? 'all'}
              type="button"
              onClick={() => setCategoryId(c.id)}
              aria-pressed={categoryId === c.id}
              className={cn(
                'shrink-0 px-4 py-2 rounded-full text-xs font-semibold border transition-colors cursor-pointer',
                categoryId === c.id ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-900'
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700 cursor-pointer select-none">
            <input type="checkbox" checked={exchangeOnly} onChange={(e) => setExchangeOnly(e.target.checked)} className="w-4 h-4 accent-black" />
            {t('Nhận đổi đồ', 'Open to swaps')}
          </label>
          <label htmlFor="sort" className="sr-only">
            {t('Sắp xếp', 'Sort')}
          </label>
          <select id="sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="field !w-auto !py-2 !rounded-full text-xs cursor-pointer">
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {t(s.vi, s.en)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="mb-6"><Notice>{error}</Notice></div>}
      {!result && !error && <Loading />}
      {result && (
        <>
          <p className="text-xs text-neutral-500 mb-4 tabular">{t(`${result.totalCount} tin đăng`, `${result.totalCount} listings`)}</p>
          {result.items.length ? (
            <ItemGrid>
              {result.items.map((it) => (
                <ItemCard key={it.id} item={it} onOpen={(i) => setOpenItem(i.id)} onToggleFavorite={toggleFavorite} />
              ))}
            </ItemGrid>
          ) : (
            <EmptyState
              icon={<PackageSearch className="w-5 h-5" />}
              title={t('Không tìm thấy món đồ phù hợp', 'No matching items')}
              description={t('Thử từ khóa khác, bỏ bớt bộ lọc hoặc chọn danh mục khác.', 'Try another keyword, fewer filters or a different category.')}
            />
          )}
          <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />
        </>
      )}

      <ItemDetailModal itemId={openItem} onClose={() => setOpenItem(null)} onFavoriteChange={setFavorite} />
    </>
  );
}

export default function MarketplacePage() {
  return (
    <AppShell>
      <Suspense fallback={<Loading />}>
        <Marketplace />
      </Suspense>
    </AppShell>
  );
}
