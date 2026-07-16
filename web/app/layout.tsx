import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SkyĐăngBài — Đăng bài tự động',
  description: 'Hệ thống SaaS đăng bài tự động lên mạng xã hội',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
