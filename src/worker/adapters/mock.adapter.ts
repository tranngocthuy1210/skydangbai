import { SocialAdapter, PublishError, PublishResult } from './types';

// Adapter GIẢ LẬP để test luồng end-to-end mà không cần API MXH thật.
// ~15% lần đầu ném RATE_LIMITED (retryable) để bạn thấy cơ chế retry & log.
export const mockAdapter: SocialAdapter = {
  async publish({ targetPlatformId, content }): Promise<PublishResult> {
    // Giả lập độ trễ mạng 200-500ms.
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

    if (Math.random() < 0.15) {
      throw new PublishError('RATE_LIMITED', true, 429, {
        error: { message: '[mock] rate limit, hãy thử lại sau' },
      });
    }
    if (content.trim().length === 0) {
      throw new PublishError('INVALID_CONTENT', false, 400, {
        error: { message: '[mock] nội dung rỗng' },
      });
    }

    const fakeId = `mock_${targetPlatformId}_${Date.now()}`;
    return {
      platformPostId: fakeId,
      permalink: `https://mock.local/${fakeId}`,
      raw: { id: fakeId, ok: true },
    };
  },
};
