'use client';

import { useEffect, useState } from 'react';
import { PageHeader, Loading, Notice, Pagination, Modal, Spinner } from '@/components/ui';
import { DataTable, Td, FilterTabs } from '@/components/admin';
import { adminApi, apiError, type ModerationReport, type PagedResult } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

import { useT } from '@/lib/i18n';
// Actions accepted by ResolveReportDto on the backend.
const ACTIONS = [
  { value: 'hide_item', vi: 'Ẩn tin đăng', en: 'Hide the listing' },
  { value: 'ban_user', vi: 'Khóa người bị báo cáo', en: 'Ban the reported user' },
  { value: 'revoke_seller', vi: 'Thu hồi quyền bán', en: 'Revoke seller access' },
  { value: 'void_review', vi: 'Vô hiệu đánh giá liên quan', en: 'Void related reviews' },
];

export default function AdminReportsPage() {
  const t = useT();
  const [status, setStatus] = useState<number | undefined>(1);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PagedResult<ModerationReport> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<ModerationReport | null>(null);
  const [actions, setActions] = useState<string[]>([]);
  const [note, setNote] = useState('');

  useEffect(() => {
    adminApi
      .reports({ status, page, pageSize: 15 })
      .then((r) => {
        setResult(r);
        setError(null);
      })
      .catch((e) => setError(apiError(e, t('Không tải được báo cáo.', 'Could not load reports.'))));
  }, [status, page, reload, t]);

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

  const openResolve = (r: ModerationReport) => {
    setTarget(r);
    setActions([]);
    setNote('');
  };

  const resolve = async (reject: boolean) => {
    if (!target) return;
    const ok = await act(() => adminApi.resolve(target.id, reject ? ['reject'] : actions.length ? actions : ['none'], note.trim()));
    if (ok) setTarget(null);
  };

  return (
    <>
      <PageHeader title={t('Báo cáo vi phạm', 'Reports')} subtitle={t('Xem xét báo cáo từ người dùng và áp dụng biện pháp xử lý.', 'Review user reports and take action.')} />
      <FilterTabs
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        options={[
          { value: 1, label: t('Chờ xử lý', 'Pending') },
          { value: 2, label: t('Đang xem xét', 'In review') },
          { value: 3, label: t('Đã xử lý', 'Resolved') },
          { value: 4, label: t('Đã bác', 'Rejected') },
          { value: undefined, label: t('Tất cả', 'All') },
        ]}
      />
      {error && <div className="mb-4"><Notice>{error}</Notice></div>}
      {!result && !error && <Loading />}
      {result && (
        <>
          <DataTable head={[t('Lý do', 'Reason'), t('Đối tượng', 'Target'), t('Người báo cáo', 'Reporter'), t('Trạng thái', 'Status'), t('Ngày', 'Date'), '']} empty={!result.items.length}>
            {result.items.map((r) => (
              <tr key={r.id}>
                <Td>
                  <p className="font-semibold">{r.reasonName}</p>
                  <p className="text-xs text-neutral-500 max-w-xs line-clamp-2">{r.description}</p>
                </Td>
                <Td className="text-xs">
                  {r.itemTitle && <span className="block font-medium">{r.itemTitle} {r.itemCode && <span className="text-neutral-400">· {r.itemCode}</span>}</span>}
                  {r.reportedUserName && <span className="block text-neutral-500">{r.reportedUserName}</span>}
                </Td>
                <Td className="text-xs">{r.reporterName}</Td>
                <Td>
                  <span className={cn('chip', r.status === 1 && 'chip-dark')}>{r.statusName}</span>
                  {r.adminNote && <span className="block text-[11px] text-neutral-500 mt-1 max-w-[12rem] truncate">{r.adminNote}</span>}
                </Td>
                <Td className="text-xs text-neutral-500 whitespace-nowrap">{formatDate(r.createdAt)}</Td>
                <Td className="text-right whitespace-nowrap">
                  {(r.status === 1 || r.status === 2) && (
                    <div className="flex gap-2 justify-end">
                      {r.status === 1 && (
                        <button type="button" disabled={busy} onClick={() => act(() => adminApi.markReviewing(r.id))} className="btn btn-outline btn-sm">{t('Nhận xử lý', 'Take')}</button>
                      )}
                      <button type="button" disabled={busy} onClick={() => openResolve(r)} className="btn btn-primary btn-sm">{t('Xử lý', 'Resolve')}</button>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </DataTable>
          <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />
        </>
      )}

      <Modal open={!!target} onClose={() => setTarget(null)} title={t('Xử lý báo cáo', 'Resolve report')}>
        {target && (
          <>
            <p className="text-sm text-neutral-700 mb-1 font-semibold">{target.reasonName}</p>
            <p className="text-sm text-neutral-600 mb-5 whitespace-pre-line">{target.description}</p>
            <fieldset className="space-y-2 mb-5">
              <legend className="label">{t('Biện pháp', 'Actions')}</legend>
              {ACTIONS.map((a) => (
                <label key={a.value} className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-100 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-black"
                    checked={actions.includes(a.value)}
                    onChange={(e) => setActions(e.target.checked ? [...actions, a.value] : actions.filter((x) => x !== a.value))}
                  />
                  {t(a.vi, a.en)}
                </label>
              ))}
            </fieldset>
            <label htmlFor="admin-note" className="label">{t('Ghi chú', 'Note')}</label>
            <textarea id="admin-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} className="field resize-none" />
            <div className="flex flex-wrap justify-end gap-3 mt-6">
              <button type="button" disabled={busy} onClick={() => resolve(true)} className="btn btn-danger">{t('Bác báo cáo', 'Reject report')}</button>
              <button type="button" disabled={busy} onClick={() => resolve(false)} className="btn btn-primary">
                {busy && <Spinner className="w-4 h-4 border-neutral-500 border-t-white" />} {t('Xác nhận xử lý', 'Confirm')}
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
