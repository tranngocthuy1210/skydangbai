// ============================================================
// ĐIỂM VÀO SERVERLESS (Vercel) — bọc app NestJS thành một function.
//
// Vì sao serverless được ở đây: các endpoint của API đều là request/response
// ngắn (query/insert DB), không có tiến trình nào cần sống lâu. Phần CẦN sống
// lâu (đăng bài theo lịch) đã tách ra chạy bằng GitHub Actions cron.
//
// Vercel gọi `handler` cho MỌI request (xem routes trong vercel.json). Nest chỉ
// được khởi tạo một lần và cache lại — lambda "ấm" tái dùng, khỏi bootstrap lại.
// ============================================================
import 'reflect-metadata';
import type { IncomingMessage, ServerResponse } from 'http';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from '../src/app.module';
import { env } from '../src/shared/env';

const server = express();

// Giữ Promise chứ không giữ boolean: nếu hai request cùng đến lúc lambda vừa
// nguội, cả hai cùng chờ MỘT lần bootstrap thay vì khởi tạo Nest hai lần.
let bootstrapPromise: Promise<void> | null = null;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ['error', 'warn'], // bớt log ồn trong môi trường serverless
  });
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: env.corsOrigin,
    allowedHeaders: ['Content-Type', 'x-user-id'],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init(); // KHÔNG dùng listen() — Vercel tự lo cổng/HTTP
}

// Vercel truyền req/res THÔ của Node (chưa qua express), nên khai kiểu ở đây là
// IncomingMessage/ServerResponse cho đúng sự thật — express nhận được chúng.
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (!bootstrapPromise) bootstrapPromise = bootstrap();
  await bootstrapPromise;

  // Gọi app express với ĐÚNG 2 tham số để nó dùng finalhandler nội bộ (tự trả
  // 404 cho route không khớp). Types của express bắt `next` là tham số bắt
  // buộc, nên phải ép kiểu — truyền next rỗng sẽ khiến request treo.
  (server as unknown as (rq: IncomingMessage, rs: ServerResponse) => void)(req, res);
}
