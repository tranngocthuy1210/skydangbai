'use client';

import { useEffect, useRef, useState } from 'react';

// Bộ emoji chọn lọc cho nội dung marketing — không cần thư viện 3000 emoji.
// Emoji là ký tự Unicode nên đi thẳng vào trường `message` của Facebook, hiển
// thị bình thường (khác "đổi font" — cái đó Facebook không hỗ trợ).
const EMOJIS = [
  '😀', '😍', '🥰', '😎', '🤩', '😊', '👍', '🙏', '👏', '💪',
  '🔥', '✨', '⭐', '🎉', '🎁', '❤️', '💚', '💙', '💛', '🧡',
  '✅', '☑️', '📌', '📣', '🛍️', '🛒', '💰', '💸', '🏷️', '🎯',
  '🍔', '🍕', '☕', '🍰', '🥤', '🌸', '🌟', '⚡', '🚀', '📍',
];

export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Bấm ra ngoài thì đóng.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm hover:bg-slate-50"
        aria-label="Chèn emoji"
      >
        😊
      </button>
      {open && (
        <div className="absolute z-10 mt-1 grid w-64 grid-cols-8 gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                onPick(e);
                setOpen(false);
              }}
              className="rounded p-1 text-lg hover:bg-slate-100"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
