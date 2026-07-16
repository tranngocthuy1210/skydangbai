-- ============================================================
-- Migration 002 — Chính sách "Official API only"
--
-- Bối cảnh: Facebook đã gỡ Publishing to Groups API (2024). Không còn
-- endpoint hợp lệ nào để đăng bài lên Group bằng Graph API. Đăng lên
-- Group chỉ còn khả thi bằng automation trình duyệt — vi phạm Platform
-- Terms và có rủi ro khóa tài khoản của khách hàng.
--
-- Quyết định: hệ thống chỉ đăng qua API chính thức. Target nào không có
-- đường đăng hợp lệ thì đánh dấu is_publishable=false, chặn ngay từ khâu
-- tạo campaign thay vì để worker fail lúc 20h.
-- ============================================================

-- 1. TARGETS: đánh dấu target nào thực sự đăng được -----------
ALTER TABLE targets
  ADD COLUMN IF NOT EXISTS is_publishable BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE targets
  ADD COLUMN IF NOT EXISTS publish_note TEXT;

COMMENT ON COLUMN targets.is_publishable IS
  'false = không có API chính thức để đăng (vd: Facebook Group). UI hiện disabled + tooltip publish_note.';

-- Khóa các Facebook Group đang tồn tại trong DB.
UPDATE targets t
SET is_publishable = false,
    publish_note   = 'Facebook đã gỡ Publishing to Groups API. Không thể đăng tự động qua API chính thức. Hãy dùng Facebook Page.'
FROM social_accounts sa
WHERE sa.id = t.social_account_id
  AND sa.platform = 'facebook'
  AND t.target_type = 'group'
  AND t.is_publishable = true;

-- 2. POSTS: thêm trạng thái 'skipped' -------------------------
-- 'skipped' ≠ 'failed'. Bài bị bỏ qua vì target không đăng được không phải
-- là lỗi hệ thống — gộp chung sẽ làm tỷ lệ thành công báo cáo sai.
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE posts ADD CONSTRAINT posts_status_check
  CHECK (status IN ('scheduled','queued','processing','success','failed','skipped','cancelled'));

-- Lý do bỏ qua / thất bại, để UI Post Logs hiển thị mà không phải JOIN logs.
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS status_reason TEXT;

-- 3. Index cho feeder: chỉ nạp bài có target đăng được --------
CREATE INDEX IF NOT EXISTS idx_targets_publishable
  ON targets(social_account_id) WHERE is_publishable AND is_active;
