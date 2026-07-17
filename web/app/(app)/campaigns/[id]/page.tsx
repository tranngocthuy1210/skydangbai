'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import { api } from '@/lib/api';
import { PLATFORM_LABEL, formatDateTime } from '@/lib/format';
import { Icon, PLATFORM_ICON } from '@/lib/icons';
import type { CampaignDetail } from '@/lib/types';

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<CampaignDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getCampaignDetail(params.id)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Lỗi không xác định'));
  }, [params.id]);

  if (error) {
    return (
      <div>
        <Link href="/campaigns" className="text-sm text-indigo-600 hover:underline">
          ← Chiến dịch
        </Link>
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="p-12 text-center text-sm text-slate-400">Đang tải…</div>;
  }

  const { campaign, posts } = data;

  return (
    <div>
      <Link href="/campaigns" className="text-sm text-indigo-600 hover:underline">
        ← Chiến dịch
      </Link>

      <header className="mt-3 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-slate-900">{campaign.name}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Tạo lúc {formatDateTime(campaign.created_at)}
              {campaign.ai_spin_enabled && (
                <span className="ml-2 inline-flex items-center gap-1 text-indigo-600">
                  <Icon.Ai className="h-3 w-3" aria-hidden="true" />
                  AI viết lại
                </span>
              )}
            </p>
          </div>
          <StatusBadge status={campaign.status as never} />
        </div>

        {campaign.content_template && (
          <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            {campaign.content_template}
          </p>
        )}
      </header>

      <h2 className="mb-3 mt-6 text-sm font-medium text-slate-900">
        Bài đăng ({posts.length})
      </h2>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <ul className="divide-y divide-slate-100">
          {posts.map((post) => {
            const PlatformGlyph = PLATFORM_ICON[post.platform];
            return (
              <li key={post.id} className="flex items-start gap-3 px-5 py-4">
                <PlatformGlyph
                  className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">{post.target_name}</span>
                    <span className="text-xs text-slate-400">
                      {PLATFORM_LABEL[post.platform]}
                    </span>
                    <StatusBadge status={post.status} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{post.content}</p>
                  {post.status_reason && (
                    <p className="mt-1 text-xs text-amber-700">{post.status_reason}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                    <span>
                      {post.published_at
                        ? `Đã đăng ${formatDateTime(post.published_at)}`
                        : `Hẹn ${formatDateTime(post.scheduled_at)}`}
                    </span>
                    {post.permalink && (
                      <a
                        href={post.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline"
                      >
                        Xem trên Facebook
                        <Icon.Permalink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    )}
                    <Link
                      href={`/logs/${post.id}`}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      Diễn biến →
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
