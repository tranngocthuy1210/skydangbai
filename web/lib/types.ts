// Các type này khớp với response thật của backend NestJS.
// Backend trả snake_case (raw pg) → giữ nguyên snake_case ở đây thay vì
// map lại, để không phải bảo trì 2 bộ tên cho cùng một thứ.

export type PostStatus =
  | 'scheduled'
  | 'queued'
  | 'processing'
  | 'success'
  | 'failed'
  | 'skipped'
  | 'cancelled';

/** Trạng thái của 1 DÒNG LOG (khác PostStatus — log ghi từng lần thử). */
export type LogStatus = 'success' | 'failed' | 'retrying' | 'skipped';

export type Platform =
  | 'facebook'
  | 'linkedin'
  | 'twitter'
  | 'instagram'
  | 'threads'
  | 'tiktok'
  | 'mock';

export type TargetType = 'page' | 'group' | 'profile' | 'channel';

/** GET /api/post-logs */
export interface PostLog {
  id: string;
  post_id: string;
  platform: Platform;
  attempt_number: number;
  status: LogStatus;
  error_code: string | null;
  error_message: string | null;
  http_status: number | null;
  duration_ms: number | null;
  created_at: string;
}

/** GET /api/post-logs/summary */
export interface LogSummary {
  success: number;
  failed: number;
  retrying: number;
  skipped: number;
  total: number;
  success_rate: number;
}

/** GET /api/post-logs/:postId */
export interface PostDetail {
  post: {
    id: string;
    content: string;
    status: PostStatus;
    status_reason: string | null;
    scheduled_at: string;
    published_at: string | null;
    permalink: string | null;
    platform_post_id: string | null;
    retry_count: number;
    target_name: string;
    target_type: TargetType;
    platform: Platform;
    account_name: string;
    campaign_id: string;
    campaign_name: string;
  };
  timeline: Array<{
    id: string;
    attempt_number: number;
    status: LogStatus;
    error_code: string | null;
    error_message: string | null;
    http_status: number | null;
    duration_ms: number | null;
    worker_id: string | null;
    request_payload: unknown;
    response_body: unknown;
    created_at: string;
  }>;
}

/** GET /api/targets */
export interface Target {
  id: string;
  name: string;
  target_type: TargetType;
  member_count: number | null;
  is_active: boolean;
  is_publishable: boolean;
  publish_note: string | null;
  platform: Platform;
  account_name: string;
}

/** GET /api/social-accounts */
export interface SocialAccount {
  id: string;
  platform: Platform;
  display_name: string | null;
  status: 'active' | 'needs_reauth' | 'revoked' | 'expired';
  token_expires_at: string | null;
  created_at: string;
}

/** GET /api/campaigns */
export interface Campaign {
  id: string;
  name: string;
  status: string;
  schedule_type: string;
  ai_spin_enabled: boolean;
  created_at: string;
  total_posts: number;
  success: number;
  failed: number;
  skipped: number;
}

/** Lỗi 400 khi chọn target không đăng được qua API chính thức. */
export interface BlockedTargetsError {
  message: string;
  blockedTargets: Array<{ id: string; name: string; reason: string }>;
}
