import { Module } from '@nestjs/common';
import { PostLogsController } from './post-logs.controller';
import { PostLogsService } from './post-logs.service';

@Module({
  controllers: [PostLogsController],
  providers: [PostLogsService],
})
export class PostLogsModule {}
