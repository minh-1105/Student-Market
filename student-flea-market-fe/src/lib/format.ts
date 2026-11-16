import { tr, useLang } from './i18n';

const locale = () => (useLang.getState().lang === 'en' ? 'en-US' : 'vi-VN');

export const formatPrice = (price: number) => (price === 0 ? tr('Tặng 0đ', 'Free') : `${price.toLocaleString('vi-VN')} ₫`);

export const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(locale(), { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

export const formatDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(locale(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return tr('Vừa xong', 'Just now');
  if (diff < 3600) return tr(`${Math.floor(diff / 60)} phút trước`, `${Math.floor(diff / 60)}m ago`);
  if (diff < 86400) return tr(`${Math.floor(diff / 3600)} giờ trước`, `${Math.floor(diff / 3600)}h ago`);
  if (diff < 86400 * 30) return tr(`${Math.floor(diff / 86400)} ngày trước`, `${Math.floor(diff / 86400)}d ago`);
  return formatDate(iso);
}

/** Roles that can open the admin console. */
export const isStaff = (roleName?: string | null) => roleName === 'Admin' || roleName === 'Moderator';
