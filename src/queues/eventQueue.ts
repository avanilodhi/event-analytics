// src/queues/eventQueue.ts
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// create a redis connection for bullmq with required options
export const connection = new IORedis(REDIS_URL, {
  // BullMQ requires maxRetriesPerRequest to be null (no retries on command-level)
  maxRetriesPerRequest: null,
  // optionally: enable keepAlive etc. Add tls / password if needed
});

export const eventQueue = new Queue('event-processing', {
  connection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
  },
});
