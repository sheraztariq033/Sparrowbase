import { Context, Next } from 'hono';

export interface TurnstileOptions {
  secretKeyEnvVar?: string;
  headerName?: string;
  bypassInDev?: boolean;
}

/**
 * Cloudflare Turnstile Bot Protection Middleware
 * Verifies Turnstile challenge token against Cloudflare's siteverify endpoint.
 */
export function turnstileGuard(options: TurnstileOptions = {}) {
  const {
    headerName = 'cf-turnstile-response',
    bypassInDev = true,
  } = options;

  return async (c: Context, next: Next) => {
    const env = (c.env as any) || {};
    const secretKey = env.TURNSTILE_SECRET_KEY;
    const isDev = env.ENVIRONMENT === 'development' || !secretKey;

    // In local development without secret configured, bypass if option set
    if (isDev && bypassInDev) {
      return next();
    }

    const token =
      c.req.header(headerName) ||
      ((await c.req.raw.clone().json().catch(() => ({}))) as any)?.turnstileToken;

    if (!token) {
      return c.json(
        {
          error: 'Turnstile verification failed: Missing challenge token',
          code: 'TURNSTILE_TOKEN_MISSING',
        },
        403
      );
    }

    try {
      const clientIp = c.req.header('CF-Connecting-IP') || '127.0.0.1';
      const formData = new FormData();
      formData.append('secret', secretKey || '1x0000000000000000000000000000000AA'); // Cloudflare test pass key
      formData.append('response', token);
      formData.append('remoteip', clientIp);

      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: formData,
      });

      const outcome: any = await verifyRes.json();

      if (!outcome.success) {
        return c.json(
          {
            error: 'Turnstile verification failed: Invalid challenge token',
            code: 'TURNSTILE_VALIDATION_FAILED',
            details: outcome['error-codes'],
          },
          403
        );
      }

      return next();
    } catch (err: any) {
      return c.json(
        {
          error: 'Turnstile verification error',
          code: 'TURNSTILE_ERROR',
        },
        500
      );
    }
  };
}
