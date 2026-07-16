// ============================================================
// ĐIỂM NHẬP DUY NHẤT cho toàn bộ icon Lucide của app.
//
// Vì sao gom về một file thay vì import trực tiếp ở từng component:
// Lucide đổi tên icon giữa các phiên bản (AlertTriangle → TriangleAlert,
// CheckCircle2 → CircleCheck, ...). Nếu rải import khắp nơi, một lần nâng
// version là phải sửa hàng chục file. Gom ở đây thì sửa đúng một chỗ.
//
// Phiên bản đang pin: lucide-react 0.408.0 (xem package.json).
// Nếu `npm run typecheck` báo thiếu tên nào, đổi TẠI ĐÂY — phần còn lại
// của app không cần biết.
// ============================================================
import {
  AlertTriangle,
  Ban,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  CornerDownRight,
  ExternalLink,
  Facebook,
  FlaskConical,
  Inbox,
  Instagram,
  LayoutDashboard,
  Link2,
  Linkedin,
  Lock,
  Megaphone,
  Music2,
  Plus,
  RefreshCw,
  Rocket,
  ScrollText,
  Send,
  Sparkles,
  Twitter,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

import type { Platform } from './types';

export type { LucideIcon };

// ---- Icon theo ngữ nghĩa của app, không theo tên riêng của Lucide ----
// Component gọi Icon.Success chứ không gọi CheckCircle2 — nếu sau này đổi
// icon thành hình khác, chỉ sửa dòng dưới đây.
export const Icon = {
  Success: CheckCircle2,
  Failed: XCircle,
  Retrying: RefreshCw,
  Skipped: Ban,
  Processing: Clock,
  Scheduled: Clock,
  Queued: Inbox,
  Cancelled: Ban,

  Warning: AlertTriangle,
  Locked: Lock,
  /** Nhánh dẫn tới dòng giải thích lỗi (thay ký tự "└─"). */
  Branch: CornerDownRight,
  Check,
  Rate: BarChart3,
  Ai: Sparkles,
  Empty: Inbox,
  Permalink: ExternalLink,
  Send,
  Plus,

  // Điều hướng thanh bên
  Dashboard: LayoutDashboard,
  Campaigns: Megaphone,
  Logs: ScrollText,
  Accounts: Link2,
  Brand: Rocket,
} as const;

// ---- Icon nền tảng ----
export const PLATFORM_ICON: Record<Platform, LucideIcon> = {
  facebook: Facebook,
  linkedin: Linkedin,
  // Lucide chưa có logo X mới — dùng icon Twitter cho nền tảng 'twitter'.
  twitter: Twitter,
  instagram: Instagram,
  threads: Link2,
  tiktok: Music2,
  mock: FlaskConical,
};
