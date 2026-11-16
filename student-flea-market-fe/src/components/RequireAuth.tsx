'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogIn, ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { isStaff } from '@/lib/format';
import { Loading } from '@/components/ui';
import { useT } from '@/lib/i18n';

/** Renders children only for signed-in users (and optionally staff); otherwise a Stitch-style prompt. */
export function RequireAuth({ children, staffOnly = false }: { children: ReactNode; staffOnly?: boolean }) {
  const pathname = usePathname();
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  const t = useT();

  if (!isInitialized) return <Loading />;

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <div className="max-w-sm text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-neutral-900 text-white flex items-center justify-center mb-5">
            <LogIn className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-neutral-900">{t('Bạn cần đăng nhập', 'Please sign in')}</h1>
          <p className="text-sm text-neutral-500 mt-2">{t('Đăng nhập để xem trang này.', 'Sign in to view this page.')}</p>
          <Link href={`/auth?redirect=${encodeURIComponent(pathname)}`} className="btn btn-primary mt-6">
            {t('Đăng nhập', 'Sign in')}
          </Link>
        </div>
      </div>
    );
  }

  if (staffOnly && !isStaff(user?.roleName)) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <div className="max-w-sm text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-neutral-900 text-white flex items-center justify-center mb-5">
            <ShieldAlert className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-neutral-900">{t('Không có quyền truy cập', 'Access denied')}</h1>
          <p className="text-sm text-neutral-500 mt-2">{t('Trang này chỉ dành cho Quản trị viên và Kiểm duyệt viên.', 'This page is for admins and moderators only.')}</p>
          <Link href="/" className="btn btn-primary mt-6">
            {t('Về trang chủ', 'Back home')}
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
