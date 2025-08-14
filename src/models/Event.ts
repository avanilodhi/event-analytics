// src/models/Event.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
  _id: string;
  orgId?: string | null;
  projectId?: string | null;
  eventId?: string | null;          // optional client-provided unique id
  eventName: string;
  userId: string;
  metadata?: Record<string, any>;
  timestamp: Date;           // time when event happened
  eventHash?: string | null; // computed fallback dedupe key
  createdAt: Date;
}

const EventSchema = new mongoose.Schema({
  orgId: { type: String, index: true },
  projectId: { type: String, index: true },
  eventId: { type: String, index: true },
  eventName: { type: String, index: true },
  userId: { type: String, index: true },
  timestamp: { type: Date, index: true },
  metadata: { type: mongoose.Schema.Types.Mixed },
  eventHash: { type: String, index: true },
  createdAt: { type: Date, default: Date.now },
});

// existing useful indexes
EventSchema.index({ orgId: 1, projectId: 1 });
EventSchema.index(
  { orgId: 1, projectId: 1, eventId: 1 },
  {
    unique: true,
    partialFilterExpression: { eventId: { $type: 'string' } },
  }
);

EventSchema.index(
  { orgId: 1, projectId: 1, eventHash: 1 },
  {
    unique: true,
    partialFilterExpression: { eventHash: { $exists: true, $ne: null } },
  }
);

// ===== ADDITIONAL PERFORMANCE INDEXES (time-series friendly) =====
/**
 * Speeds up user-journey queries: find({ userId }).sort({ timestamp: 1 })
 */
EventSchema.index({ userId: 1, timestamp: 1 });

/**
 * Speeds up metrics queries: match by eventName then group by timestamp
 */
EventSchema.index({ eventName: 1, timestamp: 1 });

/**
 * Speeds up tenant / project + time range filters
 */
EventSchema.index({ orgId: 1, projectId: 1, timestamp: 1 });
// =================================================================

// Compound index for faster queries
EventSchema.index({ orgId: 1, projectId: 1, userId: 1, eventName: 1, timestamp: 1 });

export default mongoose.model<IEvent>('Event', EventSchema);
