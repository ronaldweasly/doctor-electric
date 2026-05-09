// =============================================================================
// Error Handling Middleware
// =============================================================================

import { Request, Response, NextFunction } from 'express';

/**
 * 404 handler for unknown API routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} does not exist`,
  });
}

/**
 * Global error handler
 * WHY: Catches all unhandled errors and returns consistent JSON responses.
 * In production, we never leak stack traces to the client.
 */
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
  // Log the full error server-side
  console.error('❌ Unhandled error:', {
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    ip: req.headers['cf-connecting-ip'] || req.ip,
  });

  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal Server Error' : err.message,
    // Only include details in non-production environments
    ...(process.env.NODE_ENV !== 'production' && { details: err.message }),
  });
}
