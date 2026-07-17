import { Module } from '@nestjs/common';
import { SocialAccountsController } from './social-accounts.controller';
import { SocialAccountsService } from './social-accounts.service';
import { FacebookOauthService } from './facebook-oauth.service';

@Module({
  controllers: [SocialAccountsController],
  providers: [SocialAccountsService, FacebookOauthService],
})
export class SocialAccountsModule {}
