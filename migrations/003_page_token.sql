-- ============================================================
-- Migration 003 — Token cấp Page cho Facebook
--
-- Vì sao cần: Facebook cấp cho MỖI PAGE một access token RIÊNG, khác với token
-- của tài khoản người dùng. Muốn đăng lên Page phải dùng đúng Page token đó.
--
-- Schema hiện tại chỉ lưu token ở cấp tài khoản (social_accounts.access_token_enc),
-- nên worker/batch đang truyền nhầm token người dùng vào adapter. Đây là lỗ hổng
-- đã nêu từ bản thiết kế Phase 2 nhưng migration rút gọn bỏ mất.
-- ============================================================

-- Page access token (đã mã hóa AES-256-GCM ở tầng app, KHÔNG bao giờ là plaintext).
-- NULL = target dùng chung token của tài khoản (vd nền tảng mock, LinkedIn cá nhân).
ALTER TABLE targets
  ADD COLUMN IF NOT EXISTS target_token_enc TEXT;

COMMENT ON COLUMN targets.target_token_enc IS
  'Token riêng của target (Facebook Page token). NULL = dùng social_accounts.access_token_enc.';

-- Token dài hạn của Facebook Page gần như không hết hạn, nhưng vẫn cần biết
-- lần cuối đồng bộ để phát hiện Page bị gỡ quyền.
ALTER TABLE targets
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
