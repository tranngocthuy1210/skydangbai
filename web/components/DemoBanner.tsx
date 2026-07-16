import { IS_DEMO } from '@/lib/api';
import { Icon } from '@/lib/icons';

// Nhãn cho bản deploy chỉ-frontend.
//
// Đây không phải chi tiết trang trí: một bản demo không nói rõ mình là demo
// thì là một bản demo nói dối. Người xem phải biết ngay rằng "1.204 bài đã
// đăng" là con số bịa, không phải thành tích.
//
// Không ở chế độ demo thì component này biến mất hoàn toàn.
export function DemoBanner() {
  if (!IS_DEMO) return null;

  return (
    <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <Icon.Warning className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
      <p className="text-sm text-amber-900">
        <strong className="font-semibold">Bản demo giao diện.</strong>{' '}
        <span className="text-amber-800">
          Mọi số liệu trên trang là dữ liệu mẫu, không phải hoạt động thật. Bản
          này chưa kết nối backend nên không đăng bài, không lưu chiến dịch.
        </span>
      </p>
    </div>
  );
}
