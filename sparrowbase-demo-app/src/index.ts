import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { healthRouter } from './routes/health';
import { storageRouter } from './routes/storage';
import { stripeRouter } from './routes/stripe';
import { aiRouter } from './routes/ai';
import { rateLimiter } from './middleware/rate-limit';
import { requestTracing } from './middleware/tracing';
import { initAuth, EnvBindings } from './auth';

const app = new Hono<{ Bindings: EnvBindings }>();

// 1. Tracing & Structured Logging Middleware
app.use('*', requestTracing());

// 2. CORS Middleware
app.use('*', cors({
  origin: (origin) => origin || '*',
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Length', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-Request-ID'],
  maxAge: 600,
  credentials: true,
}));

// 3. Global Rate Limiter (100 req/min per IP)
app.use('/api/*', rateLimiter({ limit: 100, windowSeconds: 60 }));

// 4. Better-Auth Handler Mount
app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  const auth = initAuth(c.env);
  return auth.handler(c.req.raw);
});

// 5. Production API Sub-routers
app.route('/api/health', healthRouter);
app.route('/api/storage', storageRouter);
app.route('/api/stripe', stripeRouter);
app.route('/api/ai', aiRouter);

// 6. Root route
app.get('/', (c) => {
  return c.json({
    name: 'SparrowBase Production Edge Platform API',
    status: 'running',
    version: '1.0.0',
    domain: 'sparrowbase.dev',
    docs: 'https://sparrowbase.dev',
    endpoints: [
      '/api/health',
      '/api/auth/*',
      '/api/storage/upload',
      '/api/stripe/webhook',
      '/api/ai/embed',
      '/api/ai/search',
    ],
  });
});

export default app;
