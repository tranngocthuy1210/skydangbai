// ============================================================
// Dữ liệu mẫu cho CHẾ ĐỘ DEMO (NEXT_PUBLIC_DEMO_MODE=1).
//
// Vì sao tồn tại: bản deploy chỉ-frontend lên Vercel không có backend. Nếu
// vẫn gọi API thật, trình duyệt người xem sẽ đi tìm localhost của CHÍNH MÁY
// HỌ và mọi trang hiện lỗi — một tên miền đẹp trỏ tới trang trông như hỏng.
//
// QUAN TRỌNG: đây là dữ liệu giả và PHẢI luôn được gắn nhãn trên giao diện
// (xem components/DemoBanner.tsx). Một bản demo không nói rõ mình là demo thì
// là một bản demo nói dối.
//
// Chế độ này KHÔNG bao giờ được bật khi đã có backend thật.
// ============================================================
import type {
  Campaign,
  LogSummary,
  PostDetail,
  PostLog,
  SocialAccount,
  Target,
} from './types';

/** Mốc thời gian tương đối để nhật ký luôn trông "vừa mới xảy ra". */
function minutesAgo(n: number): string {
  return new Date(Date.now() - n * 60_000).toISOString();
}

export const DEMO_SUMMARY: LogSummary = {
  success: 1204,
  failed: 37,
  retrying: 2,
  skipped: 12,
  total: 1255,
  // 1204 / (1204 + 37) = 97.0%
  success_rate: 97,
};

export const DEMO_LOGS: PostLog[] = [
  {
    id: '1',
    post_id: 'post-a',
    platform: 'facebook',
    attempt_number: 3,
    status: 'failed',
    error_code: 'TOKEN_EXPIRED',
    error_message: 'Error validating access token: Session has expired',
    http_status: 401,
    duration_ms: 412,
    created_at: minutesAgo(4),
  },
  {
    id: '2',
    post_id: 'post-b',
    platform: 'facebook',
    attempt_number: 2,
    status: 'retrying',
    error_code: 'RATE_LIMITED',
    error_message: '(#4) Application request limit reached',
    http_status: 429,
    duration_ms: 238,
    created_at: minutesAgo(5),
  },
  {
    id: '3',
    post_id: 'post-c',
    platform: 'linkedin',
    attempt_number: 1,
    status: 'success',
    error_code: null,
    error_message: null,
    http_status: 201,
    duration_ms: 684,
    created_at: minutesAgo(35),
  },
  {
    id: '4',
    post_id: 'post-d',
    platform: 'facebook',
    attempt_number: 1,
    status: 'skipped',
    error_code: 'UNSUPPORTED_TARGET',
    error_message:
      'Facebook đã gỡ Publishing to Groups API. Không thể đăng tự động qua API chính thức.',
    http_status: null,
    duration_ms: 3,
    created_at: minutesAgo(5),
  },
  {
    id: '5',
    post_id: 'post-e',
    platform: 'facebook',
    attempt_number: 1,
    status: 'success',
    error_code: null,
    error_message: null,
    http_status: 200,
    duration_ms: 521,
    created_at: minutesAgo(50),
  },
  {
    id: '6',
    post_id: 'post-f',
    platform: 'linkedin',
    attempt_number: 1,
    status: 'success',
    error_code: null,
    error_message: null,
    http_status: 201,
    duration_ms: 733,
    created_at: minutesAgo(95),
  },
];

export const DEMO_POST_DETAIL: PostDetail = {
  post: {
    id: 'post-a',
    content: 'Sale 50% toàn bộ sản phẩm, chỉ trong hôm nay!',
    status: 'failed',
    status_reason:
      'Làm mới token thất bại. Tài khoản đã chuyển sang trạng thái "cần kết nối lại".',
    scheduled_at: minutesAgo(6),
    published_at: null,
    permalink: null,
    platform_post_id: null,
    retry_count: 3,
    target_name: 'Shop Thời Trang B',
    target_type: 'page',
    platform: 'facebook',
    account_name: 'Nguyễn Văn A',
    campaign_id: 'camp-1',
    campaign_name: 'Khuyến mãi tháng 7',
  },
  timeline: [
    {
      id: 't1',
      attempt_number: 1,
      status: 'retrying',
      error_code: 'RATE_LIMITED',
      error_message: '(#4) Application request limit reached',
      http_status: 429,
      duration_ms: 238,
      worker_id: 'worker-4821',
      request_payload: {
        target: '104729384756',
        content: 'Sale 50% toàn bộ sản phẩm, chỉ trong hôm nay!',
      },
      response_body: {
        error: {
          message: '(#4) Application request limit reached',
          type: 'OAuthException',
          code: 4,
        },
      },
      created_at: minutesAgo(6),
    },
    {
      id: 't2',
      attempt_number: 2,
      status: 'retrying',
      error_code: 'TOKEN_EXPIRED',
      error_message: 'Error validating access token: Session has expired',
      http_status: 401,
      duration_ms: 180,
      worker_id: 'worker-4821',
      // Token bị che — đúng như hàm redact ở backend làm trước khi ghi log.
      request_payload: { target: '104729384756', access_token: '***REDACTED***' },
      response_body: {
        error: {
          message: 'Error validating access token: Session has expired',
          type: 'OAuthException',
          code: 190,
        },
      },
      created_at: minutesAgo(5),
    },
    {
      id: 't3',
      attempt_number: 3,
      status: 'failed',
      error_code: 'TOKEN_EXPIRED',
      error_message: 'Làm mới token thất bại, cần kết nối lại',
      http_status: 401,
      duration_ms: 412,
      worker_id: 'worker-4821',
      request_payload: null,
      response_body: null,
      created_at: minutesAgo(4),
    },
  ],
};

export const DEMO_ACCOUNTS: SocialAccount[] = [
  {
    id: 'acc-fb',
    platform: 'facebook',
    display_name: 'Nguyễn Văn A',
    status: 'active',
    token_expires_at: null,
    created_at: minutesAgo(60 * 24 * 30),
  },
  {
    id: 'acc-li',
    platform: 'linkedin',
    display_name: 'Nguyễn Văn A',
    status: 'needs_reauth',
    token_expires_at: minutesAgo(120),
    created_at: minutesAgo(60 * 24 * 20),
  },
];

export const DEMO_TARGETS: Target[] = [
  {
    id: 'tg-1',
    name: 'Trang Sản phẩm A',
    target_type: 'page',
    member_count: 12500,
    is_active: true,
    is_publishable: true,
    publish_note: null,
    platform: 'facebook',
    account_name: 'Nguyễn Văn A',
  },
  {
    id: 'tg-2',
    name: 'Shop Thời Trang B',
    target_type: 'page',
    member_count: 8200,
    is_active: true,
    is_publishable: true,
    publish_note: null,
    platform: 'facebook',
    account_name: 'Nguyễn Văn A',
  },
  {
    id: 'tg-3',
    name: 'Cộng đồng Marketing VN',
    target_type: 'group',
    member_count: 45000,
    is_active: true,
    is_publishable: false,
    publish_note:
      'Facebook đã gỡ Publishing to Groups API. Không thể đăng tự động qua API chính thức. Hãy dùng Facebook Page.',
    platform: 'facebook',
    account_name: 'Nguyễn Văn A',
  },
  {
    id: 'tg-4',
    name: 'Công ty ABC',
    target_type: 'profile',
    member_count: 1200,
    is_active: true,
    is_publishable: true,
    publish_note: null,
    platform: 'linkedin',
    account_name: 'Nguyễn Văn A',
  },
];

export const DEMO_CAMPAIGNS: Campaign[] = [
  {
    id: 'camp-1',
    name: 'Khuyến mãi tháng 7',
    status: 'running',
    schedule_type: 'once',
    ai_spin_enabled: true,
    created_at: minutesAgo(60 * 6),
    total_posts: 4,
    success: 2,
    failed: 1,
    skipped: 1,
  },
  {
    id: 'camp-2',
    name: 'Ra mắt bộ sưu tập Thu',
    status: 'completed',
    schedule_type: 'once',
    ai_spin_enabled: false,
    created_at: minutesAgo(60 * 24 * 2),
    total_posts: 6,
    success: 6,
    failed: 0,
    skipped: 0,
  },
];
