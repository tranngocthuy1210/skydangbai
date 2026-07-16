'use client';

import type { LogSummary } from '@/lib/types';
import { formatNumber } from '@/lib/format';
import { Icon } from '@/lib/icons';

interface Props {
  summary: LogSummary | null;
  activeStatus?: string;
  onFilter: (status: string | undefined) => void;
}

// BỐN thẻ, không phải ba: 'Bỏ qua' tách khỏi 'Thất bại'.
// Gộp lại thì user thấy "49 thất bại" và hoảng, trong khi chỉ 37 cái là vấn đề thật.
export function SummaryCards({ summary, activeStatus, onFilter }: Props) {
  const cards = [
    {
      key: 'success',
      icon: Icon.Success,
      label: 'Thành công',
      value: summary ? formatNumber(summary.success) : '—',
      color: 'text-green-700',
    },
    {
      key: 'failed',
      icon: Icon.Failed,
      label: 'Thất bại',
      value: summary ? formatNumber(summary.failed) : '—',
      color: 'text-red-700',
    },
    {
      key: 'skipped',
      icon: Icon.Skipped,
      label: 'Bỏ qua',
      value: summary ? formatNumber(summary.skipped) : '—',
      color: 'text-slate-600',
    },
  ];

  return (
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => {
        const active = activeStatus === c.key;
        const Glyph = c.icon;
        return (
          // Thẻ tổng PHẢI bấm được: nhìn thấy số đỏ thì phản xạ đầu tiên là
          // muốn bấm vào nó. Thẻ không bấm được là cái bẫy hụt hẫng.
          <button
            key={c.key}
            type="button"
            onClick={() => onFilter(active ? undefined : c.key)}
            aria-pressed={active}
            className={`rounded-xl border bg-white p-4 text-left transition-all hover:border-slate-300 hover:shadow-sm ${
              active
                ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                : 'border-slate-200'
            }`}
          >
            <div
              className={`flex items-center gap-2 text-2xl font-semibold tabular-nums ${c.color}`}
            >
              <Glyph className="h-5 w-5 shrink-0" aria-hidden="true" />
              {c.value}
            </div>
            <div className="mt-1 text-sm text-slate-500">{c.label}</div>
          </button>
        );
      })}

      {/* Tỷ lệ thành công không lọc được → là div, không phải button. */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 text-2xl font-semibold tabular-nums text-slate-900">
          <Icon.Rate className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
          {summary ? `${summary.success_rate}%` : '—'}
        </div>
        <div
          className="mt-1 text-sm text-slate-500"
          title="Chỉ tính kết cục cuối (thành công + thất bại). Bỏ qua và đang thử lại không nằm trong mẫu số."
        >
          Tỷ lệ thành công
        </div>
      </div>
    </div>
  );
}
