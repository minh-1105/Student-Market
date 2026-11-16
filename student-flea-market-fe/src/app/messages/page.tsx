'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Send, ArrowLeft, MessageSquare } from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import { RequireAuth } from '@/components/RequireAuth';
import { PageHeader, Loading, Notice, EmptyState, Avatar, ItemImage } from '@/components/ui';
import { chatApi, apiError, type Conversation, type ChatMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { formatPrice, formatDateTime, timeAgo } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

function Messages() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const activeId = params.get('c');
  const me = useAuthStore((s) => s.user);

  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const active = conversations?.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    const load = () =>
      chatApi
        .list()
        .then((r) => setConversations(r.items))
        .catch((e) => setError(apiError(e)));
    load();
    const id = window.setInterval(load, 15000);
    return () => window.clearInterval(id);
  }, []);

  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  if (loadedFor !== activeId) {
    setLoadedFor(activeId);
    setMessages(null);
  }

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    const load = () =>
      chatApi
        .messages(activeId)
        .then((r) => !cancelled && setMessages([...r.items].sort((a, b) => a.sentAt.localeCompare(b.sentAt))))
        .catch((e) => !cancelled && setError(apiError(e)));
    load();
    chatApi
      .markRead(activeId)
      .then(() => setConversations((cs) => cs?.map((c) => (c.id === activeId ? { ...c, unreadCount: 0 } : c)) ?? cs))
      .catch(() => undefined);
    const id = window.setInterval(load, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages?.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!activeId || !content) return;
    setSending(true);
    try {
      const m = await chatApi.send(activeId, content);
      setMessages((ms) => [...(ms ?? []), m]);
      setDraft('');
      setConversations((cs) => cs?.map((c) => (c.id === activeId ? { ...c, lastMessage: content, lastMessageAt: m.sentAt } : c)) ?? cs);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSending(false);
    }
  };

  if (!conversations && !error) return <Loading />;

  return (
    <>
      <PageHeader title={t('Tin nhắn', 'Messages')} subtitle={t('Trao đổi với người mua và người bán về từng món đồ.', 'Chat with buyers and sellers about each item.')} />
      {error && <div className="mb-4"><Notice>{error}</Notice></div>}
      {conversations && !conversations.length ? (
        <EmptyState
          icon={<MessageSquare className="w-5 h-5" />}
          title={t('Chưa có cuộc trò chuyện nào', 'No conversations yet')}
          description={t('Mở một tin đăng và bấm “Nhắn tin” để bắt đầu.', 'Open a listing and press “Message” to start.')}
          action={<Link href="/marketplace" className="btn btn-primary">{t('Vào chợ đồ', 'Browse marketplace')}</Link>}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[20rem_1fr] gap-4 flex-1 min-h-[32rem]">
          <ul className={cn('card p-2 overflow-y-auto max-h-[70vh] space-y-1', activeId && 'hidden lg:block')} aria-label={t('Cuộc trò chuyện', 'Conversations')}>
            {conversations?.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => router.replace(`/messages?c=${c.id}`)}
                  aria-current={c.id === activeId ? 'true' : undefined}
                  className={cn('w-full flex items-center gap-3 p-3 rounded-2xl text-left cursor-pointer transition-colors', c.id === activeId ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100')}
                >
                  <Avatar name={c.otherParty.fullName} url={c.otherParty.avatarUrl} />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold truncate">{c.otherParty.fullName}</span>
                      {c.lastMessageAt && <span className={cn('text-[10px] shrink-0', c.id === activeId ? 'text-neutral-300' : 'text-neutral-400')}>{timeAgo(c.lastMessageAt)}</span>}
                    </span>
                    <span className={cn('block text-xs truncate', c.id === activeId ? 'text-neutral-300' : 'text-neutral-500')}>{c.item.title}</span>
                    <span className={cn('block text-xs truncate', c.id === activeId ? 'text-neutral-200' : 'text-neutral-600')}>{c.lastMessage || t('Chưa có tin nhắn', 'No messages yet')}</span>
                  </span>
                  {c.unreadCount > 0 && c.id !== activeId && <span className="px-2 py-0.5 rounded-full bg-neutral-900 text-white text-[10px] font-bold tabular">{c.unreadCount}</span>}
                </button>
              </li>
            ))}
          </ul>

          <section className={cn('card flex flex-col min-h-[32rem] max-h-[70vh]', !activeId && 'hidden lg:flex')}>
            {!active ? (
              <div className="flex-1 flex items-center justify-center text-sm text-neutral-500 p-8 text-center">{t('Chọn một cuộc trò chuyện.', 'Pick a conversation.')}</div>
            ) : (
              <>
                <header className="flex items-center gap-3 p-4 border-b border-neutral-100">
                  <button type="button" onClick={() => router.replace('/messages')} className="lg:hidden p-2 rounded-full hover:bg-neutral-100 cursor-pointer" aria-label={t('Quay lại', 'Back')}>
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <ItemImage src={active.item.primaryImageUrl} alt={active.item.title} className="w-11 h-11 rounded-xl shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">{active.item.title}</p>
                    <p className="text-xs text-neutral-500 truncate">
                      {formatPrice(active.item.price)} · {active.viewerIsBuyer ? t('Người bán', 'Seller') : t('Người mua', 'Buyer')}: {active.otherParty.fullName}
                    </p>
                  </div>
                  {active.isItemUnavailable && <span className="chip">{t('Tin không còn bán', 'No longer available')}</span>}
                </header>
                <div className="flex-1 overflow-y-auto p-4 space-y-2" aria-live="polite">
                  {!messages && <Loading />}
                  {messages?.map((m) => {
                    const mine = m.senderId === me?.id;
                    return (
                      <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                        <div className={cn('max-w-[75%] px-4 py-2.5 rounded-2xl text-sm', mine ? 'bg-neutral-900 text-white rounded-br-md' : 'bg-neutral-100 text-neutral-900 rounded-bl-md')}>
                          <p className="whitespace-pre-line break-words">{m.isDeleted ? t('Tin nhắn đã bị xóa', 'Message deleted') : m.content}</p>
                          <p className={cn('text-[10px] mt-1', mine ? 'text-neutral-400' : 'text-neutral-500')}>{formatDateTime(m.sentAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
                <form onSubmit={send} className="flex gap-2 p-3 border-t border-neutral-100">
                  <label htmlFor="message" className="sr-only">{t('Tin nhắn', 'Message')}</label>
                  <input id="message" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2000} placeholder={t('Nhập tin nhắn...', 'Type a message...')} className="field !rounded-full" autoComplete="off" />
                  <button type="submit" disabled={sending || !draft.trim()} className="btn btn-primary !px-4" aria-label={t('Gửi', 'Send')}>
                    <Send className="w-4 h-4" aria-hidden="true" />
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}

export default function MessagesPage() {
  return (
    <AppShell>
      <RequireAuth>
        <Suspense fallback={<Loading />}>
          <Messages />
        </Suspense>
      </RequireAuth>
    </AppShell>
  );
}
