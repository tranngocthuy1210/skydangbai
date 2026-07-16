// Nguyên tắc quan trọng nhất của trang Post Logs (Phase 3, mục 3.4.4):
// dòng đầu tiên user đọc phải trả lời "TÔI PHẢI LÀM GÌ BÂY GIỜ",
// không phải "chuyện gì đã xảy ra".
//
//   ❌ OAuthException code 190: Error validating access token...
//   ✅ Token hết hạn — cần kết nối lại tài khoản   [Kết nối →]
//
// Mã lỗi thô vẫn giữ, nhưng ở phần "Chi tiết kỹ thuật" gập lại, cho người cần.

export interface ErrorExplanation {
  /** Câu user đọc — tiếng người, không thuật ngữ. */
  title: string;
  /** Nhãn nút khắc phục. Bỏ trống = user không cần làm gì. */
  actionLabel?: string;
  /** Link của nút khắc phục. */
  actionHref?: string;
}

const EXPLANATIONS: Record<string, ErrorExplanation> = {
  TOKEN_EXPIRED: {
    title: 'Token hết hạn — cần kết nối lại tài khoản',
    actionLabel: 'Kết nối lại',
    actionHref: '/accounts',
  },
  RATE_LIMITED: {
    // Không có nút: hệ thống đang tự thử lại. Đưa nút ở đây sẽ khiến user
    // tưởng mình phải làm gì đó, trong khi việc đúng nhất là chờ.
    title: 'Chạm giới hạn tần suất của nền tảng — hệ thống đang tự thử lại',
  },
  PERMISSION_DENIED: {
    title: 'Không đủ quyền đăng lên mục tiêu này — cần cấp lại quyền cho ứng dụng',
    actionLabel: 'Xem tài khoản',
    actionHref: '/accounts',
  },
  INVALID_CONTENT: {
    title: 'Nội dung bị nền tảng từ chối — hãy sửa lại bài viết',
  },
  UNSUPPORTED_TARGET: {
    title: 'Mục tiêu này không đăng được qua API chính thức',
  },
  NETWORK: {
    title: 'Lỗi kết nối mạng tới nền tảng — hệ thống đang tự thử lại',
  },
  UNKNOWN: {
    title: 'Lỗi không xác định từ nền tảng',
  },
};

export function explainError(
  errorCode: string | null,
  fallbackMessage: string | null,
): ErrorExplanation {
  if (errorCode && EXPLANATIONS[errorCode]) return EXPLANATIONS[errorCode];
  return { title: fallbackMessage ?? 'Lỗi không xác định' };
}
