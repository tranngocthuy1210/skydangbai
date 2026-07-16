import IORedis, { RedisOptions } from 'ioredis';
import { env } from './env';

// BullMQ yêu cầu maxRetriesPerRequest = null.
export const redisConnectionOptions: RedisOptions = {
  host: env.redisHost,
  port: env.redisPort,
  maxRetriesPerRequest: null,
};

// Kết nối dùng cho rate-limiter / cache (không phải cho BullMQ Queue/Worker).
export const redis = new IORedis(redisConnectionOptions);
