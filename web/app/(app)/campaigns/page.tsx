'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { Icon } from '@/lib/icons';
import type { Campaign } from '@/lib/types';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getCampaigns()
      .then(setCampaigns)
      .catch((e) => setError(e instanceof Error ? e.message : 'Lỗi không xác định'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Chiến dịch</h1>
        <Link
          href="/campaigns/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Icon.Plus className="h-4 w-4" aria-hidden="true" />
          Tạo bài
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
          Đang tải…
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Icon.Campaigns
            className="mx-auto h-8 w-8 text-slate-300"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <h3 className="mt-3 font-medium text-slate-900">Chưa có chiến dịch nào</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Tạo chiến dịch đầu tiên để bắt đầu đăng bài tự động lên các Page của bạn.
          </p>
          <Link
            href="/campaigns/new"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Icon.Plus className="h-4 w-4" aria-hidden="true" />
            Tạo bài đầu tiên
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Tên</th>
                <th className="px-4 py-3 font-medium">Bài</th>
                <th className="px-4 py-3 font-medium">Kết quả</th>
                <th className="px-4 py-3 font-medium">Tạo lúc</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-900">{c.name}</span>
                    {c.ai_spin_enabled && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs text-indigo-600">
                        <Icon.Ai className="h-3 w-3" aria-hidden="true" />
                        AI
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-600">{c.total_posts}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-3 tabular-nums">
                      <span className="inline-flex items-center gap-1 text-green-700">
                        <Icon.Success className="h-3.5 w-3.5" aria-hidden="true" />
                        {c.success}
                      </span>
                      <span className="inline-flex items-center gap-1 text-red-700">
                        <Icon.Failed className="h-3.5 w-3.5" aria-hidden="true" />
                        {c.failed}
                      </span>
                      {c.skipped > 0 && (
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <Icon.Skipped className="h-3.5 w-3.5" aria-hidden="true" />
                          {c.skipped}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-500">
                    {formatDateTime(c.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
