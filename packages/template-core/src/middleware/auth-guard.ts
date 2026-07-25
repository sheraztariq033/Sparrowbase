// ── SparrowBase Auth Guard Middleware ──
// Protects routes by validating Better-Auth session tokens.
// Sets c.set('userId', ...) and c.set('sessionId', ...) for downstream handlers.

import { Context, Next } from 'hono';
import { getDb } from '../db';
import { sessions, users } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';

/**
 * Auth guard middleware for Hono.
 * Validates session from cookie or Authorization header against D1 database.
 * 
 * Usage in index.ts:
 *   app.use('/api/storage/*', authGuard());
 *   app.use('/api/ai/*', authGuard());
 */
export function authGuard() {
  return async (c: Context, next: Next) => {
    const db = getDb(c.env.DB);

    // 1. Extract session token from cookie or Authorization header
    let sessionToken: string | undefined;

    // Try cookie first (Better-Auth default cookie name)
    const cookieHeader = c.req.header('cookie');
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map(c => {
          const [key, ...vals] = c.trim().split('=');
          return [key, vals.join('=')];
        })
      );
      sessionToken = cookies['better-auth.session_token'] || cookies['__Secure-better-auth.session_token'];
    }

    // Fallback to Authorization: Bearer <token>
    if (!sessionToken) {
      const authHeader = c.req.header('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        sessionToken = authHeader.slice(7);
      }
    }

    if (!sessionToken) {
      return c.json(
        { error: 'Unauthorized', message: 'Authentication required. Please sign in.' },
        401
      );
    }

    // 2. Validate session token against D1 database
    try {
      const session = await db.query.sessions.findFirst({
        where: (s, { eq, and, gt }) =>
          and(
            eq(s.token, sessionToken!),
            gt(s.expiresAt, new Date())
          ),
      });

      if (!session) {
        return c.json(
          { error: 'Unauthorized', message: 'Session expired or invalid. Please sign in again.' },
          401
        );
      }

      // 3. Set authenticated user context for downstream handlers
      c.set('userId', session.userId);
      c.set('sessionId', session.id);

      await next();
    } catch (err: any) {
      console.error(`[SparrowBase Auth Guard] Session validation error: ${err.message}`);
      return c.json(
        { error: 'Authentication Error', message: 'Could not validate session.' },
        500
      );
    }
  };
}
