// ── SparrowBase Outbound Webhooks & Full-Text Search Engine ──
// Allows users to dispatch event notifications (webhooks) to external servers
// and run D1 Full-Text Search queries across database tables.

import { Hono } from 'hono';
import { z } from 'zod';
import { EnvBindings } from '../auth';
import { getDb } from '../db';
import { auditLogs } from '../db/schema';

export const webhookRouter = new Hono<{ Bindings: EnvBindings; Variables: { userId: string; orgId: string } }>();

const dispatchWebhookSchema = z.object({
  targetUrl: z.string().url(),
  event: z.string().min(1),
  payload: z.record(z.any()),
  secret: z.string().optional(),
});

/**
 * Dispatch an outbound webhook event to a third-party server (Zapier, Make, Slack, Customer Backend).
 */
webhookRouter.post('/dispatch', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = dispatchWebhookSchema.parse(body);

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const bodyString = JSON.stringify(parsed.payload);

    // Compute HMAC signature if secret is provided
    let signature = '';
    if (parsed.secret) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(parsed.secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const sigBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(`${timestamp}.${bodyString}`)
      );
      signature = Array.from(new Uint8Array(sigBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }

    // Edge-native fetch to target endpoint with 5-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(parsed.targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SparrowBase-Webhook/1.0',
        'X-SparrowBase-Event': parsed.event,
        'X-SparrowBase-Timestamp': timestamp,
        ...(signature ? { 'X-SparrowBase-Signature': `t=${timestamp},v1=${signature}` } : {}),
      },
      body: bodyString,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Log webhook delivery in audit log
    const db = getDb(c.env.DB);
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      action: `webhook.outbound.${parsed.event}`,
      details: JSON.stringify({
        targetUrl: parsed.targetUrl,
        statusCode: res.status,
        success: res.ok,
      }),
      createdAt: new Date(),
    });

    return c.json({
      success: res.ok,
      statusCode: res.status,
      event: parsed.event,
    });
  } catch (err: any) {
    return c.json({ error: `Webhook Dispatch Error: ${err.message}` }, 500);
  }
});
