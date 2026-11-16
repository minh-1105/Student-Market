'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import { X, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-neutral-900">{title}</h1>
        {subtitle && <p className="text-sm text-neutral-500 mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-3 shrink-0">{actions}</div>}
    </header>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="…"
      className={cn('inline-block w-5 h-5 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin', className)}
    />
  );
}

export function Loading({ label }: { label?: string }) {
  const t = useT();
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-sm text-neutral-500">
      <Spinner /> {label ?? t('Đang tải...', 'Loading...')}
    </div>
  );
}

export function Notice({ tone = 'error', children }: { tone?: 'error' | 'success' | 'info'; children: ReactNode }) {
  const Icon = tone === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 p-4 rounded-2xl text-sm border',
        tone === 'error' && 'bg-[#fff5f4] border-[#f3c4bf] text-[#93000a]',
        tone === 'success' && 'bg-emerald-50 border-emerald-200 text-emerald-900',
        tone === 'info' && 'bg-white/70 border-white text-neutral-700'
      )}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
      <div className="flex-1 leading-relaxed">{children}</div>
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="py-16 px-6 text-center rounded-3xl bg-white/60 border border-dashed border-neutral-300">
      {icon && <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-neutral-900 text-white flex items-center justify-center">{icon}</div>}
      <p className="text-sm font-bold text-neutral-900">{title}</p>
      {description && <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  const t = useT();
  if (totalPages <= 1) return null;
  return (
    <nav aria-label={t('Phân trang', 'Pagination')} className="flex items-center justify-center gap-3 mt-10">
      <button type="button" className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft className="w-4 h-4" aria-hidden="true" /> {t('Trước', 'Prev')}
      </button>
      <span className="text-sm text-neutral-600 tabular">
        {page} / {totalPages}
      </span>
      <button type="button" className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        {t('Sau', 'Next')} <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </nav>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'md' | 'lg';
}) {
  const titleId = useId();
  const t = useT();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative w-full bg-white rounded-3xl shadow-2xl max-h-[88vh] overflow-y-auto p-6 sm:p-8 animate-in zoom-in-95 fade-in duration-200',
          size === 'lg' ? 'max-w-3xl' : 'max-w-md'
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('Đóng', 'Close')}
          className="absolute top-5 right-5 p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
        <h2 id={titleId} className="font-serif text-2xl font-bold text-neutral-900 pr-12 mb-4">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

/** Remote listing photo with a monochrome placeholder. Images come from CloudFront/S3, not the Next image optimizer. */
export function ItemImage({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  if (!src) {
    return (
      <div className={cn('flex items-center justify-center bg-neutral-100 text-neutral-300', className)} aria-label={alt}>
        <ImageOff className="w-8 h-8" aria-hidden="true" />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" className={cn('object-cover bg-neutral-100', className)} />;
}

export function Avatar({ name, url, size = 'md' }: { name?: string | null; url?: string | null; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const dim =
    size === 'sm' ? 'w-7 h-7 text-[11px]' : size === 'lg' ? 'w-11 h-11 text-sm' : size === 'xl' ? 'w-20 h-20 text-3xl font-serif' : 'w-10 h-10 text-sm';
  // Falls back to initials if the image fails (e.g. a fresh avatar still being processed).
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (url && failedUrl !== url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" onError={() => setFailedUrl(url)} className={cn(dim, 'rounded-full object-cover bg-neutral-300 shrink-0')} />;
  }
  return (
    <span className={cn(dim, 'rounded-full bg-neutral-900 text-white font-bold flex items-center justify-center shrink-0')} aria-hidden="true">
      {(name || 'U').trim().charAt(0).toUpperCase()}
    </span>
  );
}
