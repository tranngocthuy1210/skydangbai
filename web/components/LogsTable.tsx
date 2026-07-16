'use client';

import Link from 'next/link';
import { StatusBadge } from './StatusBadge';
import { explainError } from '@/lib/errors';
import { PLATFORM_LABEL, formatTime } from '@/lib/format';
import { Icon, PLATFORM_ICON } from '@/lib/icons';
import type { PostLog } from '@/lib/types';

export function LogsTable({ logs }: { logs: PostLog[] }) {
  if (logs.length === 0) {
    // Trang trống phải DẠY VIỆC, không phải xin lỗi.
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <Icon.Empty
          className="mx-auto h-8 w-8 text-slate-300"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <h3 className="mt-3 font-medium text-slate-900">Chưa có bài nào được đăng</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
          Nhật ký sẽ tự động hiện ở đây sau khi chiến dịch đầu tiên của bạn chạy.
        </p>
        <Link
          href="/campaigns/new"
          className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Tạo bài đầu tiên
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3 font-medium">Trạng thái</th>
            <th className="px-4 py-3 font-medium">Nền tảng</th>
            <th className="px-4 py-3 font-medium">Lần thử</th>
            <th className="px-4 py-3 font-medium">Thời gian</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const isProblem = log.status === 'failed' || log.status === 'retrying';
            const explain = isProblem
              ? explainError(log.error_code, log.error_message)
              : log.status === 'skipped'
                ? explainError(log.error_code, log.error_message)
                : null;
            const PlatformGlyph = PLATFORM_ICON[log.platform];

            return (
              <tr
                key={log.id}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
              >
                <td className="px-4 py-3 align-top">
                  <StatusBadge status={log.status} />
                  {/* Dòng giải thích bằng tiếng người + nút khắc phục.
                      Đây là thứ user thực sự cần đọc. */}
                  {explain && (
                    <div className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-600">
                      <Icon.Branch
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400"
                        aria-hidden="true"
                      />
                      <span>
                        {explain.title}
                        {explain.actionLabel && explain.actionHref && (
                          <Link
                            href={explain.actionHref}
                            className="ml-1.5 font-medium text-indigo-600 hover:underline"
                          >
                            {explain.actionLabel} →
                          </Link>
                        )}
                      </span>
                    </div>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 align-top text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <PlatformGlyph className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    {PLATFORM_LABEL[log.platform]}
                  </span>
                </td>
                <td className="px-4 py-3 align-top tabular-nums text-slate-500">
                  {log.attempt_number}
                </td>
                <td className="whitespace-nowrap px-4 py-3 align-top tabular-nums text-slate-500">
                  {formatTime(log.created_at)}
                  {log.duration_ms != null && (
                    <span className="ml-1 text-xs text-slate-400">
                      ({log.duration_ms}ms)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 align-top text-right">
                  <Link
                    href={`/logs/${log.post_id}`}
                    className="whitespace-nowrap text-xs font-medium text-indigo-600 hover:underline"
                  >
                    Chi tiết →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
