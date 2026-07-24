import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getDb } from '../db';
import * as schema from '../db/schema';

export interface EnvBindings {
  DB: D1Database;
  RATE_LIMIT_KV: KVNamespace;
  UPLOADS_BUCKET: R2Bucket;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
}

export function initAuth(env: EnvBindings) {
  const db = getDb(env.DB);
  
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
      },
    }),
    secret: env.BETTER_AUTH_SECRET || 'dev-secret-sparrowbase-min-32-chars-key',
    baseURL: env.BETTER_AUTH_URL || 'http://localhost:8787',
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
    },
    advanced: {
      crossSubDomainCookies: {
        enabled: true,
      },
      defaultCookieAttributes: {
        sameSite: 'lax',
        secure: true,
      },
    },
  });
}
