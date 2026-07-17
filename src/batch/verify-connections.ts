// ============================================================
// KIỂM TRA KẾT NỐI — không đăng gì cả.
//
// Chạy TRÊN GITHUB ACTIONS, cố ý đi đúng con đường mà batch đăng bài đi:
// đọc token từ Neon → giải mã bằng TOKEN_ENC_KEY của GitHub → hỏi Facebook
// token còn sống không. Khác batch đúng một điểm: gọi GET /{page-id} để đọc
// tên Page, thay vì POST /feed để đăng bài.
//
// VÌ SAO PHẢI CHẠY Ở ĐÂY MÀ KHÔNG PHẢI TRÊN VERCEL: Vercel là nơi mã hóa token
// lúc kết nối, nên nó giải mã bằng chính khóa nó vừa dùng — luôn thành công,
// chứng minh được gì. Lỗi thật chỉ lộ ra khi khóa của GitHub lệch khóa Vercel,
// và chỉ script chạy ở GitHub mới bắt được.
//
// Dùng khi: vừa đổi TOKEN_ENC_KEY, hoặc nghi token bị gỡ quyền.
// ============================================================
import { pool, query } from '../shared/db';
import { decryptToken } from '../shared/crypto';

const GRAPH = 'https://graph.facebook.com/v19.0';

interface Row {
  target_name: string;
  platform: string;
  platform_target_id: string;
  target_token_enc: string | null;
  account_token_enc: string;
  account_name: string | null;
}

async function main(): Promise<void> {
  const rows = await query<Row>(
    `SELECT t.name AS target_name, t.platform_target_id, t.target_token_enc,
            sa.platform, sa.access_token_enc AS account_token_enc,
            sa.display_name AS account_name
     FROM targets t
     JOIN social_accounts sa ON sa.id = t.social_account_id
     WHERE sa.platform = 'facebook' AND t.is_active = true
     ORDER BY t.name`,
  );

  if (rows.length === 0) {
    console.log('[verify] Chưa có Page Facebook nào được kết nối.');
    return;
  }

  console.log(`[verify] Kiểm tra ${rows.length} Page Facebook...\n`);
  let ok = 0;
  let bad = 0;

  for (const r of rows) {
    // --- Bước 1: giải mã. Hỏng ở đây = TOKEN_ENC_KEY lệch. ---
    let token: string;
    try {
      token = decryptToken(r.target_token_enc ?? r.account_token_enc);
    } catch {
      console.error(
        `❌ ${r.target_name}\n` +
          `   KHÔNG GIẢI MÃ ĐƯỢC token.\n` +
          `   → TOKEN_ENC_KEY của GitHub đang LỆCH với khóa mà Vercel dùng lúc kết nối.\n` +
          `   → Sửa: đặt cùng một khóa ở cả hai nơi, rồi chạy lại luồng connect.`,
      );
      bad++;
      continue;
    }

    // --- Bước 2: hỏi Facebook token còn sống không. ---
    // Token đặt ở header, KHÔNG nhét vào URL — tránh lọt vào log của runner.
    try {
      const res = await fetch(`${GRAPH}/${r.platform_target_id}?fields=name,fan_count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body: any = await res.json().catch(() => ({}));

      if (body?.error) {
        console.error(
          `❌ ${r.target_name}\n` +
            `   Giải mã OK, nhưng Facebook từ chối token: ${body.error.message}\n` +
            `   → Thường do gỡ quyền app hoặc token bị thu hồi. Sửa: kết nối lại.`,
        );
        bad++;
        continue;
      }

      console.log(`✅ ${r.target_name} — Facebook xác nhận: "${body.name}"`);
      ok++;
    } catch {
      console.error(`❌ ${r.target_name}: không gọi được Facebook (lỗi mạng)`);
      bad++;
    }
  }

  console.log(`\n[verify] Kết quả: ✅ ${ok} tốt   ❌ ${bad} có vấn đề`);
  if (bad > 0) {
    // Thoát mã 1 để job GitHub hiện ĐỎ — có vấn đề thì phải thấy ngay,
    // không để lẫn vào đống log xanh.
    process.exitCode = 1;
  }
}

main()
  .then(async () => {
    await pool.end();
  })
  .catch(async (e) => {
    console.error('[verify] LỖI HẠ TẦNG:', e);
    await pool.end().catch(() => undefined);
    process.exit(1);
  });
