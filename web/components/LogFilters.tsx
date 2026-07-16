'use client';

import { PLATFORM_LABEL } from '@/lib/format';
import type { Platform } from '@/lib/types';

export interface Filters {
  status?: string;
  platform?: string;
  range: string; // '1' | '7' | '30' | 'all'
}

interface Props {
  filters: Filters;
  onChange: (next: Partial<Filters>) => void;
  onClear: () => void;
}

const RANGES = [
  { value: '1', label: '24 giờ' },
  { value: '7', label: '7 ngày' },
  { value: '30', label: '30 ngày' },
  { value: 'all', label: 'Tất cả' },
];

// Chữ thuần, không icon: <option> là phần tử do hệ điều hành vẽ, KHÔNG chứa
// được SVG (giới hạn của HTML, không phải của Lucide). Nhãn tự nó đã đủ rõ;
// quy tắc "màu + icon + chữ" vẫn được giữ ở bảng log và huy hiệu trạng thái.
const STATUSES = [
  { value: 'success', label: 'Thành công' },
  { value: 'failed', label: 'Thất bại' },
  { value: 'retrying', label: 'Đang thử lại' },
  { value: 'skipped', label: 'Bỏ qua' },
];

const PLATFORMS: Platform[] = ['facebook', 'linkedin', 'twitter', 'mock'];

const SELECT_CLASS =
  'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

export function LogFilters({ filters, onChange, onClear }: Props) {
  // Chip hiện rõ đang lọc gì. Bộ lọc ẩn trong dropdown là nguồn gốc của tình
  // huống kinh điển: user lọc rồi quên, hôm sau vào thấy trống, tưởng mất data.
  const chips: Array<{ label: string; clear: () => void }> = [];
  if (filters.status) {
    const s = STATUSES.find((x) => x.value === filters.status);
    chips.push({
      label: s?.label ?? filters.status,
      clear: () => onChange({ status: undefined }),
    });
  }
  if (filters.platform) {
    chips.push({
      label: PLATFORM_LABEL[filters.platform as Platform] ?? filters.platform,
      clear: () => onChange({ platform: undefined }),
    });
  }
  if (filters.range !== '7') {
    const r = RANGES.find((x) => x.value === filters.range);
    chips.push({ label: r?.label ?? filters.range, clear: () => onChange({ range: '7' }) });
  }

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Khoảng thời gian"
          value={filters.range}
          onChange={(e) => onChange({ range: e.target.value })}
          className={SELECT_CLASS}
        >
          {RANGES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Nền tảng"
          value={filters.platform ?? ''}
          onChange={(e) => onChange({ platform: e.target.value || undefined })}
          className={SELECT_CLASS}
        >
          <option value="">Mọi nền tảng</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {PLATFORM_LABEL[p]}
            </option>
          ))}
        </select>

        <select
          aria-label="Trạng thái"
          value={filters.status ?? ''}
          onChange={(e) => onChange({ status: e.target.value || undefined })}
          className={SELECT_CLASS}
        >
          <option value="">Mọi trạng thái</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500">Đang lọc:</span>
          {chips.map((c, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 py-1 pl-2.5 pr-1.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20"
            >
              {c.label}
              <button
                type="button"
                onClick={c.clear}
                aria-label={`Bỏ lọc ${c.label}`}
                className="rounded-full px-1 text-indigo-400 hover:bg-indigo-100 hover:text-indigo-700"
              >
                ×
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-slate-500 underline hover:text-slate-700"
          >
            Xóa bộ lọc
          </button>
        </div>
      )}
    </div>
  );
}
