import { Request, Response } from 'express';
import { eventQueue } from '../queues/eventQueue';
import { z, ZodError } from 'zod';
import crypto from 'crypto';
import { invalidateCachesForEvent } from '../config/cache'; // optional
import Event from '../models/Event';

// single event schema (client shape)
const singleEventSchema = z.object({
  orgId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  eventId: z.string().optional().nullable(),
  eventName: z.string().min(1),
  userId: z.string().min(1),
  metadata: z.record(z.string(), z.any()).optional(),
  timestamp: z.string().optional(), // ISO
});

const batchSchema = z.array(singleEventSchema).max(1000);

// compute fallback event hash
const computeEventHash = (ev: z.infer<typeof singleEventSchema>) => {
  const base = [
    ev.orgId ?? '',
    ev.projectId ?? '',
    ev.eventId ?? '',
    ev.eventName,
    ev.userId,
    ev.timestamp ?? '',
    JSON.stringify(ev.metadata ?? {}),
  ].join('|');
  return crypto.createHash('sha256').update(base).digest('hex');
};

const normalizeEvent = (ev: z.infer<typeof singleEventSchema>) => {
  const timestamp = ev.timestamp ? new Date(ev.timestamp) : new Date();
  const eventHash = ev.eventId ? null : computeEventHash(ev);

  return {
    orgId: ev.orgId ?? null,
    projectId: ev.projectId ?? null,
    eventId: ev.eventId ?? null,
    eventName: ev.eventName,
    userId: ev.userId,
    metadata: ev.metadata ?? {},
    timestamp, 
    eventHash,
    createdAt: new Date(), 
  };
};

const dedupeNormalizedEvents = (arr: ReturnType<typeof normalizeEvent>[]) => {
  const seen = new Set<string>();
  const out: typeof arr = [];
  for (const ev of arr) {
    const key = ev.eventId ?? ev.eventHash ?? `${ev.userId}|${ev.eventName}|${ev.timestamp}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(ev);
    }
  }
  return out;
};

///////////////////////////
// NEW: Async In-Memory Queue Processing
///////////////////////////
let asyncEventQueue: ReturnType<typeof normalizeEvent>[] = [];

// Worker function: save queued events to MongoDB every 1 second
const processQueue = async () => {
  if (asyncEventQueue.length === 0) return;

  const batch = [...asyncEventQueue];
  asyncEventQueue = [];

  try {
    await Event.insertMany(batch, { ordered: false });
    console.log(`Processed ${batch.length} events asynchronously`);
  } catch (err) {
    console.error('Async event queue error:', err);
  }
};

// Interval to process queue
setInterval(processQueue, 1000);

///////////////////////////
// SINGLE EVENT ENDPOINT
///////////////////////////
export const createEvent = async (req: Request, res: Response) => {
  try {
    const parsed = singleEventSchema.parse(req.body);
    const normalized = normalizeEvent(parsed);

    // --- NEW: Push to async in-memory queue ---
    asyncEventQueue.push(normalized);

    // Optional: enqueue via job queue if using BullMQ
    await eventQueue.add('bulk-events', { events: [normalized] });

    // Optionally invalidate caches / notify
    try { await invalidateCachesForEvent?.(normalized); } catch (e) {}

    return res.status(202).json({ success: true, accepted: 1 });
  } catch (err: any) {
    if (err instanceof ZodError) {
      return res.status(400).json({ success: false, error: err.issues.map(i => i.message) });
    }
    return res.status(400).json({ success: false, error: err?.message ?? String(err) });
  }
};

///////////////////////////
// BATCH EVENT ENDPOINT
///////////////////////////
export const createEventsBatch = async (req: Request, res: Response) => {
  try {
    const parsed = batchSchema.parse(req.body);
    if (parsed.length === 0) {
      return res.status(400).json({ success: false, error: 'empty payload' });
    }

    const normalized = parsed.map(normalizeEvent);
    const deduped = dedupeNormalizedEvents(normalized);

    // --- NEW: Push deduped events to async in-memory queue ---
    asyncEventQueue.push(...deduped);

    // Add single bulk job to job queue (BullMQ)
    await eventQueue.add('bulk-events', { events: deduped });

    // Invalidate caches (best-effort)
    try {
      for (const ev of deduped) {
        await invalidateCachesForEvent?.(ev);
      }
    } catch (e) {
      // swallow cache errors
    }

    return res.status(202).json({ success: true, accepted: deduped.length });
  } catch (err: any) {
    if (err instanceof ZodError) {
      return res.status(400).json({ success: false, error: err.issues.map(i => i.message) });
    }
    return res.status(400).json({ success: false, error: err?.message ?? String(err) });
  }
};
