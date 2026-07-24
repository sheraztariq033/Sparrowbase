import { Context, Next } from 'hono';

export function requestTracing() {
  return async (c: Context, next: Next) => {
    const requestId = c.req.header('x-request-id') || crypto.randomUUID();
    c.set('requestId', requestId);
    c.header('x-request-id', requestId);

    const start = Date.now();
    await next();
    const duration = Date.now() - start;

    // Structured JSON log for production log aggregators
    console.log(JSON.stringify({
      level: 'info',
      requestId,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: duration,
      ip: c.req.header('cf-connecting-ip') || '127.0.0.1',
      colo: (c.req.raw as any)?.cf?.colo || 'LOCAL',
    }));
  };
}
