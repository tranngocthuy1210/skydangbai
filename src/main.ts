import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { env } from './shared/env';

async function bootstrap() {
  // Kiểu NestExpressApplication để dùng được useBodyParser (nâng giới hạn body).
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  // Frontend (web/) chạy ở cổng khác → không bật CORS thì trình duyệt chặn hết.
  // Danh sách origin lấy từ CORS_ORIGIN, mặc định localhost:3001.
  app.enableCors({
    origin: env.corsOrigin,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  // Mặc định Express giới hạn JSON body 100kb — ảnh base64 vượt ngay. Nâng lên
  // 5mb (client đã thu nhỏ ảnh trước, và vẫn dưới trần ~4.5MB của Vercel).
  app.useBodyParser('json', { limit: '5mb' });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  await app.listen(env.apiPort);
  console.log(`[api] chạy tại http://localhost:${env.apiPort}/api`);
}
bootstrap();
