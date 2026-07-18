# Bàn giao — Tiếp tục ở session mới

> Mở tài liệu này đầu session mới để nối tiếp công việc. Bản kiến trúc/quyết định
> đầy đủ nằm ở [`TONG_KET_DU_AN.md`](TONG_KET_DU_AN.md); tài liệu này là ảnh chụp
> **trạng thái hiện tại** + **việc tiếp theo**.
> Cập nhật: sau commit `f4be813`, đã kiểm chứng bằng cách gọi API thật.

---

## 1. Trạng thái hiện tại — cái gì đang SỐNG

| Thành phần | URL / Vị trí | Trạng thái (đã kiểm chứng) |
|---|---|---|
| Frontend | `skydangbai.vercel.app` | ✅ Deploy, có màn đăng nhập |
| API | `skydangbai-api.vercel.app` | ✅ Health OK, auth OK, upload OK |
| Database | Neon (Singapore) | ✅ Migrations 001–003 đã chạy |
| Batch đăng bài | GitHub Actions `post-scheduler.yml` | ✅ Đã đăng bài thật lên Page |
| Kho ảnh | Vercel Blob `skydangbai-images` (Public) | ✅ Nối vào `skydangbai-api`, upload trả URL |
| Facebook | 3 Page: BEAN Coffee, BigFamily English Group, SKY Coffee | ✅ Token còn sống |

**Đã kiểm chứng bằng gọi API thật** (không phải đoán): `/api/health`, đăng ký +
đăng nhập, và `/api/upload` (trả về URL ảnh Blob thật).

---

## 2. Vừa hoàn thành trong session này

- **Xác thực JWT** — đăng ký/đăng nhập, guard toàn cục, đóng lỗ hổng API công khai.
- **Deploy frontend** (Next.js) + đấu vào API thật.
- **Trang chi tiết chiến dịch** (bấm campaign → xem bài con) + **emoji picker**.
- **Đăng ảnh từ máy** — thu nhỏ ở client → Vercel Blob → Facebook `/photos`.
  Nửa upload **đã chạy thật**; nửa đăng lên Facebook chờ test end-to-end.
- **Tài liệu tổng kết** `TONG_KET_DU_AN.md`.

---

## 3. Việc tiếp theo (backlog, ưu tiên từ trên xuống)

1. **Test đăng ảnh end-to-end** (việc gần nhất): đăng nhập web → tạo chiến dịch có
   ảnh, nhắm 1 Page → chạy `post-scheduler.yml` → mở Facebook Page xem bài **kèm
   ảnh**. Nếu ảnh không lên, kiểm tra log batch (adapter `/photos`).
2. **Nhiều ảnh một bài** — hiện 1 ảnh/bài. Facebook cần upload ảnh unpublished rồi
   attach nhiều `attached_media`.
3. **Dọn tài khoản test** — mấy user `imgtest-*@example.com` tạo khi dò lỗi (vô hại,
   không nối Page). Chưa có endpoint xóa user.
4. **Tự đăng đúng giờ hơn** — cân nhắc thêm mốc cron, hoặc nút "đăng ngay" (khó với
   kiến trúc batch — cần cách trigger GitHub Actions từ API).
5. **Đa người dùng / tổ chức** — schema hiện theo `user_id`, chưa có `organization`.
6. **Quên/đổi mật khẩu**.
7. **App Review của Meta** — chỉ khi muốn phục vụ Page của người dùng KHÁC (Page của
   mình thì Dev mode đủ).

---

## 4. Ngữ cảnh cốt lõi — DÁN block này vào đầu session mới

```
Dự án: SkyĐăngBài — SaaS đăng bài tự động lên Facebook PAGE qua API chính thức.
Repo: github.com/tranngocthuy1210/skydangbai (private, branch main).

QUYẾT ĐỊNH ĐÃ CHỐT (không đổi):
- CHỈ đăng Page qua API chính thức. KHÔNG làm Group/automation cookie (Facebook
  gỡ API Group 2024; làm sẽ khóa tài khoản). Đây là ranh giới cố ý.
- Kiến trúc "batch miễn phí" 0đ: bỏ Redis/BullMQ; batch chạy cron trên GitHub
  Actions (08:00 & 20:00 VN). Đánh đổi: không đăng chính xác từng phút.
- API NestJS bọc serverless trên Vercel. Frontend Next.js Vercel riêng.
- DB Neon. Ảnh Vercel Blob. Auth JWT (guard toàn cục, an toàn theo mặc định).

HẠ TẦNG:
- Vercel project #1 "skydangbai": Root=web, framework Next.js (frontend).
- Vercel project #2 "skydangbai-api": Root=gốc repo, framework Other (API).
- Blob store nối vào skydangbai-api (BLOB_READ_WRITE_TOKEN ở project API).
- Neon: chuỗi pooled cho Vercel, direct cho GitHub Actions.

QUY TRÌNH LÀM VIỆC (đã hiệu quả):
- Máy dev CHƯA cài Node → dùng GitHub Actions (ci.yml) làm trình biên dịch.
- Mỗi thay đổi: sửa code → commit → push → xem CI xanh → mới đi tiếp.
- Kiểm chứng runtime bằng gọi API thật (PowerShell Invoke-RestMethod) tới
  skydangbai-api.vercel.app, KHÔNG đoán qua "Ready/xanh".
- Không để khóa bí mật lộ ra chat.

Đọc docs/TONG_KET_DU_AN.md + docs/BAN_GIAO_SESSION.md để nắm đầy đủ.
```

---

## 5. Cách tiếp tục

1. Mở session mới trong repo này.
2. Dán block ở mục 4 vào tin nhắn đầu (cho Claude nắm ngữ cảnh).
3. Nói việc muốn làm — ví dụ *"test đăng ảnh end-to-end"* hoặc *"làm tính năng nhiều ảnh"*.

Mọi thứ đã commit trên GitHub, không mất gì. Hạ tầng đang chạy, chỉ việc làm tiếp.
