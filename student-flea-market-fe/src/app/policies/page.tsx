import Link from 'next/link';
import type { Metadata } from 'next';
import { FileText, ArrowRight } from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import { PageHeader } from '@/components/ui';
import { T } from '@/components/T';
import { getAllPolicySlugs, getPolicyBySlug } from '@/lib/policies';

export const metadata: Metadata = { title: 'Chính sách – FLea' };

function policyTitle(content: string, slug: string) {
  const heading = content.split('\n').find((l) => l.startsWith('# '));
  return heading ? heading.slice(2).trim() : slug;
}

export default function PoliciesPage() {
  const policies = getAllPolicySlugs().map((slug) => {
    const p = getPolicyBySlug(slug)!;
    const updated = p.content.match(/Last Updated:\s*(.+)/i)?.[1]?.trim();
    return { slug, title: policyTitle(p.content, slug), updated };
  });

  return (
    <AppShell>
      <PageHeader title={<T vi="Chính sách" en="Policies" />} subtitle={<T vi="Điều khoản sử dụng, quyền riêng tư và quy trình giải quyết tranh chấp của FLea." en="FLea terms of use, privacy and dispute resolution." />} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {policies.map((p) => (
          <Link key={p.slug} href={`/policies/${p.slug}`} className="group card p-6 hover:shadow-md transition-shadow flex flex-col">
            <span className="w-10 h-10 rounded-full bg-neutral-900 text-white flex items-center justify-center mb-4">
              <FileText className="w-4 h-4" aria-hidden="true" />
            </span>
            <h2 className="font-serif text-xl font-bold text-neutral-900">{p.title}</h2>
            {p.updated && <p className="text-xs text-neutral-500 mt-1"><T vi="Cập nhật:" en="Updated:" /> {p.updated}</p>}
            <span className="mt-auto pt-6 text-sm font-semibold text-neutral-900 inline-flex items-center gap-1">
              <T vi="Đọc" en="Read" /> <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
