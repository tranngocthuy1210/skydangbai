import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { SocialAccountsService } from './social-accounts.service';
import { FacebookOauthService } from './facebook-oauth.service';
import { AuthService } from '../auth/auth.service';
import { CurrentUser, Public } from '../../common/auth';
import { env } from '../../shared/env';

@Controller()
export class SocialAccountsController {
  constructor(
    private readonly service: SocialAccountsService,
    private readonly fb: FacebookOauthService,
    private readonly auth: AuthService,
  ) {}

  @Get('social-accounts')
  async accounts(@CurrentUser() userId: string) {
    return this.service.listAccounts(userId);
  }

  @Get('targets')
  async targets(@CurrentUser() userId: string) {
    return this.service.listTargets(userId);
  }

  // ===== Facebook OAuth =====

  /**
   * Trả về URL để frontend chuyển hướng người dùng sang Facebook.
   *
   * Vì sao là POST trả URL, chứ không phải GET tự redirect: trình duyệt không
   * gửi được header Authorization khi điều hướng, nên endpoint redirect không
   * thể biết ai đang gọi. Cách này giữ được xác thực: frontend gọi có token,
   * nhận URL (đã kèm `state` ký sẵn), rồi tự chuyển hướng.
   */
  @Post('social-accounts/facebook/connect-url')
  async fbConnectUrl(@CurrentUser() userId: string) {
    if (!this.fb.configured) {
      throw new BadRequestException(
        'Chưa cấu hình FACEBOOK_APP_ID / FACEBOOK_APP_SECRET trên server.',
      );
    }
    const state = await this.auth.signOauthState(userId);
    return { url: this.fb.buildAuthUrl(state) };
  }

  /**
   * Facebook gọi ngược về đây. BẮT BUỘC phải @Public — Facebook không có JWT
   * của mình. An toàn nhờ `state`: đó là token do chính server ký, hết hạn sau
   * 10 phút, nên không ai giả mạo được để gắn Page vào tài khoản người khác.
   */
  @Public()
  @Get('social-accounts/facebook/callback')
  async fbCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    if (error || !code || !state) {
      return res.redirect(`${env.frontendUrl}/accounts?fb=cancelled`);
    }
    try {
      const userId = await this.auth.verifyOauthState(state);
      const result = await this.fb.handleCallback(userId, code);
      return res.redirect(
        `${env.frontendUrl}/accounts?fb=connected&pages=${result.pages}`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      return res.redirect(
        `${env.frontendUrl}/accounts?fb=error&reason=${encodeURIComponent(msg)}`,
      );
    }
  }
}
