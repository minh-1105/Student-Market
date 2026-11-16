/**
 * Typed wrappers around the Student Flea Market backend (ASP.NET Core, camelCase JSON).
 * Contracts mirror StudentFleaMarket.Application DTOs.
 */
import axios, { AxiosError } from 'axios';
import { apiClient } from './api-client';
import { tr } from './i18n';
import type { UserDto } from '@/types/auth';

// ---------------------------------------------------------------- shared
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

/** ItemCondition enum (Domain). */
export const CONDITIONS = [
  { value: 1, vi: 'Mới 99%', en: '99% new' },
  { value: 2, vi: 'Như mới', en: 'Like new' },
  { value: 3, vi: 'Tốt', en: 'Good' },
  { value: 4, vi: 'Khá', en: 'Fair' },
  { value: 5, vi: 'Kém', en: 'Poor' },
] as const;

export const SORT_OPTIONS = [
  { value: 'newest', vi: 'Mới nhất', en: 'Newest' },
  { value: 'price_asc', vi: 'Giá thấp → cao', en: 'Price: low → high' },
  { value: 'price_desc', vi: 'Giá cao → thấp', en: 'Price: high → low' },
  { value: 'most_favorited', vi: 'Được thích nhiều', en: 'Most favorited' },
] as const;

/** ReportReason enum (Domain). */
export const REPORT_REASONS = [
  { value: 1, vi: 'Không đến hẹn', en: 'No-show' },
  { value: 2, vi: 'Đồ không đúng mô tả', en: 'Item not as described' },
  { value: 3, vi: 'Không thanh toán', en: 'Did not pay' },
  { value: 4, vi: 'Quấy rối', en: 'Harassment' },
] as const;

/** Turns any API failure into one readable message. Backend messages are passed through as-is. */
export function apiError(error: unknown, fallback?: string): string {
  const fb = fallback ?? tr('Đã có lỗi xảy ra. Vui lòng thử lại.', 'Something went wrong. Please try again.');
  if (!axios.isAxiosError(error)) return error instanceof Error ? error.message : fb;
  const e = error as AxiosError<{ message?: string; Message?: string; errors?: Record<string, string[]> | string[] }>;
  if (e.code === 'ERR_NETWORK') return tr('Không kết nối được máy chủ. Kiểm tra backend đã chạy chưa.', 'Cannot reach the server. Is the backend running?');
  const data = e.response?.data;
  if (data?.errors) {
    const list = Array.isArray(data.errors) ? data.errors : Object.values(data.errors).flat();
    if (list.length) return list.join(' ');
  }
  if (data?.message || data?.Message) return (data.message || data.Message) as string;
  if (e.response?.status === 401) return tr('Bạn cần đăng nhập để tiếp tục.', 'Please sign in to continue.');
  if (e.response?.status === 403) return tr('Bạn không có quyền thực hiện thao tác này.', 'You are not allowed to do this.');
  return fb;
}

// ---------------------------------------------------------------- items
export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  order: number;
  itemCount: number;
}

export interface ItemSummary {
  id: string;
  title: string;
  slug: string;
  itemCode: string;
  price: number;
  condition: number;
  conditionName: string;
  isExchangeEnabled: boolean;
  location: string;
  status: number;
  statusName: string;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  sellerId: string;
  sellerName: string;
  primaryImageUrl?: string | null;
  favoriteCount: number;
  isFavorited: boolean;
  createdAt: string;
}

export interface ItemDetail extends Omit<ItemSummary, 'categoryId' | 'categoryName' | 'categorySlug' | 'sellerId' | 'sellerName' | 'primaryImageUrl'> {
  description?: string | null;
  category: Category;
  seller: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
    schoolName?: string | null;
    studentCode?: string | null;
    memberSince: string;
  };
  images: { id: string; imageUrl: string; isPrimary: boolean; order: number }[];
  updatedAt: string;
}

export interface ItemQuery {
  keyword?: string;
  categoryIds?: number[];
  sortBy?: string;
  exchangeOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateItemInput {
  title: string;
  categoryId: number;
  description?: string;
  price: number;
  condition: number;
  isExchangeEnabled: boolean;
  location: string;
}

const listParams = (q: ItemQuery) => ({
  keyword: q.keyword || undefined,
  categoryIds: q.categoryIds?.length ? q.categoryIds : undefined,
  sortBy: q.sortBy || undefined,
  exchangeOnly: q.exchangeOnly || undefined,
  page: q.page ?? 1,
  pageSize: q.pageSize ?? 20,
});
// ASP.NET binds repeated keys (categoryIds=1&categoryIds=2).
const paramsSerializer = { indexes: null };

export const itemsApi = {
  categories: () => apiClient.get<Category[]>('/Items/categories').then((r) => r.data),
  search: (q: ItemQuery) =>
    apiClient.get<PagedResult<ItemSummary>>('/Items/search', { params: listParams(q), paramsSerializer }).then((r) => r.data),
  get: (id: string) => apiClient.get<ItemDetail>(`/Items/${id}`).then((r) => r.data),
  mine: (q: ItemQuery = {}) =>
    apiClient.get<PagedResult<ItemSummary>>('/Items/sell/mine', { params: listParams(q), paramsSerializer }).then((r) => r.data),
  create: (input: CreateItemInput) => apiClient.post<ItemDetail>('/Items/sell', input).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/Items/sell/${id}`),
};

// ---------------------------------------------------------------- image upload (S3 presigned POST)
interface PresignedUpload {
  uploadId: string;
  objectKey: string;
  uploadUrl: string;
  method: string;
  formFields: Record<string, string>;
  expectedSizeBytes: number;
  expiresAt: string;
}

/** presign → browser uploads straight to S3 → confirm. The file never passes through the API. */
export async function uploadItemImages(itemId: string, files: File[]): Promise<void> {
  if (!files.length) return;
  const { data } = await apiClient.post<{ uploads: PresignedUpload[] }>(`/Items/sell/${itemId}/images/presign`, {
    files: files.map((f) => ({ fileName: f.name, contentType: f.type, sizeBytes: f.size })),
  });
  await Promise.all(
    data.uploads.map(async (u, i) => {
      const form = new FormData();
      Object.entries(u.formFields).forEach(([k, v]) => form.append(k, v));
      form.append('file', files[i]);
      const res = await fetch(u.uploadUrl, { method: u.method || 'POST', body: form });
      if (!res.ok) throw new Error(tr(`Tải ảnh "${files[i].name}" thất bại (${res.status}).`, `Uploading "${files[i].name}" failed (${res.status}).`));
    })
  );
  await apiClient.post(`/Items/sell/${itemId}/images/confirm`, { objectKeys: data.uploads.map((u) => u.objectKey) });
}

// ---------------------------------------------------------------- favorites & seller
export const favoritesApi = {
  list: (page = 1, pageSize = 20) =>
    apiClient.get<PagedResult<ItemSummary>>('/Favorites', { params: { page, pageSize } }).then((r) => r.data),
  toggle: (itemId: string) =>
    apiClient.post<{ itemId: string; isFavorited: boolean; favoriteCount: number }>(`/Favorites/${itemId}/toggle`).then((r) => r.data),
};

export interface SellerStatus {
  sellerStatus: number; // 0 None, 1 Pending, 2 Approved, 3 Rejected
  sellerStatusName: string;
  canSell: boolean;
  requestedAt?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
}

export const sellerApi = {
  status: () => apiClient.get<SellerStatus>('/Seller/status').then((r) => r.data),
  request: (note?: string) => apiClient.post<SellerStatus>('/Seller/request', { note: note || null }).then((r) => r.data),
  cancel: () => apiClient.post<SellerStatus>('/Seller/request/cancel').then((r) => r.data),
};

// ---------------------------------------------------------------- chat
export interface Conversation {
  id: string;
  itemId: string;
  item: { id: string; title: string; itemCode: string; price: number; primaryImageUrl?: string | null; status: number; statusName: string };
  sellerId: string;
  buyerId: string;
  otherParty: { id: string; fullName: string; username?: string | null; avatarUrl?: string | null };
  viewerIsBuyer: boolean;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unreadCount: number;
  isItemUnavailable: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content?: string | null;
  isDeleted: boolean;
  isRead: boolean;
  sentAt: string;
}

export const chatApi = {
  open: (itemId: string) => apiClient.post<Conversation>('/Chat/conversations', { itemId }).then((r) => r.data),
  list: () =>
    apiClient.get<{ items: Conversation[]; totalUnread: number }>('/Chat/conversations', { params: { page: 1, pageSize: 50 } }).then((r) => r.data),
  messages: (id: string) =>
    apiClient.get<{ items: ChatMessage[]; totalCount: number }>(`/Chat/conversations/${id}/messages`, { params: { page: 1, pageSize: 100 } }).then((r) => r.data),
  send: (id: string, content: string) => apiClient.post<ChatMessage>(`/Chat/conversations/${id}/messages`, { content }).then((r) => r.data),
  markRead: (id: string) => apiClient.post(`/Chat/conversations/${id}/read`),
  unread: () => apiClient.get<{ totalUnread: number }>('/Chat/unread-count').then((r) => r.data.totalUnread),
};

// ---------------------------------------------------------------- trading
export interface TradingItem {
  id: string;
  title: string;
  itemCode: string;
  price: number;
  primaryImageUrl?: string | null;
  location: string;
  sellerId: string;
  sellerName: string;
}

export interface TradingParty {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
}

export interface Transaction {
  id: string;
  type: number; // 1 Purchase, 2 Exchange, 3 Free
  typeName: string;
  status: number; // 1 Pending, 2 Accepted, 3 Rejected, 4 Cancelled, 5 Completed, 6 AwaitingConfirmation
  statusName: string;
  initiator: TradingParty;
  counterparty: TradingParty;
  item: TradingItem;
  offeredItem?: TradingItem | null;
  amount: number;
  meetingLocation: string;
  payment?: { methodName: string; statusName: string; status: number; amount: number; paidAt?: string | null } | null;
  createdAt: string;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  canManage: boolean;
}

export interface ExchangeRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requestedItem: TradingItem;
  offeredItem: TradingItem;
  additionalAmount: number;
  note?: string | null;
  responseNote?: string | null;
  status: number; // 1 Pending, 2 Accepted, 3 Rejected, 4 Cancelled, 5 Expired
  statusName: string;
  createdAt: string;
  canRespond: boolean;
  canCancel: boolean;
}

export const FINAL_TX_STATUSES = [3, 4, 5];

export const tradingApi = {
  purchase: (itemCode: string, meetingLocation?: string) =>
    apiClient.post<Transaction>('/Transactions/purchase', { itemCode, meetingLocation: meetingLocation || null, paymentMethod: 1 }).then((r) => r.data),
  fromExchange: (exchangeRequestId: string, meetingLocation?: string) =>
    apiClient.post<Transaction>('/Transactions/exchange', { exchangeRequestId, meetingLocation: meetingLocation || null, paymentMethod: 1 }).then((r) => r.data),
  list: (q: { direction?: string; status?: number; page?: number }) =>
    apiClient.get<PagedResult<Transaction>>('/Transactions', { params: { ...q, pageSize: 10 } }).then((r) => r.data),
  pay: (id: string) => apiClient.post(`/Transactions/${id}/payment`, {}),
  handover: (id: string, itemCodeVerified?: string) =>
    apiClient.post(`/Transactions/${id}/handover`, { itemReceivedOk: true, itemCodeVerified: itemCodeVerified || null }),
  complete: (id: string) => apiClient.post(`/Transactions/${id}/complete`),
  cancel: (id: string, reason?: string) => apiClient.post(`/Transactions/${id}/cancel`, { reason: reason || null }),

  requestExchange: (requestedItemCode: string, offeredItemCode: string, additionalAmount: number, note?: string) =>
    apiClient.post<ExchangeRequest>('/ExchangeRequests', { requestedItemCode, offeredItemCode, additionalAmount, note: note || null }).then((r) => r.data),
  exchanges: (q: { direction?: string; status?: number; page?: number }) =>
    apiClient.get<PagedResult<ExchangeRequest>>('/ExchangeRequests', { params: { ...q, pageSize: 10 } }).then((r) => r.data),
  acceptExchange: (id: string, note?: string) => apiClient.post(`/ExchangeRequests/${id}/accept`, { note: note || null }),
  rejectExchange: (id: string, note?: string) => apiClient.post(`/ExchangeRequests/${id}/reject`, { note: note || null }),
  cancelExchange: (id: string) => apiClient.post(`/ExchangeRequests/${id}/cancel`),
};

// ---------------------------------------------------------------- reviews & reports
export interface Review {
  id: string;
  rating: number;
  comment?: string | null;
  reviewerName: string;
  reviewerAvatarUrl?: string | null;
  itemTitle: string;
  createdAt: string;
}

export interface PendingReview {
  transactionId: string;
  itemCode: string;
  itemTitle: string;
  itemImageUrl?: string | null;
  revieweeName: string;
  revieweeId: string;
  amount: number;
  completedAt: string;
  countsTowardsTrust: boolean;
}

export interface MyReport {
  id: string;
  reason: number;
  reasonName: string;
  status: number;
  statusName: string;
  description: string;
  adminNote?: string | null;
  itemTitle?: string | null;
  reportedUserName?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
}

export const trustApi = {
  pending: () => apiClient.get<PendingReview[]>('/Reviews/pending').then((r) => r.data),
  review: (transactionId: string, rating: number, comment?: string) =>
    apiClient.post(`/Reviews/transactions/${transactionId}`, { rating, comment: comment || null }),
  forUser: (userId: string, page = 1) =>
    apiClient.get<PagedResult<Review>>(`/Reviews/users/${userId}`, { params: { page, pageSize: 10 } }).then((r) => r.data),
  myReports: (page = 1) => apiClient.get<PagedResult<MyReport>>('/Reports', { params: { page, pageSize: 10 } }).then((r) => r.data),
  report: (input: { reason: number; description: string; itemCode?: string; transactionId?: string; conversationId?: string }) =>
    apiClient.post('/Reports', {
      reason: input.reason,
      description: input.description,
      itemCode: input.itemCode || null,
      transactionId: input.transactionId || null,
      conversationId: input.conversationId || null,
    }),
};

// ---------------------------------------------------------------- admin
export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  username?: string | null;
  phoneNumber?: string | null;
  schoolName?: string | null;
  studentCode?: string | null;
  status: number;
  statusName: string;
  isBanned: boolean;
  banReason?: string | null;
  sellerStatus: number;
  sellerStatusName: string;
  canSell: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  itemCount: number;
  roleName: string;
  isAdmin: boolean;
  isModerator: boolean;
  isStaff: boolean;
}

export interface SellerRequest {
  userId: string;
  fullName: string;
  email: string;
  username?: string | null;
  schoolName?: string | null;
  studentCode?: string | null;
  phoneNumber?: string | null;
  sellerStatus: number;
  sellerStatusName: string;
  requestedAt?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  itemCount: number;
}

export interface ModerationReport {
  id: string;
  reason: number;
  reasonName: string;
  status: number; // 1 Pending, 2 Reviewing, 3 Resolved, 4 Rejected
  statusName: string;
  description: string;
  reporterName: string;
  reportedUserName?: string | null;
  itemTitle?: string | null;
  itemCode?: string | null;
  adminNote?: string | null;
  resolvedByName?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
}

export interface ModerationDashboard {
  pendingReportCount: number;
  reviewingReportCount: number;
  resolvedReportCount: number;
  rejectedReportCount: number;
  hiddenItemCount: number;
  bannedUserCount: number;
  activeCategoryCount: number;
  totalCategoryCount: number;
  voidedReviewCount: number;
}

export interface AdminCategory {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  order: number;
  isActive: boolean;
  itemCount: number;
  hiddenItemCount: number;
}

export interface Moderator {
  userId: string;
  fullName: string;
  email: string;
  username?: string | null;
  grantedAt?: string | null;
  grantedByFullName?: string | null;
}

type Paging = { page?: number; pageSize?: number };

export const adminApi = {
  dashboard: () => apiClient.get<ModerationDashboard>('/Admin/moderation/dashboard').then((r) => r.data),

  users: (q: Paging & { keyword?: string; status?: number }) =>
    apiClient.get<PagedResult<AdminUser>>('/Admin/users', { params: q }).then((r) => r.data),
  ban: (userId: string, reason?: string) => apiClient.post(`/Admin/users/${userId}/ban`, { reason: reason || null }),
  unban: (userId: string) => apiClient.post(`/Admin/users/${userId}/unban`),

  sellerRequests: (q: Paging & { status?: number }) =>
    apiClient.get<PagedResult<SellerRequest>>('/Admin/seller-requests', { params: q }).then((r) => r.data),
  approveSeller: (userId: string) => apiClient.post(`/Admin/seller-requests/${userId}/approve`),
  rejectSeller: (userId: string, reason?: string) =>
    apiClient.post(`/Admin/seller-requests/${userId}/reject`, { reason: reason || null }),
  revokeSeller: (userId: string) => apiClient.post(`/Admin/seller-requests/${userId}/revoke`),

  reports: (q: Paging & { status?: number }) =>
    apiClient.get<PagedResult<ModerationReport>>('/Admin/moderation/reports', { params: q }).then((r) => r.data),
  markReviewing: (id: string) => apiClient.post(`/Admin/moderation/reports/${id}/reviewing`),
  resolve: (id: string, actions: string[], adminNote?: string) =>
    apiClient.post(`/Admin/moderation/reports/${id}/resolve`, { actions, adminNote: adminNote || null }),

  categories: () => apiClient.get<AdminCategory[]>('/Admin/categories').then((r) => r.data),
  createCategory: (name: string, description?: string) =>
    apiClient.post('/Admin/categories', { name, description: description || null, isActive: true }),
  toggleCategory: (id: number, isActive: boolean) => apiClient.patch(`/Admin/categories/${id}/status`, { isActive }),
  deleteCategory: (id: number) => apiClient.delete(`/Admin/categories/${id}`),

  moderators: (q: Paging) => apiClient.get<PagedResult<Moderator>>('/Admin/moderators', { params: q }).then((r) => r.data),
  assignModerator: (userId: string) => apiClient.post(`/Admin/moderators/${userId}`, {}),
  revokeModerator: (userId: string) => apiClient.delete(`/Admin/moderators/${userId}`),
};

// ---------------------------------------------------------------- profile
export interface UpdateProfileRequest {
  fullName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  schoolName?: string;
  studentCode?: string;
  commonArea?: string;
  dormitory?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const profileApi = {
  get: () => apiClient.get<UserDto>('/Profile').then((r) => r.data),
  /** Fields sent as '' are cleared; omitted fields stay unchanged. */
  update: (body: UpdateProfileRequest) => apiClient.put<UserDto>('/Profile', body).then((r) => r.data),
  /** Revokes every refresh token server-side — the caller must sign the user out afterwards. */
  changePassword: (body: ChangePasswordRequest) => apiClient.post('/Profile/change-password', body).then((r) => r.data),
  uploadAvatar,
  removeAvatar: () => apiClient.delete<UserDto>('/Profile/avatar').then((r) => r.data),
};

export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/** Client-side check mirroring the API validator; returns an error message or null. */
export function validateAvatar(file: File): string | null {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return tr('Chỉ nhận ảnh JPG, PNG hoặc WebP.', 'Only JPG, PNG or WebP images.');
  if (file.size > AVATAR_MAX_BYTES) return tr('Ảnh tối đa 5 MB.', 'Image must be 5 MB or smaller.');
  return null;
}

/**
 * presign → browser POSTs straight to S3 (raw/, private) → confirm saves the CloudFront URL on the user.
 * The Lambda crops it to a square WebP a moment later, so the returned URL may 403/404 for a few seconds.
 */
async function uploadAvatar(file: File): Promise<UserDto> {
  const { data: u } = await apiClient.post<PresignedUpload>('/Profile/avatar/presign', {
    // Normalised name so odd extensions (.jfif, none) still match the declared type.
    fileName: `avatar.${AVATAR_EXT[file.type]}`,
    contentType: file.type,
    sizeBytes: file.size,
  });
  const form = new FormData();
  Object.entries(u.formFields).forEach(([k, v]) => form.append(k, v));
  form.append('file', file);
  const res = await fetch(u.uploadUrl, { method: u.method || 'POST', body: form });
  if (!res.ok) throw new Error(tr(`Tải ảnh lên thất bại (${res.status}).`, `Upload failed (${res.status}).`));
  return apiClient.post<UserDto>('/Profile/avatar/confirm', { objectKey: u.objectKey }).then((r) => r.data);
}

/** Resolves once the processed image is reachable (Lambda finished), or false after ~20 s. */
export function waitForImage(url: string, attempts = 10, delayMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    let n = 0;
    const tryOnce = () => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => (++n >= attempts ? resolve(false) : window.setTimeout(tryOnce, delayMs));
      img.src = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
    };
    tryOnce();
  });
}
