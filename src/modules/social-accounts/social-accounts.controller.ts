import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { SocialAccountsService } from './social-accounts.service';
import { FacebookOauthService } from './facebook-oauth.service';
import { resolveUserId } from '../../common/current-user';
import { env } from '../../shared/env';

@Controller()
export class SocialAccountsController {
  constructor(
    private readonly service: SocialAccountsService,
    private readonly fb: FacebookOauthService,
  ) {}

  @Get('social-accounts')
  async accounts(@Headers('x-user-id') userIdHeader: string) {
    const userId = await resolveUserId(userIdHeader);
    return this.service.listAccounts(userId);
  }

  @Get('targets')
  async targets(@Headers('x-user-id') userIdHeader: string) {
    const userId = await resolveUserId(userIdHeader);
    return this.service.listTargets(userId);
  }

  // ===== Facebook OAuth =====

  /** Bắt đầu kết nối: đưa người dùng sang trang xin quyền của Facebook. */
  @Get('social-accounts/facebook/connect')
  async fbConnect(
    @Headers('x-user-id') userIdHeader: string,
    @Res() res: Response,
  ) {
    if (!this.fb.configured) {
      throw new BadRequestException(
        'Chưa cấu hình FACEBOOK_APP_ID / FACEBOOK_APP_SECRET trên server.',
      );
    }
    const userId = await resolveUserId(userIdHeader);
    res.redirect(this.fb.buildAuthUrl(userId));
  }

  /**
   * Facebook gọi ngược về đây sau khi người dùng bấm đồng ý.
   * URL này phải khai Y HỆT trong Meta app → Facebook Login → Valid OAuth Redirect URIs.
   */
  @Get('social-accounts/facebook/callback')
  async fbCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    // Người dùng bấm "Hủy" ở màn hình Facebook.
    if (error || !code) {
      return res.redirect(`${env.frontendUrl}/accounts?fb=cancelled`);
    }
    try {
      const result = await this.fb.handleCallback(state, code);
      return res.redirect(
        `${env.frontendUrl}/accounts?fb=connected&pages=${result.pages}`,
      );
    } catch (e) {
      // Đưa người dùng về UI kèm lý do, thay vì bỏ họ ở một trang JSON trống rỗng.
      const msg = e instanceof Error ? e.message : 'unknown';
      return res.redirect(
        `${env.frontendUrl}/accounts?fb=error&reason=${encodeURIComponent(msg)}`,
      );
    }
  }
}
