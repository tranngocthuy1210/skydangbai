import { query } from '../shared/db';

// Stub auth cho demo: lấy userId từ header 'x-user-id'.
// Nếu không có → dùng user đầu tiên trong DB (user demo do seed tạo).
// Production: thay bằng JWT guard trích userId từ token.
export async function resolveUserId(headerUserId?: string): Promise<string> {
  if (headerUserId) return headerUserId;
  const [u] = await query('SELECT id FROM users ORDER BY created_at LIMIT 1');
  if (!u) throw new Error('Chưa có user nào — hãy chạy: npm run seed');
  return u.id;
}
