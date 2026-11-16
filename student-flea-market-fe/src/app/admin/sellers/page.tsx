'use client';

import { useEffect, useState } from 'react';
import { PageHeader, Loading, Notice, Pagination, Modal, Avatar } from '@/components/ui';
import { DataTable, Td, FilterTabs } from '@/components/admin';
import { adminApi, apiError, type SellerRequest, type PagedResult } from '@/lib/api';
import { formatDate } from '@/lib/format';

import { useT } from '@/lib/i18n';
export default function AdminSellersPage() {
  const t = useT();
  const [status, setStatus] = useState<number | undefined>(1);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PagedResult<SellerRequest> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<SellerRequest | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    adminApi
      .sellerRequests({ status, page, pageSize: 15 })
      .then((r) => {
        setResult(r);
        setError(null);
      })
      .catch((e) => setError(apiError(e, t('Không tải được yêu cầu.', 'Could not load requests.'))));
  }, [status, page, reload, t]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      setReload((r) => r + 1);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title={t('Duyệt người bán', 'Seller requests')} subtitle={t('Người dùng phải được duyệt trước khi đăng tin.', 'Users must be approved before they can post.')} />
      <FilterTabs
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        options={[
          { value: 1, label: t('Chờ duyệt', 'Pending') },
          { value: 2, label: t('Đã duyệt', 'Approved') },
          { value: 3, label: t('Đã từ chối', 'Rejected') },
          { value: undefined, label: t('Tất cả', 'All') },
        ]}
      />
      {error && <div className="mb-4"><Notice>{error}</Notice></div>}
      {!result && !error && <Loading />}
      {result && (
        <>
          <DataTable head={[t('Người dùng', 'User'), t('Trường / MSSV', 'School / ID'), t('Trạng thái', 'Status'), t('Gửi lúc', 'Requested'), t('Tin', 'Listings'), '']} empty={!result.items.length}>
            {result.items.map((s) => (
              <tr key={s.userId}>
                <Td>
                  <div className="flex items-center gap-3 min-w-[13rem]">
                    <Avatar name={s.fullName} size="sm" />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{s.fullName}</p>
                      <p className="text-xs text-neutral-500 truncate">{s.email}</p>
                    </div>
                  </div>
                </Td>
                <Td className="text-xs">
                  {s.schoolName || '—'}
                  {s.studentCode && <span className="block text-neutral-500">{s.studentCode}</span>}
                </Td>
                <Td>
                  <span className="chip">{s.sellerStatusName}</span>
                  {s.rejectionReason && <span className="block text-[11px] text-neutral-500 mt-1 max-w-[12rem] truncate">{s.rejectionReason}</span>}
                </Td>
                <Td className="text-xs text-neutral-500 whitespace-nowrap">{formatDate(s.requestedAt)}</Td>
                <Td className="tabular">{s.itemCount}</Td>
                <Td className="text-right whitespace-nowrap">
                  {s.sellerStatus === 1 && (
                    <div className="flex gap-2 justify-end">
                      <button type="button" disabled={busy} onClick={() => act(() => adminApi.approveSeller(s.userId))} className="btn btn-primary btn-sm">{t('Duyệt', 'Approve')}</button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setRejectTarget(s);
                          setReason('');
                        }}
                        className="btn btn-danger btn-sm"
                      >
                        {t('Từ chối', 'Reject')}
                      </button>
                    </div>
                  )}
                  {s.sellerStatus === 2 && (
                    <button type="button" disabled={busy} onClick={() => act(() => adminApi.revokeSeller(s.userId))} className="btn btn-outline btn-sm">{t('Thu hồi quyền', 'Revoke')}</button>
                  )}
                </Td>
              </tr>
            ))}
          </DataTable>
          <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />
        </>
      )}

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title={t('Từ chối yêu cầu bán', 'Reject seller request')}>
        <label htmlFor="reject-reason" className="label">{t('Lý do (người dùng sẽ thấy)', 'Reason (shown to the user)')}</label>
        <textarea id="reject-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="field resize-none" />
        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={() => setRejectTarget(null)} className="btn btn-secondary">{t('Hủy', 'Cancel')}</button>
          <button
            type="button"
            disabled={busy}
            onClick={() => rejectTarget && act(() => adminApi.rejectSeller(rejectTarget.userId, reason.trim())).then(() => setRejectTarget(null))}
            className="btn btn-primary"
          >
            {t('Từ chối', 'Reject')}
          </button>
        </div>
      </Modal>
    </>
  );
}
