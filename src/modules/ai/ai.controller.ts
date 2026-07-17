import { Body, Controller, Get, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { SpinDto, HashtagDto } from './dto/ai.dto';
import { CurrentUser } from '../../common/auth';

// AI Studio: spin nội dung, gợi ý hashtag, phân tích giờ vàng.
// Cả 3 endpoint đều cần đăng nhập — chúng tiêu tiền API của bạn, để mở là
// người lạ đốt hạn mức Anthropic của bạn miễn phí.
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
  async optimalTimes(@CurrentUser() userId: string) {
    return this.ai.analyzeOptimalTimes(userId);
  }
}
