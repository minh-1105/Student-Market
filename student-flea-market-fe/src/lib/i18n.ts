'use client';

import { useCallback } from 'react';
import { create } from 'zustand';

export type Lang = 'vi' | 'en';
const KEY = 'sfm_lang';

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Read the saved language after hydration (static export renders Vietnamese first). */
  hydrate: () => void;
}

export const useLang = create<LangState>((set) => ({
  lang: 'vi',
  setLang: (lang) => {
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      /* storage unavailable: keep in memory only */
    }
    document.documentElement.lang = lang;
    set({ lang });
  },
  hydrate: () => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'vi' || saved === 'en') {
        document.documentElement.lang = saved;
        set({ lang: saved });
      }
    } catch {
      /* ignore */
    }
  },
}));

/** `t('Tiếng Việt', 'English')` — strings live next to the UI that uses them. */
export function useT() {
  const lang = useLang((s) => s.lang);
  return useCallback((vi: string, en: string) => (lang === 'en' ? en : vi), [lang]);
}

/** Non-hook variant for helpers (error messages, formatters). */
export const tr = (vi: string, en: string) => (useLang.getState().lang === 'en' ? en : vi);
