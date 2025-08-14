// src/routes/eventRoutes.ts
import { Router } from 'express';
import { createEvent, createEventsBatch } from '../controllers/eventController';

const router = Router();

// Single event
router.post('/', createEvent);

// Batch events
router.post('/batch', createEventsBatch);

export default router;
