'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { PageHeader, Loading, Notice, Modal } from '@/components/ui';
import { DataTable, Td } from '@/components/admin';
import { adminApi, apiError, type AdminCategory } from '@/lib/api';
import { cn } from '@/lib/utils';

import { useT } from '@/lib/i18n';
export default function AdminCategoriesPage() {
  const t = useT();
  const [items, setItems] = useState<AdminCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);

  useEffect(() => {
    adminApi
      .categories()
      .then((c) => {
        setItems([...c].sort((a, b) => a.order - b.order));
        setError(null);
      })
      .catch((e) => setError(apiError(e, t('Không tải được danh mục.', 'Could not load categories.'))));
  }, [reload, t]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      setReload((r) => r + 1);
      return true;
    } catch (e) {
      setError(apiError(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title={t('Danh mục', 'Categories')}
        subtitle={t('Danh mục hiển thị trên Chợ đồ và form đăng tin.', 'Categories shown on the marketplace and the post form.')}
        actions={
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setName('');
              setDescription('');
            }}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" aria-hidden="true" /> {t('Thêm danh mục', 'Add category')}
          </button>
        }
      />
      {error && <div className="mb-4"><Notice>{error}</Notice></div>}
      {!items && !error && <Loading />}
      {items && (
        <DataTable head={['#', t('Tên', 'Name'), 'Slug', t('Tin đăng', 'Listings'), t('Trạng thái', 'Status'), '']} empty={!items.length}>
          {items.map((c) => (
            <tr key={c.id}>
              <Td className="tabular text-neutral-500">{c.order}</Td>
              <Td>
                <p className="font-semibold">{c.name}</p>
                {c.description && <p className="text-xs text-neutral-500 max-w-xs truncate">{c.description}</p>}
              </Td>
              <Td className="text-xs text-neutral-500">{c.slug}</Td>
              <Td className="tabular">
                {c.itemCount}
                {c.hiddenItemCount > 0 && <span className="text-xs text-neutral-400"> (+{c.hiddenItemCount} {t('ẩn', 'hidden')})</span>}
              </Td>
              <Td>
                <button
                  type="button"
                  role="switch"
                  aria-checked={c.isActive}
                  aria-label={`${c.isActive ? t('Tắt', 'Disable') : t('Bật', 'Enable')} ${c.name}`}
                  disabled={busy}
                  onClick={() => act(() => adminApi.toggleCategory(c.id, !c.isActive))}
                  className={cn('relative w-11 h-6 rounded-full transition-colors cursor-pointer', c.isActive ? 'bg-neutral-900' : 'bg-neutral-300')}
                >
                  <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', c.isActive && 'translate-x-5')} />
                </button>
              </Td>
              <Td className="text-right">
                <button type="button" disabled={busy || c.itemCount > 0} title={c.itemCount > 0 ? t('Không xóa được danh mục đang có tin', 'Categories with listings cannot be deleted') : undefined} onClick={() => setDeleteTarget(c)} className="btn btn-danger btn-sm" aria-label={t(`Xóa ${c.name}`, `Delete ${c.name}`)}>
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </Td>
            </tr>
          ))}
        </DataTable>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title={t('Thêm danh mục', 'Add category')}>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (await act(() => adminApi.createCategory(name.trim(), description.trim()))) setCreating(false);
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="cat-name" className="label">{t('Tên *', 'Name *')}</label>
            <input id="cat-name" required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className="field" />
          </div>
          <div>
            <label htmlFor="cat-desc" className="label">{t('Mô tả', 'Description')}</label>
            <textarea id="cat-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="field resize-none" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setCreating(false)} className="btn btn-secondary">{t('Hủy', 'Cancel')}</button>
            <button type="submit" disabled={busy} className="btn btn-primary">{t('Thêm', 'Add')}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t(`Xóa “${deleteTarget?.name ?? ''}”?`, `Delete “${deleteTarget?.name ?? ''}”?`)}>
        <p className="text-sm text-neutral-600">{t('Danh mục sẽ bị xóa vĩnh viễn.', 'The category will be deleted permanently.')}</p>
        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={() => setDeleteTarget(null)} className="btn btn-secondary">{t('Hủy', 'Cancel')}</button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              if (deleteTarget && (await act(() => adminApi.deleteCategory(deleteTarget.id)))) setDeleteTarget(null);
            }}
            className="btn btn-primary"
          >
            {t('Xóa', 'Delete')}
          </button>
        </div>
      </Modal>
    </>
  );
}
