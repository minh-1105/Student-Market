'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PageHeader, Loading, Notice } from '@/components/ui';
import { StatCard } from '@/components/admin';
import { adminApi, apiError, type ModerationDashboard } from '@/lib/api';

import { useT } from '@/lib/i18n';
export default function AdminDashboard() {
  const t = useT();
  const [data, setData] = useState<ModerationDashboard | null>(null);
  const [pendingSellers, setPendingSellers] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.dashboard().then(setData).catch((e) => setError(apiError(e, t('Không tải được số liệu.', 'Could not load stats.'))));
    adminApi
      .sellerRequests({ status: 1, pageSize: 1 })
      .then((r) => setPendingSellers(r.totalCount))
      .catch(() => setPendingSellers(null));
  }, [t]);

  return (
    <>
      <PageHeader title={t('Tổng quan', 'Overview')} subtitle={t('Tình hình kiểm duyệt và vận hành chợ.', 'Moderation and marketplace health.')} />
      {error && <Notice>{error}</Notice>}
      {!data && !error && <Loading />}
      {data && (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
            <StatCard dark label={t('Báo cáo chờ xử lý', 'Pending reports')} value={data.pendingReportCount} hint={t(`${data.reviewingReportCount} đang xem xét`, `${data.reviewingReportCount} in review`)} />
            <StatCard label={t('Yêu cầu bán chờ duyệt', 'Pending seller requests')} value={pendingSellers ?? '—'} />
            <StatCard label={t('Tin bị ẩn', 'Hidden listings')} value={data.hiddenItemCount} />
            <StatCard label={t('Người dùng bị khóa', 'Banned users')} value={data.bannedUserCount} />
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
            <StatCard label={t('Báo cáo đã xử lý', 'Resolved reports')} value={data.resolvedReportCount} />
            <StatCard label={t('Báo cáo bị bác', 'Rejected reports')} value={data.rejectedReportCount} />
            <StatCard label={t('Danh mục hoạt động', 'Active categories')} value={`${data.activeCategoryCount}/${data.totalCategoryCount}`} />
            <StatCard label={t('Đánh giá bị vô hiệu', 'Voided reviews')} value={data.voidedReviewCount} />
          </div>

          <h2 className="text-sm font-bold text-neutral-900 mb-3">{t('Việc cần làm', 'To do')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { href: '/admin/reports', title: t('Xử lý báo cáo vi phạm', 'Handle reports'), desc: t(`${data.pendingReportCount} báo cáo đang chờ`, `${data.pendingReportCount} pending`) },
              { href: '/admin/sellers', title: t('Duyệt người bán', 'Review sellers'), desc: pendingSellers === null ? t('Xem yêu cầu', 'View requests') : t(`${pendingSellers} yêu cầu đang chờ`, `${pendingSellers} pending`) },
              { href: '/admin/categories', title: t('Quản lý danh mục', 'Manage categories'), desc: t('Thêm, bật/tắt danh mục', 'Add or toggle categories') },
            ].map((task) => (
              <Link key={task.href} href={task.href} className="group card p-5 hover:shadow-md transition-shadow flex items-center justify-between gap-3">
                <span>
                  <span className="block text-sm font-bold text-neutral-900">{task.title}</span>
                  <span className="block text-xs text-neutral-500 mt-0.5">{task.desc}</span>
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
