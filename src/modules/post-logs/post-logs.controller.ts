import { Controller, Get, Param, Query } from '@nestjs/common';
import { PostLogsService } from './post-logs.service';
import { CurrentUser } from '../../common/auth';

@Controller('post-logs')
export class PostLogsController {
  constructor(private readonly service: PostLogsService) {}

  @Get()
  async list(
    @CurrentUser() userId: string,
    @Query('status') status?: string,
    @Query('platform') platform?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.service.list(userId, {
      status,
      platform,
      from,
      to,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('summary')
  async summary(@CurrentUser() userId: string, @Query('from') from?: string) {
    return this.service.summary(userId, from);
  }

  // PHẢI khai báo sau 'summary', nếu không /post-logs/summary sẽ khớp vào đây
  // với postId='summary'.
  @Get(':postId')
  async detail(@CurrentUser() userId: string, @Param('postId') postId: string) {
    return this.service.detail(userId, postId);
  }
}
