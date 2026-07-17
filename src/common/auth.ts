import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { env } from '../shared/env';

export interface JwtPayload {
  sub: string; // user id
  email: string;
}

/** Đánh dấu endpoint KHÔNG cần đăng nhập. Mặc định mọi thứ đều cần. */
export const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Lấy userId của người đang đăng nhập (do JwtAuthGuard gắn vào request). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<Request & { userId?: string }>();
    if (!req.userId) {
      // Tới đây mà không có userId nghĩa là guard chưa chạy — lỗi lập trình,
      // không phải lỗi người dùng. Ném to để lộ ra ngay lúc dev.
      throw new UnauthorizedException('Thiếu thông tin người dùng');
    }
    return req.userId;
  },
);

/**
 * Chặn mọi request không có JWT hợp lệ.
 *
 * Áp ở CẤP TOÀN CỤC (xem app.module) — an toàn theo mặc định. Muốn mở một
 * endpoint thì phải gắn @Public() một cách có ý thức, thay vì quên gắn guard
 * rồi phơi dữ liệu ra internet mà không ai nhận ra.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    // Không có JWT_SECRET thì KHÔNG mở cửa. Chạy với khóa mặc định còn tệ hơn
    // không có xác thực, vì nó tạo cảm giác an toàn giả.
    if (!env.jwtSecret) {
      throw new UnauthorizedException(
        'Server chưa cấu hình JWT_SECRET — mọi request bị từ chối.',
      );
    }

    const req = ctx.switchToHttp().getRequest<Request & { userId?: string }>();
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Thiếu token đăng nhập');
    }

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: env.jwtSecret,
      });
      req.userId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }
}
