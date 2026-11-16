'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Plus } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { Avatar } from '@/components/ui';
import { useT } from '@/lib/i18n';

/** Stitch header bar: pill search → marketplace, "Đăng tin" CTA, avatar. */
export function TopBar({ initialQuery = '' }: { initialQuery?: string }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [query, setQuery] = useState(initialQuery);
  const t = useT();

  return (
    <div className="flex items-center gap-3 sm:gap-4 mb-8">
      <form
        role="search"
        className="flex-1 relative"
        onSubmit={(e) => {
          e.preventDefault();
          const q = query.trim();
          router.push(q ? `/marketplace?q=${encodeURIComponent(q)}` : '/marketplace');
        }}
      >
        <label htmlFor="global-search" className="sr-only">
          {t('Tìm món đồ', 'Search items')}
        </label>
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" aria-hidden="true" />
        <input
          id="global-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('Tìm món đồ, danh mục hoặc người bán...', 'Search for items, categories, or sellers...')}
          className="field !rounded-full pl-12"
        />
      </form>
      <Link href="/post-item" className="btn btn-primary hidden sm:inline-flex">
        <Plus className="w-4 h-4" aria-hidden="true" /> {t('Đăng tin', 'Post an item')}
      </Link>
      {isAuthenticated && user ? (
        <Link href="/profile" aria-label={t('Hồ sơ của tôi', 'My profile')} className="rounded-full ring-2 ring-transparent hover:ring-neutral-900 transition-shadow">
          <Avatar name={user.fullName} url={user.avatarUrl} size="lg" />
        </Link>
      ) : (
        <Link href="/auth" className="btn btn-outline hidden md:inline-flex">
          {t('Đăng nhập', 'Sign in')}
        </Link>
      )}
    </div>
  );
}
