'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authApi } from '@/lib/api';
import { setToken } from '@/lib/auth-store';
import { Icon } from '@/lib/icons';

// Dùng chung cho cả đăng nhập và đăng ký — hai màn hình chỉ khác vài chi tiết.
export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const isRegister = mode === 'register';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = isRegister
        ? await authApi.register(email, password, fullName || undefined)
        : await authApi.login(email, password);
      setToken(res.accessToken);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Icon.Brand className="h-6 w-6 text-indigo-600" aria-hidden="true" />
          <span className="text-lg font-semibold text-slate-900">SkyĐăngBài</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">
            {isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isRegister
              ? 'Đăng ký để bắt đầu đăng bài tự động lên Facebook Page.'
              : 'Đăng nhập để quản lý chiến dịch của bạn.'}
          </p>

          <form onSubmit={submit} className="mt-5 space-y-4">
            {isRegister && (
              <Field label="Họ tên (tùy chọn)">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={INPUT}
                  placeholder="Nguyễn Văn A"
                />
              </Field>
            )}

            <Field label="Email">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT}
                placeholder="ban@email.com"
                autoComplete="email"
              />
            </Field>

            <Field label="Mật khẩu">
              <input
                type="password"
                required
                minLength={isRegister ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={INPUT}
                placeholder={isRegister ? 'Tối thiểu 8 ký tự' : '••••••••'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
              />
            </Field>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting
                ? 'Đang xử lý…'
                : isRegister
                  ? 'Đăng ký'
                  : 'Đăng nhập'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-slate-500">
          {isRegister ? (
            <>
              Đã có tài khoản?{' '}
              <Link href="/login" className="font-medium text-indigo-600 hover:underline">
                Đăng nhập
              </Link>
            </>
          ) : (
            <>
              Chưa có tài khoản?{' '}
              <Link href="/register" className="font-medium text-indigo-600 hover:underline">
                Đăng ký
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

const INPUT =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
