'use client';

import { useEffect, useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import { PageHeader, Loading, Notice, Pagination, Modal, Avatar } from '@/components/ui';
import { DataTable, Td } from '@/components/admin';
import { RequireAuth } from '@/components/RequireAuth';
import { adminApi, apiError, type Moderator, type AdminUser, type PagedResult } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { formatDate } from '@/lib/format';

import { useT } from '@/lib/i18n';
function Moderators() {
  const t = useT();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PagedResult<Moderator> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<AdminUser[] | null>(null);

  useEffect(() => {
    adminApi
      .moderators({ page, pageSize: 15 })
      .then((r) => {
        setResult(r);
        setError(null);
      })
      .catch((e) => setError(apiError(e, t('Không tải được danh sách.', 'Could not load the list.'))));
  }, [page, reload, t]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      setReload((r) => r + 1);
      return true;
    } catch (e) {
      setError(apiError(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const searchUsers = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r = await adminApi.users({ keyword: query.trim() || undefined, status: 1, pageSize: 8 });
      setCandidates(r.items.filter((u) => !u.isStaff));
    } catch (err) {
      setError(apiError(err));
    }
  };

  return (
    <>
      <PageHeader
        title={t('Kiểm duyệt viên', 'Moderators')}
        subtitle={t('Kiểm duyệt viên được xử lý báo cáo, duyệt người bán và quản lý danh mục.', 'Moderators handle reports, approve sellers and manage categories.')}
        actions={
          <button
            type="button"
            onClick={() => {
              setPicking(true);
              setCandidates(null);
              setQuery('');
            }}
            className="btn btn-primary"
          >
            <UserPlus className="w-4 h-4" aria-hidden="true" /> {t('Thêm kiểm duyệt viên', 'Add moderator')}
          </button>
        }
      />
      {error && <div className="mb-4"><Notice>{error}</Notice></div>}
      {!result && !error && <Loading />}
      {result && (
        <>
          <DataTable head={[t('Người dùng', 'User'), t('Cấp bởi', 'Granted by'), t('Ngày cấp', 'Granted on'), '']} empty={!result.items.length}>
            {result.items.map((m) => (
              <tr key={m.userId}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar name={m.fullName} size="sm" />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{m.fullName}</p>
                      <p className="text-xs text-neutral-500 truncate">{m.email}</p>
                    </div>
                  </div>
                </Td>
                <Td className="text-xs">{m.grantedByFullName || '—'}</Td>
                <Td className="text-xs text-neutral-500">{formatDate(m.grantedAt)}</Td>
                <Td className="text-right">
                  <button type="button" disabled={busy} onClick={() => act(() => adminApi.revokeModerator(m.userId))} className="btn btn-danger btn-sm">{t('Thu hồi', 'Revoke')}</button>
                </Td>
              </tr>
            ))}
          </DataTable>
          <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />
        </>
      )}

      <Modal open={picking} onClose={() => setPicking(false)} title={t('Thêm kiểm duyệt viên', 'Add moderator')}>
        <form onSubmit={searchUsers} className="relative mb-4" role="search">
          <label htmlFor="mod-search" className="sr-only">{t('Tìm người dùng', 'Search users')}</label>
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
          <input id="mod-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Tên hoặc email, rồi Enter', 'Name or email, then Enter')} className="field !rounded-full pl-10" />
        </form>
        {candidates && !candidates.length && <p className="text-sm text-neutral-500">{t('Không tìm thấy người dùng phù hợp.', 'No matching users.')}</p>}
        <ul className="space-y-2">
          {candidates?.map((u) => (
            <li key={u.id} className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-100">
              <Avatar name={u.fullName} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{u.fullName}</p>
                <p className="text-xs text-neutral-500 truncate">{u.email}</p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  if (await act(() => adminApi.assignModerator(u.id))) setPicking(false);
                }}
                className="btn btn-primary btn-sm"
              >
                {t('Cấp quyền', 'Grant')}
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}

/** Only full Admins may manage moderators (backend: [Authorize(Roles = "Admin")]). */
export default function AdminModeratorsPage() {
  const t = useT();
  const isAdmin = useAuthStore((s) => s.user?.roleName === 'Admin');
  return (
    <RequireAuth staffOnly>
      {isAdmin ? <Moderators /> : <Notice>{t('Chỉ Quản trị viên mới quản lý được kiểm duyệt viên.', 'Only admins can manage moderators.')}</Notice>}
    </RequireAuth>
  );
}
