import { Context, Next } from 'hono';

interface RateLimitOptions {
  limit?: number;      // Maximum requests allowed in window (default: 100)
  windowSeconds?: number; // Time window in seconds (default: 60)
}

export function rateLimiter(options: RateLimitOptions = {}) {
  const limit = options.limit || 100;
  const windowSeconds = options.windowSeconds || 60;

  return async (c: Context, next: Next) => {
    const kv = c.env?.RATE_LIMIT_KV as KVNamespace | undefined;
    const environment = c.env?.ENVIRONMENT || 'development';
    
    // ── SECURITY: Warn loudly if KV is unbound in production ──
    if (!kv) {
      if (environment === 'production') {
        console.error(
          '[SparrowBase CRITICAL] RATE_LIMIT_KV is not bound in production! ' +
          'Rate limiting is DISABLED. Your API is unprotected against abuse. ' +
          'Fix: Add [[kv_namespaces]] binding in wrangler.toml.'
        );
        // In production, still allow the request but log the critical issue.
        // Alternatively, uncomment the next line to block all requests:
        // return c.json({ error: 'Service misconfigured. Contact admin.' }, 503);
      }
      await next();
      return;
    }

    const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';
    const route = c.req.path;
    const windowKey = Math.floor(Date.now() / 1000 / windowSeconds);
    const key = `ratelimit:${clientIp}:${route}:${windowKey}`;

    const currentCountStr = await kv.get(key);
    const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;

    if (currentCount >= limit) {
      c.header('Retry-After', windowSeconds.toString());
      c.header('X-RateLimit-Limit', limit.toString());
      c.header('X-RateLimit-Remaining', '0');
      return c.json(
        {
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Maximum ${limit} requests per ${windowSeconds}s.`,
        },
        429
      );
    }

    await kv.put(key, (currentCount + 1).toString(), { expirationTtl: windowSeconds * 2 });
    
    c.header('X-RateLimit-Limit', limit.toString());
    c.header('X-RateLimit-Remaining', Math.max(0, limit - currentCount - 1).toString());

    await next();
  };
}
