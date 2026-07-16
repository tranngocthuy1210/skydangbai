import type { Platform } from './types';

export const PLATFORM_LABEL: Record<Platform, string> = {
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  twitter: 'X',
  instagram: 'Instagram',
  threads: 'Threads',
  tiktok: 'TikTok',
  mock: 'Mock (thử nghiệm)',
};

// PLATFORM_ICON đã chuyển sang lib/icons.ts (nay là component Lucide,
// không còn là ký tự emoji).

/** "20:05" — giờ trong ngày, dùng cho cột thời gian của bảng log. */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "16/07 20:05:03" — đủ chi tiết cho timeline. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) +
    ' ' +
    d.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  );
}

/** ISO của thời điểm N ngày trước — dùng cho bộ lọc khoảng thời gian. */
export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export function formatNumber(n: number): string {
  return n.toLocaleString('vi-VN');
}
