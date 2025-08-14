// src/config/cache.ts
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
export const redis = new IORedis(REDIS_URL);

/**
 * Get JSON-parsed cache value or null
 */
export async function getCache<T = any>(key: string): Promise<T | null> {
  const v = await redis.get(key);
  if (!v) return null;
  try { return JSON.parse(v) as T; } catch { return null; }
}

/**
 * Set cache value with optional TTL (seconds). Default 300s (5m)
 */
export async function setCache(key: string, value: any, ttlSec = 60 * 5) {
  const s = JSON.stringify(value);
  if (ttlSec > 0) {
    await redis.set(key, s, 'EX', ttlSec);
  } else {
    await redis.set(key, s);
  }
}

/**
 * Delete keys by SCAN pattern (non-blocking)
 */
export async function delByPattern(pattern: string) {
  const stream = redis.scanStream({ match: pattern, count: 100 });
  const keys: string[] = [];
  for await (const resultKeys of stream) {
    if (resultKeys.length) keys.push(...resultKeys);
  }
  if (keys.length) await redis.del(...keys);
}

/**
 * Invalidate caches related to analytics for given org/project/user/event
 * - We use wildcard matching so keys created by `cacheKey()` are removed.
 * - NOTE: SCAN is used (not KEYS) to avoid blocking Redis.
 */
export async function invalidateCachesForEvent(opts: {
  orgId?: string | null;
  projectId?: string | null;
  userId?: string | null;
  eventName?: string | null;
}) {
  const org = opts.orgId ?? 'null';
  const proj = opts.projectId ?? 'null';
  const user = opts.userId ?? '*';
  // patterns to remove - keep broad so we catch metrics/funnels/retention/journey keys
  const patterns = [
    `*org:${org}:project:${proj}*`,   // metrics / funnels / retention variants
    `*user:${user}:org:${org}:project:${proj}*`, // user journey keys
    `*org:${org}*project:${proj}*`, // very broad fallback
  ];

  for (const p of patterns) {
    try {
      await delByPattern(p);
    } catch (err) {
      console.warn('invalidateCachesForEvent error for pattern', p, err);
    }
  }
}
