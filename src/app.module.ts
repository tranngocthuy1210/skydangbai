import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { PostLogsModule } from './modules/post-logs/post-logs.module';
import { SocialAccountsModule } from './modules/social-accounts/social-accounts.module';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthController } from './modules/health.controller';
import { JwtAuthGuard } from './common/auth';

@Module({
  imports: [
    AuthModule,
    CampaignsModule,
    PostLogsModule,
    SocialAccountsModule,
    AiModule,
  ],
  controllers: [HealthController],
  providers: [
    // Guard TOÀN CỤC: mọi endpoint đều cần đăng nhập, trừ khi gắn @Public().
    // Cố ý chọn cách này thay vì gắn guard từng controller — quên gắn thì
    // endpoint bị KHÓA (lộ ra ngay khi test), chứ không HỞ ra internet âm thầm.
    // Sai theo hướng an toàn.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
