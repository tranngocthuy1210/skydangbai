'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Icon } from '@/lib/icons';

const NAV = [
  { href: '/dashboard', label: 'Tổng quan', icon: Icon.Dashboard },
  { href: '/campaigns', label: 'Chiến dịch', icon: Icon.Campaigns },
  { href: '/logs', label: 'Nhật ký', icon: Icon.Logs },
  { href: '/accounts', label: 'Tài khoản', icon: Icon.Accounts },
];

export function Sidebar() {
  const pathname = usePathname();
  const [needsReauth, setNeedsReauth] = useState(0);

  // Badge đỏ trên "Tài khoản" khi có tài khoản cần kết nối lại.
  // Token hết hạn là nguyên nhân số 1 khiến chiến dịch chết hàng loạt, và nó
  // xảy ra âm thầm — badge này là chi phí gần bằng 0 cho một cảnh báo sớm.
  useEffect(() => {
    let cancelled = false;
    api
      .getAccounts()
      .then((accs) => {
        if (!cancelled) {
          setNeedsReauth(accs.filter((a) => a.status !== 'active').length);
        }
      })
      .catch(() => {
        // API chưa chạy — sidebar vẫn phải render được, không làm sập app.
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4">
        <Icon.Brand className="h-5 w-5 text-indigo-600" aria-hidden="true" />
        <span className="font-semibold">AutoPost</span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          const badge = item.href === '/accounts' ? needsReauth : 0;
          const Glyph = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? 'bg-slate-100 font-medium text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Glyph
                className={`h-4 w-4 ${active ? 'text-slate-900' : 'text-slate-400'}`}
                aria-hidden="true"
              />
              <span className="flex-1">{item.label}</span>
              {badge > 0 && (
                <span
                  className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700"
                  title={`${badge} tài khoản cần kết nối lại`}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Nút màu nhấn DUY NHẤT trên toàn màn hình. Nếu mọi thứ đều nổi bật
          thì không gì nổi bật cả. */}
      <div className="border-t border-slate-200 p-3">
        <Link
          href="/campaigns/new"
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <Icon.Plus className="h-4 w-4" aria-hidden="true" />
          Tạo bài
        </Link>
      </div>
    </aside>
  );
}
