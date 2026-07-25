// ── SparrowBase Role-Based Access Control (RBAC) & API Key Middleware ──
// Supports multi-tenant roles (owner, admin, member, viewer) and API Key Authentication.

import { Context, Next } from 'hono';
import { getDb } from '../db';
import { memberships, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export type Role = 'owner' | 'admin' | 'member' | 'viewer';

const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

/**
 * Require a minimum organization role to access a route.
 * @param minRole - Minimum required role ('owner' | 'admin' | 'member' | 'viewer')
 */
export function requireRole(minRole: Role) {
  return async (c: Context, next: Next) => {
    const userId = c.get('userId') as string;
    const orgId = c.req.header('x-organization-id') || c.req.query('organizationId');

    if (!userId) {
      return c.json({ error: 'Unauthorized', message: 'Authentication required.' }, 401);
    }

    if (!orgId) {
      return c.json({ error: 'Bad Request', message: 'x-organization-id header or organizationId query param required.' }, 400);
    }

    const db = getDb(c.env.DB);
    const membership = await db.query.memberships.findFirst({
      where: (m, { eq, and }) =>
        and(
          eq(m.userId, userId),
          eq(m.organizationId, orgId)
        ),
    });

    if (!membership) {
      return c.json({ error: 'Forbidden', message: 'You are not a member of this organization.' }, 403);
    }

    const userRole = (membership.role || 'member') as Role;
    if ((ROLE_HIERARCHY[userRole] || 0) < ROLE_HIERARCHY[minRole]) {
      return c.json({
        error: 'Forbidden',
        message: `Insufficient permissions. Requires '${minRole}' role or higher (you are '${userRole}').`,
      }, 403);
    }

    c.set('orgRole', userRole);
    c.set('orgId', orgId);

    await next();
  };
}

/**
 * API Key Authentication Middleware for B2B/Developer API endpoints.
 * Validates 'X-API-Key: sb_live_...' headers against KV or database.
 */
export function apiKeyGuard() {
  return async (c: Context, next: Next) => {
    const apiKey = c.req.header('x-api-key') || c.req.header('authorization')?.replace('Bearer ', '');

    if (!apiKey || !apiKey.startsWith('sb_')) {
      return c.json({ error: 'Unauthorized', message: 'Valid X-API-Key header (sb_live_...) required.' }, 401);
    }

    const kv = c.env.RATE_LIMIT_KV as KVNamespace;
    if (kv) {
      const keyDataStr = await kv.get(`apikey:${apiKey}`);
      if (keyDataStr) {
        const keyData = JSON.parse(keyDataStr);
        c.set('userId', keyData.userId);
        c.set('orgId', keyData.orgId);
        c.set('apiKeyScopes', keyData.scopes || []);
        await next();
        return;
      }
    }

    // Fallback if key not found
    return c.json({ error: 'Unauthorized', message: 'Invalid or revoked API key.' }, 401);
  };
}
