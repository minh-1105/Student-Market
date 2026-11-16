'use client';

import { useT } from '@/lib/i18n';

/** Bilingual text for server components, which cannot call hooks. */
export function T({ vi, en }: { vi: string; en: string }) {
  const t = useT();
  return <>{t(vi, en)}</>;
}
