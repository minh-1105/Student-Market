'use client';

import { Heart, MapPin, RefreshCw } from 'lucide-react';
import { CONDITIONS, type ItemSummary } from '@/lib/api';
import { formatPrice, timeAgo } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { ItemImage } from '@/components/ui';
import { cn } from '@/lib/utils';

export function useConditionLabel() {
  const t = useT();
  return (value: number, fallback?: string) => {
    const c = CONDITIONS.find((x) => x.value === value);
    return c ? t(c.vi, c.en) : fallback ?? '';
  };
}

/** Marketplace island card (DESIGN.md → Cards): photo, title, serif price, meta row. */
export function ItemCard({
  item,
  onOpen,
  onToggleFavorite,
}: {
  item: ItemSummary;
  onOpen: (item: ItemSummary) => void;
  onToggleFavorite?: (item: ItemSummary) => void;
}) {
  const t = useT();
  const conditionLabel = useConditionLabel();
  return (
    <article className="group relative bg-white rounded-3xl border border-white shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden flex flex-col">
      <button type="button" onClick={() => onOpen(item)} className="text-left cursor-pointer flex-1 flex flex-col" aria-label={t(`Xem ${item.title}`, `View ${item.title}`)}>
        <div className="relative w-full aspect-[4/3] overflow-hidden">
          <ItemImage src={item.primaryImageUrl} alt={item.title} className="w-full h-full group-hover:scale-105 transition-transform duration-500" />
          <span className="absolute top-3 left-3 chip bg-white/90 backdrop-blur-md">{conditionLabel(item.condition, item.conditionName)}</span>
        </div>
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-bold text-sm text-neutral-900 line-clamp-1">{item.title}</h3>
          <p className="font-serif text-xl font-extrabold text-neutral-900 mt-1 tabular">{formatPrice(item.price)}</p>
          <div className="flex items-center gap-2 py-2 mt-2 border-t border-neutral-100 text-xs text-neutral-500">
            <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate flex-1">{item.location}</span>
            <span className="shrink-0 text-[11px] text-neutral-400">{timeAgo(item.createdAt)}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
            <span className="chip">{item.categoryName}</span>
            {item.isExchangeEnabled && (
              <span className="chip">
                <RefreshCw className="w-3 h-3" aria-hidden="true" /> {t('Đổi đồ', 'Swap')}
              </span>
            )}
          </div>
        </div>
      </button>
      {onToggleFavorite && (
        <button
          type="button"
          onClick={() => onToggleFavorite(item)}
          aria-label={item.isFavorited ? t('Bỏ yêu thích', 'Remove from favorites') : t('Lưu vào yêu thích', 'Save to favorites')}
          aria-pressed={item.isFavorited}
          className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-colors cursor-pointer"
        >
          <Heart className={cn('w-4 h-4', item.isFavorited && 'fill-white')} />
        </button>
      )}
    </article>
  );
}

export function ItemGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">{children}</div>;
}
