'use client';

import { useEffect, useState } from 'react';
import { Flag, Plus } from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import { RequireAuth } from '@/components/RequireAuth';
import { PageHeader, Loading, Notice, EmptyState, Pagination, Modal, Spinner } from '@/components/ui';
import { trustApi, apiError, REPORT_REASONS, type MyReport, type PagedResult } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

function Reports() {
  const t = useT();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PagedResult<MyReport> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ reason: 2, itemCode: '', description: '' });

  useEffect(() => {
    trustApi.myReports(page).then(setResult).catch((e) => setError(apiError(e)));
  }, [page, reload]);

  const reasonLabel = (value: number, fallback: string) => {
    const r = REPORT_REASONS.find((x) => x.value === value);
    return r ? t(r.vi, r.en) : fallback;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await trustApi.report({ reason: form.reason, description: form.description.trim(), itemCode: form.itemCode.trim() });
      setOpen(false);
      setSuccess(t('Đã gửi báo cáo. Quản trị viên sẽ xem xét sớm.', 'Report submitted. An admin will review it soon.'));
      setReload((r) => r + 1);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title={t('Báo cáo', 'Reports')}
        subtitle={t('Báo cáo vi phạm bạn đã gửi và kết quả xử lý.', 'Reports you have filed and how they were handled.')}
        actions={
          <button
            type="button"
            onClick={() => {
              setForm({ reason: 2, itemCode: '', description: '' });
              setOpen(true);
            }}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" aria-hidden="true" /> {t('Gửi báo cáo', 'New report')}
          </button>
        }
      />
      {error && <div className="mb-4"><Notice>{error}</Notice></div>}
      {success && <div className="mb-4"><Notice tone="success">{success}</Notice></div>}
      {!result && !error && <Loading />}
      {result &&
        (result.items.length ? (
          <>
            <ul className="space-y-3">
              {result.items.map((r) => (
                <li key={r.id} className="card p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold">{reasonLabel(r.reason, r.reasonName)}</p>
                    <span className={cn('chip', (r.status === 1 || r.status === 2) && 'chip-dark')}>{r.statusName}</span>
                    <span className="text-xs text-neutral-400 ml-auto">{formatDate(r.createdAt)}</span>
                  </div>
                  {(r.itemTitle || r.reportedUserName) && (
                    <p className="text-xs text-neutral-500 mt-1">{[r.itemTitle, r.reportedUserName].filter(Boolean).join(' · ')}</p>
                  )}
                  <p className="text-sm text-neutral-700 mt-2 whitespace-pre-line">{r.description}</p>
                  {r.adminNote && (
                    <p className="text-xs text-neutral-600 mt-3 p-3 rounded-2xl bg-neutral-100">
                      <strong>{t('Phản hồi của quản trị viên', 'Admin response')}:</strong> {r.adminNote}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />
          </>
        ) : (
          <EmptyState icon={<Flag className="w-5 h-5" />} title={t('Bạn chưa gửi báo cáo nào', 'You have not filed any reports')} description={t('Gặp tin lừa đảo hoặc người dùng vi phạm? Hãy báo cho chúng tôi.', 'Found a scam or a rule-breaker? Let us know.')} />
        ))}

      <Modal open={open} onClose={() => setOpen(false)} title={t('Gửi báo cáo vi phạm', 'Report a problem')}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="r-reason" className="label">{t('Lý do', 'Reason')}</label>
            <select id="r-reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: Number(e.target.value) })} className="field cursor-pointer">
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{t(r.vi, r.en)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="r-code" className="label">{t('Mã tin đăng', 'Listing code')} *</label>
            <input id="r-code" required value={form.itemCode} onChange={(e) => setForm({ ...form, itemCode: e.target.value })} placeholder={t('Mã hiển thị trong chi tiết tin', 'Shown on the listing details')} className="field" />
          </div>
          <div>
            <label htmlFor="r-desc" className="label">{t('Mô tả', 'Description')} *</label>
            <textarea id="r-desc" required minLength={10} rows={4} maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="field resize-none" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary">{t('Hủy', 'Cancel')}</button>
            <button type="submit" disabled={busy} className="btn btn-primary">
              {busy && <Spinner className="w-4 h-4 border-neutral-500 border-t-white" />} {t('Gửi', 'Submit')}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default function ReportsPage() {
  return (
    <AppShell>
      <RequireAuth>
        <Reports />
      </RequireAuth>
    </AppShell>
  );
}
