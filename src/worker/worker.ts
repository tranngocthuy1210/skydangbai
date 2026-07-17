import { Worker, Job } from 'bullmq';
import { redisConnectionOptions } from '../shared/redis';
import { query } from '../shared/db';
import { env } from '../shared/env';
import { POST_QUEUE_NAME, PublishJobData } from '../shared/queue';
import { decryptToken } from '../shared/crypto';
import { getAdapter } from './adapters';
import { PublishError, TargetType } from './adapters/types';
import { refreshAccessToken } from './token.service';
import { checkRateLimit } from './rate-limiter';
import { writeLog } from './log.repository';

const WORKER_ID = `worker-${process.pid}`;

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

// Tên KHÔNG được là `process` — sẽ che biến `process` toàn cục của Node,
// khiến `process.pid` ở trên trỏ nhầm vào hàm này.
async function processJob(job: Job<PublishJobData>): Promise<void> {
  const { postId } = job.data;
  const attempt = job.attemptsMade + 1;
  const startedAt = Date.now();

  // 1) Nạp post + target + account + campaign trong 1 JOIN.
  const [post] = await query<PostRow>(
    `SELECT p.id, p.content, p.media_urls, p.status, p.platform_post_id,
            t.platform_target_id, t.target_type, t.is_publishable, t.publish_note,
            t.target_token_enc,
            sa.id AS account_id, sa.platform, sa.access_token_enc, sa.token_expires_at,
            c.user_id
     FROM posts p
     JOIN targets t          ON t.id = p.target_id
     JOIN social_accounts sa ON sa.id = t.social_account_id
     JOIN campaigns c        ON c.id = p.campaign_id
     WHERE p.id = $1`,
    [postId],
  );
  if (!post) return; // post đã bị xóa

  // 2) Idempotency: đã đăng thành công rồi thì bỏ qua (crash-safe).
  if (post.status === 'success' && post.platform_post_id) {
    console.log(`[worker] ${postId} đã đăng, bỏ qua`);
    return;
  }

  // 3) Official API only: target không có đường đăng hợp lệ thì bỏ qua ngay.
  // Đánh 'skipped' chứ không phải 'failed' — đây không phải lỗi hệ thống, và
  // gộp vào failed sẽ làm tỷ lệ thành công báo cáo sai.
  if (!post.is_publishable) {
    const reason =
      post.publish_note ??
      `Không hỗ trợ đăng tự động lên ${post.target_type} của ${post.platform} qua API chính thức.`;
    await query(`UPDATE posts SET status='skipped', status_reason=$2, updated_at=now() WHERE id=$1`, [
      postId,
      reason,
    ]);
    await writeLog({
      postId, userId: post.user_id, platform: post.platform, attempt,
      status: 'skipped', errorCode: 'UNSUPPORTED_TARGET', errorMessage: reason,
      durationMs: Date.now() - startedAt, workerId: WORKER_ID,
    });
    console.warn(`[worker] ⊘ ${postId} bỏ qua: ${reason}`);
    return; // KHÔNG throw → không retry
  }

  await query(`UPDATE posts SET status='processing', updated_at=now() WHERE id=$1`, [postId]);

  // 4) Rate limit theo account.
  const allowed = await checkRateLimit(post.account_id, post.platform);
  if (!allowed) {
    await writeLog({
      postId, userId: post.user_id, platform: post.platform, attempt,
      status: 'retrying', errorCode: 'RATE_LIMITED',
      errorMessage: 'Chạm trần rate limit cục bộ, hoãn lại',
      durationMs: Date.now() - startedAt, workerId: WORKER_ID,
    });
    throw new PublishError('RATE_LIMITED', true);
  }

  // 5) Chuẩn bị token.
  // Facebook cấp token RIÊNG cho từng Page (target_token_enc) — phải dùng đúng
  // token đó mới đăng được, và nó gần như không hết hạn nên bỏ qua refresh.
  let accessToken = decryptToken(post.target_token_enc ?? post.access_token_enc);
  const expiringSoon =
    !post.target_token_enc &&
    post.token_expires_at &&
    new Date(post.token_expires_at).getTime() - Date.now() < 5 * 60_000;
  if (expiringSoon) {
    try {
      accessToken = await refreshAccessToken(post.account_id, post.platform);
    } catch {
      await query(`UPDATE social_accounts SET status='needs_reauth' WHERE id=$1`, [post.account_id]);
      await writeLog({
        postId, userId: post.user_id, platform: post.platform, attempt,
        status: 'failed', errorCode: 'TOKEN_EXPIRED',
        errorMessage: 'Refresh token thất bại, cần kết nối lại',
        durationMs: Date.now() - startedAt, workerId: WORKER_ID,
      });
      await query(`UPDATE posts SET status='failed' WHERE id=$1`, [postId]);
      return; // KHÔNG throw → không retry vô ích
    }
  }

  // 6) Chọn adapter theo nền tảng.
  const adapter = getAdapter(post.platform);
  if (!adapter) {
    await writeLog({
      postId, userId: post.user_id, platform: post.platform, attempt,
      status: 'failed', errorCode: 'UNKNOWN',
      errorMessage: `Không hỗ trợ nền tảng: ${post.platform}`,
      durationMs: Date.now() - startedAt, workerId: WORKER_ID,
    });
    await query(`UPDATE posts SET status='failed' WHERE id=$1`, [postId]);
    return;
  }

  const requestPayload = { target: post.platform_target_id, content: post.content };

  // 7) Gọi API đăng bài + xử lý kết quả.
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
      [postId, result.platformPostId, result.permalink ?? null],
    );
    await writeLog({
      postId, userId: post.user_id, platform: post.platform, attempt,
      status: 'success', httpStatus: 200, durationMs: Date.now() - startedAt,
      workerId: WORKER_ID, requestPayload, responseBody: result.raw,
    });
    console.log(`[worker] ✅ ${postId} → ${result.platformPostId}`);
  } catch (err) {
    const e = err instanceof PublishError ? err : new PublishError('UNKNOWN', true);
    const isLastAttempt = attempt >= (job.opts.attempts ?? 1);
    const willRetry = e.retryable && !isLastAttempt;
    // Adapter từ chối vì nền tảng không có API cho loại target này → 'skipped'.
    const unsupported = e.code === 'UNSUPPORTED_TARGET';
    const errorMessage = (e.raw as any)?.error?.message ?? e.code;

    await writeLog({
      postId, userId: post.user_id, platform: post.platform, attempt,
      status: willRetry ? 'retrying' : unsupported ? 'skipped' : 'failed',
      errorCode: e.code,
      errorMessage,
      httpStatus: e.httpStatus, durationMs: Date.now() - startedAt,
      workerId: WORKER_ID, requestPayload, responseBody: e.raw,
    });

    if (willRetry) {
      console.warn(`[worker] ↻ ${postId} lỗi ${e.code}, sẽ retry (${attempt})`);
      throw e; // để BullMQ backoff & retry
    }

    if (unsupported) {
      await query(
        `UPDATE posts SET status='skipped', status_reason=$2, updated_at=now() WHERE id=$1`,
        [postId, errorMessage],
      );
      console.warn(`[worker] ⊘ ${postId} bỏ qua: ${errorMessage}`);
      return;
    }

    await query(
      `UPDATE posts SET status='failed', status_reason=$2, retry_count=$3, updated_at=now() WHERE id=$1`,
      [postId, errorMessage, attempt],
    );
    console.error(`[worker] ✗ ${postId} thất bại vĩnh viễn: ${e.code}`);
  }
}

const worker = new Worker<PublishJobData>(POST_QUEUE_NAME, processJob, {
  connection: redisConnectionOptions,
  concurrency: env.workerConcurrency,
  limiter: { max: 100, duration: 1000 }, // trần toàn cục 100 job/giây
});

worker.on('completed', (job) => console.log(`[worker] job ${job.id} xong`));
worker.on('failed', (job, err) =>
  console.error(`[worker] job ${job?.id} kết thúc fail: ${err.message}`),
);

console.log(`[worker] ${WORKER_ID} đang chạy, concurrency=${env.workerConcurrency}`);
