import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { healthRouter } from './routes/health';
import { storageRouter } from './routes/storage';
import { stripeRouter } from './routes/stripe';
import { aiRouter } from './routes/ai';
import { realtimeRouter } from './routes/realtime';
import { rateLimiter } from './middleware/rate-limit';
import { requestTracing } from './middleware/tracing';
import { authGuard } from './middleware/auth-guard';
import { edgeAnalytics } from './middleware/analytics';
import { initAuth, EnvBindings } from './auth';
import { RealtimeRoom } from './realtime/room';

const app = new Hono<{ Bindings: EnvBindings }>();

// 1. Tracing, Structured Logging & Edge Analytics Middleware
app.use('*', requestTracing());
app.use('*', edgeAnalytics());

// 2. CORS Middleware — SECURITY: Explicit origin allowlist, not wildcard reflection
app.use('*', cors({
  origin: (origin, c) => {
    const env = (c as any)?.env;
    const allowedOrigins = env?.ALLOWED_ORIGINS;

    // In development, allow localhost
    if (!allowedOrigins) {
      const devOrigins = ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8787'];
      return devOrigins.includes(origin) ? origin : devOrigins[0];
    }

    // In production, parse the comma-separated allowlist
    const allowed = allowedOrigins.split(',').map((s: string) => s.trim());
    return allowed.includes(origin) ? origin : allowed[0];
  },
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Length', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-Request-ID'],
  maxAge: 600,
  credentials: true,
}));

// 3. Global Rate Limiter (100 req/min per IP)
app.use('/api/*', rateLimiter({ limit: 100, windowSeconds: 60 }));

// 4. Better-Auth Handler Mount (public — handles its own auth)
app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  const auth = initAuth(c.env);
  return auth.handler(c.req.raw);
});

// 5. Public routes (no auth required)
app.route('/api/health', healthRouter);

// 6. Stripe webhook (uses its own HMAC signature verification, NOT session auth)
app.route('/api/stripe', stripeRouter);

// 7. ── SECURITY: Protected routes — require authenticated session ──
import { webhookRouter } from './routes/webhooks';

app.use('/api/storage/*', authGuard());
app.use('/api/ai/*', authGuard());
app.use('/api/webhooks/*', authGuard());

app.route('/api/storage', storageRouter);
app.route('/api/ai', aiRouter);
app.route('/api/webhooks', webhookRouter);
app.route('/api/realtime', realtimeRouter);

// 8. Root route
app.get('/', (c) => {
  return c.json({
    name: 'SparrowBase Production Edge Platform API',
    status: 'running',
    version: '1.0.0',
    domain: 'sparrowbase.dev',
    docs: 'https://sparrowbase.dev',
    security: {
      cors: 'Explicit origin allowlist',
      auth: 'Better-Auth with session cookies',
      stripe: 'HMAC-SHA256 webhook verification',
      rateLimit: '100 req/min per IP via KV',
    },
    endpoints: [
      '/api/health',
      '/api/auth/*',
      '/api/storage/upload (🔒 auth required)',
      '/api/stripe/webhook (🔒 HMAC verified)',
      '/api/ai/embed (🔒 auth required)',
      '/api/ai/search (🔒 auth required)',
      '/api/ai/chat/stream (🔒 auth required)',
      '/api/realtime/ws/:roomId (⚡ WebSocket Realtime)',
    ],
  });
});

export type AppType = typeof app;
export { RealtimeRoom };
export default app;
