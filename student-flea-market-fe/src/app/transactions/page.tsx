'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, ArrowRight, MapPin } from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import { RequireAuth } from '@/components/RequireAuth';
import { PageHeader, Loading, Notice, EmptyState, Pagination, Modal, ItemImage, Spinner } from '@/components/ui';
import { FilterTabs } from '@/components/admin';
import { tradingApi, apiError, FINAL_TX_STATUSES, type Transaction, type ExchangeRequest, type PagedResult } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { formatPrice, formatDate } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Tab = 'orders' | 'swaps';
type Dir = 'all' | 'incoming' | 'outgoing';

function TxCard({ tx, busy, onAction }: { tx: Transaction; busy: boolean; onAction: (kind: 'pay' | 'handover' | 'complete' | 'cancel', tx: Transaction) => void }) {
  const t = useT();
  const me = useAuthStore((s) => s.user);
  const other = tx.initiator.id === me?.id ? tx.counterparty : tx.initiator;
  const open = tx.canManage && !FINAL_TX_STATUSES.includes(tx.status);
  return (
    <li className="card p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <ItemImage src={tx.item.primaryImageUrl} alt={tx.item.title} className="w-16 h-16 rounded-2xl shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-sm text-neutral-900 truncate">{tx.item.title}</p>
            <span className="chip">{tx.typeName}</span>
            <span className={cn('chip', !FINAL_TX_STATUSES.includes(tx.status) && 'chip-dark')}>{tx.statusName}</span>
          </div>
          {tx.offeredItem && (
            <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" aria-hidden="true" /> {t('Đổi lấy', 'Swapped for')} {tx.offeredItem.title}
            </p>
          )}
          <p className="font-serif text-lg font-extrabold text-neutral-900 tabular mt-1">{formatPrice(tx.amount)}</p>
          <p className="text-xs text-neutral-500 mt-1 flex flex-wrap gap-x-3">
            <span>{t('Với', 'With')} {other.fullName}{other.phoneNumber && ` · ${other.phoneNumber}`}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" aria-hidden="true" /> {tx.meetingLocation}</span>
            <span>{formatDate(tx.createdAt)}</span>
            {tx.payment && <span>{tx.payment.methodName}: {tx.payment.statusName}</span>}
          </p>
          {tx.cancelReason && <p className="text-xs text-neutral-500 mt-1">{t('Lý do hủy', 'Cancel reason')}: {tx.cancelReason}</p>}
        </div>
      </div>
      {open && (
        <div className="flex flex-wrap justify-end gap-2 mt-4 pt-4 border-t border-neutral-100">
          {tx.payment && tx.payment.status !== 2 && tx.amount > 0 && (
            <button type="button" disabled={busy} onClick={() => onAction('pay', tx)} className="btn btn-outline btn-sm">{t('Đã thanh toán', 'Mark as paid')}</button>
          )}
          <button type="button" disabled={busy} onClick={() => onAction('handover', tx)} className="btn btn-outline btn-sm">{t('Xác nhận bàn giao', 'Confirm handover')}</button>
          <button type="button" disabled={busy} onClick={() => onAction('complete', tx)} className="btn btn-primary btn-sm">{t('Hoàn tất', 'Complete')}</button>
          <button type="button" disabled={busy} onClick={() => onAction('cancel', tx)} className="btn btn-danger btn-sm">{t('Hủy', 'Cancel')}</button>
        </div>
      )}
    </li>
  );
}

function SwapCard({ ex, busy, onAction }: { ex: ExchangeRequest; busy: boolean; onAction: (kind: 'accept' | 'reject' | 'cancel' | 'start', ex: ExchangeRequest) => void }) {
  const t = useT();
  return (
    <li className="card p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <ItemImage src={ex.offeredItem.primaryImageUrl} alt={ex.offeredItem.title} className="w-14 h-14 rounded-2xl shrink-0" />
        <ArrowRight className="w-4 h-4 text-neutral-400 shrink-0" aria-hidden="true" />
        <ItemImage src={ex.requestedItem.primaryImageUrl} alt={ex.requestedItem.title} className="w-14 h-14 rounded-2xl shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-neutral-900 truncate">
            {ex.offeredItem.title} → {ex.requestedItem.title}
          </p>
          <p className="text-xs text-neutral-500">
            {t('Từ', 'From')} {ex.requesterName} · {formatDate(ex.createdAt)}
            {ex.additionalAmount > 0 && ` · ${t('bù', 'plus')} ${formatPrice(ex.additionalAmount)}`}
          </p>
          {ex.note && <p className="text-xs text-neutral-600 mt-1 line-clamp-2">“{ex.note}”</p>}
          {ex.responseNote && <p className="text-xs text-neutral-500 mt-1">{t('Phản hồi', 'Reply')}: {ex.responseNote}</p>}
        </div>
        <span className={cn('chip shrink-0', ex.status === 1 && 'chip-dark')}>{ex.statusName}</span>
      </div>
      {(ex.canRespond || ex.canCancel || ex.status === 2) && (
        <div className="flex flex-wrap justify-end gap-2 mt-4 pt-4 border-t border-neutral-100">
          {ex.canRespond && (
            <>
              <button type="button" disabled={busy} onClick={() => onAction('accept', ex)} className="btn btn-primary btn-sm">{t('Chấp nhận', 'Accept')}</button>
              <button type="button" disabled={busy} onClick={() => onAction('reject', ex)} className="btn btn-danger btn-sm">{t('Từ chối', 'Decline')}</button>
            </>
          )}
          {ex.canCancel && <button type="button" disabled={busy} onClick={() => onAction('cancel', ex)} className="btn btn-outline btn-sm">{t('Hủy yêu cầu', 'Withdraw')}</button>}
          {ex.status === 2 && <button type="button" disabled={busy} onClick={() => onAction('start', ex)} className="btn btn-outline btn-sm">{t('Tạo đơn giao dịch', 'Start transaction')}</button>}
        </div>
      )}
    </li>
  );
}

function Transactions() {
  const t = useT();
  const [tab, setTab] = useState<Tab>('orders');
  const [dir, setDir] = useState<Dir>('all');
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<PagedResult<Transaction> | null>(null);
  const [swaps, setSwaps] = useState<PagedResult<ExchangeRequest> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [dialog, setDialog] = useState<{ kind: 'handover' | 'cancel' | 'reject'; id: string; code?: string } | null>(null);
  const [text, setText] = useState('');

  const key = `${tab}|${dir}`;
  const [lastKey, setLastKey] = useState(key);
  if (lastKey !== key) {
    setLastKey(key);
    setPage(1);
  }

  useEffect(() => {
    const direction = dir === 'all' ? undefined : dir;
    const req = tab === 'orders' ? tradingApi.list({ direction, page }).then(setOrders) : tradingApi.exchanges({ direction, page }).then(setSwaps);
    req.catch((e) => setError(apiError(e)));
  }, [tab, dir, page, reload]);

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await fn();
      setSuccess(okMsg);
      setReload((r) => r + 1);
      return true;
    } catch (e) {
      setError(apiError(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const onTx = (kind: 'pay' | 'handover' | 'complete' | 'cancel', tx: Transaction) => {
    if (kind === 'pay') return run(() => tradingApi.pay(tx.id), t('Đã ghi nhận thanh toán.', 'Payment recorded.'));
    if (kind === 'complete') return run(() => tradingApi.complete(tx.id), t('Giao dịch đã hoàn tất.', 'Transaction completed.'));
    setText(kind === 'handover' ? tx.item.itemCode : '');
    setDialog({ kind, id: tx.id, code: tx.item.itemCode });
  };

  const onSwap = (kind: 'accept' | 'reject' | 'cancel' | 'start', ex: ExchangeRequest) => {
    if (kind === 'accept') return run(() => tradingApi.acceptExchange(ex.id), t('Đã chấp nhận đề nghị đổi.', 'Swap accepted.'));
    if (kind === 'cancel') return run(() => tradingApi.cancelExchange(ex.id), t('Đã hủy yêu cầu.', 'Request withdrawn.'));
    if (kind === 'start') return run(() => tradingApi.fromExchange(ex.id, ex.requestedItem.location), t('Đã tạo đơn giao dịch đổi đồ.', 'Swap transaction created.'));
    setText('');
    setDialog({ kind: 'reject', id: ex.id });
  };

  const submitDialog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dialog) return;
    const ok =
      dialog.kind === 'handover'
        ? await run(() => tradingApi.handover(dialog.id, text.trim()), t('Đã xác nhận bàn giao.', 'Handover confirmed.'))
        : dialog.kind === 'cancel'
          ? await run(() => tradingApi.cancel(dialog.id, text.trim()), t('Đã hủy giao dịch.', 'Transaction cancelled.'))
          : await run(() => tradingApi.rejectExchange(dialog.id, text.trim()), t('Đã từ chối đề nghị.', 'Swap declined.'));
    if (ok) setDialog(null);
  };

  const data = tab === 'orders' ? orders : swaps;

  return (
    <>
      <PageHeader title={t('Giao dịch', 'Transactions')} subtitle={t('Theo dõi đơn mua bán và các đề nghị đổi đồ.', 'Track purchases and swap offers.')} />
      <div className="flex flex-col md:flex-row md:items-center gap-x-4">
        <FilterTabs<Tab> value={tab} onChange={setTab} options={[{ value: 'orders', label: t('Đơn giao dịch', 'Orders') }, { value: 'swaps', label: t('Yêu cầu đổi đồ', 'Swap requests') }]} />
        <div className="md:ml-auto">
          <FilterTabs<Dir>
            value={dir}
            onChange={setDir}
            options={[
              { value: 'all', label: t('Tất cả', 'All') },
              { value: 'incoming', label: t('Gửi đến tôi', 'Incoming') },
              { value: 'outgoing', label: t('Tôi gửi', 'Outgoing') },
            ]}
          />
        </div>
      </div>
      {error && <div className="mb-4"><Notice>{error}</Notice></div>}
      {success && <div className="mb-4"><Notice tone="success">{success}</Notice></div>}
      {!data && !error && <Loading />}
      {data &&
        (data.items.length ? (
          <>
            <ul className="space-y-3">
              {tab === 'orders'
                ? orders!.items.map((tx) => <TxCard key={tx.id} tx={tx} busy={busy} onAction={onTx} />)
                : swaps!.items.map((ex) => <SwapCard key={ex.id} ex={ex} busy={busy} onAction={onSwap} />)}
            </ul>
            <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
          </>
        ) : (
          <EmptyState
            icon={<RefreshCw className="w-5 h-5" />}
            title={tab === 'orders' ? t('Chưa có giao dịch', 'No transactions yet') : t('Chưa có yêu cầu đổi đồ', 'No swap requests yet')}
            description={t('Mở một tin đăng trong Chợ đồ để mua hoặc đề nghị đổi.', 'Open a listing in the marketplace to buy or offer a swap.')}
            action={<Link href="/marketplace" className="btn btn-primary">{t('Vào chợ đồ', 'Browse marketplace')}</Link>}
          />
        ))}

      <Modal
        open={!!dialog}
        onClose={() => setDialog(null)}
        title={dialog?.kind === 'handover' ? t('Xác nhận bàn giao', 'Confirm handover') : dialog?.kind === 'cancel' ? t('Hủy giao dịch', 'Cancel transaction') : t('Từ chối đề nghị', 'Decline swap')}
      >
        <form onSubmit={submitDialog} className="space-y-4">
          {dialog?.kind === 'handover' && (
            <p className="text-sm text-neutral-600">
              {t('Đối chiếu mã tin trên món đồ thật để chắc đúng món. Mã đúng:', 'Check the code on the actual item. Expected code:')} <strong className="tabular">{dialog.code}</strong>
            </p>
          )}
          <div>
            <label htmlFor="dialog-text" className="label">
              {dialog?.kind === 'handover' ? t('Mã tin bạn thấy trên món đồ', 'Code on the item') : t('Lý do', 'Reason')}
            </label>
            <input id="dialog-text" value={text} onChange={(e) => setText(e.target.value)} className="field" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setDialog(null)} className="btn btn-secondary">{t('Đóng', 'Close')}</button>
            <button type="submit" disabled={busy} className="btn btn-primary">
              {busy && <Spinner className="w-4 h-4 border-neutral-500 border-t-white" />} {t('Xác nhận', 'Confirm')}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default function TransactionsPage() {
  return (
    <AppShell>
      <RequireAuth>
        <Transactions />
      </RequireAuth>
    </AppShell>
  );
}
