'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';

type Phase = 'idle' | 'shrink' | 'pulse' | 'stretch' | 'arriving' | 'reveal';
const MitosisContext = createContext<{ phase: Phase; divideInto: (href: string) => void }>({
  phase: 'idle',
  divideInto: () => undefined,
});

export const useMitosis = () => useContext(MitosisContext);

/** Keep the nucleus mounted across navigation so the two destination islands can emerge together. */
export function MitosisTransition({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>('idle');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const origin = useRef<string | null>(null);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const divideInto = useCallback((href: string) => {
    if (origin.current !== null) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      router.replace(href);
      return;
    }
    origin.current = pathname;
    router.prefetch(href);
    setPhase('shrink');
    timers.current.push(
      setTimeout(() => setPhase('pulse'), 350),
      setTimeout(() => setPhase('stretch'), 800),
      setTimeout(() => {
        setPhase('arriving');
        router.replace(href);
      }, 1450),
    );
  }, [pathname, router]);

  useEffect(() => {
    if (origin.current === null || pathname === origin.current) return;
    clearTimers();
    // The overlay covers the first destination paint; reveal only after the route has committed.
    const reveal = () => setPhase('reveal');
    reveal();
    timers.current.push(setTimeout(() => {
      setPhase('idle');
      origin.current = null;
    }, 700));
  }, [pathname, clearTimers]);

  return (
    <MitosisContext.Provider value={{ phase, divideInto }}>
      {children}
      {phase !== 'idle' && phase !== 'shrink' && (
        <div className="mitosis-stage auth-canvas" data-phase={phase} aria-hidden="true">
          <div className="mitosis-nucleus">
            <div className="mitosis-membrane shadow-clay-deep">
              <span className="mitosis-furrow" />
              <span className="font-display text-xl font-bold text-neutral-800 select-none">F<span className="italic">L</span>ea</span>
            </div>
          </div>
        </div>
      )}
    </MitosisContext.Provider>
  );
}
