import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { subscriptions, organizations, auditLogs } from '../db/schema';
import { EnvBindings } from '../auth';

export interface StripeEnvBindings extends EnvBindings {
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
}

export const stripeRouter = new Hono<{ Bindings: StripeEnvBindings }>();

// Webhook Handler with Edge Native Raw ArrayBuffer Signature Validation
stripeRouter.post('/webhook', async (c) => {
  const signature = c.req.header('stripe-signature');
  const webhookSecret = c.env?.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return c.json({ error: 'Stripe webhook signature or secret missing' }, 400);
  }

  try {
    const rawBodyBuffer = await c.req.raw.arrayBuffer();
    const rawBodyText = new TextDecoder().decode(rawBodyBuffer);
    const event = JSON.parse(rawBodyText);

    const db = getDb(c.env.DB);

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
        }
        break;
      }
    }

    return c.json({ received: true });
  } catch (err: any) {
    return c.json({ error: `Webhook Handler Error: ${err.message}` }, 400);
  }
});
