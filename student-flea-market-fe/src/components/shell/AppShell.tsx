'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Sidebar, Wordmark } from './Sidebar';
import { useAuthStore } from '@/lib/auth-store';
import { useLang, useT } from '@/lib/i18n';
import { useMitosis } from '@/components/MitosisTransition';

/**
 * Stitch layout: grey canvas → sidebar island + content island.
 * Below lg the sidebar becomes a drawer opened from a compact header island.
 */
export function AppShell({ children, variant = 'user' }: { children: ReactNode; variant?: 'user' | 'admin' }) {
  const pathname = usePathname();
  const initAuth = useAuthStore((s) => s.initAuth);
  const hydrateLang = useLang((s) => s.hydrate);
  const t = useT();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setDrawerOpen(false);
  }

  const { phase } = useMitosis();

  // Trên desktop nội dung cuộn trong <main> chứ không phải window,
  // nên tự đưa về đầu trang khi chuyển route.
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  useEffect(() => {
    initAuth();
    hydrateLang();
  }, [initAuth, hydrateLang]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  return (
    <div className="app-shell min-h-screen p-3 sm:p-4 lg:p-6 lg:h-screen lg:overflow-hidden" data-mitosis={phase} inert={phase !== 'idle' && phase !== 'reveal'}>
      {/* Desktop (lg+): khung đảo cố định theo viewport, chỉ nội dung bên trong đảo phải cuộn. */}
      <div className="mx-auto w-full flex gap-6 items-stretch lg:h-full">
        <div className="mitosis-sidebar hidden lg:block shrink-0 h-[calc(100vh-3rem)]">
          <Sidebar variant={variant} />
        </div>

        <div className="mitosis-content flex-1 min-w-0 flex flex-col gap-3 min-h-[calc(100vh-1.5rem)] sm:min-h-[calc(100vh-2rem)] lg:min-h-0 lg:h-full">
          <div className="lg:hidden island !rounded-3xl px-5 py-3 flex items-center justify-between">
            <Wordmark admin={variant === 'admin'} />
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label={t('Mở menu', 'Open menu')}
              aria-expanded={drawerOpen}
              className="p-2.5 rounded-full bg-neutral-200/70 hover:bg-neutral-300 text-neutral-900 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
          <main id="main" ref={mainRef} className="island flex-1 p-5 sm:p-8 flex flex-col lg:min-h-0 lg:overflow-y-auto no-scrollbar">
            {children}
          </main>
        </div>
      </div>

      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/40 animate-in fade-in duration-200" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-[85%] max-w-xs h-full p-3 animate-in slide-in-from-left duration-300">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label={t('Đóng menu', 'Close menu')}
              className="absolute top-6 right-6 z-10 p-2 rounded-full bg-white/90 text-neutral-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <Sidebar variant={variant} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
