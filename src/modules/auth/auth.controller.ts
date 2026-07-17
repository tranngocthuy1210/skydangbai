import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { CurrentUser, Public } from '../../common/auth';
import { query } from '../../shared/db';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  /** Ai đang đăng nhập — frontend dùng để kiểm tra token còn sống không. */
  @Get('me')
  async me(@CurrentUser() userId: string) {
    const [user] = await query(
      'SELECT id, email, full_name, plan, timezone FROM users WHERE id = $1',
      [userId],
    );
    return user;
  }
}
