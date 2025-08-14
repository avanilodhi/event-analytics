import { Router } from "express";
import { 
  getMetrics, 
  postFunnel, 
  getRetention, 
  getUserJourney 
} from "../controllers/analyticsController";

const router = Router();

// User journey
router.get("/users/:userId/journey", getUserJourney);

// Metrics
router.get("/metrics", getMetrics);

// Funnels
router.post("/funnels", postFunnel);

// Retention
router.get("/retention", getRetention);

// Optional placeholders (keep if you plan to implement)
router.get("/projects/:projectId/overview", (req, res) => {
  res.json({ success: true, data: {} });
});

router.get("/orgs/:orgId/stats", (req, res) => {
  res.json({ success: true, data: {} });
});

export default router;
