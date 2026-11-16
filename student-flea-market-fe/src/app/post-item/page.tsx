'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Upload, Tag, RefreshCw, Heart, X, CheckCircle2, MapPin, LogIn, BadgeCheck, Hourglass } from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import { TopBar } from '@/components/shell/TopBar';
import { Loading, Notice, Avatar, Spinner } from '@/components/ui';
import { itemsApi, sellerApi, uploadItemImages, apiError, CONDITIONS, type Category, type SellerStatus } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { formatPrice, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useConditionLabel } from '@/components/items/ItemCard';

import { useT } from '@/lib/i18n';
const MAX_PHOTOS = 8; // backend limit per item
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_DESC = 1000;
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];

type Photo = { file: File; url: string };

function SellerGate({ status, onChange }: { status: SellerStatus; onChange: (s: SellerStatus) => void }) {
  const t = useT();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = status.sellerStatus === 1;
  const rejected = status.sellerStatus === 3;

  const run = async (fn: () => Promise<SellerStatus>) => {
    setBusy(true);
    setError(null);
    try {
      onChange(await fn());
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12">
      <div className="max-w-md w-full card p-8">
        <div className="w-12 h-12 rounded-full bg-neutral-900 text-white flex items-center justify-center mb-5">
          {pending ? <Hourglass className="w-5 h-5" aria-hidden="true" /> : <BadgeCheck className="w-5 h-5" aria-hidden="true" />}
        </div>
        <h1 className="font-serif text-3xl font-bold text-neutral-900">{pending ? t('Đang chờ duyệt', 'Awaiting approval') : t('Trở thành người bán', 'Become a seller')}</h1>
        <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
          {pending
            ? t(`Yêu cầu gửi ngày ${formatDate(status.requestedAt)}. Quản trị viên sẽ duyệt sớm, sau đó bạn đăng tin được ngay.`, `Requested on ${formatDate(status.requestedAt)}. An admin will review it soon, then you can post right away.`)
            : t('Để giữ chợ an toàn, tài khoản cần được duyệt trước khi đăng tin. Gửi yêu cầu kèm vài dòng giới thiệu.', 'To keep the market safe, accounts are approved before posting. Send a request with a short intro.')}
        </p>
        {rejected && status.rejectionReason && (
          <div className="mt-4">
            <Notice>{t('Yêu cầu trước bị từ chối:', 'Your last request was declined:')} {status.rejectionReason}</Notice>
          </div>
        )}
        {error && <div className="mt-4"><Notice>{error}</Notice></div>}
        {pending ? (
          <button type="button" disabled={busy} onClick={() => run(sellerApi.cancel)} className="btn btn-outline w-full mt-6">
            {busy && <Spinner className="w-4 h-4" />} {t('Hủy yêu cầu', 'Withdraw request')}
          </button>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => sellerApi.request(note.trim()));
            }}
          >
            <div>
              <label htmlFor="note" className="label">{t('Giới thiệu ngắn (không bắt buộc)', 'Short intro (optional)')}</label>
              <textarea id="note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className="field resize-none" placeholder={t('VD: Mình muốn pass lại giáo trình năm nhất...', 'e.g. I want to pass on my first-year textbooks...')} />
            </div>
            <button type="submit" disabled={busy} className="btn btn-primary w-full">
              {busy && <Spinner className="w-4 h-4 border-neutral-500 border-t-white" />} {t('Gửi yêu cầu', 'Send request')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function PostForm() {
  const t = useT();
  const { user } = useAuthStore();
  const conditionLabel = useConditionLabel();
  const [categories, setCategories] = useState<Category[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [condition, setCondition] = useState(2);
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [exchange, setExchange] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ warning?: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const photosRef = useRef<Photo[]>([]);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  useEffect(() => {
    itemsApi
      .categories()
      .then((c) => {
        setCategories(c);
        setCategoryId((cur) => (cur === '' && c[0] ? c[0].id : cur));
      })
      .catch((e) => setError(apiError(e, t('Không tải được danh mục.', 'Could not load categories.'))));
  }, [t]);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const rejected: string[] = [];
    const next: Photo[] = [];
    for (const f of Array.from(files)) {
      if (!ACCEPT.includes(f.type) || f.size > MAX_BYTES) rejected.push(f.name);
      else if (photos.length + next.length < MAX_PHOTOS) next.push({ file: f, url: URL.createObjectURL(f) });
    }
    setPhotos((p) => [...p, ...next]);
    setError(rejected.length ? t(`Bỏ qua ${rejected.join(', ')}: chỉ nhận JPG, PNG, WEBP tối đa 10MB.`, `Skipped ${rejected.join(', ')}: only JPG, PNG, WEBP up to 10MB.`) : null);
  };

  const removePhoto = (i: number) =>
    setPhotos((p) => {
      URL.revokeObjectURL(p[i].url);
      return p.filter((_, idx) => idx !== i);
    });

  const priceNumber = Number(price.replace(/\D/g, '') || 0);
  const category = categories.find((c) => c.id === categoryId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) return setError(t('Chọn danh mục cho món đồ.', 'Pick a category for the item.'));
    setSubmitting(true);
    setError(null);
    try {
      const item = await itemsApi.create({
        title: title.trim(),
        categoryId,
        description: description.trim() || undefined,
        price: priceNumber,
        condition,
        isExchangeEnabled: exchange,
        location: location.trim(),
      });
      try {
        await uploadItemImages(item.id, photos.map((p) => p.file));
        setDone({});
      } catch (uploadErr) {
        // The listing exists; only the photos failed (e.g. S3 not configured locally).
        setDone({ warning: t(`Tin đã đăng nhưng ảnh chưa tải lên được: ${apiError(uploadErr)}`, `Listing posted, but photos failed to upload: ${apiError(uploadErr)}`) });
      }
    } catch (err) {
      setError(apiError(err, t('Đăng tin thất bại.', 'Posting failed.')));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <div className="max-w-md text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-5">
            <CheckCircle2 className="w-7 h-7" aria-hidden="true" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-neutral-900">{t('Đăng tin thành công!', 'Listing posted!')}</h1>
          <p className="text-sm text-neutral-500 mt-2">{t('Tin của bạn đã lên chợ.', 'Your item is now on the marketplace.')}</p>
          {done.warning && <div className="mt-4 text-left"><Notice>{done.warning}</Notice></div>}
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/my-listings" className="btn btn-primary">{t('Xem tin của tôi', 'View my listings')}</Link>
            <Link href="/marketplace" className="btn btn-secondary">{t('Về chợ đồ', 'Back to marketplace')}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex-1 flex flex-col">
      <div className="mb-6">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-neutral-900">{t('Đăng tin', 'Post an item')}</h1>
        <p className="text-sm text-neutral-500 mt-1">{t('Tạo tin để bán, đổi hoặc tặng 0đ món đồ của bạn.', 'Create a listing to sell, swap or give away your item.')}</p>
      </div>
      {error && <div className="mb-6"><Notice>{error}</Notice></div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-5">
          <div>
            <div className="flex justify-between items-center label">
              <span>{t('Ảnh món đồ', 'Photos')}</span>
              <span className="tabular">{photos.length}/{MAX_PHOTOS}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="w-32 h-28 border-2 border-dashed border-neutral-300 hover:border-neutral-600 rounded-2xl flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-colors"
                >
                  <Upload className="w-5 h-5 text-neutral-500 mb-1" aria-hidden="true" />
                  <span className="text-xs font-bold text-neutral-900">{t('Thêm ảnh', 'Add photos')}</span>
                  <span className="text-[10px] text-neutral-400 mt-0.5">JPG, PNG, WEBP · 10MB</span>
                </button>
              )}
              <input
                ref={fileInput}
                type="file"
                accept={ACCEPT.join(',')}
                multiple
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              {photos.map((p, i) => (
                <div key={p.url} className="w-28 h-28 rounded-2xl overflow-hidden bg-neutral-200 border border-neutral-300 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.file.name} className="w-full h-full object-cover" />
                  {i === 0 && <span className="absolute bottom-1.5 left-1.5 chip chip-dark !text-[10px]">{t('Ảnh bìa', 'Cover')}</span>}
                  <button type="button" onClick={() => removePhoto(i)} aria-label={t(`Xóa ảnh ${p.file.name}`, `Remove ${p.file.name}`)} className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/50 hover:bg-black/70 text-white cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="title" className="label">{t('Tên món đồ *', 'Item title *')}</label>
            <input id="title" required minLength={3} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('VD: Giáo trình Giải tích 1, quạt mini Senko...', 'e.g. Calculus 1 textbook, mini desk fan...')} className="field" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="category" className="label">{t('Danh mục *', 'Category *')}</label>
              <select id="category" required value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))} className="field cursor-pointer">
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="condition" className="label">{t('Tình trạng *', 'Condition *')}</label>
              <select id="condition" value={condition} onChange={(e) => setCondition(Number(e.target.value))} className="field cursor-pointer">
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>{t(c.vi, c.en)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="price" className="label">{t('Giá *', 'Price *')}</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <input
                  id="price"
                  inputMode="numeric"
                  required
                  value={price}
                  onChange={(e) => {
                    const d = e.target.value.replace(/\D/g, '').slice(0, 9);
                    setPrice(d ? Number(d).toLocaleString('vi-VN') : '');
                  }}
                  placeholder="0"
                  className="field pr-10 font-semibold tabular"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 font-bold" aria-hidden="true">₫</span>
              </div>
              <p className="flex-1 px-4 py-3 bg-neutral-200/50 rounded-2xl text-xs text-neutral-500 flex items-center">{t('Đặt giá 0 ₫ để tặng miễn phí.', 'Set the price to 0 ₫ to give it away.')}</p>
            </div>
          </div>

          <div>
            <label htmlFor="location" className="label">{t('Khu vực giao dịch *', 'Meeting area *')}</label>
            <input id="location" required minLength={2} maxLength={255} value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t('VD: KTX khu A, cổng chính...', 'e.g. Dorm A, main gate...')} className="field" />
          </div>

          <div>
            <div className="flex justify-between items-center label">
              <label htmlFor="description">{t('Mô tả', 'Description')}</label>
              <span className="tabular">{description.length}/{MAX_DESC}</span>
            </div>
            <textarea id="description" rows={4} maxLength={MAX_DESC} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('Tình trạng, phụ kiện kèm theo, thời gian rảnh để gặp...', 'Condition, accessories included, when you are free to meet...')} className="field resize-none" />
          </div>

          <fieldset>
            <legend className="label">{t('Hình thức *', 'Listing type *')}</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(
                [
                  { key: false, icon: Tag, label: t('Bán', 'Sell'), desc: t('Bán với giá cố định.', 'Sell at a fixed price.') },
                  { key: true, icon: RefreshCw, label: t('Bán & nhận đổi', 'Sell & swap'), desc: t('Nhận thêm đề nghị đổi món khác.', 'Also accept swap offers.') },
                ]
              ).map(({ key, icon: Icon, label, desc }) => {
                const active = exchange === key;
                return (
                  <label
                    key={label}
                    className={cn(
                      'p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between gap-3',
                      active ? 'border-neutral-900 bg-white/70 shadow-sm' : 'border-transparent bg-neutral-200/50 hover:bg-neutral-200'
                    )}
                  >
                    <input type="radio" name="mode" checked={active} onChange={() => setExchange(key)} className="sr-only" />
                    <span className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-neutral-700" aria-hidden="true" />
                      <span>
                        <span className="block text-sm font-bold text-neutral-900">{label}</span>
                        <span className="block text-xs text-neutral-500">{desc}</span>
                      </span>
                    </span>
                    <span className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0', active ? 'border-neutral-900' : 'border-neutral-400')} aria-hidden="true">
                      {active && <span className="w-2.5 h-2.5 bg-neutral-900 rounded-full" />}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>

        {/* Live listing preview */}
        <aside className="lg:col-span-4 bg-white/80 rounded-3xl p-5 border border-white shadow-lg lg:sticky lg:top-8" aria-label={t('Xem trước tin đăng', 'Listing preview')}>
          <h2 className="text-sm font-bold text-neutral-900 mb-1">{t('Xem trước', 'Preview')}</h2>
          <p className="text-xs text-neutral-500 mb-4">{t('Tin của bạn sẽ hiển thị như thế này.', 'This is how your listing will look.')}</p>
          <div className="rounded-2xl overflow-hidden bg-neutral-100 border border-black/5 relative mb-4 h-48 flex items-center justify-center">
            {photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photos[0].url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Upload className="w-8 h-8 text-neutral-300" aria-hidden="true" />
            )}
            <span className="absolute top-3 right-3 p-2 bg-black/40 backdrop-blur-md rounded-full text-white" aria-hidden="true">
              <Heart className="w-4 h-4" />
            </span>
          </div>
          <h3 className="font-bold text-neutral-900 text-base mb-1 truncate">{title || t('Tên món đồ', 'Item title')}</h3>
          <p className="font-serif text-xl font-extrabold text-neutral-900 mb-3 tabular">{formatPrice(priceNumber)}</p>
          <div className="flex items-center gap-2 py-2 border-t border-b border-neutral-100 mb-3">
            <Avatar name={user?.fullName} url={user?.avatarUrl} size="sm" />
            <span className="text-xs font-semibold text-neutral-800 truncate">{user?.fullName}</span>
            <span className="text-[11px] text-neutral-400 ml-auto shrink-0">{t('Vừa xong', 'Just now')}</span>
          </div>
          {location && (
            <p className="flex items-center gap-1.5 text-xs text-neutral-500 mb-2">
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" /> {location}
            </p>
          )}
          <p className="text-xs text-neutral-600 line-clamp-2 mb-4 min-h-[2rem]">{description}</p>
          <div className="flex flex-wrap gap-2">
            {category && <span className="chip">{category.name}</span>}
            <span className="chip">{conditionLabel(condition)}</span>
            {exchange && <span className="chip chip-dark">{t('Nhận đổi', 'Swaps')}</span>}
          </div>
        </aside>
      </div>

      <div className="flex justify-end gap-3 pt-6 mt-8 border-t border-neutral-200">
        <Link href="/marketplace" className="btn btn-secondary">{t('Hủy', 'Cancel')}</Link>
        <button type="submit" disabled={submitting} className="btn btn-primary px-8">
          {submitting && <Spinner className="w-4 h-4 border-neutral-500 border-t-white" />}
          {submitting ? t('Đang đăng...', 'Posting...') : t('Đăng tin', 'Post listing')}
        </button>
      </div>
    </form>
  );
}

function PostItemContent() {
  const t = useT();
  const { isAuthenticated, isInitialized } = useAuthStore();
  const [status, setStatus] = useState<SellerStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return;
    sellerApi.status().then(setStatus).catch((e) => setError(apiError(e, t('Không kiểm tra được quyền bán.', 'Could not check seller access.'))));
  }, [isInitialized, isAuthenticated, t]);

  if (!isInitialized) return <Loading />;
  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <div className="max-w-sm text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-neutral-900 text-white flex items-center justify-center mb-5">
            <LogIn className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-neutral-900">{t('Đăng nhập để đăng tin', 'Sign in to post an item')}</h1>
          <p className="text-sm text-neutral-500 mt-2">{t('Bạn cần tài khoản sinh viên để bán, đổi hoặc tặng đồ.', 'You need a student account to sell, swap or give away items.')}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/auth?redirect=/post-item" className="btn btn-primary">{t('Đăng nhập', 'Sign in')}</Link>
            <Link href="/auth?mode=register" className="btn btn-secondary">{t('Tạo tài khoản', 'Create account')}</Link>
          </div>
        </div>
      </div>
    );
  }
  if (error) return <Notice>{error}</Notice>;
  if (!status) return <Loading label={t('Đang kiểm tra quyền bán...', 'Checking seller access...')} />;
  if (!status.canSell) return <SellerGate status={status} onChange={setStatus} />;
  return <PostForm />;
}

export default function PostItemPage() {
  return (
    <AppShell>
      <TopBar />
      <PostItemContent />
    </AppShell>
  );
}
