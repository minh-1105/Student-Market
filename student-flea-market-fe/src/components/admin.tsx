'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';

/** Stitch-style data table: white island, hairline rows, label-sm headers. */
export function DataTable({ head, children, empty }: { head: string[]; children: ReactNode; empty?: boolean }) {
  const t = useT();
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200">
            {head.map((h) => (
              <th key={h} scope="col" className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-[0.06em] text-neutral-500 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">{children}</tbody>
      </table>
      {empty && <p className="py-12 text-center text-sm text-neutral-500">{t('Không có dữ liệu.', 'No data.')}</p>}
    </div>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3 align-middle text-neutral-800', className)}>{children}</td>;
}

export function FilterTabs<T extends string | number | undefined>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div role="group" className="inline-flex p-1 rounded-full bg-neutral-200/70 mb-6 overflow-x-auto max-w-full">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            'px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer',
            value === o.value ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function StatCard({ label, value, hint, dark }: { label: string; value: ReactNode; hint?: string; dark?: boolean }) {
  return (
    <div className={cn('p-5 rounded-2xl border shadow-sm', dark ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white/70 border-white')}>
      <p className={cn('text-xs font-semibold', dark ? 'text-neutral-300' : 'text-neutral-600')}>{label}</p>
      <p className="font-serif text-3xl font-bold mt-2 tabular">{value}</p>
      {hint && <p className={cn('text-[11px] mt-0.5', dark ? 'text-neutral-400' : 'text-neutral-400')}>{hint}</p>}
    </div>
  );
}
