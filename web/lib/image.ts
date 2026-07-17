// Thu nhỏ ảnh ngay tại trình duyệt TRƯỚC khi upload.
//
// Vì sao: ảnh từ điện thoại thường 3–10MB, vượt trần payload của serverless
// (~4.5MB) và tốn băng thông. Nén xuống cạnh dài tối đa ~1600px + JPEG quẹ
// chất lượng 0.85 thường ra < 1MB, đủ đẹp cho mạng xã hội. Cũng loại luôn dữ
// liệu EXIF (vị trí GPS...) — riêng tư hơn.

export interface PreparedImage {
  dataBase64: string;
  contentType: string;
}

export async function resizeImage(
  file: File,
  maxDim = 1600,
  quality = 0.85,
): Promise<PreparedImage> {
  const img = await loadImage(file);

  let { width, height } = img;
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Trình duyệt không xử lý được ảnh');
  ctx.drawImage(img, 0, 0, width, height);

  // Luôn xuất JPEG để chuẩn hóa định dạng và giảm dung lượng.
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const dataBase64 = dataUrl.split(',')[1] ?? '';
  return { dataBase64, contentType: 'image/jpeg' };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('File không phải ảnh hợp lệ'));
    };
    img.src = url;
  });
}
