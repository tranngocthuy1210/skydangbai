'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SummaryCards } from '@/components/SummaryCards';
import { LogFilters, type Filters } from '@/components/LogFilters';
import { LogsTable } from '@/components/LogsTable';
import { api } from '@/lib/api';
import { daysAgoIso } from '@/lib/format';
import type { LogSummary, PostLog } from '@/lib/types';

const POLL_MS = 10_000;

function LogsPageInner() {
  const router = useRouter();
  const params = useSearchParams();

  // Bộ lọc sống trong URL → gửi link cho đồng nghiệp được, F5 không mất.
  const filters: Filters = {
    status: params.get('status') ?? undefined,
    platform: params.get('platform') ?? undefined,
    range: params.get('range') ?? '7',
  };

  const [logs, setLogs] = useState<PostLog[]>([]);
  const [summary, setSummary] = useState<LogSummary | null>(null);
  const [pending, setPending] = useState<{ rows: PostLog[]; count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialised = useRef(false);

  // Đọc logs hiện tại trong lúc poll mà không đưa `logs` vào deps của
  // fetchData (sẽ tạo vòng lặp fetch vô tận).
  const logsRef = useRef<PostLog[]>([]);
  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  const setFilters = useCallback(
    (next: Partial<Filters>) => {
      const merged = { ...filters, ...next };
      const sp = new URLSearchParams();
      if (merged.status) sp.set('status', merged.status);
      if (merged.platform) sp.set('platform', merged.platform);
      if (merged.range !== '7') sp.set('range', merged.range);
      router.replace(`/logs${sp.toString() ? `?${sp}` : ''}`);
    },
    [filters, router],
  );

  const fetchData = useCallback(
    async (isPoll: boolean) => {
      const from = filters.range === 'all' ? undefined : daysAgoIso(Number(filters.range));
      try {
        const [rows, sum] = await Promise.all([
          api.getLogs({
            status: filters.status,
            platform: filters.platform,
            from,
            limit: 100,
          }),
          api.getLogSummary(from),
        ]);
        setSummary(sum);
        setError(null);

        if (isPoll) {
          // KHÔNG tự chèn dòng mới lên đầu khi user đang đọc — đẩy nội dung
          // xuống giữa chừng là trải nghiệm tệ. Gom lại, để user tự bấm.
          const current = logsRef.current;
          const newestSeen = current[0]?.created_at;
          const fresh = newestSeen
            ? rows.filter((r) => r.created_at > newestSeen)
            : [];
          if (current.length > 0 && fresh.length > 0) {
            setPending({ rows, count: fresh.length });
          } else {
            // Không có dòng mới → cập nhật tại chỗ (retrying → success).
            setLogs(rows);
          }
        } else {
          setLogs(rows);
          setPending(null);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Lỗi không xác định');
      } finally {
        setLoading(false);
      }
    },
    [filters.status, filters.platform, filters.range],
  );

  // Mặc định thông minh: người ta vào trang này vì NGHI CÓ CHUYỆN.
  // Nếu có lỗi trong 24h qua mà user chưa lọc gì → tự lọc sẵn về lỗi.
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    if (params.toString() !== '') return;
    api
      .getLogSummary(daysAgoIso(1))
      .then((s) => {
        if (s.failed > 0) router.replace('/logs?status=failed');
      })
      .catch(() => {});
  }, [params, router]);

  useEffect(() => {
    setLoading(true);
    fetchData(false);
  }, [fetchData]);

  useEffect(() => {
    const t = setInterval(() => fetchData(true), POLL_MS);
    return () => clearInterval(t);
  }, [fetchData]);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Nhật ký đăng bài</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Theo dõi từng lần thử đăng, lý do lỗi và cách khắc phục.
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
          Tự động cập nhật
        </span>
      </div>

      <SummaryCards
        summary={summary}
        activeStatus={filters.status}
        onFilter={(status) => setFilters({ status })}
      />

      <LogFilters
        filters={filters}
        onChange={setFilters}
        onClear={() => router.replace('/logs')}
      />

      {pending && (
        <div className="mb-3 flex justify-center">
          <button
            type="button"
            onClick={() => {
              setLogs(pending.rows);
              setPending(null);
            }}
            className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-medium text-white shadow-lg hover:bg-slate-700"
          >
            ↑ {pending.count} bản ghi mới
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">Không tải được nhật ký</p>
          <p className="mt-0.5">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
          Đang tải…
        </div>
      ) : (
        <LogsTable logs={logs} />
      )}
    </div>
  );
}

export default function LogsPage() {
  // useSearchParams bắt buộc phải nằm trong Suspense ở App Router.
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Đang tải…</div>}>
      <LogsPageInner />
    </Suspense>
  );
}
