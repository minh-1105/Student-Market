'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { PageHeader, Loading, Notice, Pagination, Modal, Avatar, Spinner } from '@/components/ui';
import { DataTable, Td, FilterTabs } from '@/components/admin';
import { adminApi, apiError, type AdminUser, type PagedResult } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

import { useT } from '@/lib/i18n';
export default function AdminUsersPage() {
  const t = useT();
  const me = useAuthStore((s) => s.user);
  const [status, setStatus] = useState<number | undefined>(undefined);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PagedResult<AdminUser> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminApi
      .users({ status, keyword: keyword || undefined, page, pageSize: 15 })
      .then((r) => {
        setResult(r);
        setError(null);
      })
      .catch((e) => setError(apiError(e, t('Không tải được người dùng.', 'Could not load users.'))));
  }, [status, keyword, page, reload, t]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      setReload((r) => r + 1);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title={t('Người dùng', 'Users')} subtitle={t('Tìm kiếm, khóa và mở khóa tài khoản.', 'Search, ban and unban accounts.')} />
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        <FilterTabs
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={[
            { value: undefined, label: t('Tất cả', 'All') },
            { value: 1, label: t('Hoạt động', 'Active') },
            { value: 3, label: t('Bị khóa', 'Banned') },
          ]}
        />
        <form
          role="search"
          className="relative md:ml-auto md:w-80 mb-6"
          onSubmit={(e) => {
            e.preventDefault();
            setKeyword(keywordInput.trim());
            setPage(1);
          }}
        >
          <label htmlFor="user-search" className="sr-only">{t('Tìm người dùng', 'Search users')}</label>
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
          <input id="user-search" type="search" value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} placeholder={t('Tên, email, tên đăng nhập...', 'Name, email, username...')} className="field !rounded-full pl-10 !py-2" />
        </form>
      </div>

      {error && <div className="mb-4"><Notice>{error}</Notice></div>}
      {!result && !error && <Loading />}
      {result && (
        <>
          <DataTable head={[t('Người dùng', 'User'), t('Vai trò', 'Role'), t('Quyền bán', 'Seller'), t('Trạng thái', 'Status'), t('Tin', 'Listings'), t('Tham gia', 'Joined'), '']} empty={!result.items.length}>
            {result.items.map((u) => (
              <tr key={u.id}>
                <Td>
                  <div className="flex items-center gap-3 min-w-[14rem]">
                    <Avatar name={u.fullName} size="sm" />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{u.fullName}</p>
                      <p className="text-xs text-neutral-500 truncate">{u.email}</p>
                    </div>
                  </div>
                </Td>
                <Td><span className={cn('chip', u.isStaff && 'chip-dark')}>{u.roleName}</span></Td>
                <Td className="text-xs">{u.sellerStatusName}</Td>
                <Td>
                  <span className={cn('chip', u.isBanned && '!bg-[#ffdad6] !text-[#93000a]')}>{u.statusName}</span>
                </Td>
                <Td className="tabular">{u.itemCount}</Td>
                <Td className="text-xs text-neutral-500 whitespace-nowrap">{formatDate(u.createdAt)}</Td>
                <Td className="text-right">
                  {u.id !== me?.id && !u.isAdmin &&
                    (u.isBanned ? (
                      <button type="button" disabled={busy} onClick={() => act(() => adminApi.unban(u.id))} className="btn btn-outline btn-sm">{t('Mở khóa', 'Unban')}</button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setBanTarget(u);
                          setBanReason('');
                        }}
                        className="btn btn-danger btn-sm"
                      >
                        {t('Khóa', 'Ban')}
                      </button>
                    ))}
                </Td>
              </tr>
            ))}
          </DataTable>
          <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />
        </>
      )}

      <Modal open={!!banTarget} onClose={() => setBanTarget(null)} title={t(`Khóa ${banTarget?.fullName ?? ''}?`, `Ban ${banTarget?.fullName ?? ''}?`)}>
        <p className="text-sm text-neutral-600 mb-4">{t('Người dùng sẽ không đăng nhập được cho tới khi được mở khóa.', 'The user cannot sign in until unbanned.')}</p>
        <label htmlFor="ban-reason" className="label">{t('Lý do', 'Reason')}</label>
        <textarea id="ban-reason" rows={3} value={banReason} onChange={(e) => setBanReason(e.target.value)} className="field resize-none" />
        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={() => setBanTarget(null)} className="btn btn-secondary">{t('Hủy', 'Cancel')}</button>
          <button
            type="button"
            disabled={busy}
            onClick={() => banTarget && act(() => adminApi.ban(banTarget.id, banReason.trim())).then(() => setBanTarget(null))}
            className="btn btn-primary"
          >
            {busy && <Spinner className="w-4 h-4 border-neutral-500 border-t-white" />} {t('Khóa tài khoản', 'Ban account')}
          </button>
        </div>
      </Modal>
    </>
  );
}
