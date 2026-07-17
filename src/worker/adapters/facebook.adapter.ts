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

    // Có ảnh → đăng bài KÈM ẢNH qua /photos (caption = nội dung).
    // Không ảnh → bài chữ thường qua /feed.
    // Ảnh phải là URL công khai để Facebook tự tải về — đúng thứ Vercel Blob cho.
    const hasImage = Boolean(mediaUrls && mediaUrls.length > 0);
    const url = hasImage
      ? `https://graph.facebook.com/v19.0/${targetPlatformId}/photos`
      : `https://graph.facebook.com/v19.0/${targetPlatformId}/feed`;
    const payload: Record<string, string> = hasImage
      ? { url: mediaUrls![0], caption: content, access_token: accessToken }
      : { message: content, access_token: accessToken };

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new PublishError('NETWORK', true);
    }

    const body: any = await res.json().catch(() => ({}));

    if (res.ok && body.id) {
      // /photos trả về post_id (id của bài trên feed) tách khỏi id ảnh — dùng
      // post_id để link tới bài. /feed chỉ có id.
      const postId = body.post_id ?? body.id;
      return {
        platformPostId: postId,
        permalink: `https://facebook.com/${postId}`,
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
