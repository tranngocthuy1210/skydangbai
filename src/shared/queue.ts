import { Queue } from 'bullmq';
import { redisConnectionOptions } from './redis';

export const POST_QUEUE_NAME = 'post-queue';

export interface PublishJobData {
  postId: string;
}

// Queue instance dùng để add job (API/feeder gọi).
export const postQueue = new Queue<PublishJobData>(POST_QUEUE_NAME, {
  connection: redisConnectionOptions,
});
