// Lưu JWT phía client. Dùng localStorage vì toàn bộ app là client component
// ('use client') gọi API qua useEffect — không có server session để giữ token.
//
// Đánh đổi đã biết: localStorage đọc được bằng JS nên dễ tổn thương trước XSS.
// Chấp nhận được ở giai đoạn này vì ta không nhúng nội dung bên thứ ba. Khi cần
// nâng cấp: chuyển sang cookie HttpOnly (đòi backend set-cookie + CSRF token).

const TOKEN_KEY = 'skydangbai_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null; // an toàn khi render phía server
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}
