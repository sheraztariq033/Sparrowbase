import { Hono } from 'hono';

export const healthRouter = new Hono<{ Bindings: { DB: D1Database } }>();

healthRouter.get('/', async (c) => {
  const startTime = Date.now();
  let dbStatus = 'healthy';
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    await c.env.DB.prepare('SELECT 1').first();
    dbLatencyMs = Date.now() - dbStart;
  } catch (err) {
    dbStatus = 'degraded';
  }

  const cfColo = (c.req.raw as any)?.cf?.colo || 'LOCAL-DEV';
  const cfCountry = (c.req.raw as any)?.cf?.country || 'LOCAL';

  return c.json({
    status: 'ok',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    edge: {
      coloRegion: cfColo,
      country: cfCountry,
      totalLatencyMs: Date.now() - startTime,
    },
    services: {
      d1Database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
    },
  });
});
