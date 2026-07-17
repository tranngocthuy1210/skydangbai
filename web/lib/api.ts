import {
  DEMO_ACCOUNTS,
  DEMO_CAMPAIGNS,
  DEMO_LOGS,
  DEMO_POST_DETAIL,
  DEMO_SUMMARY,
  DEMO_TARGETS,
} from './demo-data';
import { clearToken, getToken } from './auth-store';
import type {
  Campaign,
  CampaignDetail,
  LogSummary,
  PostDetail,
  PostLog,
  SocialAccount,
  Target,
} from './types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://skydangbai-api.vercel.app/api';

/** Lỗi HTTP có kèm body đã parse — để UI đọc được `blockedTargets`. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };
  // Gắn JWT vào mọi request nếu đã đăng nhập.
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers, cache: 'no-store' });
  } catch {
    // Nguyên nhân phổ biến nhất: API chưa chạy, hoặc CORS chặn.
    throw new ApiError(
      0,
      null,
      'Không kết nối được tới API. Kiểm tra backend đã chạy ở ' + BASE + ' chưa.',
    );
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    // 401 = token hết hạn/không hợp lệ → xóa và đá về login. Bỏ qua chính các
    // endpoint đăng nhập (401 ở đó là "sai mật khẩu", không phải "hết phiên").
    if (res.status === 401 && !path.startsWith('/auth/')) {
      clearToken();
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
    const msg =
      (body as { message?: string | string[] })?.message ??
      `Lỗi ${res.status}`;
    throw new ApiError(res.status, body, Array.isArray(msg) ? msg.join(', ') : msg);
  }
  return body as T;
}

export interface LogQuery {
  status?: string;
  platform?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

const liveApi = {
  getLogs: (q: LogQuery = {}) => request<PostLog[]>(`/post-logs${qs({ ...q })}`),

  getLogSummary: (from?: string) =>
    request<LogSummary>(`/post-logs/summary${qs({ from })}`),

  getPostDetail: (postId: string) => request<PostDetail>(`/post-logs/${postId}`),

  getTargets: () => request<Target[]>('/targets'),

  getAccounts: () => request<SocialAccount[]>('/social-accounts'),

  getCampaigns: () => request<Campaign[]>('/campaigns'),

  getCampaignDetail: (id: string) => request<CampaignDetail>(`/campaigns/${id}`),

  createCampaign: (payload: {
    name: string;
    content: string;
    targetIds: string[];
    scheduledAt?: string;
    hashtags?: string[];
    aiSpin?: boolean;
  }) =>
    request<{ campaignId: string; postsCreated: number; hashtags: string[] }>(
      '/campaigns',
      { method: 'POST', body: JSON.stringify(payload) },
    ),

  // `enabled: false` = backend chưa có ANTHROPIC_API_KEY, đang chạy fallback.
  // UI cần biết để không quảng cáo nhầm là "AI đã gợi ý".
  suggestHashtags: (content: string, platform?: string) =>
    request<{ enabled: boolean; hashtags: string[] }>('/ai/hashtags', {
      method: 'POST',
      body: JSON.stringify({ content, platform }),
    }),

  spinContent: (content: string, count: number, platform?: string) =>
    request<{ enabled: boolean; count: number; variants: string[] }>('/ai/spin', {
      method: 'POST',
      body: JSON.stringify({ content, count, platform }),
    }),

  // Trả về URL Facebook để frontend tự chuyển hướng. Là POST (không phải link
  // <a>) vì cần gửi kèm JWT — trình duyệt không gắn header khi điều hướng thường.
  getFacebookConnectUrl: () =>
    request<{ url: string }>('/social-accounts/facebook/connect-url', {
      method: 'POST',
    }),
};

// ---- Chế độ demo ------------------------------------------------------
// Bản deploy chỉ-frontend (Vercel) không có backend. Không có lớp này thì
// trình duyệt người xem đi tìm localhost của chính máy họ và mọi trang hiện
// lỗi. Xem thêm: lib/demo-data.ts.
//
// Cùng kiểu với liveApi (`satisfies typeof liveApi`) nên nếu thêm endpoint mới
// mà quên làm bản demo, TypeScript báo lỗi ngay — không thể lỡ tay để sót.
const demoApi = {
  getLogs: async (q: LogQuery = {}) => {
    let rows = DEMO_LOGS;
    if (q.status) rows = rows.filter((r) => r.status === q.status);
    if (q.platform) rows = rows.filter((r) => r.platform === q.platform);
    if (q.from) rows = rows.filter((r) => r.created_at >= q.from!);
    return rows;
  },

  getLogSummary: async (_from?: string) => DEMO_SUMMARY,

  getPostDetail: async (_postId: string) => DEMO_POST_DETAIL,

  getTargets: async () => DEMO_TARGETS,

  getAccounts: async () => DEMO_ACCOUNTS,

  getCampaigns: async () => DEMO_CAMPAIGNS,

  getCampaignDetail: async (_id: string): Promise<CampaignDetail> => {
    throw new ApiError(0, null, 'Bản demo không có chi tiết chiến dịch.');
  },

  createCampaign: async (_payload: {
    name: string;
    content: string;
    targetIds: string[];
    scheduledAt?: string;
    hashtags?: string[];
    aiSpin?: boolean;
  }): Promise<{ campaignId: string; postsCreated: number; hashtags: string[] }> => {
    // Không có backend để lưu — nói thật thay vì giả vờ thành công rồi để
    // user quay lại tìm chiến dịch không tồn tại.
    throw new ApiError(0, null, 'Đây là bản demo — không lưu được chiến dịch thật.');
  },

  suggestHashtags: async (_content: string, _platform?: string) => ({
    enabled: false,
    hashtags: ['sale', 'khuyenmai', 'thoitrang'],
  }),

  spinContent: async (content: string, count: number, _platform?: string) => ({
    enabled: false,
    count,
    variants: Array.from({ length: count }, () => content),
  }),

  getFacebookConnectUrl: async (): Promise<{ url: string }> => {
    throw new ApiError(0, null, 'Bản demo không kết nối Facebook được.');
  },
} satisfies typeof liveApi;

/** Bật bằng NEXT_PUBLIC_DEMO_MODE=1. KHÔNG bật khi đã có backend thật. */
export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === '1';

export const api = IS_DEMO ? demoApi : liveApi;

// ---- Xác thực ----
// Tách riêng khỏi `api`: đăng nhập LUÔN dùng backend thật, không dính chế độ demo.
export interface AuthResult {
  accessToken: string;
  user: { id: string; email: string; fullName: string | null };
}

export const authApi = {
  register: (email: string, password: string, fullName?: string) =>
    request<AuthResult>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    }),

  login: (email: string, password: string) =>
    request<AuthResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () =>
    request<{ id: string; email: string; full_name: string | null; plan: string }>(
      '/auth/me',
    ),
};
