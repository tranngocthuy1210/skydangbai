import { Icon, type LucideIcon } from '@/lib/icons';
import type { LogStatus, PostStatus } from '@/lib/types';

// Mỗi trạng thái = MÀU + ICON + CHỮ. Không bao giờ chỉ dùng màu.
// ~8% nam giới mù màu đỏ-lục — đúng cặp success/failed. Chỉ dựa vào màu là
// loại 1/12 người dùng nam khỏi tính năng quan trọng nhất của sản phẩm.
const STYLES: Record<string, { icon: LucideIcon; label: string; className: string }> = {
  success: {
    icon: Icon.Success,
    label: 'Thành công',
    className: 'bg-green-50 text-green-700 ring-green-600/20',
  },
  failed: {
    icon: Icon.Failed,
    label: 'Thất bại',
    className: 'bg-red-50 text-red-700 ring-red-600/20',
  },
  retrying: {
    icon: Icon.Retrying,
    label: 'Đang thử lại',
    className: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  },
  skipped: {
    // Xám, trung tính: bỏ qua KHÔNG phải lỗi của ai cả.
    icon: Icon.Skipped,
    label: 'Bỏ qua',
    className: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  },
  processing: {
    icon: Icon.Processing,
    label: 'Đang xử lý',
    className: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  },
  scheduled: {
    icon: Icon.Scheduled,
    label: 'Đã hẹn giờ',
    className: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  },
  queued: {
    icon: Icon.Queued,
    label: 'Trong hàng đợi',
    className: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  },
  cancelled: {
    icon: Icon.Cancelled,
    label: 'Đã hủy',
    className: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  },
};

export function StatusBadge({ status }: { status: LogStatus | PostStatus }) {
  const s = STYLES[status];
  if (!s) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/20">
        {status}
      </span>
    );
  }
  const Glyph = s.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${s.className}`}
    >
      {/* aria-hidden: nhãn chữ ngay bên cạnh đã nói đủ cho trình đọc màn hình. */}
      <Glyph className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
      {s.label}
    </span>
  );
}
