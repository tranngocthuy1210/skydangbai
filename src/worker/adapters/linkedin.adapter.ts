import { SocialAdapter, PublishError, PublishResult } from './types';

// Đăng bài text lên LinkedIn qua UGC Posts API.
// targetPlatformId ở đây là URN, ví dụ: urn:li:organization:123 hoặc urn:li:person:abc
export const linkedinAdapter: SocialAdapter = {
  async publish({ targetPlatformId, accessToken, content }): Promise<PublishResult> {
    const url = 'https://api.linkedin.com/v2/ugcPosts';

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          author: targetPlatformId,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: { text: content },
              shareMediaCategory: 'NONE',
            },
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
          },
        }),
      });
    } catch {
      throw new PublishError('NETWORK', true);
    }

    if (res.status === 201) {
      const id = res.headers.get('x-restli-id') ?? `li_${Date.now()}`;
      return {
        platformPostId: id,
        permalink: `https://www.linkedin.com/feed/update/${id}`,
        raw: { id },
      };
    }

    const body: any = await res.json().catch(() => ({}));
    if (res.status === 401) throw new PublishError('TOKEN_EXPIRED', true, 401, body);
    if (res.status === 429) throw new PublishError('RATE_LIMITED', true, 429, body);
    if (res.status === 403) throw new PublishError('PERMISSION_DENIED', false, 403, body);
    if (res.status === 422) throw new PublishError('INVALID_CONTENT', false, 422, body);

    throw new PublishError('UNKNOWN', res.status >= 500, res.status, body);
  },
};
