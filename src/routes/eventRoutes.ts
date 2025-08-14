import { Router } from 'express';
import { createEvent, createEventsBatch } from '../controllers/eventController';

const router = Router();
/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Create events
 *     tags:
 *       - Events
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               events:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     eventName:
 *                       type: string
 *                     orgId:
 *                       type: string
 *                     projectId:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *     responses:
 *       200:
 *         description: Events created successfully
 *       400:
 *         description: Invalid request
 *     security:
 *       - ApiKeyAuth: []
 */
// Single event
router.post('/', createEvent);

// Batch events
/**
 * @swagger
 * /api/events/batch:
 *   post:
 *     summary: Create multiple events in batch
 *     tags:
 *       - Events
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               events:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     eventName:
 *                       type: string
 *                     orgId:
 *                       type: string
 *                     projectId:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *     responses:
 *       200:
 *         description: Events batch created successfully
 *       400:
 *         description: Invalid request
 *     security:
 *       - ApiKeyAuth: []
 */
router.post('/batch', createEventsBatch);

export default router;
