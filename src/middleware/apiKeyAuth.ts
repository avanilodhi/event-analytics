// src/middleware/apiKeyAuth.ts
import { Request, Response, NextFunction } from 'express';

const API_KEYS = (process.env.API_KEYS || '').split(',').map(k => k.trim()).filter(Boolean);

/**
 * Simple API key auth middleware.
 * Reads x-api-key header or ?apiKey=... query param.
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const key = (req.header('x-api-key') || req.query.apiKey || '') as string;

  if (!API_KEYS.length) {
    // In dev, allow if env var not set but log a warning.
    console.warn('Warning: no API_KEYS configured in env; allowing unauthenticated traffic (dev only).');
    (req as any).apiKey = key || 'anonymous';
    return next();
  }

  if (!key) {
    return res.status(401).json({ success: false, error: 'Missing API key in x-api-key header or apiKey query param' });
  }

  if (!API_KEYS.includes(key)) {
    return res.status(401).json({ success: false, error: 'Invalid API key' });
  }

  (req as any).apiKey = key;
  next();
}
