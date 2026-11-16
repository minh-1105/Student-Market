'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, MapPin, RefreshCw, MessageSquare, School, ShoppingBag, Flag, ArrowLeft } from 'lucide-react';
import {
  itemsApi,
  favoritesApi,
  chatApi,
  tradingApi,
  trustApi,
  apiError,
  REPORT_REASONS,
  type ItemDetail,
  type ItemSummary,
} from '@/lib/api';
import { formatPrice, formatDate, timeAgo } from '@/lib/format';
import { useAuthStore } from '@/lib/auth-store';
import { useT } from '@/lib/i18n';
import { Modal, Loading, Notice, ItemImage, Avatar, Spinner } from '@/components/ui';
import { useConditionLabel } from './ItemCard';
import { cn } from '@/lib/utils';

type Panel = 'detail' | 'buy' | 'exchange' | 'report';

export function ItemDetailModal({
  itemId,
  onClose,
  onFavoriteChange,
}: {
  itemId: string | null;
  onClose: () => void;
  onFavoriteChange?: (id: string, isFavorited: boolean) => void;
}) {
  const t = useT();
  const router = useRouter();
  const conditionLabel = useConditionLabel();
  const { user, isAuthenticated } = useAuthStore();
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [panel, setPanel] = useState<Panel>('detail');
  const [busy, setBusy] = useState(false);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  // action inputs
  const [meeting, setMeeting] = useState('');
  const [myItems, setMyItems] = useState<ItemSummary[] | null>(null);
  const [offerCode, setOfferCode] = useState('');
  const [extra, setExtra] = useState('');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState<number>(2);

  if (itemId !== loadedId) {
    setLoadedId(itemId);
    setItem(null);
    setError(null);
    setSuccess(null);
    setActiveImage(0);
    setPanel('detail');
  }

  useEffect(() => {
    if (!itemId) return;
    let cancelled = false;
    itemsApi
      .get(itemId)
      .then((d) => {
        if (cancelled) return;
        setItem(d);
        setMeeting(d.location);
      })
      .catch((e) => !cancelled && setError(apiError(e, t('Không tải được tin đăng.', 'Could not load this listing.'))));
    return () => {
      cancelled = true;
    };
  }, [itemId, t]);

  useEffect(() => {
    if (panel !== 'exchange' || myItems) return;
    itemsApi
      .mine({ pageSize: 50 })
      .then((r) => {
        const usable = r.items.filter((i) => i.status === 1);
        setMyItems(usable);
        setOfferCode(usable[0]?.itemCode ?? '');
      })
      .catch((e) => setError(apiError(e)));
  }, [panel, myItems]);

  const isOwner = !!item && item.seller.id === user?.id;
  const available = item?.status === 1;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const toggleFavorite = () =>
    run(async () => {
      if (!item) return;
      const r = await favoritesApi.toggle(item.id);
      setItem({ ...item, isFavorited: r.isFavorited, favoriteCount: r.favoriteCount });
      onFavoriteChange?.(item.id, r.isFavorited);
    });

  const openChat = () =>
    run(async () => {
      if (!item) return;
      const c = await chatApi.open(item.id);
      onClose();
      router.push(`/messages?c=${c.id}`);
    });

  const buy = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      if (!item) return;
      await tradingApi.purchase(item.itemCode, meeting.trim());
      setPanel('detail');
      setSuccess(t('Đã tạo đơn mua. Theo dõi trong mục Giao dịch.', 'Purchase created. Track it under Transactions.'));
    });
  };

  const offer = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      if (!item) return;
      await tradingApi.requestExchange(item.itemCode, offerCode, Number(extra.replace(/\D/g, '') || 0), note.trim());
      setPanel('detail');
      setSuccess(t('Đã gửi đề nghị đổi đồ. Theo dõi trong mục Giao dịch.', 'Swap offer sent. Track it under Transactions.'));
    });
  };

  const report = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      if (!item) return;
      await trustApi.report({ reason, description: note.trim(), itemCode: item.itemCode });
      setPanel('detail');
      setSuccess(t('Đã gửi báo cáo. Cảm ơn bạn!', 'Report submitted. Thank you!'));
    });
  };

  const goPanel = (p: Panel) => {
    setPanel(p);
    setNote('');
    setError(null);
    setSuccess(null);
  };

  const images = item?.images.length ? [...item.images].sort((a, b) => a.order - b.order) : [];
  const backButton = (
    <button type="button" onClick={() => goPanel('detail')} className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 mb-4 cursor-pointer">
      <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> {t('Quay lại', 'Back')}
    </button>
  );

  return (
    <Modal open={!!itemId} onClose={onClose} title={item?.title ?? t('Chi tiết tin đăng', 'Listing details')} size="lg">
      {error && <div className="mb-4"><Notice>{error}</Notice></div>}
      {success && <div className="mb-4"><Notice tone="success">{success}</Notice></div>}
      {!item && !error && <Loading />}

      {item && panel === 'buy' && (
        <form onSubmit={buy} className="space-y-4">
          {backButton}
          <p className="text-sm text-neutral-700">
            {t('Mua', 'Buy')} <strong>{item.title}</strong> — <span className="font-serif font-bold">{formatPrice(item.price)}</span>
          </p>
          <div>
            <label htmlFor="meeting" className="label">{t('Địa điểm gặp mặt', 'Meeting place')}</label>
            <input id="meeting" required value={meeting} onChange={(e) => setMeeting(e.target.value)} className="field" />
          </div>
          <p className="text-xs text-neutral-500">{t('Thanh toán khi gặp (COD). Người bán sẽ xác nhận đơn.', 'Pay in person (COD). The seller will confirm the order.')}</p>
          <button type="submit" disabled={busy} className="btn btn-primary w-full">
            {busy && <Spinner className="w-4 h-4 border-neutral-500 border-t-white" />} {t('Xác nhận mua', 'Confirm purchase')}
          </button>
        </form>
      )}

      {item && panel === 'exchange' && (
        <form onSubmit={offer} className="space-y-4">
          {backButton}
          {!myItems && <Loading />}
          {myItems && !myItems.length && (
            <Notice tone="info">
              {t('Bạn cần có ít nhất một tin đang bán để đề nghị đổi.', 'You need at least one active listing to offer a swap.')}{' '}
              <Link href="/post-item" className="underline font-semibold">{t('Đăng tin', 'Post an item')}</Link>
            </Notice>
          )}
          {myItems && myItems.length > 0 && (
            <>
              <div>
                <label htmlFor="offer" className="label">{t('Món bạn đem đổi', 'Item you offer')}</label>
                <select id="offer" value={offerCode} onChange={(e) => setOfferCode(e.target.value)} className="field cursor-pointer">
                  {myItems.map((i) => (
                    <option key={i.id} value={i.itemCode}>{i.title} · {formatPrice(i.price)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="extra" className="label">{t('Bù thêm (₫)', 'Extra cash (₫)')}</label>
                <input
                  id="extra"
                  inputMode="numeric"
                  value={extra}
                  onChange={(e) => {
                    const d = e.target.value.replace(/\D/g, '').slice(0, 9);
                    setExtra(d ? Number(d).toLocaleString('vi-VN') : '');
                  }}
                  placeholder="0"
                  className="field tabular"
                />
              </div>
              <div>
                <label htmlFor="offer-note" className="label">{t('Lời nhắn', 'Note')}</label>
                <textarea id="offer-note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className="field resize-none" />
              </div>
              <button type="submit" disabled={busy || !offerCode} className="btn btn-primary w-full">{t('Gửi đề nghị đổi', 'Send swap offer')}</button>
            </>
          )}
        </form>
      )}

      {item && panel === 'report' && (
        <form onSubmit={report} className="space-y-4">
          {backButton}
          <div>
            <label htmlFor="reason" className="label">{t('Lý do', 'Reason')}</label>
            <select id="reason" value={reason} onChange={(e) => setReason(Number(e.target.value))} className="field cursor-pointer">
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{t(r.vi, r.en)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="report-desc" className="label">{t('Mô tả', 'Description')} *</label>
            <textarea id="report-desc" required minLength={10} rows={4} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className="field resize-none" />
          </div>
          <button type="submit" disabled={busy} className="btn btn-primary w-full">{t('Gửi báo cáo', 'Submit report')}</button>
        </form>
      )}

      {item && panel === 'detail' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <ItemImage src={images[activeImage]?.imageUrl} alt={item.title} className="w-full aspect-square rounded-2xl" />
            {images.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    aria-label={t(`Ảnh ${i + 1}`, `Photo ${i + 1}`)}
                    aria-pressed={i === activeImage}
                    className={cn('shrink-0 rounded-xl overflow-hidden border-2 cursor-pointer', i === activeImage ? 'border-neutral-900' : 'border-transparent')}
                  >
                    <ItemImage src={img.imageUrl} alt="" className="w-16 h-16" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <p className="font-serif text-3xl font-extrabold text-neutral-900 tabular">{formatPrice(item.price)}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="chip">{item.category.name}</span>
              <span className="chip">{conditionLabel(item.condition, item.conditionName)}</span>
              <span className={cn('chip', available && 'chip-dark')}>{item.statusName}</span>
              {item.isExchangeEnabled && (
                <span className="chip">
                  <RefreshCw className="w-3 h-3" aria-hidden="true" /> {t('Nhận đổi đồ', 'Open to swaps')}
                </span>
              )}
            </div>
            <p className="flex items-center gap-2 text-sm text-neutral-600 mt-4">
              <MapPin className="w-4 h-4" aria-hidden="true" /> {item.location}
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              {t('Mã tin', 'Code')} {item.itemCode} · {timeAgo(item.createdAt)}
            </p>
            {item.description && (
              <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line mt-4 pt-4 border-t border-neutral-100">{item.description}</p>
            )}

            <div className="flex items-center gap-3 mt-5 p-3 rounded-2xl bg-neutral-100">
              <Avatar name={item.seller.fullName} url={item.seller.avatarUrl} />
              <div className="min-w-0">
                <p className="text-sm font-bold text-neutral-900 truncate">{item.seller.fullName}</p>
                <p className="text-xs text-neutral-500 flex items-center gap-1 truncate">
                  {item.seller.schoolName && (
                    <>
                      <School className="w-3 h-3" aria-hidden="true" /> {item.seller.schoolName} ·{' '}
                    </>
                  )}
                  {t('Thành viên từ', 'Member since')} {formatDate(item.seller.memberSince)}
                </p>
              </div>
            </div>

            <div className="mt-auto pt-6 space-y-3">
              {!isAuthenticated ? (
                <Link href="/auth" className="btn btn-primary w-full">{t('Đăng nhập để liên hệ người bán', 'Sign in to contact the seller')}</Link>
              ) : isOwner ? (
                <p className="text-xs text-neutral-500 text-center">{t('Đây là tin của bạn.', 'This is your listing.')}</p>
              ) : (
                <>
                  <div className="flex gap-3">
                    <button type="button" disabled={busy || !available} onClick={() => goPanel('buy')} className="btn btn-primary flex-1">
                      <ShoppingBag className="w-4 h-4" aria-hidden="true" /> {item.price === 0 ? t('Nhận đồ', 'Claim') : t('Mua', 'Buy')}
                    </button>
                    {item.isExchangeEnabled && (
                      <button type="button" disabled={busy || !available} onClick={() => goPanel('exchange')} className="btn btn-outline flex-1">
                        <RefreshCw className="w-4 h-4" aria-hidden="true" /> {t('Đề nghị đổi', 'Offer swap')}
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button type="button" disabled={busy} onClick={openChat} className="btn btn-outline flex-1">
                      <MessageSquare className="w-4 h-4" aria-hidden="true" /> {t('Nhắn tin', 'Message')}
                    </button>
                    <button type="button" disabled={busy} onClick={toggleFavorite} className="btn btn-outline" aria-pressed={item.isFavorited} aria-label={t('Yêu thích', 'Favorite')}>
                      <Heart className={cn('w-4 h-4', item.isFavorited && 'fill-black')} aria-hidden="true" /> {item.favoriteCount}
                    </button>
                    <button type="button" disabled={busy} onClick={() => goPanel('report')} className="btn btn-outline" aria-label={t('Báo cáo tin này', 'Report this listing')}>
                      <Flag className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
