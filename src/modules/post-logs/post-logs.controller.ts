import { Controller, Get, Headers, Param, Query } from '@nestjs/common';
import { PostLogsService } from './post-logs.service';
import { resolveUserId } from '../../common/current-user';

@Controller('post-logs')
export class PostLogsController {
  constructor(private readonly service: PostLogsService) {}

  @Get()
  async list(
    @Headers('x-user-id') userIdHeader: string,
    @Query('status') status?: string,
    @Query('platform') platform?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const userId = await resolveUserId(userIdHeader);
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
  async summary(
    @Headers('x-user-id') userIdHeader: string,
    @Query('from') from?: string,
  ) {
    const userId = await resolveUserId(userIdHeader);
    return this.service.summary(userId, from);
  }

  // PHẢI khai báo sau 'summary', nếu không /post-logs/summary sẽ khớp vào đây
  // với postId='summary'.
  @Get(':postId')
  async detail(
    @Headers('x-user-id') userIdHeader: string,
    @Param('postId') postId: string,
  ) {
    const userId = await resolveUserId(userIdHeader);
    return this.service.detail(userId, postId);
  }
}
