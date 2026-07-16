import * as crypto from 'crypto';
import { pool, query } from '../src/shared/db';
import { encryptToken } from '../src/shared/crypto';

// Tạo dữ liệu demo để test luồng end-to-end với nền tảng 'mock'.
async function seed() {
  // 1) User demo.
  const [user] = await query(
    `INSERT INTO users (email, password_hash, full_name, plan)
     VALUES ('demo@autoposter.local', 'x', 'Người dùng Demo', 'pro')
     ON CONFLICT (email) DO UPDATE SET updated_at = now()
     RETURNING id`,
  );
  console.log('user:', user.id);

  // 2) Tài khoản MXH mock (token được mã hóa).
  const [acc] = await query(
    `INSERT INTO social_accounts
       (user_id, platform, platform_user_id, display_name, access_token_enc, status)
     VALUES ($1, 'mock', 'mock-user-1', 'Tài khoản Mock', $2, 'active')
     ON CONFLICT (user_id, platform, platform_user_id)
       DO UPDATE SET updated_at = now()
     RETURNING id`,
    [user.id, encryptToken('fake-access-token')],
  );
  console.log('account:', acc.id);

  // 3) Vài target (group/page).
  const targetNames = [
    ['group', 'Cộng đồng Marketing VN'],
    ['group', 'Nhóm Khởi nghiệp 4.0'],
    ['page', 'Trang Sản phẩm A'],
  ];
  const targetIds: string[] = [];
  for (let i = 0; i < targetNames.length; i++) {
    const [t] = await query(
      `INSERT INTO targets
         (social_account_id, target_type, platform_target_id, name, member_count)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (social_account_id, platform_target_id)
         DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [acc.id, targetNames[i][0], `mock-target-${i + 1}`, targetNames[i][1], 1000 * (i + 1)],
    );
    targetIds.push(t.id);
  }
  console.log('targets:', targetIds);

  // 4) 1 campaign demo + posts hẹn giờ 20 giây tới → worker sẽ xử lý.
  const [camp] = await query(
    `INSERT INTO campaigns
       (user_id, name, content_template, schedule_type, status)
     VALUES ($1, 'Chiến dịch Demo', 'Xin chào từ hệ thống đăng bài tự động!', 'once', 'scheduled')
     RETURNING id`,
    [user.id],
  );
  const scheduledAt = new Date(Date.now() + 20_000);
  for (const targetId of targetIds) {
    const key = crypto.createHash('sha256')
      .update(`${camp.id}:${targetId}`).digest('hex').slice(0, 40);
    await query(
      `INSERT INTO posts
         (campaign_id, target_id, content, scheduled_at, status, idempotency_key)
       VALUES ($1, $2, $3, $4, 'scheduled', $5)`,
      [camp.id, targetId, 'Xin chào từ hệ thống đăng bài tự động! 🚀', scheduledAt, key],
    );
  }
  console.log(`campaign: ${camp.id} — 3 bài hẹn lúc ${scheduledAt.toLocaleTimeString()}`);

  console.log('\n✅ Seed xong. Bật worker + feeder rồi chờ ~20s để thấy log chạy.');
  console.log(`   X-User-Id để test API: ${user.id}`);
  await pool.end();
}

seed().catch((e) => {
  console.error('[seed] lỗi:', e);
  process.exit(1);
});
