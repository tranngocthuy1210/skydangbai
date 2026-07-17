import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { env } from './shared/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  // Frontend (web/) chạy ở cổng khác → không bật CORS thì trình duyệt chặn hết.
  // Danh sách origin lấy từ CORS_ORIGIN, mặc định localhost:3001.
  app.enableCors({
    origin: env.corsOrigin,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  await app.listen(env.apiPort);
  console.log(`[api] chạy tại http://localhost:${env.apiPort}/api`);
}
bootstrap();
