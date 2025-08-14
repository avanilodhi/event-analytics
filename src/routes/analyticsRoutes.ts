import { Router } from "express";
import {
  getMetrics,
  postFunnel,
  getRetention,
  getUserJourney
} from "../controllers/analyticsController";

const router = Router();

// User journey

/**
 * @swagger
 * /api/analytics/users/{userId}/journey:
 *   get:
 *     summary: Get a user's event journey
 *     tags:
 *       - Analytics
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: orgId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *       - name: projectId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User journey fetched successfully
 *     security:
 *       - ApiKeyAuth: []
 */
router.get("/users/:userId/journey", getUserJourney);

// Metrics
/**
 * @swagger
 * /api/analytics/metrics:
 *   get:
 *     summary: Get aggregated metrics for an event
 *     tags:
 *       - Analytics
 *     parameters:
 *       - name: event
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *       - name: interval
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *       - name: orgId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *       - name: projectId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Metrics fetched successfully
 *     security:
 *       - ApiKeyAuth: []
 */
router.get("/metrics", getMetrics);

// Funnels
/**
 * @swagger
 * /api/analytics/funnels:
 *   post:
 *     summary: Compute user funnel steps
 *     tags:
 *       - Analytics
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               steps:
 *                 type: array
 *                 items:
 *                   type: string
 *               orgId:
 *                 type: string
 *               projectId:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Funnel calculated successfully
 *     security:
 *       - ApiKeyAuth: []
 */
router.post("/funnels", postFunnel);

/**
 * @swagger
 * /api/analytics/retention:
 *   get:
 *     summary: Get cohort retention
 *     tags:
 *       - Analytics
 *     parameters:
 *       - name: cohort
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *       - name: days
 *         in: query
 *         required: true
 *         schema:
 *           type: number
 *       - name: orgId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *       - name: projectId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *       - name: startDate
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Retention calculated successfully
 *     security:
 *       - ApiKeyAuth: []
 */
// Retention
router.get("/retention", getRetention);

/**
 * @swagger
 * /api/analytics/projects/{projectId}/overview:
 *   get:
 *     summary: Get project overview
 *     tags:
 *       - Analytics
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project overview fetched successfully
 *     security:
 *       - ApiKeyAuth: []
 */

router.get("/projects/:projectId/overview", (req, res) => {
  res.json({ success: true, data: {} });
});

/**
 * @swagger
 * /api/analytics/orgs/{orgId}/stats:
 *   get:
 *     summary: Get org stats
 *     tags:
 *       - Analytics
 *     parameters:
 *       - name: orgId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Org stats fetched successfully
 *     security:
 *       - ApiKeyAuth: []
 */

router.get("/orgs/:orgId/stats", (req, res) => {
  res.json({ success: true, data: {} });
});

export default router;
