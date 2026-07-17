import { BadRequestException, Injectable } from '@nestjs/common';
import { encryptToken } from '../../shared/crypto';
import { query } from '../../shared/db';
import { env } from '../../shared/env';

const GRAPH = 'https://graph.facebook.com/v19.0';

// Quyền tối thiểu: liệt kê Page, đọc thông tin Page, đăng bài lên Page.
// Với Page của chính mình + app ở Development mode → dùng được ngay, không cần App Review.
const SCOPES = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'];

interface FbPage {
  id: string;
  name: string;
  access_token: string; // ← PAGE TOKEN: thứ thật sự dùng để đăng
  fan_count?: number;
}

@Injectable()
export class FacebookOauthService {
  /** false = chưa đặt App ID/Secret → báo rõ thay vì để lỗi khó hiểu lúc gọi Graph. */
  get configured(): boolean {
    return Boolean(env.facebookAppId && env.facebookAppSecret);
  }

  /**
   * URL đưa người dùng tới trang xin quyền của Facebook.
   *
   * `state` là JWT ngắn hạn do AuthService ký (xem signOauthState) — vừa không
   * đoán được (chống CSRF), vừa mang userId qua vòng chuyển hướng của Facebook.
   */
  buildAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: env.facebookAppId,
      redirect_uri: env.facebookRedirectUri,
      scope: SCOPES.join(','),
      response_type: 'code',
      state,
    });
    return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
  }

  /** Gọi Graph API. Facebook trả lỗi trong body kèm HTTP 200 nên phải soi cả `body.error`. */
  private async graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = `${GRAPH}${path}?${new URLSearchParams(params).toString()}`;
    let res: Response;
    try {
      res = await fetch(url);
    } catch {
      throw new BadRequestException('Không kết nối được tới Facebook');
    }
    const body: any = await res.json().catch(() => ({}));
    if (!res.ok || body?.error) {
      throw new BadRequestException(
        `Facebook từ chối: ${body?.error?.message ?? `HTTP ${res.status}`}`,
      );
    }
    return body as T;
  }

  /**
   * Xử lý callback: đổi code lấy token, rồi lưu tài khoản + toàn bộ Page kèm
   * token riêng của từng Page.
   */
  async handleCallback(userId: string, code: string) {
    // 1) code → user token NGẮN hạn (~1 giờ)
    const short = await this.graphGet<{ access_token: string }>('/oauth/access_token', {
      client_id: env.facebookAppId,
      client_secret: env.facebookAppSecret,
      redirect_uri: env.facebookRedirectUri,
      code,
    });

    // 2) ngắn hạn → DÀI hạn (~60 ngày). Bắt buộc: Page token sinh từ token dài
    //    hạn mới gần như không hết hạn.
    const long = await this.graphGet<{ access_token: string; expires_in?: number }>(
      '/oauth/access_token',
      {
        grant_type: 'fb_exchange_token',
        client_id: env.facebookAppId,
        client_secret: env.facebookAppSecret,
        fb_exchange_token: short.access_token,
      },
    );

    // 3) danh tính người dùng
    const me = await this.graphGet<{ id: string; name: string }>('/me', {
      fields: 'id,name',
      access_token: long.access_token,
    });

    // 4) danh sách Page — mỗi Page kèm access_token RIÊNG của nó
    const pages = await this.graphGet<{ data: FbPage[] }>('/me/accounts', {
      fields: 'id,name,access_token,fan_count',
      access_token: long.access_token,
    });

    const expiresAt = long.expires_in
      ? new Date(Date.now() + long.expires_in * 1000)
      : null;

    // 5) Lưu tài khoản (token dài hạn — dùng để làm mới danh sách Page về sau).
    const [account] = await query<{ id: string }>(
      `INSERT INTO social_accounts
         (user_id, platform, platform_user_id, display_name, access_token_enc,
          token_expires_at, scopes, status)
       VALUES ($1,'facebook',$2,$3,$4,$5,$6,'active')
       ON CONFLICT (user_id, platform, platform_user_id) DO UPDATE
         SET access_token_enc = EXCLUDED.access_token_enc,
             token_expires_at = EXCLUDED.token_expires_at,
             display_name     = EXCLUDED.display_name,
             status           = 'active',
             updated_at       = now()
       RETURNING id`,
      [userId, me.id, me.name, encryptToken(long.access_token), expiresAt, SCOPES],
    );

    // 6) Lưu từng Page kèm token riêng (đã mã hóa).
    //    is_active=true để hồi sinh Page từng bị ngắt rồi nay cấp quyền lại.
    const list = pages.data ?? [];
    for (const p of list) {
      await query(
        `INSERT INTO targets
           (social_account_id, target_type, platform_target_id, name, member_count,
            target_token_enc, is_publishable, is_active, last_synced_at)
         VALUES ($1,'page',$2,$3,$4,$5,true,true,now())
         ON CONFLICT (social_account_id, platform_target_id) DO UPDATE
           SET name             = EXCLUDED.name,
               member_count     = EXCLUDED.member_count,
               target_token_enc = EXCLUDED.target_token_enc,
               is_publishable   = true,
               is_active        = true,
               last_synced_at   = now()`,
        [account.id, p.id, p.name, p.fan_count ?? null, encryptToken(p.access_token)],
      );
    }

    // 7) ĐỒNG BỘ NGƯỢC — bước dễ quên nhưng bắt buộc.
    //    Page nào KHÔNG còn trong danh sách Facebook trả về = người dùng đã bỏ
    //    chọn hoặc gỡ quyền. Không xử lý thì dòng cũ nằm lại, vẫn hiện ra cho
    //    người dùng chọn, ôm token đã chết, và chỉ vỡ vào đúng lúc chiến dịch
    //    thật chạy — kiểu lỗi tệ nhất.
    //
    //    Xóa luôn token: nó không giải mã được nữa (hoặc đã bị thu hồi), giữ
    //    lại chỉ tổ rác. Giữ lại DÒNG (không DELETE) để post_logs cũ còn tham chiếu.
    await query(
      `UPDATE targets
          SET is_active        = false,
              target_token_enc = NULL,
              publish_note     = 'Bạn đã ngắt kết nối Page này. Kết nối lại để dùng.'
        WHERE social_account_id = $1
          AND platform_target_id <> ALL($2::text[])`,
      [account.id, list.map((p) => p.id)],
    );

    return { accountId: account.id, name: me.name, pages: list.length };
  }
}
