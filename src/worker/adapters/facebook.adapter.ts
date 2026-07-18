import { SocialAdapter, PublishError, PublishResult } from './types';

const GRAPH = 'https://graph.facebook.com/v19.0';

// Đăng bài lên Facebook PAGE qua Graph API — chỉ dùng API chính thức.
//
// Facebook đã gỡ Publishing to Groups API, nên không còn đường hợp lệ để đăng
// lên Group. Chặn tại đây bằng lỗi PERMANENT thay vì để Graph API trả lỗi khó
// hiểu sau khi đã tiêu tốn 5 lần retry.
//
// Token truyền vào phải là PAGE access token (khác user token) + quyền
// pages_manage_posts.
//
// Ba nhánh theo số ảnh:
//   0 ảnh  → /feed  (bài chữ).
//   1 ảnh  → /photos (caption = nội dung) — một request, đơn giản nhất.
//   2+ ảnh → upload TỪNG ảnh dạng unpublished (/photos published=false) để lấy
//            media_fbid, rồi tạo bài /feed đính kèm nhiều attached_media. Đây là
//            cách chính thức duy nhất để một bài mang nhiều ảnh.
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

    const images = mediaUrls ?? [];

    // --- 1 ảnh: đăng thẳng qua /photos (caption = nội dung). ---
    // Ảnh phải là URL công khai để Facebook tự tải về — đúng thứ Vercel Blob cho.
    if (images.length === 1) {
      const body = await graphPost(`${GRAPH}/${targetPlatformId}/photos`, {
        url: images[0],
        caption: content,
        access_token: accessToken,
      });
      // /photos trả về post_id (id bài trên feed) tách khỏi id ảnh — dùng
      // post_id để link tới bài. Thiếu thì lùi về id ảnh.
      return toResult(body, body.post_id ?? body.id);
    }

    // --- 2+ ảnh: upload unpublished từng ảnh → gom media_fbid → /feed. ---
    if (images.length >= 2) {
      const attached_media: { media_fbid: string }[] = [];
      for (const url of images) {
        const photo = await graphPost(`${GRAPH}/${targetPlatformId}/photos`, {
          url,
          published: false, // chỉ tải lên, chưa hiện trên tường
          access_token: accessToken,
        });
        if (!photo.id) {
          throw new PublishError('UNKNOWN', true, undefined, {
            error: { message: 'Upload ảnh unpublished không trả về id' },
          });
        }
        attached_media.push({ media_fbid: photo.id });
      }

      const body = await graphPost(`${GRAPH}/${targetPlatformId}/feed`, {
        message: content,
        attached_media,
        access_token: accessToken,
      });
      return toResult(body, body.id);
    }

    // --- 0 ảnh: bài chữ thường qua /feed. ---
    const body = await graphPost(`${GRAPH}/${targetPlatformId}/feed`, {
      message: content,
      access_token: accessToken,
    });
    return toResult(body, body.id);
  },
};

function toResult(raw: any, postId: string): PublishResult {
  return {
    platformPostId: postId,
    permalink: `https://facebook.com/${postId}`,
    raw,
  };
}

/**
 * Gọi một endpoint Graph API POST, trả về body JSON khi thành công, hoặc ném
 * PublishError đã map mã lỗi khi thất bại. Dùng chung cho mọi request (upload
 * ảnh unpublished, /photos, /feed) để phân loại lỗi nhất quán.
 */
async function graphPost(
  url: string,
  payload: Record<string, unknown>,
): Promise<any> {
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
  if (res.ok && body.id) return body;

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
}
