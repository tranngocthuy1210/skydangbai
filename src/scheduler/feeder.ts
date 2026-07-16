import cron from 'node-cron';
import { query } from '../shared/db';
import { postQueue } from '../shared/queue';

interface DuePost {
  id: string;
  scheduled_at: string;
  idempotency_key: string;
}

// Quét post 'scheduled' đến giờ trong 2 phút tới → chuyển 'queued' → đẩy vào BullMQ.
// FOR UPDATE SKIP LOCKED cho phép chạy nhiều feeder song song mà không nạp trùng.
async function feedDuePosts(): Promise<void> {
  const rows = await query<DuePost>(`
    UPDATE posts
    SET status = 'queued', updated_at = now()
    WHERE id IN (
      SELECT id FROM posts
      WHERE status = 'scheduled'
        AND scheduled_at <= now() + interval '2 minutes'
      ORDER BY scheduled_at
      LIMIT 500
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, scheduled_at, idempotency_key;
  `);

  for (const post of rows) {
    const delay = Math.max(0, new Date(post.scheduled_at).getTime() - Date.now());
    await postQueue.add(
      'publish',
      { postId: post.id },
      {
        delay,
        jobId: post.idempotency_key, // chống enqueue trùng
        attempts: 5,
        backoff: { type: 'exponential', delay: 60_000 },
        removeOnComplete: 1000,
        removeOnFail: false, // giữ job fail làm Dead Letter Queue
      },
    );
  }

  if (rows.length) console.log(`[feeder] đã nạp ${rows.length} bài vào queue`);
}

// Chạy mỗi phút.
cron.schedule('* * * * *', () => {
  feedDuePosts().catch((e) => console.error('[feeder] lỗi:', e));
});

// Chạy ngay 1 lần khi khởi động cho nhanh.
feedDuePosts().catch((e) => console.error('[feeder] lỗi:', e));

console.log('[feeder] đang chạy — quét mỗi phút');
