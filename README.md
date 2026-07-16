# SkyĐăngBài — Hệ thống SaaS đăng bài tự động

Đăng bài tự động lên mạng xã hội, kiến trúc **tách API ↔ Queue ↔ Worker**.
Stack: **NestJS · PostgreSQL · Redis + BullMQ · Next.js · TypeScript**.

- **Frontend (demo):** https://skydangbai.vercel.app *(chưa deploy)*
- **Backend:** chưa deploy — [xem vì sao](#-chưa-được-deploy-backend-công-khai)

## ⚖️ Quyết định kiến trúc: chỉ dùng API chính thức

Hệ thống **chỉ đăng bài qua API chính thức** của nền tảng. Không dùng automation
trình duyệt, không dùng cookie/token lấy bằng đường không chính thức.

| Nền tảng | Đăng được | Ghi chú |
|---|---|---|
| Facebook **Page** | ✅ | Graph API `/{page-id}/feed` + `pages_manage_posts` |
| Facebook **Group** | ❌ | Facebook đã gỡ Publishing to Groups API (2024) — **không có** đường hợp lệ |
| LinkedIn (person/organization) | ✅ | UGC Posts API |
| X, Threads, TikTok | 🔜 | Thêm adapter khi cần |

**Vì sao:** đăng lên Group chỉ còn khả thi bằng automation trình duyệt — vi phạm
Platform Terms, khiến **tài khoản khách hàng bị khóa**, và đẩy rủi ro pháp lý về
phía nhà cung cấp dịch vụ. Định vị sản phẩm là *Social Publishing cho Page/Business*.

Chính sách được thực thi ở **3 lớp** (target không hợp lệ bị chặn càng sớm càng tốt):

1. **DB** — `targets.is_publishable = false` + `publish_note` (migration 002).
2. **API** — `POST /api/campaigns` trả `400` kèm `blockedTargets` → user biết ngay khi bấm nút.
3. **Adapter/Worker** — hàng rào cuối: `PublishError('UNSUPPORTED_TARGET', retryable=false)`
   → post thành `skipped`, **không retry**, không đốt quota.

> `skipped` ≠ `failed`: bài bị bỏ qua không phải lỗi hệ thống, nên không tính vào
> mẫu số của `success_rate`.

## Kiến trúc thư mục

```
├── docker-compose.yml        # Postgres + Redis
├── migrations/
│   ├── 001_init.sql           # Schema (users, social_accounts, targets, campaigns, posts, post_logs)
│   └── 002_official_api_only.sql # is_publishable, status 'skipped', status_reason
├── scripts/
│   ├── migrate.ts             # Chạy migration
│   └── seed.ts                # Tạo dữ liệu demo (nền tảng 'mock')
├── src/                       # ===== BACKEND =====
│   ├── main.ts                # Bootstrap API (NestJS)
│   ├── app.module.ts
│   ├── shared/                # db, redis, crypto, queue, env (dùng chung API + worker)
│   ├── common/                # resolveUserId (stub auth)
│   ├── modules/               # campaigns, post-logs, social-accounts, health
│   ├── scheduler/feeder.ts    # Cronjob nạp bài đến giờ vào queue
│   └── worker/                # worker.ts + adapters (facebook, linkedin, mock)
└── web/                       # ===== FRONTEND (Next.js 14 + Tailwind) =====
    ├── app/(app)/logs/        # ★★ Post Logs — trang trung tâm + timeline chi tiết
    ├── app/(app)/campaigns/   # ★ Wizard tạo bài 3 bước (new/)
    ├── app/(app)/accounts/    # Tài khoản + Page (Group hiện nhưng khóa, kèm lý do)
    ├── components/            # StatusBadge, LogsTable, SummaryCards, TargetPicker…
    └── lib/                   # api client, types, errors.ts (dịch mã lỗi → tiếng người)
```

## 4 tiến trình chạy độc lập (scale riêng)

| Tiến trình | Lệnh | Cổng | Vai trò |
|---|---|---|---|
| API | `npm run start:api` | 3000 | Nhận request, tạo campaign, đọc logs |
| Feeder | `npm run start:feeder` | — | Quét post đến giờ → đẩy vào queue |
| Worker | `npm run start:worker` | — | Rút job → gọi API MXH → ghi post_logs |
| Web | `cd web && npm run dev` | 3001 | Giao diện (Next.js) |

> ⚠️ **Frontend `web/` chưa từng được chạy hay typecheck** (máy phát triển chưa cài
> Node lúc viết). Lần chạy đầu tiên hãy `cd web && npm install && npm run typecheck`
> trước, và coi mọi lỗi phát sinh là bình thường.

## 🚀 Deploy

### Vercel chạy được gì, không chạy được gì

| Thành phần | Vercel? | Vì sao |
|---|---|---|
| `web/` (Next.js) | ✅ | Đúng thứ Vercel sinh ra để làm. Tên miền `*.vercel.app` miễn phí |
| API (NestJS) | ⚠️ | Phải bọc thành serverless function, mất SSE/WebSocket |
| **Worker (BullMQ)** | ❌ | **Phải sống 24/7 để rút job. Serverless chết sau vài giây** |
| **Feeder (cron 30s)** | ❌ | Vercel Cron gói free chỉ chạy 1 lần/ngày |
| Postgres, Redis | ❌ | Vercel không cung cấp |

Nói ngắn: **frontend lên Vercel, backend phải nằm chỗ khác** (Railway / Fly.io /
VPS). Đặt worker lên serverless thì bài hẹn 20h sẽ không bao giờ được đăng — hỏng
đúng tính năng cốt lõi của sản phẩm.

### Deploy chỉ frontend (chế độ demo)

Dùng để có tên miền công khai xem giao diện, khi chưa dựng backend.

1. Vercel → **New Project** → chọn repo này.
2. **Project Name: `skydangbai`** → tên miền sẽ là `skydangbai.vercel.app`.
   (Subdomain `.vercel.app` là duy nhất toàn cầu; nếu trùng, Vercel tự thêm hậu tố.)
3. **Root Directory: `web`** ← bắt buộc, nếu không Vercel thấy `package.json` ở gốc,
   tưởng là dự án NestJS và build hỏng.
4. Environment Variables: `NEXT_PUBLIC_DEMO_MODE` = `1`
5. Deploy.

Chế độ demo khiến frontend dùng dữ liệu mẫu ở [`web/lib/demo-data.ts`](web/lib/demo-data.ts)
thay vì gọi API, và hiện nhãn *"Bản demo giao diện"* trên mọi trang. Không có nó,
trình duyệt người xem sẽ đi tìm `localhost:3000` của **chính máy họ** và mọi trang
hiện lỗi.

> **Bỏ `NEXT_PUBLIC_DEMO_MODE` ngay khi có backend thật**, rồi đặt
> `NEXT_PUBLIC_API_URL` trỏ tới domain backend.

### ⛔ Chưa được deploy backend công khai

Hai việc **bắt buộc** làm trước:

1. **Chưa có xác thực.** [`current-user.ts`](src/common/current-user.ts) lấy user từ
   header `x-user-id`, không có header thì **tự lấy user đầu tiên trong DB**. Công
   khai lên internet = bất kỳ ai cũng đọc được toàn bộ chiến dịch, nhật ký và Page
   của mọi người dùng. Cần JWT + guard thật.
2. **`TOKEN_ENC_KEY` mặc định là 64 số 0.** Quên đặt = toàn bộ token mạng xã hội
   được mã hóa bằng khóa mà ai đọc repo cũng biết. Sinh khóa thật:
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

Ngoài ra nhớ đặt `CORS_ORIGIN` = domain Vercel của bạn.

## Chạy thử end-to-end (dùng mock adapter, KHÔNG cần token thật)

```bash
# 1. Bật hạ tầng
docker compose up -d

# 2. Cài dependencies
npm install

# 3. Cấu hình môi trường
cp .env.example .env
# (khuyến nghị) tạo khóa mã hóa token thật:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# rồi dán vào TOKEN_ENC_KEY trong .env

# 4. Migrate + seed dữ liệu demo
npm run migrate
npm run seed        # tạo user + 3 group mock + 1 campaign hẹn giờ 20s tới

# 5. Bật cả 3 tiến trình (mỗi lệnh 1 terminal), hoặc dùng:
npm run dev

# 6. Sau ~20s, worker sẽ xử lý 3 bài. Xem kết quả:
curl http://localhost:3000/api/post-logs/summary
curl http://localhost:3000/api/post-logs

# 7. Giao diện (terminal riêng):
cd web
npm install
cp .env.local.example .env.local
npm run typecheck     # chạy TRƯỚC — code này chưa từng được compile
npm run dev           # → http://localhost:3001/logs
```

## API chính

| Method | Endpoint | Mô tả |
|---|---|---|
| GET  | `/api/health` | Kiểm tra API + DB |
| GET  | `/api/social-accounts` | Danh sách tài khoản MXH |
| GET  | `/api/targets` | Danh sách group/page để chọn |
| POST | `/api/campaigns` | Tạo chiến dịch → sinh posts |
| GET  | `/api/campaigns` | Danh sách chiến dịch + thống kê |
| GET  | `/api/post-logs` | Nhật ký đăng bài (lọc: status, platform, from, to) |
| GET  | `/api/post-logs/summary` | Thẻ tổng quan (success/failed/skipped/rate) |
| GET  | `/api/post-logs/:postId` | Timeline chi tiết 1 bài + request/response thô |
| POST | `/api/ai/spin` | AI spin nội dung → N biến thể |
| POST | `/api/ai/hashtags` | AI gợi ý hashtag |
| GET  | `/api/ai/optimal-times` | Phân tích giờ vàng từ `post_logs` |

> Auth hiện là stub: gửi header `x-user-id: <uuid>` (in ra khi seed), hoặc bỏ trống để dùng user demo đầu tiên.

### Ví dụ tạo campaign

```bash
curl -X POST http://localhost:3000/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bài test",
    "content": "Nội dung bài viết",
    "targetIds": ["<target-uuid-1>", "<target-uuid-2>"],
    "hashtags": ["marketing", "sale"]
  }'
```
(Lấy `targetIds` từ `GET /api/targets`. Bỏ `scheduledAt` = đăng ngay.)

## Mở rộng thêm nền tảng

Thêm 1 file `src/worker/adapters/<platform>.adapter.ts` implement `SocialAdapter`,
rồi đăng ký 1 dòng trong `src/worker/adapters/index.ts`. Xong.

## AI (Phase 3.5) — `src/modules/ai`

Dùng **Anthropic SDK** (`@anthropic-ai/sdk`). Cấu hình trong `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...     # bỏ trống = chạy fallback (không gọi API)
AI_SPIN_MODEL=claude-haiku-4-5   # rẻ/nhanh cho spin hàng loạt
AI_ANALYSIS_MODEL=claude-opus-4-8 # mạnh cho phân tích giờ vàng (adaptive thinking)
```

3 tính năng (`AiService`):

1. **Spin nội dung** — `spinContent()`: 1 bài gốc → N biến thể khác câu chữ, giữ CTA. Tự cắm vào `POST /api/campaigns` khi `aiSpin: true` (mỗi target 1 biến thể).
2. **Gợi ý hashtag** — `suggestHashtags()`: theo ngữ cảnh + nền tảng.
3. **Giờ vàng** — `analyzeOptimalTimes()`: đọc `post_logs` của user, nhờ Claude luận giải khung giờ tối ưu (có heuristic fallback khi chưa có API key).

> Không có API key → mọi tính năng AI tự chuyển sang fallback an toàn (spin trả bài gốc, phân tích dùng heuristic thuần SQL) nên app vẫn chạy.
