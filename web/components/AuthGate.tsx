'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IS_DEMO } from '@/lib/api';
import { getToken } from '@/lib/auth-store';

// Chặn hiển thị nội dung app khi chưa đăng nhập — đá thẳng về /login.
//
// Đây là hàng rào phía CLIENT (cho trải nghiệm mượt); hàng rào thật nằm ở
// backend (guard JWT toàn cục). Kể cả ai đó vượt qua lớp này thì API vẫn từ
// chối vì thiếu token. Hai lớp, lớp dưới mới là lớp bảo vệ thật.
//
// Chế độ demo: bỏ qua đăng nhập vì không có backend để xác thực.
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(IS_DEMO);

  useEffect(() => {
    if (IS_DEMO) return;
    if (getToken()) {
      setReady(true);
    } else {
      router.replace('/login');
    }
  }, [router]);

  if (!ready) {
    // Tránh nháy nội dung app trước khi biết đã đăng nhập hay chưa.
    return (
      <div className="flex h-screen items-center justify-center text-sm text-slate-400">
        Đang tải…
      </div>
    );
  }
  return <>{children}</>;
}
