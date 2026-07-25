import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getDb } from '../db';
import * as schema from '../db/schema';
import { sendEmail, verificationEmailHtml, passwordResetEmailHtml, welcomeEmailHtml } from '../email';

// ── Unified Environment Bindings ──
// All Cloudflare Worker bindings and secrets used by SparrowBase.
export interface EnvBindings {
  // Core Cloudflare bindings
  DB: D1Database;
  RATE_LIMIT_KV: KVNamespace;
  UPLOADS_BUCKET: R2Bucket;
  
  // Auth
  BETTER_AUTH_SECRET: string;  // REQUIRED — no fallback
  BETTER_AUTH_URL?: string;
  
  // Email
  RESEND_API_KEY?: string;
  
  // Stripe
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  
  // AI
  AI?: any;
  VECTORIZE_INDEX?: any;
  
  // Security
  ALLOWED_ORIGINS?: string;  // Comma-separated list of allowed origins for CORS
  ENVIRONMENT?: string;      // 'development' | 'production'
}

export function initAuth(env: EnvBindings) {
  // ── SECURITY: Fail loudly if auth secret is missing ──
  if (!env.BETTER_AUTH_SECRET) {
    throw new Error(
      '[SparrowBase FATAL] BETTER_AUTH_SECRET is not set. ' +
      'Sessions cannot be signed securely. ' +
      'Run: npx wrangler secret put BETTER_AUTH_SECRET'
    );
  }

  const db = getDb(env.DB);
  const resendApiKey = env.RESEND_API_KEY;
  
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
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL || 'http://localhost:8787',
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      // ── Email Verification (OTP) ──
      requireEmailVerification: !!resendApiKey, // Only enforce if email is configured
      sendResetPassword: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: 'Reset Your SparrowBase Password',
          html: passwordResetEmailHtml(url),
        }, resendApiKey);
      },
    },
    emailVerification: {
      sendOnSignUp: !!resendApiKey,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, token }) => {
        // Generate 6-digit OTP from the token
        const otp = token.slice(0, 6).toUpperCase();
        await sendEmail({
          to: user.email,
          subject: `${otp} — Verify Your SparrowBase Email`,
          html: verificationEmailHtml(otp),
        }, resendApiKey);
      },
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
