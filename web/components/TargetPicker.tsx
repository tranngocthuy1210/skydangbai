'use client';

import { PLATFORM_LABEL, formatNumber } from '@/lib/format';
import { Icon, PLATFORM_ICON } from '@/lib/icons';
import type { Platform, Target } from '@/lib/types';

interface Props {
  targets: Target[];
  selected: string[];
  onToggle: (id: string) => void;
}

export function TargetPicker({ targets, selected, onToggle }: Props) {
  const byPlatform = targets.reduce<Record<string, Target[]>>((acc, t) => {
    (acc[t.platform] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {Object.entries(byPlatform).map(([platform, list]) => {
        const selectable = list.filter((t) => t.is_publishable);
        const allSelected =
          selectable.length > 0 && selectable.every((t) => selected.includes(t.id));
        const PlatformGlyph = PLATFORM_ICON[platform as Platform];

        return (
          <section key={platform}>
            <header className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <PlatformGlyph className="h-4 w-4 text-slate-400" aria-hidden="true" />
                {PLATFORM_LABEL[platform as Platform]}
              </h3>
              {selectable.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    selectable.forEach((t) => {
                      const isOn = selected.includes(t.id);
                      if (allSelected ? isOn : !isOn) onToggle(t.id);
                    })
                  }
                  className="text-xs font-medium text-indigo-600 hover:underline"
                >
                  {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button>
              )}
            </header>

            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {list.map((t) => {
                const checked = selected.includes(t.id);
                // Ba trạng thái thị giác phải phân biệt được NGAY, không cần đọc:
                //   checkbox = chọn được · ổ khóa = khóa, có lý do
                //   tam giác cảnh báo = cần hành động
                // Gộp ổ khóa và cảnh báo làm một là sai: cái đầu user KHÔNG THỂ
                // làm gì, cái sau user sửa được trong 10 giây.
                if (!t.is_publishable) {
                  return (
                    <li key={t.id} className="flex items-start gap-3 px-4 py-3">
                      <Icon.Locked
                        className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-400">
                          {t.name}
                          <span className="ml-2 text-xs uppercase">{t.target_type}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {t.publish_note ?? 'Không đăng được qua API chính thức.'}
                        </p>
                      </div>
                    </li>
                  );
                }

                return (
                  <li key={t.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggle(t.id)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="flex-1 text-sm text-slate-900">{t.name}</span>
                      <span className="text-xs uppercase text-slate-400">
                        {t.target_type}
                      </span>
                      {t.member_count != null && (
                        <span className="text-xs text-slate-400">
                          {formatNumber(t.member_count)}
                        </span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {targets.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Chưa có mục tiêu nào. Hãy kết nối tài khoản mạng xã hội trước.
        </p>
      )}
    </div>
  );
}
