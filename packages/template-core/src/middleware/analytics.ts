import { Context, Next } from 'hono';

export interface AnalyticsEvent {
  path: string;
  method: string;
  status: number;
  durationMs: number;
  ip: string;
  colo: string;
  timestamp: number;
}

/**
 * Edge Telemetry & Analytics Middleware
 * Captures edge colocation latency and telemetry for Cloudflare Analytics Engine.
 */
export function edgeAnalytics() {
  return async (c: Context, next: Next) => {
    const startTime = Date.now();
    await next();
    const durationMs = Date.now() - startTime;

    const cf = (c.req.raw as any).cf || {};
    const colo = cf.colo || 'LOCAL';
    const clientIp = c.req.header('CF-Connecting-IP') || '127.0.0.1';

    const event: AnalyticsEvent = {
      path: c.req.path,
      method: c.req.method,
      status: c.res.status,
      durationMs,
      ip: clientIp,
      colo,
      timestamp: Date.now(),
    };

    // If Cloudflare Analytics Engine binding exists, write directly to dataset
    const analyticsEngine = (c.env as any)?.ANALYTICS;
    if (analyticsEngine && typeof analyticsEngine.writeDataPoint === 'function') {
      try {
        analyticsEngine.writeDataPoint({
          blobs: [event.path, event.method, event.colo],
          doubles: [event.durationMs, event.status],
          indexes: [event.colo],
        });
      } catch {
        // Non-blocking telemetry
      }
    }
  };
}
