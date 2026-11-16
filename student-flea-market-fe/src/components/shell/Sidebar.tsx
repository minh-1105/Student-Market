'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Tag,
  MessageSquare,
  Bookmark,
  Layers,
  RefreshCw,
  Star,
  Flag,
  LayoutDashboard,
  Users,
  BadgeCheck,
  FolderTree,
  ShieldCheck,
  FileText,
  LogOut,
  LogIn,
  ArrowLeftRight,
  UserCog,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useLang, useT } from '@/lib/i18n';
import { chatApi } from '@/lib/api';
import { isStaff } from '@/lib/format';
import { Avatar } from '@/components/ui';
import { cn } from '@/lib/utils';

interface NavItem {
  vi: string;
  en: string;
  href: string;
  icon: LucideIcon;
  auth?: boolean;
  adminOnly?: boolean;
  badge?: 'unread';
}

const USER_NAV: NavItem[] = [
  { vi: 'Khám phá', en: 'Discover', href: '/', icon: Home },
  { vi: 'Chợ đồ', en: 'Marketplace', href: '/marketplace', icon: Tag },
  { vi: 'Tin nhắn', en: 'Messages', href: '/messages', icon: MessageSquare, auth: true, badge: 'unread' },
  { vi: 'Yêu thích', en: 'Favorites', href: '/favorites', icon: Bookmark, auth: true },
  { vi: 'Tin của tôi', en: 'My listings', href: '/my-listings', icon: Layers, auth: true },
  { vi: 'Giao dịch', en: 'Transactions', href: '/transactions', icon: RefreshCw, auth: true },
  { vi: 'Đánh giá', en: 'Reviews', href: '/reviews', icon: Star, auth: true },
  { vi: 'Báo cáo', en: 'Reports', href: '/reports', icon: Flag, auth: true },
];

const ADMIN_NAV: NavItem[] = [
  { vi: 'Tổng quan', en: 'Overview', href: '/admin', icon: LayoutDashboard },
  { vi: 'Người dùng', en: 'Users', href: '/admin/users', icon: Users },
  { vi: 'Duyệt người bán', en: 'Seller requests', href: '/admin/sellers', icon: BadgeCheck },
  { vi: 'Báo cáo vi phạm', en: 'Reports', href: '/admin/reports', icon: Flag },
  { vi: 'Danh mục', en: 'Categories', href: '/admin/categories', icon: FolderTree },
  { vi: 'Kiểm duyệt viên', en: 'Moderators', href: '/admin/moderators', icon: ShieldCheck, adminOnly: true },
];

export function Wordmark({ admin = false }: { admin?: boolean }) {
  return (
    <Link href={admin ? '/admin' : '/'} className="inline-flex items-baseline gap-2">
      <span className="font-serif text-4xl font-bold tracking-tight text-neutral-900">FLea</span>
      {admin && <span className="chip chip-dark">Admin</span>}
    </Link>
  );
}

export function LanguageSwitch() {
  const { lang, setLang } = useLang();
  const t = useT();
  return (
    <div role="group" aria-label={t('Ngôn ngữ', 'Language')} className="flex p-0.5 rounded-full bg-neutral-200/70 text-[11px] font-bold">
      {(['vi', 'en'] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn('px-3 py-1 rounded-full transition-colors cursor-pointer', lang === l ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900')}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export function Sidebar({ variant = 'user', onNavigate }: { variant?: 'user' | 'admin'; onNavigate?: () => void }) {
  const pathname = usePathname();
  const t = useT();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [unread, setUnread] = useState(0);
  const staff = isStaff(user?.roleName);

  useEffect(() => {
    if (!isAuthenticated || variant !== 'user') return;
    const load = () => chatApi.unread().then(setUnread).catch(() => undefined);
    load();
    const id = window.setInterval(load, 30000);
    return () => window.clearInterval(id);
  }, [isAuthenticated, variant, pathname]);

  const items = (variant === 'admin' ? ADMIN_NAV : USER_NAV).filter((i) => !i.adminOnly || user?.roleName === 'Admin');
  const isActive = (href: string) => (href === '/' || href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <aside className="island w-full lg:w-72 h-full p-6 flex flex-col justify-between overflow-y-auto no-scrollbar">
      <div>
        <div className="mb-8 px-2">
          <Wordmark admin={variant === 'admin'} />
        </div>

        {isAuthenticated && user ? (
          <Link
            href="/profile"
            onClick={onNavigate}
            aria-current={pathname === '/profile' ? 'page' : undefined}
            aria-label={t('Hồ sơ của tôi', 'My profile')}
            className={cn(
              'group flex items-center gap-3 p-3 rounded-2xl shadow-sm border mb-6 transition-colors',
              pathname === '/profile' ? 'bg-neutral-900 border-neutral-900' : 'bg-white/80 border-black/5 hover:border-black/20 hover:bg-white'
            )}
          >
            <Avatar name={user.fullName} url={user.avatarUrl} />
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-bold truncate', pathname === '/profile' ? 'text-white' : 'text-neutral-900')}>{user.fullName || user.username}</p>
              <p className={cn('text-xs truncate', pathname === '/profile' ? 'text-neutral-300' : 'text-neutral-500')}>{user.schoolName || user.email}</p>
            </div>
            <UserCog
              className={cn('w-4 h-4 shrink-0 transition-colors', pathname === '/profile' ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-900')}
              aria-hidden="true"
            />
          </Link>
        ) : (
          <div className="p-4 rounded-2xl bg-white/80 shadow-sm border border-black/5 mb-6">
            <p className="text-sm font-bold text-neutral-900">{t('Chào bạn!', 'Hi there!')}</p>
            <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
              {t('Đăng nhập để đăng tin, nhắn tin và giao dịch.', 'Sign in to post items, chat and trade.')}
            </p>
            <Link href="/auth" onClick={onNavigate} className="btn btn-primary btn-sm w-full mt-3">
              <LogIn className="w-4 h-4" aria-hidden="true" /> {t('Đăng nhập', 'Sign in')}
            </Link>
          </div>
        )}

        <nav aria-label={variant === 'admin' ? t('Quản trị', 'Admin') : t('Điều hướng chính', 'Main navigation')} className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const href = item.auth && !isAuthenticated ? `/auth?redirect=${encodeURIComponent(item.href)}` : item.href;
            return (
              <Link
                key={item.href}
                href={href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-colors duration-200',
                  active ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-600 hover:bg-neutral-200/60 hover:text-neutral-900'
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-5 h-5 stroke-[1.8]" aria-hidden="true" /> {t(item.vi, item.en)}
                </span>
                {item.badge === 'unread' && unread > 0 && (
                  <span
                    className={cn('px-2 py-0.5 text-xs rounded-full font-bold tabular', active ? 'bg-white text-neutral-900' : 'bg-neutral-900 text-white')}
                    aria-label={t(`${unread} tin chưa đọc`, `${unread} unread`)}
                  >
                    {unread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 mt-6 border-t border-neutral-200 space-y-1">
        {variant === 'user' && staff && (
          <Link href="/admin" onClick={onNavigate} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-neutral-600 hover:bg-neutral-200/50">
            <ShieldCheck className="w-5 h-5 stroke-[1.8]" aria-hidden="true" /> {t('Trang quản trị', 'Admin console')}
          </Link>
        )}
        {variant === 'admin' && (
          <Link href="/" onClick={onNavigate} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-neutral-600 hover:bg-neutral-200/50">
            <ArrowLeftRight className="w-5 h-5 stroke-[1.8]" aria-hidden="true" /> {t('Về trang người dùng', 'Back to app')}
          </Link>
        )}
        <Link href="/policies" onClick={onNavigate} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-neutral-600 hover:bg-neutral-200/50">
          <FileText className="w-5 h-5 stroke-[1.8]" aria-hidden="true" /> {t('Chính sách', 'Policies')}
        </Link>
        <div className="flex items-center justify-between px-4 py-1.5">
          <span className="text-xs font-semibold text-neutral-500">{t('Ngôn ngữ', 'Language')}</span>
          <LanguageSwitch />
        </div>
        {isAuthenticated && (
          <button
            type="button"
            onClick={() => {
              logout();
              onNavigate?.();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-neutral-600 hover:bg-[#fff5f4] hover:text-[#93000a] cursor-pointer"
          >
            <LogOut className="w-5 h-5 stroke-[1.8]" aria-hidden="true" /> {t('Đăng xuất', 'Sign out')}
          </button>
        )}
      </div>
    </aside>
  );
}
