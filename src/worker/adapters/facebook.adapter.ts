import { SocialAdapter, PublishError, PublishResult } from './types';

// Đăng bài lên Facebook PAGE qua Graph API — chỉ dùng API chính thức.
//
// Facebook đã gỡ Publishing to Groups API, nên không còn đường hợp lệ để đăng
// lên Group. Chặn tại đây bằng lỗi PERMANENT thay vì để Graph API trả lỗi khó
// hiểu sau khi đã tiêu tốn 5 lần retry.
//
// Token truyền vào phải là PAGE access token (khác user token) + quyền
// pages_manage_posts.
export const facebookAdapter: SocialAdapter = {
  async publish({
    targetPlatformId,
    targetType,
    accessToken,
    content,
    mediaUrls,
  }): Promise<PublishResult> {
    if (targetType !== 'page') {
      throw new PublishError('UNSUPPORTED_TARGET', false, undefined, {
        error: {
          message:
            `Facebook chỉ đăng tự động được lên Page. Loại target '${targetType}' ` +
            `không có API chính thức để đăng bài.`,
        },
      });
    }

    const url = `https://graph.facebook.com/v19.0/${targetPlatformId}/feed`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          link: mediaUrls?.[0],
          access_token: accessToken,
        }),
      });
    } catch {
      throw new PublishError('NETWORK', true);
    }

    const body: any = await res.json().catch(() => ({}));

    if (res.ok && body.id) {
      return {
        platformPostId: body.id,
        permalink: `https://facebook.com/${body.id}`,
        raw: body,
      };
    }

    // Map mã lỗi Graph API → mã chuẩn nội bộ.
    const code = body?.error?.code;
    if (code === 190) throw new PublishError('TOKEN_EXPIRED', true, res.status, body);
    if ([4, 17, 32, 613].includes(code))
      throw new PublishError('RATE_LIMITED', true, res.status, body);
    if ([10, 200, 299].includes(code))
      throw new PublishError('PERMISSION_DENIED', false, res.status, body);
    if (code === 100)
      throw new PublishError('INVALID_CONTENT', false, res.status, body);

    throw new PublishError('UNKNOWN', res.status >= 500, res.status, body);
  },
};
