/**
 * Request Tracing Utility
 * Adds X-Request-ID header to all requests for debugging across services
 * Helps trace issues from frontend through backend logs
 */

/**
 * Generate a unique request ID for tracing
 * Format: app-timestamp-random
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `req-${timestamp}-${random}`;
}

/**
 * Get or create a request ID for the current session
 * Stores in sessionStorage to maintain same ID across requests in a session
 */
export function getSessionRequestId(): string {
  const key = 'x_request_session_id';
  let sessionId = sessionStorage.getItem(key);
  
  if (!sessionId) {
    sessionId = generateRequestId();
    sessionStorage.setItem(key, sessionId);
  }
  
  return sessionId;
}

/**
 * Generate trace context object for including in requests
 */
export interface TraceContext {
  requestId: string;
  sessionId: string;
  timestamp: string;
  userAgent?: string;
}

export function generateTraceContext(): TraceContext {
  return {
    requestId: generateRequestId(),
    sessionId: getSessionRequestId(),
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
  };
}

/**
 * Add tracing headers to fetch request
 * 
 * @example
 * const headers = getTraceHeaders();
 * fetch(url, {
 *   headers: { ...headers }
 * });
 */
export function getTraceHeaders(): Record<string, string> {
  const context = generateTraceContext();
  return {
    'X-Request-ID': context.requestId,
    'X-Session-ID': context.sessionId,
    'X-Trace-Timestamp': context.timestamp,
  };
}

/**
 * Intercept fetch to automatically add tracing headers
 * Call this once in app initialization
 */
export function initializeRequestTracing(): void {
  const originalFetch = window.fetch;

  window.fetch = function(...args: any[]) {
    const [resource, config] = args;
    
    // Only add tracing headers to same-origin requests
    const isLocalRequest = 
      typeof resource === 'string' && 
      (resource.startsWith('/') || resource.startsWith(window.location.origin));

    if (isLocalRequest) {
      const headers = new Headers(config?.headers || {});
      const traceHeaders = getTraceHeaders();
      
      Object.entries(traceHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });

      return originalFetch.call(
        this,
        resource,
        { ...config, headers }
      );
    }

    return originalFetch.apply(this, args);
  } as any;

  console.log('[Tracing] Request tracing initialized');
}

/**
 * Log trace context to console for debugging
 */
export function logTraceContext(): void {
  const context = generateTraceContext();
  console.group('[Trace Context]');
  console.log('Request ID:', context.requestId);
  console.log('Session ID:', context.sessionId);
  console.log('Timestamp:', context.timestamp);
  console.log('User Agent:', context.userAgent);
  console.groupEnd();
}
