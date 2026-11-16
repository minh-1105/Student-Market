'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import { RequireAuth } from '@/components/RequireAuth';
import { PageHeader, Loading, Notice, EmptyState, Pagination, Avatar, ItemImage, Spinner } from '@/components/ui';
import { trustApi, apiError, type PendingReview, type Review, type PagedResult } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { formatPrice, formatDate } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

function Stars({ value, onChange, size = 'md' }: { value: number; onChange?: (v: number) => void; size?: 'sm' | 'md' }) {
  const t = useT();
  const dim = size === 'sm' ? 'w-3.5 h-3.5' : 'w-6 h-6';
  return (
    <div className="flex gap-1" role={onChange ? 'radiogroup' : 'img'} aria-label={t(`${value} trên 5 sao`, `${value} out of 5 stars`)}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n}`} onClick={() => onChange(n)} className="p-0.5 cursor-pointer">
            <Star className={cn(dim, n <= value ? 'fill-neutral-900 text-neutral-900' : 'text-neutral-300')} />
          </button>
        ) : (
          <Star key={n} className={cn(dim, n <= value ? 'fill-neutral-900 text-neutral-900' : 'text-neutral-300')} aria-hidden="true" />
        )
      )}
    </div>
  );
}

function PendingCard({ p, onDone }: { p: PendingReview; onDone: () => void }) {
  const t = useT();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await trustApi.review(p.transactionId, rating, comment.trim());
      onDone();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="card p-4 sm:p-5">
      <form onSubmit={submit}>
        <div className="flex items-center gap-4">
          <ItemImage src={p.itemImageUrl} alt={p.itemTitle} className="w-14 h-14 rounded-2xl shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">{p.itemTitle}</p>
            <p className="text-xs text-neutral-500">
              {t('Đánh giá', 'Review')} {p.revieweeName} · {formatPrice(p.amount)} · {formatDate(p.completedAt)}
            </p>
          </div>
          <Stars value={rating} onChange={setRating} />
        </div>
        <label htmlFor={`c-${p.transactionId}`} className="sr-only">{t('Nhận xét', 'Comment')}</label>
        <textarea
          id={`c-${p.transactionId}`}
          rows={2}
          maxLength={1000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t('Nhận xét về giao dịch (không bắt buộc)', 'How did it go? (optional)')}
          className="field resize-none mt-4"
        />
        {error && <div className="mt-3"><Notice>{error}</Notice></div>}
        <div className="flex justify-end mt-3">
          <button type="submit" disabled={busy} className="btn btn-primary btn-sm">
            {busy && <Spinner className="w-3.5 h-3.5 border-neutral-500 border-t-white" />} {t('Gửi đánh giá', 'Submit review')}
          </button>
        </div>
      </form>
    </li>
  );
}

function Reviews() {
  const t = useT();
  const me = useAuthStore((s) => s.user);
  const [pending, setPending] = useState<PendingReview[] | null>(null);
  const [received, setReceived] = useState<PagedResult<Review> | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    trustApi.pending().then(setPending).catch((e) => setError(apiError(e)));
  }, [reload]);

  useEffect(() => {
    if (!me) return;
    trustApi.forUser(me.id, page).then(setReceived).catch((e) => setError(apiError(e)));
  }, [me, page]);

  const avg = received?.items.length ? received.items.reduce((s, r) => s + r.rating, 0) / received.items.length : null;

  return (
    <>
      <PageHeader title={t('Đánh giá', 'Reviews')} subtitle={t('Đánh giá sau giao dịch giúp cộng đồng biết ai là người uy tín.', 'Reviews after each deal help everyone know who to trust.')} />
      {error && <div className="mb-4"><Notice>{error}</Notice></div>}

      <h2 className="text-sm font-bold text-neutral-900 mb-3">{t('Chờ bạn đánh giá', 'Waiting for your review')}</h2>
      {!pending ? (
        <Loading />
      ) : pending.length ? (
        <ul className="space-y-3 mb-10">
          {pending.map((p) => (
            <PendingCard key={p.transactionId} p={p} onDone={() => setReload((r) => r + 1)} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-neutral-500 mb-10">{t('Không có giao dịch nào cần đánh giá.', 'Nothing to review right now.')}</p>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-neutral-900">{t('Người khác đánh giá bạn', 'Reviews about you')}</h2>
        {avg !== null && (
          <span className="flex items-center gap-2 text-sm font-semibold tabular">
            <Stars value={Math.round(avg)} size="sm" /> {avg.toFixed(1)} · {received!.totalCount}
          </span>
        )}
      </div>
      {!received ? (
        <Loading />
      ) : received.items.length ? (
        <>
          <ul className="space-y-3">
            {received.items.map((r) => (
              <li key={r.id} className="card p-4 flex gap-3">
                <Avatar name={r.reviewerName} url={r.reviewerAvatarUrl} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold">{r.reviewerName}</p>
                    <Stars value={r.rating} size="sm" />
                    <span className="text-xs text-neutral-400">{formatDate(r.createdAt)}</span>
                  </div>
                  <p className="text-xs text-neutral-500">{r.itemTitle}</p>
                  {r.comment && <p className="text-sm text-neutral-700 mt-1">{r.comment}</p>}
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={received.page} totalPages={received.totalPages} onChange={setPage} />
        </>
      ) : (
        <EmptyState icon={<Star className="w-5 h-5" />} title={t('Chưa có đánh giá nào', 'No reviews yet')} description={t('Hoàn tất giao dịch đầu tiên để nhận đánh giá.', 'Complete your first deal to get reviewed.')} />
      )}
    </>
  );
}

export default function ReviewsPage() {
  return (
    <AppShell>
      <RequireAuth>
        <Reviews />
      </RequireAuth>
    </AppShell>
  );
}
