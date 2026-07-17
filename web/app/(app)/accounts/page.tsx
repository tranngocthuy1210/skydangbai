'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { IS_DEMO, api } from '@/lib/api';
import { PLATFORM_LABEL, formatNumber } from '@/lib/format';
import { Icon, PLATFORM_ICON, type LucideIcon } from '@/lib/icons';
import type { SocialAccount, Target } from '@/lib/types';

const ACCOUNT_STATUS: Record<
  string,
  { icon: LucideIcon; label: string; className: string }
> = {
  active: {
    icon: Icon.Success,
    label: 'Hoạt động',
    className: 'bg-green-50 text-green-700',
  },
  needs_reauth: {
    icon: Icon.Warning,
    label: 'Cần kết nối lại',
    className: 'bg-amber-50 text-amber-700',
  },
  revoked: {
    icon: Icon.Skipped,
    label: 'Đã thu hồi',
    className: 'bg-red-50 text-red-700',
  },
  expired: {
    icon: Icon.Processing,
    label: 'Hết hạn',
    className: 'bg-red-50 text-red-700',
  },
};

function AccountsInner() {
  const params = useSearchParams();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    Promise.all([api.getAccounts(), api.getTargets()])
      .then(([a, t]) => {
        setAccounts(a);
        setTargets(t);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Lỗi không xác định'));
  }, []);

  // Facebook đẩy người dùng về đây kèm ?fb=... — dịch thành thông báo dễ hiểu.
  const fb = params.get('fb');
  const fbBanner =
    fb === 'connected'
      ? { ok: true, msg: `Đã kết nối ${params.get('pages') ?? ''} Page thành công.` }
      : fb === 'cancelled'
        ? { ok: false, msg: 'Bạn đã hủy kết nối Facebook.' }
        : fb === 'error'
          ? { ok: false, msg: `Kết nối thất bại: ${params.get('reason') ?? 'lỗi không rõ'}` }
          : null;

  async function connectFacebook() {
    setConnecting(true);
    setError(null);
    try {
      // Backend trả URL đã kèm state ký sẵn — chỉ việc chuyển hướng.
      const { url } = await api.getFacebookConnectUrl();
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không lấy được liên kết Facebook');
      setConnecting(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Tài khoản mạng xã hội</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Hệ thống chỉ đăng qua API chính thức của nền tảng.
          </p>
        </div>
        {!IS_DEMO && (
          <button
            type="button"
            onClick={connectFacebook}
            disabled={connecting}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-[#1877F2] px-4 py-2 text-sm font-medium text-white hover:bg-[#166fe0] disabled:opacity-60"
          >
            <Icon.Facebook className="h-4 w-4" aria-hidden="true" />
            {connecting ? 'Đang chuyển…' : 'Kết nối Facebook Page'}
          </button>
        )}
      </div>

      {fbBanner && (
        <div
          className={`mt-4 rounded-lg border p-4 text-sm ${
            fbBanner.ok
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}
        >
          {fbBanner.msg}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="mt-5 space-y-4">
        {accounts.map((acc) => {
          const st = ACCOUNT_STATUS[acc.status] ?? {
            icon: Icon.Skipped,
            label: acc.status,
            className: 'bg-slate-100 text-slate-600',
          };
          const StatusGlyph = st.icon;
          const PlatformGlyph = PLATFORM_ICON[acc.platform];
          const accTargets = targets.filter((t) => t.platform === acc.platform);

          return (
            <section
              key={acc.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white"
            >
              <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <div className="flex items-center gap-3">
                  <PlatformGlyph className="h-5 w-5 text-slate-500" aria-hidden="true" />
                  <div>
                    <p className="font-medium text-slate-900">
                      {acc.display_name ?? '(chưa đặt tên)'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {PLATFORM_LABEL[acc.platform]}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${st.className}`}
                  >
                    <StatusGlyph className="h-3.5 w-3.5" aria-hidden="true" />
                    {st.label}
                  </span>
                  {acc.status !== 'active' && (
                    <button
                      type="button"
                      className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
                    >
                      Kết nối lại
                    </button>
                  )}
                </div>
              </header>

              <ul className="divide-y divide-slate-100">
                {accTargets.map((t) => (
                  <li key={t.id} className="flex items-start gap-3 px-5 py-3">
                    {t.is_publishable ? (
                      <Icon.Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-green-600"
                        aria-hidden="true"
                      />
                    ) : (
                      <Icon.Locked
                        className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                        aria-hidden="true"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm ${
                          t.is_publishable ? 'text-slate-900' : 'text-slate-400'
                        }`}
                      >
                        {t.name}
                        <span className="ml-2 text-xs uppercase text-slate-400">
                          {t.target_type}
                        </span>
                        {t.member_count != null && (
                          <span className="ml-2 text-xs text-slate-400">
                            {formatNumber(t.member_count)} thành viên
                          </span>
                        )}
                      </p>
                      {/* Group KHÔNG bị ẩn — hiện, khóa, kèm lý do.
                          Ẩn đi thì user tưởng hệ thống lỗi và mở ticket.
                          Hiện-kèm-lý-do biến khiếm khuyết thành sự minh bạch. */}
                      {!t.is_publishable && t.publish_note && (
                        <p className="mt-0.5 text-xs text-slate-500">{t.publish_note}</p>
                      )}
                    </div>
                  </li>
                ))}
                {accTargets.length === 0 && (
                  <li className="px-5 py-4 text-sm text-slate-400">
                    Chưa có Page nào được đồng bộ.
                  </li>
                )}
              </ul>
            </section>
          );
        })}

        {accounts.length === 0 && !error && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Icon.Accounts
              className="mx-auto h-8 w-8 text-slate-300"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <h3 className="mt-3 font-medium text-slate-900">Chưa kết nối tài khoản nào</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              Bấm “Kết nối Facebook Page” ở trên để bắt đầu đăng bài tự động.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AccountsPage() {
  // useSearchParams đòi Suspense ở App Router.
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Đang tải…</div>}>
      <AccountsInner />
    </Suspense>
  );
}
