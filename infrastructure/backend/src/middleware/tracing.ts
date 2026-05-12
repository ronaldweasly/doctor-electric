/**
 * Request Tracing Middleware
 * Extracts trace headers from requests and logs them for debugging
 */

import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      traceId?: string;
      sessionId?: string;
    }
  }
}

/**
 * Middleware to extract and attach trace context to requests
 * 
 * Usage:
 * app.use(tracingMiddleware);
 */
export function tracingMiddleware(req: Request, res: Response, next: NextFunction) {
  // Extract trace headers from request
  const traceId = req.get('X-Request-ID') || req.get('x-request-id');
  const sessionId = req.get('X-Session-ID') || req.get('x-session-id');
  const timestamp = req.get('X-Trace-Timestamp') || req.get('x-trace-timestamp');

  // Attach to request object for use in handlers
  if (traceId) req.traceId = traceId;
  if (sessionId) req.sessionId = sessionId;

  // Forward trace headers to response
  if (traceId) res.setHeader('X-Request-ID', traceId);
  if (sessionId) res.setHeader('X-Session-ID', sessionId);

  // Log request with trace context
  const method = req.method;
  const url = req.path;
  const ip = req.get('cf-connecting-ip') || req.ip;
  
  console.log(
    `[${new Date().toISOString()}] ${method} ${url}`,
    traceId ? `[trace: ${traceId.substring(0, 8)}]` : '',
    `from ${ip}`
  );

  // Log response time
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusColor = status >= 400 ? '❌' : '✓';
    console.log(
      `[${new Date().toISOString()}] ${statusColor} ${status} ${method} ${url}`,
      `${duration}ms`,
      traceId ? `[${traceId.substring(0, 8)}]` : ''
    );
  });

  next();
}
