// src/workers/eventWorker.ts
import 'dotenv/config';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import mongoose from 'mongoose';
import Event from '../models/Event';
import { connectDB } from '../config/db';

(async () => {
  try {
    // 1) Connect MongoDB
    await connectDB();

    // Crash fast if Mongo dies later
    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongo connection error in worker:', err);
      process.exit(1);
    });
    mongoose.connection.on('disconnected', () => {
      console.error('❌ Mongo disconnected in worker');
      process.exit(1);
    });

    // 2) Redis connection for BullMQ
    const connection = new IORedis(process.env.REDIS_URL as string, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    connection.on('error', (err) => {
      console.error('❌ Redis error in worker:', err);
      process.exit(1);
    });

    // 3) Worker
    const worker = new Worker(
      'event-processing',
      async (job) => {
        const { events } = job.data as { events: any[] };
        if (!Array.isArray(events) || events.length === 0) return;

        const ops = events.map((ev) => {
          const filter: any = { orgId: ev.orgId ?? null, projectId: ev.projectId ?? null };
          if (ev.eventId) filter.eventId = ev.eventId;
          else filter.eventHash = ev.eventHash;

          const doc = {
            orgId: ev.orgId ?? null,
            projectId: ev.projectId ?? null,
            eventId: ev.eventId ?? null,
            eventName: ev.eventName,
            userId: ev.userId,
            metadata: ev.metadata ?? {},
            timestamp: ev.timestamp ? new Date(ev.timestamp) : new Date(),
            eventHash: ev.eventHash ?? null,
            createdAt: ev.createdAt ? new Date(ev.createdAt) : new Date(),
          };

          return {
            updateOne: {
              filter,
              update: { $setOnInsert: doc },
              upsert: true,
            },
          };
        });

        if (ops.length > 0) {
          await Event.bulkWrite(ops, { ordered: false });
        }
      },
      {
        connection,
        concurrency: 10,
        removeOnComplete: { age: 60, count: 1000 },
        removeOnFail: { age: 60 * 60, count: 1000 },
      }
    );

    worker.on('completed', (job) => {
      console.log('✅ Worker completed job', job.id);
    });
    worker.on('failed', (job, err) => {
      console.error('❌ Worker failed job', job?.id, err);
    });
  } catch (err) {
    console.error('❌ Worker failed to start:', err);
    process.exit(1);
  }
})();
