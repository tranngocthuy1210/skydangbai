import * as dotenv from 'dotenv';

dotenv.config();

export const env = {
  apiPort: parseInt(process.env.API_PORT ?? '3000', 10),
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgres://postgres:postgres@localhost:5432/autoposter',
  redisHost: process.env.REDIS_HOST ?? 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  tokenEncKey:
    process.env.TOKEN_ENC_KEY ??
    '0'.repeat(64), // 32 byte hex — ĐỔI trong production!
  workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY ?? '20', 10),
  // Origin của frontend web/. Nhiều domain thì ngăn cách bằng dấu phẩy.
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:3001').split(','),

  // ===== Facebook (Meta App) =====
  // Lấy ở developers.facebook.com → App settings → Basic (xem docs/META_SETUP.md).
  facebookAppId: process.env.FACEBOOK_APP_ID ?? '',
  // BÍ MẬT — chỉ sống ở biến môi trường server, không bao giờ lộ ra frontend.
  facebookAppSecret: process.env.FACEBOOK_APP_SECRET ?? '',
  // Phải TRÙNG KHỚP tuyệt đối với "Valid OAuth Redirect URIs" khai trong Meta app,
  // lệch một ký tự là Facebook từ chối.
  facebookRedirectUri:
    process.env.FACEBOOK_REDIRECT_URI ??
    'https://skydangbai-api.vercel.app/api/social-accounts/facebook/callback',
  // Nơi đưa người dùng về sau khi kết nối xong.
  frontendUrl: process.env.FRONTEND_URL ?? 'https://skydangbai.vercel.app',

  // ===== AI (Claude) =====
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  // Haiku 4.5: rẻ/nhanh cho spin nội dung hàng loạt (theo định hướng dự án).
  aiSpinModel: process.env.AI_SPIN_MODEL ?? 'claude-haiku-4-5',
  // Opus 4.8: mạnh cho phân tích giờ vàng (tác vụ suy luận).
  aiAnalysisModel: process.env.AI_ANALYSIS_MODEL ?? 'claude-opus-4-8',
};
