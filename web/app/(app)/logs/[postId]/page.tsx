'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import { api } from '@/lib/api';
import { explainError } from '@/lib/errors';
import { PLATFORM_LABEL, formatDateTime } from '@/lib/format';
import { Icon, PLATFORM_ICON } from '@/lib/icons';
import type { PostDetail } from '@/lib/types';

const DOT: Record<string, string> = {
  success: 'bg-green-500',
  failed: 'bg-red-500',
  retrying: 'bg-amber-500',
  skipped: 'bg-slate-400',
};

export default function PostDetailPage({ params }: { params: { postId: string } }) {
  const [data, setData] = useState<PostDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getPostDetail(params.postId)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Lỗi không xác định'));
  }, [params.postId]);

  if (error) {
    return (
      <div>
        <Link href="/logs" className="text-sm text-indigo-600 hover:underline">
          ← Nhật ký
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

  const { post, timeline } = data;
  const PlatformGlyph = PLATFORM_ICON[post.platform];

  return (
    <div>
      <Link href="/logs" className="text-sm text-indigo-600 hover:underline">
        ← Nhật ký
      </Link>

      <header className="mt-3 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-slate-900">
              {post.content.split('\n')[0]}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
              <PlatformGlyph className="h-4 w-4 text-slate-400" aria-hidden="true" />
              {PLATFORM_LABEL[post.platform]} · {post.target_name} ·{' '}
              <Link href="/campaigns" className="text-indigo-600 hover:underline">
                {post.campaign_name}
              </Link>
            </p>
          </div>
          <StatusBadge status={post.status} />
        </div>

        {post.status_reason && (
          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            {post.status_reason}
          </p>
        )}

        {post.permalink && (
          <a
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline"
          >
            Xem bài đã đăng
            <Icon.Permalink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
      </header>

      <h2 className="mb-3 mt-6 text-sm font-medium text-slate-900">
        Diễn biến ({timeline.length} bản ghi)
      </h2>

      <ol className="relative space-y-0 rounded-xl border border-slate-200 bg-white p-5">
        {timeline.map((ev, i) => {
          const explain =
            ev.status === 'failed' || ev.status === 'retrying' || ev.status === 'skipped'
              ? explainError(ev.error_code, ev.error_message)
              : null;
          const last = i === timeline.length - 1;

          return (
            <li key={ev.id} className="relative flex gap-4 pb-5 last:pb-0">
              {/* Đường nối dọc giữa các mốc */}
              {!last && (
                <span
                  aria-hidden="true"
                  className="absolute left-[5px] top-4 h-full w-px bg-slate-200"
                />
              )}
              <span
                aria-hidden="true"
                className={`relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ${
                  DOT[ev.status] ?? 'bg-slate-300'
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="font-mono text-xs text-slate-400">
                    {formatDateTime(ev.created_at)}
                  </span>
                  <span className="text-slate-900">Lần {ev.attempt_number}</span>
                  <StatusBadge status={ev.status} />
                  {ev.duration_ms != null && (
                    <span className="text-xs text-slate-400">{ev.duration_ms}ms</span>
                  )}
                </div>

                {explain && (
                  <div className="mt-1 text-sm text-slate-600">
                    {explain.title}
                    {explain.actionLabel && explain.actionHref && (
                      <Link
                        href={explain.actionHref}
                        className="ml-2 font-medium text-indigo-600 hover:underline"
                      >
                        {explain.actionLabel} →
                      </Link>
                    )}
                  </div>
                )}

                {/* Chi tiết kỹ thuật: GẬP SẴN. Đây là nơi đội support sống khi
                    khách gửi ticket — nhưng user thường không cần thấy. */}
                {(ev.request_payload != null || ev.response_body != null) && (
                  <details className="mt-2 group">
                    <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-600">
                      Chi tiết kỹ thuật
                      {ev.error_code && (
                        <span className="ml-1.5 font-mono">({ev.error_code})</span>
                      )}
                      {ev.worker_id && (
                        <span className="ml-1.5 font-mono">{ev.worker_id}</span>
                      )}
                    </summary>
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">
                      {JSON.stringify(
                        { request: ev.request_payload, response: ev.response_body },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
