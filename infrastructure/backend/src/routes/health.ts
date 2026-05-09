// =============================================================================
// Health Check Route
// =============================================================================
// Used by:
// - Docker HEALTHCHECK
// - Uptime Kuma monitoring
// - Cloudflare health checks
// - CI/CD deployment verification
// =============================================================================

import { Router, Request, Response } from 'express';
import { pool } from '../db/pool.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req: Request, res: Response) => {
  const checks: Record<string, string> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
  };

  try {
    // Check database connectivity
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    checks.database = `ok (${Date.now() - dbStart}ms)`;
    checks.db_pool = `${pool.totalCount} total, ${pool.idleCount} idle, ${pool.waitingCount} waiting`;
  } catch (err) {
    checks.database = 'error';
    checks.status = 'degraded';
  }

  const statusCode = checks.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(checks);
});
