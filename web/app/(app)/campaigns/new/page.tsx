'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TargetPicker } from '@/components/TargetPicker';
import { EmojiPicker } from '@/components/EmojiPicker';
import { PLATFORM_LABEL } from '@/lib/format';
import { Icon, PLATFORM_ICON } from '@/lib/icons';
import { ApiError, api, uploadImage } from '@/lib/api';
import type { BlockedTargetsError, Target } from '@/lib/types';

const STEPS = ['Nội dung', 'Mục tiêu', 'Lịch đăng'];

export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Chèn emoji tại vị trí con trỏ (không phải nối vào cuối) — giữ đúng chỗ user
  // đang gõ. Sau khi chèn, đặt lại con trỏ ngay sau emoji.
  function insertEmoji(emoji: string) {
    const ta = contentRef.current;
    if (!ta) {
      setContent((c) => c + emoji);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = content.slice(0, start) + emoji + content.slice(end);
    setContent(next);
    // Đợi React render xong rồi mới đặt con trỏ.
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + emoji.length;
      ta.setSelectionRange(pos, pos);
    });
  }
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [aiSpin, setAiSpin] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState('');

  const [targets, setTargets] = useState<Target[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<BlockedTargetsError['blockedTargets']>([]);

  useEffect(() => {
    api.getTargets().then(setTargets).catch(() => {});
  }, []);

  const chosen = targets.filter((t) => selected.includes(t.id));

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // cho phép chọn lại cùng file sau khi xóa
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadImage(file);
      setImageUrl(url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Tải ảnh thất bại');
    } finally {
      setUploading(false);
    }
  }

  async function suggestHashtags() {
    if (!content.trim()) return;
    setSuggesting(true);
    try {
      const res = await api.suggestHashtags(content);
      setHashtags(res.hashtags);
    } catch {
      /* AI hỏng thì bỏ qua — không chặn user tạo bài. */
    } finally {
      setSuggesting(false);
    }
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    setBlocked([]);
    try {
      const res = await api.createCampaign({
        name,
        content,
        targetIds: selected,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        hashtags,
        aiSpin,
        mediaUrls: imageUrl ? [imageUrl] : undefined,
      });
      router.push(`/logs`);
      return res;
    } catch (e) {
      // Backend chặn target không đăng được qua API chính thức → hiện rõ
      // từng mục tiêu bị chặn kèm lý do, thay vì một câu lỗi chung chung.
      if (e instanceof ApiError && e.status === 400) {
        const body = e.body as BlockedTargetsError | undefined;
        if (body?.blockedTargets?.length) {
          setBlocked(body.blockedTargets);
          setStep(1);
        }
      }
      setError(e instanceof Error ? e.message : 'Lỗi không xác định');
    } finally {
      setSubmitting(false);
    }
  }

  const canNext =
    step === 0 ? name.trim() !== '' && content.trim() !== '' : selected.length > 0;

  const preview =
    content + (hashtags.length ? '\n\n' + hashtags.map((h) => `#${h.replace(/^#/, '')}`).join(' ') : '');

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Tạo bài đăng</h1>

      {/* Thanh tiến trình 3 bước */}
      <ol className="mb-6 mt-4 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                i <= step ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}
            >
              {i + 1}
            </span>
            <span
              className={`text-sm ${i <= step ? 'font-medium text-slate-900' : 'text-slate-400'}`}
            >
              {s}
            </span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-slate-200" />}
          </li>
        ))}
      </ol>

      {/* ===== Bước 1: Nội dung ===== */}
      {step === 0 && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
                Tên chiến dịch
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Khuyến mãi tháng 7"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label htmlFor="content" className="block text-sm font-medium text-slate-700">
                  Nội dung
                </label>
                <EmojiPicker onPick={insertEmoji} />
              </div>
              <textarea
                id="content"
                ref={contentRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={7}
                placeholder="Sale 50% toàn bộ sản phẩm, chỉ trong hôm nay!"
                className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-slate-400">
                {content.length.toLocaleString('vi-VN')} ký tự
              </p>
            </div>

            {/* Ảnh đính kèm — tải từ máy, thu nhỏ ở trình duyệt rồi upload. */}
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Ảnh (tùy chọn)
              </span>
              {imageUrl ? (
                <div className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Ảnh đính kèm"
                    className="max-h-48 rounded-lg border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl(null)}
                    className="absolute right-2 top-2 rounded-full bg-slate-900/70 px-2 py-0.5 text-xs text-white hover:bg-slate-900"
                  >
                    Xóa
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600">
                  <Icon.Image className="h-4 w-4" aria-hidden="true" />
                  {uploading ? 'Đang tải ảnh…' : 'Chọn ảnh từ máy'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImage}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              )}
              {uploadError && (
                <p className="mt-1 text-xs text-red-600">{uploadError}</p>
              )}
            </div>

            <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <Icon.Ai className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                AI
              </p>
              <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={aiSpin}
                  onChange={(e) => setAiSpin(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  Viết lại cho mỗi mục tiêu
                  <span className="block text-xs text-slate-500">
                    Mỗi Page nhận một biến thể khác câu chữ — tránh bị đánh dấu trùng lặp.
                  </span>
                </span>
              </label>

              <button
                type="button"
                onClick={suggestHashtags}
                disabled={!content.trim() || suggesting}
                className="mt-3 rounded-md border border-indigo-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
              >
                {suggesting ? 'Đang gợi ý…' : 'Gợi ý hashtag'}
              </button>

              {hashtags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {hashtags.map((h) => (
                    <span
                      key={h}
                      className="rounded-full bg-white px-2 py-0.5 text-xs text-indigo-700 ring-1 ring-indigo-200"
                    >
                      #{h.replace(/^#/, '')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Preview: tính năng đắt giá nhất của bước này.
              Nỗi sợ đăng nhầm lên trang công ty là thứ khiến người ta không
              dám dùng tự động hóa. Preview loại bỏ nỗi sợ đó. */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
              Xem trước
            </p>
            {chosen.length === 0 ? (
              <p className="text-sm text-slate-400">
                Chọn mục tiêu ở bước sau để xem bài hiển thị thế nào trên từng nền tảng.
              </p>
            ) : (
              <div className="space-y-3">
                {chosen.slice(0, 3).map((t) => {
                  const PlatformGlyph = PLATFORM_ICON[t.platform];
                  return (
                    <article key={t.id} className="rounded-lg border border-slate-200 p-3">
                      <header className="mb-2 flex items-center gap-2">
                        <PlatformGlyph
                          className="h-4 w-4 text-slate-400"
                          aria-hidden="true"
                        />
                        <span className="text-sm font-medium text-slate-900">{t.name}</span>
                      </header>
                      <p className="whitespace-pre-wrap text-sm text-slate-700">
                        {preview || (
                          <span className="text-slate-300">(chưa có nội dung)</span>
                        )}
                      </p>
                      {imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
                          alt=""
                          className="mt-2 max-h-40 rounded border border-slate-200"
                        />
                      )}
                    </article>
                  );
                })}
                {aiSpin && (
                  <p className="flex items-start gap-1.5 text-xs text-slate-500">
                    <Icon.Ai className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                    Bật viết lại: nội dung thực tế mỗi mục tiêu sẽ khác nhau đôi chút.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Bước 2: Mục tiêu ===== */}
      {step === 1 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Đã chọn {selected.length} / {targets.filter((t) => t.is_publishable).length}{' '}
              mục tiêu đăng được
            </p>
          </div>

          {blocked.length > 0 && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-900">
                Một số mục tiêu không đăng được qua API chính thức:
              </p>
              <ul className="mt-1.5 space-y-1">
                {blocked.map((b) => (
                  <li key={b.id} className="text-sm text-red-800">
                    <strong>{b.name}</strong> — {b.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <TargetPicker
            targets={targets}
            selected={selected}
            onToggle={(id) =>
              setSelected((cur) =>
                cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
              )
            }
          />
        </div>
      )}

      {/* ===== Bước 3: Lịch đăng ===== */}
      {step === 2 && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                checked={scheduledAt === ''}
                onChange={() => setScheduledAt('')}
                className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Đăng ngay
            </label>
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                checked={scheduledAt !== ''}
                onChange={() => {
                  const d = new Date(Date.now() + 3_600_000);
                  d.setSeconds(0, 0);
                  setScheduledAt(
                    new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                      .toISOString()
                      .slice(0, 16),
                  );
                }}
                className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Hẹn giờ
            </label>
            {scheduledAt !== '' && (
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="ml-6 mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            )}
          </div>

          {/* Tóm tắt: nút cuối phải phát biểu hậu quả của chính nó. */}
          <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium">Tóm tắt</p>
            <p className="mt-1">
              {selected.length} bài · {chosen.length} mục tiêu ·{' '}
              {[...new Set(chosen.map((t) => PLATFORM_LABEL[t.platform]))].join(', ')}
            </p>
            <p className="mt-0.5 text-slate-500">
              {scheduledAt
                ? `Đăng lúc ${new Date(scheduledAt).toLocaleString('vi-VN')}`
                : 'Đăng ngay sau khi bấm nút'}
            </p>
          </div>

          {error && blocked.length === 0 && (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </p>
          )}
        </div>
      )}

      {/* ===== Điều hướng ===== */}
      <div className="mt-6 flex justify-between">
        <button
          type="button"
          onClick={() => (step === 0 ? router.back() : setStep(step - 1))}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Quay lại
        </button>

        {step < 2 ? (
          <button
            type="button"
            disabled={!canNext}
            onClick={() => setStep(step + 1)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            Tiếp →
          </button>
        ) : (
          <button
            type="button"
            disabled={submitting || selected.length === 0}
            onClick={submit}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            {/* Nút phải phát biểu hậu quả của chính nó: "Lên lịch 2 bài",
                không phải "Xong". Icon máy bay giấy = hành động gửi đi. */}
            {!submitting && <Icon.Send className="h-4 w-4" aria-hidden="true" />}
            {submitting
              ? 'Đang lên lịch…'
              : `${scheduledAt ? 'Lên lịch' : 'Đăng'} ${selected.length} bài`}
          </button>
        )}
      </div>
    </div>
  );
}
