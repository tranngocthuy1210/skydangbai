import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { SpinDto, HashtagDto } from './dto/ai.dto';
import { resolveUserId } from '../../common/current-user';

// AI Studio: spin nội dung, gợi ý hashtag, phân tích giờ vàng.
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('spin')
  async spin(@Body() dto: SpinDto) {
    const variants = await this.ai.spinContent(
      dto.content,
      dto.count ?? 3,
      dto.platform,
    );
    return { enabled: this.ai.enabled, count: variants.length, variants };
  }

  @Post('hashtags')
  async hashtags(@Body() dto: HashtagDto) {
    const hashtags = await this.ai.suggestHashtags(dto.content, dto.platform);
    return { enabled: this.ai.enabled, hashtags };
  }

  @Get('optimal-times')
  async optimalTimes(@Headers('x-user-id') userIdHeader: string) {
    const userId = await resolveUserId(userIdHeader);
    return this.ai.analyzeOptimalTimes(userId);
  }
}
