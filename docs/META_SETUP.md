# Kết nối Facebook — Đăng ký Meta App

Hướng dẫn lấy **App ID + App Secret** để hệ thống đăng bài lên Facebook Page
qua API chính thức.

## ⚠️ Đọc trước: App Review

| Muốn đăng lên... | Cần App Review? |
|---|---|
| **Page của chính bạn** (bạn là admin) | ❌ Không — chỉ cần app ở Development mode |
| Page của **người dùng khác** | ✅ Có — kèm Business Verification (vài ngày–tuần) |

→ Giai đoạn test/MVP: dùng Page của bạn, bỏ qua review hoàn toàn.

## ⚠️ Phải là PAGE, không phải profile cá nhân

Facebook **không** cho đăng tự động lên trang cá nhân qua API. Bạn cần một
**Facebook Page (Fanpage)**. Chưa có thì tạo miễn phí tại facebook.com/pages/create.

---

## Bước 1 — Tạo app

1. Vào **developers.facebook.com** → đăng nhập bằng tài khoản Facebook.
2. Góc phải: **My Apps** → **Create App**.
3. Use case: chọn **Other** → **Next**.
4. App type: chọn **Business** → **Next**.
5. Đặt tên app (vd "SkyDangBai"), điền email → **Create app**.

## Bước 2 — Lấy App ID + App Secret

1. Trong app → menu trái **App settings** → **Basic**.
2. **App ID**: dãy số — công khai, không sao.
3. **App secret**: bấm **Show** → copy.
   - 🔒 App Secret là **bí mật tuyệt đối**. KHÔNG bao giờ đưa vào code hay đẩy
     lên GitHub. Nó sẽ được lưu ở biến môi trường của backend (như secret trên
     GitHub Actions / Vercel).

## Bước 3 — Thêm Facebook Login

1. Dashboard app → **Add Product**.
2. Tìm **Facebook Login for Business** → **Set up**.

## Bước 4 — Quyền (permissions) cần dùng

Hệ thống sẽ xin các quyền:
- `pages_show_list` — liệt kê Page bạn quản lý
- `pages_read_engagement` — đọc thông tin Page
- `pages_manage_posts` — đăng bài lên Page

(Với Page của chính bạn ở Development mode, các quyền này dùng được ngay mà
không cần review.)

## Bước 5 — Redirect URI (điền SAU khi deploy API)

1. Menu trái **Facebook Login** → **Settings**.
2. Ô **Valid OAuth Redirect URIs**: sẽ điền địa chỉ callback của backend, dạng:
   ```
   https://<domain-api-của-bạn>/api/social-accounts/facebook/callback
   ```
3. **Chưa deploy API nên chưa có domain** — để trống, quay lại điền sau khi có.

## Bước 6 — Thêm chính bạn làm tester (để test không cần review)

1. App đang ở chế độ **Development** (mặc định) — giữ nguyên.
2. Menu trái **App roles** → **Roles** → chắc chắn tài khoản của bạn là
   **Administrator** (mặc định người tạo app đã là admin).

---

## Ba giá trị sẽ đưa cho backend (khi tới bước code)

| Biến môi trường | Lấy từ |
|---|---|
| `FACEBOOK_APP_ID` | Bước 2 |
| `FACEBOOK_APP_SECRET` | Bước 2 (bí mật) |
| `FACEBOOK_REDIRECT_URI` | Bước 5 (sau khi deploy API) |

Xong bước 1–2 (có App ID + App Secret) là đủ để đi tiếp. Bước 5 chờ deploy API.
