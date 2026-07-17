// ============================================================
// BATCH ENTRYPOINT — chế độ miễn phí (GitHub Actions cron).
//
// Thay cho cặp worker + feeder chạy 24/7: script này chạy MỘT LẦN (tại các
// mốc cron cố định), xử lý mọi bài đến hạn, ghi log, rồi TẮT. Không cần Redis,
// không cần tiến trình sống liên tục → host được miễn phí.
//
// Tái dùng nguyên vẹn phần lõi: adapter, phân loại lỗi (PublishError), ghi
// post_logs, mã hóa token. Chỉ bỏ lớp hàng đợi (BullMQ) và rate-limit (Redis).
//
// Đánh đổi so với queue 24/7: bài chỉ lên vào các cửa sổ cron, không chính xác
// từng phút. Đủ cho nhu cầu 1–2 lần/ngày.
// ============================================================
import { pool, query } from '../shared/db';
import { decryptToken } from '../shared/crypto';
import { getAdapter } from '../worker/adapters';
import { PublishError, TargetType } from '../worker/adapters/types';
import { refreshAccessToken } from '../worker/token.service';
import { writeLog } from '../worker/log.repository';

// Nhận diện lần chạy trong log — GitHub đặt sẵn GITHUB_RUN_ID.
const BATCH_ID = `batch-${process.env.GITHUB_RUN_ID ?? Date.now()}`;

// Giãn cách giữa hai bài để tránh bị nền tảng đánh dấu spam (thay cho rate
// limiter Redis). Batch chạy thưa nên chỉ cần khoảng cách nhỏ.
const SPACING_MS = Number(process.env.BATCH_SPACING_MS ?? 2000);

// Số lần thử lại TRONG cùng một lần chạy cho lỗi tạm thời (mạng, 5xx).
const MAX_ATTEMPTS = Number(process.env.BATCH_MAX_ATTEMPTS ?? 3);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface PostRow {
  id: string;
  content: string;
  media_urls: string[] | null;
  status: string;
  platform_post_id: string | null;
  platform_target_id: string;
  target_type: TargetType;
  is_publishable: boolean;
  publish_note: string | null;
  target_token_enc: string | null;
  account_id: string;
  platform: string;
  access_token_enc: string;
  token_expires_at: string | null;
  user_id: string;
}

/**
 * Giành lấy các bài đến hạn một cách nguyên tử: chuyển 'scheduled' → 'processing'
 * và trả về id. FOR UPDATE SKIP LOCKED để hai lần chạy chồng nhau không lấy trùng.
 */
async function claimDuePosts(limit: number): Promise<string[]> {
  const rows = await query<{ id: string }>(
    `UPDATE posts
       SET status = 'processing', updated_at = now()
     WHERE id IN (
       SELECT id FROM posts
       WHERE status = 'scheduled' AND scheduled_at <= now()
       ORDER BY scheduled_at
       LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING id`,
    [limit],
  );
  return rows.map((r) => r.id);
}

async function loadPosts(ids: string[]): Promise<PostRow[]> {
  return query<PostRow>(
    `SELECT p.id, p.content, p.media_urls, p.status, p.platform_post_id,
            t.platform_target_id, t.target_type, t.is_publishable, t.publish_note,
            t.target_token_enc,
            sa.id AS account_id, sa.platform, sa.access_token_enc, sa.token_expires_at,
            c.user_id
     FROM posts p
     JOIN targets t          ON t.id = p.target_id
     JOIN social_accounts sa ON sa.id = t.social_account_id
     JOIN campaigns c        ON c.id = p.campaign_id
     WHERE p.id = ANY($1::uuid[])`,
    [ids],
  );
}

type Outcome = 'success' | 'failed' | 'skipped' | 'rescheduled';

/** Kiểm tra target đăng được không, rồi chọn đúng token để đăng. */
async function processOnePost(post: PostRow): Promise<Outcome> {
  const startedAt = Date.now();

  // 1) Official API only: target không đăng được → bỏ qua (không phải lỗi).
  if (!post.is_publishable) {
    const reason =
      post.publish_note ??
      `Không hỗ trợ đăng tự động lên ${post.target_type} của ${post.platform}.`;
    await query(
      `UPDATE posts SET status='skipped', status_reason=$2, updated_at=now() WHERE id=$1`,
      [post.id, reason],
    );
    await writeLog({
      postId: post.id, userId: post.user_id, platform: post.platform, attempt: 1,
      status: 'skipped', errorCode: 'UNSUPPORTED_TARGET', errorMessage: reason,
      durationMs: Date.now() - startedAt, workerId: BATCH_ID,
    });
    return 'skipped';
  }

  // 2) Chọn token.
  // Facebook cấp cho MỖI PAGE một token riêng (target_token_enc) — phải dùng
  // đúng token đó mới đăng được, và nó gần như không hết hạn nên khỏi refresh.
  // Nền tảng khác (mock, LinkedIn) dùng token cấp tài khoản, có thể cần refresh.
  let accessToken: string;
  if (post.target_token_enc) {
    accessToken = decryptToken(post.target_token_enc);
    return publishWithToken(post, accessToken, startedAt);
  }

  accessToken = decryptToken(post.access_token_enc);
  const expiringSoon =
    post.token_expires_at &&
    new Date(post.token_expires_at).getTime() - Date.now() < 5 * 60_000;
  if (expiringSoon) {
    try {
      accessToken = await refreshAccessToken(post.account_id, post.platform);
    } catch {
      await query(`UPDATE social_accounts SET status='needs_reauth' WHERE id=$1`, [post.account_id]);
      await query(
        `UPDATE posts SET status='failed', status_reason=$2, updated_at=now() WHERE id=$1`,
        [post.id, 'Refresh token thất bại, cần kết nối lại'],
      );
      await writeLog({
        postId: post.id, userId: post.user_id, platform: post.platform, attempt: 1,
        status: 'failed', errorCode: 'TOKEN_EXPIRED',
        errorMessage: 'Refresh token thất bại, cần kết nối lại',
        durationMs: Date.now() - startedAt, workerId: BATCH_ID,
      });
      return 'failed';
    }
  }

  return publishWithToken(post, accessToken, startedAt);
}

/** Chọn adapter, gọi API đăng bài, ghi log — phần chung cho mọi loại token. */
async function publishWithToken(
  post: PostRow,
  accessToken: string,
  startedAt: number,
): Promise<Outcome> {
  // 3) Adapter theo nền tảng.
  const adapter = getAdapter(post.platform);
  if (!adapter) {
    await query(
      `UPDATE posts SET status='failed', status_reason=$2, updated_at=now() WHERE id=$1`,
      [post.id, `Không hỗ trợ nền tảng: ${post.platform}`],
    );
    await writeLog({
      postId: post.id, userId: post.user_id, platform: post.platform, attempt: 1,
      status: 'failed', errorCode: 'UNKNOWN',
      errorMessage: `Không hỗ trợ nền tảng: ${post.platform}`,
      durationMs: Date.now() - startedAt, workerId: BATCH_ID,
    });
    return 'failed';
  }

  const requestPayload = { target: post.platform_target_id, content: post.content };

  // 4) Gọi API — thử lại TRONG lần chạy cho lỗi tạm thời (mạng, 5xx).
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const attemptStart = Date.now();
    try {
      const result = await adapter.publish({
        targetPlatformId: post.platform_target_id,
        targetType: post.target_type,
        accessToken,
        content: post.content,
        mediaUrls: post.media_urls ?? undefined,
      });

      await query(
        `UPDATE posts SET status='success', platform_post_id=$2, permalink=$3,
                published_at=now(), updated_at=now() WHERE id=$1`,
        [post.id, result.platformPostId, result.permalink ?? null],
      );
      await writeLog({
        postId: post.id, userId: post.user_id, platform: post.platform, attempt,
        status: 'success', httpStatus: 200, durationMs: Date.now() - attemptStart,
        workerId: BATCH_ID, requestPayload, responseBody: result.raw,
      });
      return 'success';
    } catch (err) {
      const e = err instanceof PublishError ? err : new PublishError('UNKNOWN', true);
      const errorMessage = (e.raw as any)?.error?.message ?? e.code;

      // RATE_LIMITED: đừng đốt lượt thử — trả bài về 'scheduled' cho lần chạy sau.
      if (e.code === 'RATE_LIMITED') {
        await query(
          `UPDATE posts SET status='scheduled', status_reason=$2, updated_at=now() WHERE id=$1`,
          [post.id, 'Chạm giới hạn tần suất — hoãn sang lần chạy sau'],
        );
        await writeLog({
          postId: post.id, userId: post.user_id, platform: post.platform, attempt,
          status: 'retrying', errorCode: e.code, errorMessage,
          httpStatus: e.httpStatus, durationMs: Date.now() - attemptStart,
          workerId: BATCH_ID, requestPayload, responseBody: e.raw,
        });
        return 'rescheduled';
      }

      // UNSUPPORTED_TARGET: adapter từ chối → skipped.
      if (e.code === 'UNSUPPORTED_TARGET') {
        await query(
          `UPDATE posts SET status='skipped', status_reason=$2, updated_at=now() WHERE id=$1`,
          [post.id, errorMessage],
        );
        await writeLog({
          postId: post.id, userId: post.user_id, platform: post.platform, attempt,
          status: 'skipped', errorCode: e.code, errorMessage,
          durationMs: Date.now() - attemptStart, workerId: BATCH_ID,
          requestPayload, responseBody: e.raw,
        });
        return 'skipped';
      }

      const willRetry = e.retryable && attempt < MAX_ATTEMPTS;
      await writeLog({
        postId: post.id, userId: post.user_id, platform: post.platform, attempt,
        status: willRetry ? 'retrying' : 'failed', errorCode: e.code, errorMessage,
        httpStatus: e.httpStatus, durationMs: Date.now() - attemptStart,
        workerId: BATCH_ID, requestPayload, responseBody: e.raw,
      });

      if (willRetry) {
        await sleep(1000 * attempt); // backoff tuyến tính nhỏ trong lần chạy
        continue;
      }

      await query(
        `UPDATE posts SET status='failed', status_reason=$2, retry_count=$3, updated_at=now() WHERE id=$1`,
        [post.id, errorMessage, attempt],
      );
      return 'failed';
    }
  }
  return 'failed';
}

async function main(): Promise<void> {
  const started = Date.now();
  console.log(`[batch] ${BATCH_ID} bắt đầu`);

  const ids = await claimDuePosts(500);
  if (ids.length === 0) {
    console.log('[batch] không có bài nào đến hạn.');
    return;
  }
  console.log(`[batch] giành được ${ids.length} bài đến hạn`);

  const posts = await loadPosts(ids);
  const tally: Record<Outcome, number> = {
    success: 0, failed: 0, skipped: 0, rescheduled: 0,
  };

  for (let i = 0; i < posts.length; i++) {
    const outcome = await processOnePost(posts[i]);
    tally[outcome]++;
    console.log(`[batch] ${posts[i].id} → ${outcome}`);
    if (i < posts.length - 1) await sleep(SPACING_MS); // giãn cách chống spam
  }

  console.log(
    `[batch] xong trong ${Math.round((Date.now() - started) / 1000)}s — ` +
      `✅ ${tally.success}  ❌ ${tally.failed}  ⊘ ${tally.skipped}  ↻ ${tally.rescheduled}`,
  );
}

// Chạy → đóng pool → thoát. Thoát ĐÚNG mã để GitHub Actions báo trạng thái đúng:
// - Bài đăng lỗi KHÔNG làm job đỏ (đó là kết cục hợp lệ, đã ghi log).
// - Chỉ lỗi hạ tầng (mất kết nối DB...) mới làm job đỏ.
main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('[batch] LỖI HẠ TẦNG:', e);
    await pool.end().catch(() => undefined);
    process.exit(1);
  });
