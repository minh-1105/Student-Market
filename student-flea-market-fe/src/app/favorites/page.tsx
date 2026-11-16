'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bookmark } from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import { RequireAuth } from '@/components/RequireAuth';
import { PageHeader, Loading, Notice, EmptyState, Pagination } from '@/components/ui';
import { ItemCard, ItemGrid } from '@/components/items/ItemCard';
import { ItemDetailModal } from '@/components/items/ItemDetailModal';
import { favoritesApi, apiError, type ItemSummary, type PagedResult } from '@/lib/api';

import { useT } from '@/lib/i18n';
function Favorites() {
  const t = useT();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PagedResult<ItemSummary> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    favoritesApi
      .list(page, 12)
      .then(setResult)
      .catch((e) => setError(apiError(e, t('Không tải được danh sách yêu thích.', 'Could not load favorites.'))));
  }, [page, reloadKey, t]);

  const unfavorite = async (item: ItemSummary) => {
    try {
      await favoritesApi.toggle(item.id);
      setReloadKey((k) => k + 1);
    } catch (e) {
      setError(apiError(e));
    }
  };

  const onFavoriteChange = useCallback(() => setReloadKey((k) => k + 1), []);

  return (
    <>
      <PageHeader title={t('Yêu thích', 'Favorites')} subtitle={t('Những món đồ bạn đã lưu để xem lại.', 'Items you saved for later.')} />
      {error && <div className="mb-6"><Notice>{error}</Notice></div>}
      {!result && !error && <Loading />}
      {result &&
        (result.items.length ? (
          <>
            <ItemGrid>
              {result.items.map((it) => (
                <ItemCard key={it.id} item={{ ...it, isFavorited: true }} onOpen={(i) => setOpenItem(i.id)} onToggleFavorite={unfavorite} />
              ))}
            </ItemGrid>
            <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />
          </>
        ) : (
          <EmptyState
            icon={<Bookmark className="w-5 h-5" />}
            title={t('Chưa lưu món nào', 'Nothing saved yet')}
            description={t('Bấm biểu tượng trái tim trên tin đăng để lưu lại.', 'Tap the heart on a listing to save it.')}
            action={<Link href="/marketplace" className="btn btn-primary">{t('Vào chợ đồ', 'Browse marketplace')}</Link>}
          />
        ))}
      <ItemDetailModal itemId={openItem} onClose={() => setOpenItem(null)} onFavoriteChange={onFavoriteChange} />
    </>
  );
}

export default function FavoritesPage() {
  return (
    <AppShell>
      <RequireAuth>
        <Favorites />
      </RequireAuth>
    </AppShell>
  );
}
