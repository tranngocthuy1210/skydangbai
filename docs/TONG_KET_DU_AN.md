# SkyĐăngBài — Tổng kết dự án & Bản thiết kế để tái dựng

> Tài liệu gói lại **mọi quyết định đã chốt**, kiến trúc, cấu hình và bài học —
> đủ để hiểu hệ thống hoặc dựng lại từ đầu cho một project mới.
> Cập nhật tới commit `6066dc4`.

---

## 1. Sản phẩm là gì

SaaS **đăng bài tự động lên Facebook Page** (và mở rộng được sang LinkedIn, X…).
Người dùng đăng nhập → kết nối Page → tạo chiến dịch (nội dung + ảnh + hẹn giờ) →
hệ thống tự đăng lên Page qua **API chính thức của Facebook** → xem nhật ký chi tiết.

**Toàn bộ chạy với chi phí 0 đồng** (không có server chạy 24/7).

---

## 2. Bốn quyết định nền tảng (quan trọng nhất — đọc kỹ)

### 2.1. CHỈ dùng API chính thức — chỉ đăng lên PAGE, không Group

- Facebook đã **gỡ API đăng bài lên Group từ 2024**; đăng lên profile cá nhân bị bỏ từ 2018. **Không có đường API hợp lệ nào cho Group.**
- Cách duy nhất đăng Group = **automation trình duyệt bằng cookie** (kiểu dangbaitudong, extension Chrome). Nó **vi phạm điều khoản Facebook và làm khóa tài khoản** người dùng.
- → Quyết định: **không xây automation Group.** Định vị sản phẩm cho **Page/Business** — cùng thị trường Buffer/Hootsuite/Publer, bền và bán được.
- Được thực thi ở **3 lớp**: DB (`is_publishable`), API (chặn lúc tạo campaign), adapter (`UNSUPPORTED_TARGET`, không retry).

### 2.2. Kiến trúc "batch miễn phí" thay vì hàng đợi 24/7

- Ban đầu thiết kế queue (BullMQ + Redis + worker chạy liên tục) → chính xác từng phút nhưng **tốn ~5$/tháng** tiền server.
- Vì chỉ cần đăng 1–2 lần/ngày → **bỏ Redis/BullMQ**, thay bằng **một script batch chạy theo cron trên GitHub Actions**. Chạy một lần → xử lý mọi bài đến hạn → tắt.
- **Đánh đổi:** bài chỉ lên vào các cửa sổ cron (mặc định 08:00 & 20:00 giờ VN), cron GitHub có thể trễ 5–15 phút. Đổi lại: **0 đồng, không server 24/7.**

### 2.3. API NestJS chạy dạng serverless trên Vercel

- Các endpoint đều là request/response ngắn (query/insert DB) → hợp serverless.
- Bọc nguyên app NestJS thành **một Vercel function** (`api/index.ts`) thay vì viết lại — giữ toàn bộ module, adapter, lớp mã hóa.

### 2.4. An toàn theo mặc định (auth)

- Guard JWT **toàn cục**: mọi endpoint mặc định **khóa**, phải gắn `@Public()` mới mở. Quên bảo vệ = bị khóa (lộ ra khi test), **không hở âm thầm ra internet**.

---

## 3. Kiến trúc tổng thể

```
┌─────────────┐     đăng nhập / tạo campaign / upload ảnh
│  Người dùng │ ──────────────────────────────────────────┐
└─────────────┘                                            ▼
                                              ┌───────────────────────────┐
  Frontend (Next.js)                          │  API (NestJS serverless)  │
  skydangbai.vercel.app  ── gọi API ────────► │  skydangbai-api.vercel.app│
  (Vercel project #1)                         │  (Vercel project #2)      │
                                              └──────────┬────────────────┘
                                                         │ đọc/ghi
                                                         ▼
                                              ┌───────────────────────────┐
   ẢNH: upload ──► Vercel Blob (public) ◄──── │   Neon Postgres (free)    │
                        ▲                      └──────────┬────────────────┘
                        │ Facebook tải ảnh                │ đọc bài đến hạn
                        │                                 ▼
                        │                      ┌───────────────────────────┐
                        │                      │  Batch đăng bài           │
                        └───────────────────── │  GitHub Actions (cron)    │
                                               │  08:00 & 20:00 giờ VN     │
                                               └──────────┬────────────────┘
                                                          │ Graph API /feed, /photos
                                                          ▼
                                                   ┌──────────────┐
                                                   │  Facebook    │
                                                   │  Page        │
                                                   └──────────────┘
```

**Không có tiến trình nào chạy 24/7.** Mọi thứ hoặc là serverless (bật khi có request),
hoặc là job chạy-rồi-tắt (batch), hoặc là dịch vụ được quản lý (Neon, Blob).

---

## 4. Tech stack

| Lớp | Công nghệ | Vì sao |
|---|---|---|
| Backend | NestJS 10 + TypeScript | Module rõ ràng, DI, hợp serverless |
| Database | PostgreSQL (Neon free) | SSL bắt buộc; dùng chuỗi **pooled** cho serverless, **direct** cho migrate/batch |
| Truy vấn | `pg` thuần + SQL | Không ORM — chủ động cho các query analytics |
| Mã hóa token | AES-256-GCM (`crypto`) | Token MXH mã hóa at-rest |
| Auth | `@nestjs/jwt` + `bcryptjs` | bcryptjs (JS thuần) chạy được serverless, khác bcrypt native |
| Kho ảnh | Vercel Blob (public) | Bật 1 nút trong dashboard, tự set token |
| Batch/cron | GitHub Actions | Miễn phí, chạy-rồi-tắt |
| Frontend | Next.js 14 (App Router) + Tailwind + lucide-react | |
| Deploy | Vercel × 2 project (API + web) | |
| CI | GitHub Actions (`ci.yml`) | Biên dịch backend + frontend mỗi lần push |

---

## 5. Tính năng đã xây

- **Xác thực**: đăng ký/đăng nhập (JWT), guard toàn cục, tự đá về login khi hết hạn.
- **Kết nối Facebook Page** (OAuth): đổi code → token dài hạn → lấy **Page token riêng từng Page** → lưu mã hóa. Đồng bộ ngược: bỏ chọn Page nào thì ngắt Page đó.
- **Tạo chiến dịch**: nội dung, **emoji**, **ảnh (tải từ máy)**, hashtag, AI viết lại, hẹn giờ; fan-out mỗi target = 1 bài độc lập.
- **Batch đăng bài**: cron, phân loại lỗi (rate-limit → hoãn, tạm thời → retry trong lần chạy, vĩnh viễn → bỏ), dùng đúng Page token.
- **Đăng ảnh**: qua Graph `/photos` (không phải chỉ link xem trước).
- **Nhật ký (Post Logs)**: thẻ tổng bấm được, lọc lưu URL, lỗi dịch sang tiếng người kèm nút khắc phục, timeline từng bài + request/response thô (đã redact token).
- **Chi tiết chiến dịch**: bấm vào campaign → xem từng bài con + trạng thái.
- **Kiểm tra kết nối** (`verify-connections`): chạy trên GitHub Actions, xác nhận token còn sống mà không đăng gì.

---

## 6. Hạ tầng & cấu hình (bảng tái dựng)

### Ba nơi cần tài khoản (đều free)
1. **Neon** (Postgres) — neon.tech
2. **Vercel** (2 project: API + web, + Blob storage) — vercel.com
3. **GitHub** (repo + Actions) — nơi chứa code & chạy batch
4. **Meta for Developers** (Facebook App loại Business) — developers.facebook.com

### Biến môi trường

| Biến | Đặt ở đâu | Ghi chú |
|---|---|---|
| `DATABASE_URL` | Vercel API (**pooled**) + GitHub Secret (**direct**) | Neon; serverless cần pooled, migrate/batch cần direct |
| `TOKEN_ENC_KEY` | Vercel API + GitHub Secret (**giống hệt nhau**) | 64 hex. Mã hóa Page token. Vercel mã hóa, GitHub giải mã |
| `JWT_SECRET` | Vercel API | **Khác** TOKEN_ENC_KEY. Rỗng = từ chối mọi request |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | Vercel API | Từ Meta App |
| `FACEBOOK_REDIRECT_URI` | Vercel API | `https://<api>/api/social-accounts/facebook/callback` — phải khai y hệt trong Meta App |
| `FRONTEND_URL` | Vercel API | Nơi đưa user về sau OAuth |
| `CORS_ORIGIN` | Vercel API | Domain frontend |
| `BLOB_READ_WRITE_TOKEN` | Vercel API (tự set khi nối Blob store) | ⚠️ Phải ở project **API**, không phải frontend |
| `NEXT_PUBLIC_API_URL` | Vercel web | Trỏ tới domain API |
| `ANTHROPIC_API_KEY` | Vercel API + GitHub Secret | Tùy chọn — trống thì AI chạy fallback |

### GitHub Actions workflows
- `ci.yml` — biên dịch BE+FE mỗi push (chạy tự động).
- `db-setup.yml` — migrate (+ seed tùy chọn) lên Neon (chạy tay).
- `post-scheduler.yml` — batch đăng bài (cron 08:00 & 20:00 VN + chạy tay).
- `verify-connections.yml` — kiểm tra token Page còn sống (chạy tay).

### Vercel: hai project, hai Root Directory
- **`skydangbai-api`**: Root = **gốc repo** (dùng `vercel.json` ở gốc, framework **Other**).
- **`skydangbai`**: Root = **`web`** (framework **Next.js** — đã ép bằng `web/vercel.json`).

---

## 7. Mô hình bảo mật

- **Token MXH mã hóa at-rest** bằng AES-256-GCM. Redact token trước khi ghi `post_logs`.
- **Hai khóa tách biệt**: `TOKEN_ENC_KEY` (mã hóa token) ≠ `JWT_SECRET` (ký phiên đăng nhập).
- **OAuth `state` là JWT ngắn hạn có ký** (10 phút) — chống CSRF, không ai gắn Facebook của họ vào tài khoản người khác được.
- **An toàn theo mặc định**: guard toàn cục, endpoint phải chủ động `@Public()`.
- **Thu hồi đúng cách**: đổi khóa mã hóa phải kèm **gỡ app trên Facebook** (token cũ chết) + **kết nối lại** (mã hóa lại bằng khóa mới).

> ⚠️ **Bài học xương máu:** không bao giờ để khóa bí mật (TOKEN_ENC_KEY, JWT_SECRET,
> App Secret) xuất hiện trong chat/log/transcript. Khóa nào từng lộ ra thì coi như
> không còn bí mật — phải thay ngay.

---

## 8. Giới hạn đã biết & việc còn lại

| Việc | Trạng thái |
|---|---|
| Đăng lên **Group** | ❌ Không làm — không có API, rủi ro khóa tài khoản (quyết định cố ý) |
| **Đổi font / in đậm** trong bài | ❌ Facebook không hỗ trợ — bài Page là text thuần (emoji thì được) |
| **Nhiều ảnh** một bài | ⬜ Chưa — hiện 1 ảnh/bài |
| **App Review** của Meta | ⬜ Chỉ cần khi đăng lên Page của **người khác**; Page của mình thì Dev mode là đủ |
| Đăng **đúng giờ từng phút** | ⚠️ Không — batch chạy theo cửa sổ cron (đánh đổi của kiến trúc free) |
| Quản lý thành viên / nhiều user một tổ chức | ⬜ Chưa (schema dùng `user_id`, chưa có `organization`) |
| Đổi mật khẩu / quên mật khẩu | ⬜ Chưa |

---

## 9. Bài học vận hành (quy trình đã hiệu quả)

1. **CI làm trình biên dịch.** Máy dev không cài Node — mỗi push, GitHub Actions biên dịch cả BE+FE, bắt lỗi trước khi deploy. Đây là cách "chạy thử" khi không có môi trường local.
2. **Push nhỏ, kiểm từng bước.** Mỗi commit một việc, xem CI xanh rồi mới đi tiếp. Không chồng code chưa chạy lên code chưa chạy.
3. **Thông báo lỗi phải trung thực.** Lỗi tự tin mà sai (vd script kiểm tra khẳng định "lệch khóa" trong khi thật ra là "chưa kết nối lại") đẩy người ta sửa nhầm chỗ — tệ hơn không có.
4. **Fail loud khi thiếu cấu hình.** Thiếu `DATABASE_URL`/`JWT_SECRET` → báo thẳng, đừng lặng lẽ lùi về mặc định rồi lỗi khó hiểu.
5. **Xác minh bằng bằng chứng, không bằng niềm tin.** "Ready/xanh" chỉ là build xong — phải mở endpoint/log/Facebook Page thật để xác nhận.

---

## 10. Dựng lại cho project mới — thứ tự

1. **Clone repo** (hoặc dùng làm khung).
2. **Neon**: tạo project → lấy 2 chuỗi (pooled + direct).
3. **GitHub**: push code → thêm Secrets (`DATABASE_URL` direct, `TOKEN_ENC_KEY`) → chạy `db-setup.yml` (migrate).
4. **Meta App**: tạo app Business → lấy App ID + Secret → thêm Facebook Login → khai Redirect URI (điền sau khi có domain API).
5. **Vercel project API**: import repo, Root = gốc, framework Other → thêm env (DATABASE_URL pooled, TOKEN_ENC_KEY **giống GitHub**, JWT_SECRET, FACEBOOK_*, CORS_ORIGIN…) → deploy → test `/api/health`.
6. **Vercel Blob**: tạo store (Public) → nối vào project **API** (tick read-write token) → Redeploy.
7. **Vercel project web**: import repo, Root = `web`, framework Next.js → env `NEXT_PUBLIC_API_URL` → deploy.
8. **Hoàn tất Meta**: dán Redirect URI thật vào Meta App.
9. **Dùng thử**: đăng ký → kết nối Page → tạo chiến dịch → chạy `post-scheduler.yml` → xem Facebook Page.

---

## 11. Bản đồ mã nguồn (nơi tìm từng thứ)

```
migrations/            001 init · 002 official-api-only · 003 page-token
.github/workflows/     ci · db-setup · post-scheduler · verify-connections
api/index.ts           Bọc NestJS thành Vercel serverless function
vercel.json            Cấu hình build project API
src/
  shared/              db (SSL), crypto (AES-GCM), env, queue, redis
  common/auth.ts       Guard JWT toàn cục, @Public, @CurrentUser
  modules/
    auth/              đăng ký/đăng nhập, ký OAuth state
    campaigns/         tạo campaign (fan-out), chi tiết
    social-accounts/   OAuth Facebook, danh sách Page (facebook-oauth.service.ts)
    post-logs/         nhật ký, summary, timeline
    uploads/           nhận ảnh → Vercel Blob
    ai/                spin nội dung, hashtag, giờ vàng (Claude)
  worker/adapters/     facebook (/feed + /photos), linkedin, mock — phân loại lỗi
  batch/
    run-due-posts.ts   ★ batch đăng bài (thay worker+feeder)
    verify-connections.ts  kiểm tra token Page
web/
  app/(app)/           dashboard, campaigns, campaigns/[id], campaigns/new,
                       logs, logs/[postId], accounts
  app/login, register  ngoài layout app (không sidebar)
  components/          Sidebar, AuthForm, AuthGate, StatusBadge, LogsTable,
                       TargetPicker, EmojiPicker, DemoBanner…
  lib/                 api (client + demo), auth-store, image (resize), icons, errors
  vercel.json          Ép framework Next.js
```
