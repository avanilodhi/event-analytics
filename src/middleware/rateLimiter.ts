// src/middleware/rateLimiter.ts
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Global limiter by client IP (safe for IPv6)
 */
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,            // 300 req/min per IP
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request, _res: Response) =>
  ipKeyGenerator(req.ip || 'unknown-ip'), // ✅ pass string IP
});

/**
 * Per-API-key limiter (fallback to IP if header missing)
 */
export const perKeyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 600,            // 600 req/min per API key
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request, _res: Response) =>
  req.header('x-api-key') || ipKeyGenerator(req.ip ?? 'unknown-ip'), // ✅ same fix
});
