'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Layers, Plus, Trash2, Eye } from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import { RequireAuth } from '@/components/RequireAuth';
import { PageHeader, Loading, Notice, EmptyState, Pagination, Modal, ItemImage, Spinner } from '@/components/ui';
import { ItemDetailModal } from '@/components/items/ItemDetailModal';
import { itemsApi, apiError, type ItemSummary, type PagedResult } from '@/lib/api';
import { formatPrice, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

import { useT } from '@/lib/i18n';
function MyListings() {
  const t = useT();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PagedResult<ItemSummary> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ItemSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    itemsApi
      .mine({ page, pageSize: 10, sortBy: 'newest' })
      .then(setResult)
      .catch((e) => setError(apiError(e, t('Không tải được tin của bạn.', 'Could not load your listings.'))));
  }, [page, reloadKey, t]);

  const doDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await itemsApi.remove(confirmDelete.id);
      setConfirmDelete(null);
      setReloadKey((k) => k + 1);
    } catch (e) {
      setError(apiError(e, t('Không xóa được tin.', 'Could not delete the listing.')));
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title={t('Tin của tôi', 'My listings')}
        subtitle={t('Quản lý các món đồ bạn đang bán, đổi hoặc tặng.', 'Manage the items you are selling, swapping or giving away.')}
        actions={
          <Link href="/post-item" className="btn btn-primary">
            <Plus className="w-4 h-4" aria-hidden="true" /> {t('Đăng tin mới', 'New listing')}
          </Link>
        }
      />
      {error && <div className="mb-6"><Notice>{error}</Notice></div>}
      {!result && !error && <Loading />}
      {result &&
        (result.items.length ? (
          <>
            <ul className="space-y-3">
              {result.items.map((it) => (
                <li key={it.id} className="card p-3 sm:p-4 flex items-center gap-4">
                  <ItemImage src={it.primaryImageUrl} alt={it.title} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-neutral-900 truncate">{it.title}</p>
                    <p className="font-serif text-lg font-extrabold text-neutral-900 tabular">{formatPrice(it.price)}</p>
                    <p className="text-xs text-neutral-500 truncate">
                      {it.categoryName} · {it.itemCode} · {formatDate(it.createdAt)}
                    </p>
                  </div>
                  <span className={cn('chip hidden sm:inline-flex', it.status === 1 && 'chip-dark')}>{it.statusName}</span>
                  <div className="flex gap-2 shrink-0">
                    <button type="button" onClick={() => setOpenItem(it.id)} className="btn btn-outline btn-sm" aria-label={t(`Xem ${it.title}`, `View ${it.title}`)}>
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => setConfirmDelete(it)} className="btn btn-danger btn-sm" aria-label={t(`Xóa ${it.title}`, `Delete ${it.title}`)}>
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />
          </>
        ) : (
          <EmptyState
            icon={<Layers className="w-5 h-5" />}
            title={t('Bạn chưa có tin nào', 'You have no listings yet')}
            description={t('Đăng món đồ đầu tiên để bán, đổi hoặc tặng 0đ.', 'Post your first item to sell, swap or give away.')}
            action={<Link href="/post-item" className="btn btn-primary">{t('Đăng tin', 'Post an item')}</Link>}
          />
        ))}

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title={t('Xóa tin đăng?', 'Delete listing?')}>
        <p className="text-sm text-neutral-600">
          <strong>{confirmDelete?.title}</strong> — {t('tin sẽ bị gỡ khỏi chợ. Thao tác này không hoàn tác được.', 'will be removed from the marketplace. This cannot be undone.')}
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={() => setConfirmDelete(null)} className="btn btn-secondary">{t('Hủy', 'Cancel')}</button>
          <button type="button" onClick={doDelete} disabled={deleting} className="btn btn-primary">
            {deleting && <Spinner className="w-4 h-4 border-neutral-500 border-t-white" />} {t('Xóa tin', 'Delete')}
          </button>
        </div>
      </Modal>
      <ItemDetailModal itemId={openItem} onClose={() => setOpenItem(null)} />
    </>
  );
}

export default function MyListingsPage() {
  return (
    <AppShell>
      <RequireAuth>
        <MyListings />
      </RequireAuth>
    </AppShell>
  );
}
