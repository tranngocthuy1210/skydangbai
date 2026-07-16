'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Icon } from '@/lib/icons';

// Banner cảnh báo tài khoản chết token.
// Quy tắc: CHỈ hiện khi có vấn đề. Banner "mọi thứ đều ổn" là nhiễu, và nhiễu
// lâu ngày khiến người ta ngừng đọc mọi banner — kể cả cái quan trọng.
export function AccountAlertBanner() {
  const [broken, setBroken] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    api
      .getAccounts()
      .then((accs) => {
        if (cancelled) return;
        setBroken(
          accs
            .filter((a) => a.status !== 'active')
            .map((a) => a.display_name ?? a.platform),
        );
      })
      .catch(() => {
        /* API chưa chạy — im lặng, trang vẫn dùng được. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (broken.length === 0) return null;

  return (
    <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <Icon.Warning
        className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
        aria-hidden="true"
      />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-900">
          {broken.length} tài khoản cần kết nối lại
        </p>
        <p className="mt-0.5 text-sm text-amber-800">
          {broken.join(', ')} — các bài sắp đăng qua những tài khoản này sẽ thất bại.
        </p>
      </div>
      <Link
        href="/accounts"
        className="shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
      >
        Sửa ngay →
      </Link>
    </div>
  );
}
