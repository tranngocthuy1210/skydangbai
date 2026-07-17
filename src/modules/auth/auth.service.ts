import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { query } from '../../shared/db';
import { env } from '../../shared/env';
import type { JwtPayload } from '../../common/auth';
import { LoginDto, RegisterDto } from './dto/auth.dto';

interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  full_name: string | null;
  status: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  async register(dto: RegisterDto) {
    const existing = await query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [dto.email],
    );
    if (existing.length > 0) {
      throw new ConflictException('Email này đã được đăng ký');
    }

    const hash = await bcrypt.hash(dto.password, 10);
    const [user] = await query<UserRow>(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES ($1,$2,$3)
       RETURNING id, email, full_name, status`,
      [dto.email, hash, dto.fullName ?? null],
    );
    return this.issueToken(user);
  }

  async login(dto: LoginDto) {
    const [user] = await query<UserRow>(
      `SELECT id, email, password_hash, full_name, status
       FROM users WHERE email = $1`,
      [dto.email],
    );

    // Cùng một thông báo cho "email không tồn tại" và "sai mật khẩu" — không
    // để kẻ tấn công dò xem email nào đã đăng ký.
    const invalid = new UnauthorizedException('Email hoặc mật khẩu không đúng');
    if (!user || !user.password_hash) throw invalid;

    const ok = await bcrypt.compare(dto.password, user.password_hash);
    if (!ok) throw invalid;

    if (user.status !== 'active') {
      throw new UnauthorizedException('Tài khoản đã bị khóa');
    }

    await query('UPDATE users SET updated_at = now() WHERE id = $1', [user.id]);
    return this.issueToken(user);
  }

  private async issueToken(user: UserRow) {
    // Không có JWT_SECRET thì KHÔNG phát hành token — ký bằng khóa rỗng tạo ra
    // token ai cũng giả được, tệ hơn là báo lỗi thẳng.
    if (!env.jwtSecret) {
      throw new UnauthorizedException(
        'Server chưa cấu hình JWT_SECRET — không thể đăng nhập.',
      );
    }
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: env.jwtSecret,
      expiresIn: env.jwtExpiresIn,
    });
    return {
      accessToken,
      user: { id: user.id, email: user.email, fullName: user.full_name },
    };
  }

  /**
   * Token ngắn hạn dùng làm tham số `state` của OAuth.
   *
   * Vì sao cần: `state` phải vừa KHÔNG ĐOÁN ĐƯỢC (chống CSRF — kẻ khác không
   * thể gắn tài khoản Facebook của họ vào user của bạn), vừa mang được userId
   * qua vòng chuyển hướng của Facebook. Một JWT ký ngắn hạn thỏa cả hai.
   *
   * Bản trước truyền thẳng userId thô — ai cũng giả mạo được. Đây là chỗ vá.
   */
  async signOauthState(userId: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId, purpose: 'oauth' },
      { secret: env.jwtSecret, expiresIn: '10m' }, // đủ để bấm vài nút, không hơn
    );
  }

  async verifyOauthState(state: string): Promise<string> {
    const payload = await this.jwt.verifyAsync<{ sub: string; purpose?: string }>(
      state,
      { secret: env.jwtSecret },
    );
    // Chặn dùng token đăng nhập thường làm state (và ngược lại).
    if (payload.purpose !== 'oauth') {
      throw new UnauthorizedException('State không hợp lệ');
    }
    return payload.sub;
  }
}
