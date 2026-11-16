import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft } from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import { T } from '@/components/T';
import { getAllPolicySlugs, getPolicyBySlug } from '@/lib/policies';

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPolicySlugs().map((slug) => ({ slug }));
}

const titleOf = (content: string, slug: string) => content.split('\n').find((l) => l.startsWith('# '))?.slice(2).trim() ?? slug;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = getPolicyBySlug(slug);
  return { title: p ? `${titleOf(p.content, slug)} – FLea` : 'Không tìm thấy – FLea' };
}

export default async function PolicyPage({ params }: Props) {
  const { slug } = await params;
  const policy = getPolicyBySlug(slug);
  if (!policy) notFound();

  return (
    <AppShell>
      <Link href="/policies" className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 mb-6">
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> <T vi="Tất cả chính sách" en="All policies" />
      </Link>
      <article className="card p-6 sm:p-10 max-w-3xl">
        <ReactMarkdown
          components={{
            h1: ({ children }) => <h1 className="font-serif text-3xl sm:text-4xl font-bold text-neutral-900 mb-2">{children}</h1>,
            h2: ({ children }) => <h2 className="font-serif text-2xl font-bold text-neutral-900 mt-10 mb-3">{children}</h2>,
            h3: ({ children }) => <h3 className="text-base font-bold text-neutral-900 mt-6 mb-2">{children}</h3>,
            p: ({ children }) => <p className="text-sm text-neutral-700 leading-relaxed mb-4">{children}</p>,
            ul: ({ children }) => <ul className="list-disc pl-5 space-y-2 mb-4 text-sm text-neutral-700 leading-relaxed">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-5 space-y-2 mb-4 text-sm text-neutral-700 leading-relaxed">{children}</ol>,
            strong: ({ children }) => <strong className="font-semibold text-neutral-900">{children}</strong>,
            a: ({ href, children }) => (
              <a href={href} className="underline font-medium text-neutral-900">
                {children}
              </a>
            ),
            hr: () => <hr className="my-8 border-neutral-200" />,
          }}
        >
          {policy.content}
        </ReactMarkdown>
      </article>
    </AppShell>
  );
}
