import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { env } from '../../shared/env';

// @Global: JwtService cần dùng ở guard toàn cục và ở module social-accounts
// (ký `state` cho OAuth). Khai global một lần thay vì import lặp khắp nơi.
@Global()
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: env.jwtSecret,
      signOptions: { expiresIn: env.jwtExpiresIn },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
