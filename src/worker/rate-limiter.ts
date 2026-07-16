import { redis } from '../shared/redis';

// Giới hạn cục bộ theo từng social account để không vượt trần của nền tảng.
// Cửa sổ trượt đơn giản bằng INCR + EXPIRE. Tùy chỉnh theo từng platform.
const LIMITS: Record<string, { max: number; windowSec: number }> = {
  facebook: { max: 25, windowSec: 60 },
  linkedin: { max: 20, windowSec: 60 },
  twitter: { max: 15, windowSec: 60 },
  mock: { max: 1000, windowSec: 60 },
};

export async function checkRateLimit(
  accountId: string,
  platform: string,
): Promise<boolean> {
  const cfg = LIMITS[platform] ?? { max: 30, windowSec: 60 };
  const key = `ratelimit:${platform}:${accountId}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, cfg.windowSec);
  }
  return count <= cfg.max;
}
