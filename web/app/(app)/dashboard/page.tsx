'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { daysAgoIso, formatNumber } from '@/lib/format';
import { Icon } from '@/lib/icons';
import type { Campaign, LogSummary } from '@/lib/types';

export default function DashboardPage() {
  const [summary, setSummary] = useState<LogSummary | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getLogSummary(daysAgoIso(7)), api.getCampaigns()])
      .then(([s, c]) => {
        setSummary(s);
        setCampaigns(c);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Lỗi không xác định'));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Tổng quan</h1>
      <p className="mt-0.5 text-sm text-slate-500">Hoạt động 7 ngày gần nhất.</p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">Không kết nối được backend</p>
          <p className="mt-0.5">{error}</p>
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Đã đăng', value: summary?.success, icon: Icon.Success, color: 'text-green-700' },
          { label: 'Thất bại', value: summary?.failed, icon: Icon.Failed, color: 'text-red-700' },
          {
            label: 'Chiến dịch',
            value: campaigns.length,
            icon: Icon.Campaigns,
            color: 'text-slate-900',
          },
          {
            label: 'Tỷ lệ thành công',
            value: summary ? `${summary.success_rate}%` : undefined,
            icon: Icon.Rate,
            color: 'text-slate-900',
          },
        ].map((c) => {
          const Glyph = c.icon;
          return (
            <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4">
              <div
                className={`flex items-center gap-2 text-2xl font-semibold tabular-nums ${c.color}`}
              >
                <Glyph className="h-5 w-5 shrink-0" aria-hidden="true" />
                {typeof c.value === 'number' ? formatNumber(c.value) : (c.value ?? '—')}
              </div>
              <div className="mt-1 text-sm text-slate-500">{c.label}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex gap-3">
        <Link
          href="/campaigns/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Icon.Plus className="h-4 w-4" aria-hidden="true" />
          Tạo bài
        </Link>
        <Link
          href="/logs"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Xem nhật ký
        </Link>
      </div>
    </div>
  );
}
