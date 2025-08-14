// src/config/redis.ts
import IORedis from 'ioredis';

export const redis = new IORedis(process.env.REDIS_URL as string, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on('error', (e) => {
  console.error('❌ Redis error (app):', e);
});

// Small helper to build stable keys
export function cacheKey(obj: Record<string, any>) {
  return 'cache:' + Buffer.from(JSON.stringify(obj)).toString('base64url');
}
