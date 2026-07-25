import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { subscriptions, organizations, auditLogs, users, memberships } from '../db/schema';
import { EnvBindings } from '../auth';
import {
  sendEmail,
  welcomeToProEmailHtml,
  paymentFailedEmailHtml,
  subscriptionCanceledEmailHtml,
} from '../email';

export const stripeRouter = new Hono<{ Bindings: EnvBindings }>();

// ── Edge-Native HMAC-SHA256 Stripe Signature Verification ──
// Uses Web Crypto API (crypto.subtle) — NO Node.js dependencies.
async function verifyStripeSignature(
  rawBody: ArrayBuffer,
  signatureHeader: string,
  webhookSecret: string
): Promise<boolean> {
  // 1. Parse the stripe-signature header: "t=timestamp,v1=signature"
  const parts = Object.fromEntries(
    signatureHeader.split(',').map(part => {
      const [key, value] = part.split('=');
      return [key, value];
    })
  );

  const timestamp = parts['t'];
  const receivedSig = parts['v1'];

  if (!timestamp || !receivedSig) {
    return false;
  }

  // 2. Reject if timestamp is older than 5 minutes (replay protection)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp, 10)) > 300) {
    return false;
  }

  // 3. Construct the signed payload: "timestamp.rawBody"
  const rawBodyText = new TextDecoder().decode(rawBody);
  const signedPayload = `${timestamp}.${rawBodyText}`;

  // 4. Import webhook secret as HMAC key via Web Crypto API
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // 5. Compute HMAC-SHA256
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload)
  );

  // 6. Convert to hex string
  const computedSig = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // 7. Constant-time comparison to prevent timing attacks
  if (computedSig.length !== receivedSig.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < computedSig.length; i++) {
    mismatch |= computedSig.charCodeAt(i) ^ receivedSig.charCodeAt(i);
  }

  return mismatch === 0;
}

// ── Helper: get org owner's email ──
async function getOrgOwnerEmail(db: any, orgId: string): Promise<string | null> {
  try {
    const membership = await db.query.memberships.findFirst({
      where: (m: any, { eq }: any) => eq(m.organizationId, orgId),
    });
    if (!membership) return null;

    const user = await db.query.users.findFirst({
      where: (u: any, { eq }: any) => eq(u.id, membership.userId),
    });
    return user?.email || null;
  } catch {
    return null;
  }
}

// ── Webhook Handler with Real Signature Verification ──
stripeRouter.post('/webhook', async (c) => {
  const signature = c.req.header('stripe-signature');
  const webhookSecret = c.env?.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return c.json({ error: 'Stripe webhook signature or secret missing' }, 400);
  }

  try {
    const rawBodyBuffer = await c.req.raw.arrayBuffer();

    // ── SECURITY: Verify HMAC-SHA256 signature ──
    const isValid = await verifyStripeSignature(rawBodyBuffer, signature, webhookSecret);
    if (!isValid) {
      console.error('[SparrowBase Stripe] Invalid webhook signature — rejecting request');
      return c.json({ error: 'Invalid webhook signature' }, 403);
    }

    const rawBodyText = new TextDecoder().decode(rawBodyBuffer);
    const event = JSON.parse(rawBodyText);

    const db = getDb(c.env.DB);
    const resendApiKey = c.env.RESEND_API_KEY;

    // Audit Log recording
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      action: `stripe.webhook.${event.type}`,
      ipAddress: c.req.header('cf-connecting-ip') || 'stripe-webhook',
      details: JSON.stringify({ type: event.type, id: event.id }),
      createdAt: new Date(),
    });

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const customerId = sub.customer;
        const subscriptionId = sub.id;
        const status = sub.status;
        const priceId = sub.items?.data[0]?.price?.id || 'unknown';
        const orgId = sub.metadata?.organizationId;

        if (orgId) {
          await db
            .insert(subscriptions)
            .values({
              id: crypto.randomUUID(),
              organizationId: orgId,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              stripePriceId: priceId,
              status: status,
              currentPeriodStart: new Date(sub.current_period_start * 1000),
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
              cancelAtPeriodEnd: sub.cancel_at_period_end || false,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: subscriptions.organizationId,
              set: {
                status: status,
                stripePriceId: priceId,
                currentPeriodStart: new Date(sub.current_period_start * 1000),
                currentPeriodEnd: new Date(sub.current_period_end * 1000),
                cancelAtPeriodEnd: sub.cancel_at_period_end || false,
                updatedAt: new Date(),
              },
            });

          // Update organization plan tier
          await db
            .update(organizations)
            .set({ plan: status === 'active' ? 'pro' : 'free', updatedAt: new Date() })
            .where(eq(organizations.id, orgId));

          // ── Email: Welcome to Pro ──
          if (event.type === 'customer.subscription.created' && status === 'active') {
            const ownerEmail = await getOrgOwnerEmail(db, orgId);
            if (ownerEmail) {
              await sendEmail({
                to: ownerEmail,
                subject: 'Welcome to SparrowBase Pro! 🎉',
                html: welcomeToProEmailHtml(),
              }, resendApiKey);
            }
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const orgId = invoice.subscription_details?.metadata?.organizationId
          || invoice.lines?.data?.[0]?.metadata?.organizationId;
        if (orgId) {
          const ownerEmail = await getOrgOwnerEmail(db, orgId);
          if (ownerEmail) {
            await sendEmail({
              to: ownerEmail,
              subject: 'SparrowBase — Payment Failed',
              html: paymentFailedEmailHtml(),
            }, resendApiKey);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const orgId = sub.metadata?.organizationId;
        if (orgId) {
          await db
            .update(organizations)
            .set({ plan: 'free', updatedAt: new Date() })
            .where(eq(organizations.id, orgId));

          // ── Email: Subscription canceled ──
          const ownerEmail = await getOrgOwnerEmail(db, orgId);
          if (ownerEmail) {
            await sendEmail({
              to: ownerEmail,
              subject: 'SparrowBase Pro — Subscription Canceled',
              html: subscriptionCanceledEmailHtml(),
            }, resendApiKey);
          }
        }
        break;
      }
    }

    return c.json({ received: true });
  } catch (err: any) {
    console.error(`[SparrowBase Stripe] Webhook Error: ${err.message}`);
    return c.json({ error: `Webhook Handler Error: ${err.message}` }, 400);
  }
});
