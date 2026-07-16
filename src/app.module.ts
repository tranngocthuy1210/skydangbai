import { Module } from '@nestjs/common';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { PostLogsModule } from './modules/post-logs/post-logs.module';
import { SocialAccountsModule } from './modules/social-accounts/social-accounts.module';
import { AiModule } from './modules/ai/ai.module';
import { HealthController } from './modules/health.controller';

@Module({
  imports: [CampaignsModule, PostLogsModule, SocialAccountsModule, AiModule],
  controllers: [HealthController],
})
export class AppModule {}
