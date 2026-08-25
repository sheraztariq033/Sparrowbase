import { describe, it, expect } from 'vitest';
import app from './index';
import { sendEmail } from './email';
import { sendSms } from './sms';
import { chunkText } from './ai/chunker';

describe('SparrowBase Production Platform API Suite', () => {
  // ── Public Route Tests ──

  it('GET / should return SparrowBase Edge Platform info with security details', async () => {
    const res = await app.request('http://localhost/');
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.name).toBe('SparrowBase Production Edge Platform API');
    expect(data.domain).toBe('sparrowbase.dev');
    expect(data.status).toBe('running');
    expect(data.version).toBe('1.0.0');
    expect(data.security).toBeDefined();
    expect(data.security.stripe).toBe('HMAC-SHA256 webhook verification');
  });

  it('GET /api/health should respond with edge metrics', async () => {
    const mockEnv = {
      DB: {
        prepare: () => ({
          first: async () => ({ 1: 1 }),
        }),
      },
    };

    const res = await app.request('http://localhost/api/health', {}, mockEnv);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.status).toBe('ok');
    expect(data.services.d1Database.status).toBe('healthy');
  });

  // ── Auth Guard Tests (SECURITY) ──

  it('POST /api/storage/upload should REJECT unauthenticated requests', async () => {
    const mockEnv = {
      DB: {
        prepare: () => ({
          bind: () => ({
            run: async () => ({ success: true }),
          }),
          run: async () => ({ success: true }),
        }),
      },
    };

    const res = await app.request(
      'http://localhost/api/storage/upload',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: 'avatar.png',
          fileSize: 1024,
          mimeType: 'image/png',
        }),
      },
      mockEnv
    );

    expect(res.status).toBe(401);
    const data = (await res.json()) as any;
    expect(data.error).toBe('Unauthorized');
  });

  it('POST /api/ai/embed should REJECT unauthenticated requests', async () => {
    const res = await app.request(
      'http://localhost/api/ai/embed',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Hello SparrowBase Vector Search' }),
      },
      {}
    );

    expect(res.status).toBe(401);
    const data = (await res.json()) as any;
    expect(data.error).toBe('Unauthorized');
  });

  it('POST /api/ai/ingest should REJECT unauthenticated requests', async () => {
    const res = await app.request(
      'http://localhost/api/ai/ingest',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Long document text for RAG chunking...' }),
      },
      {}
    );

    expect(res.status).toBe(401);
  });

  it('POST /api/ai/search should REJECT unauthenticated requests', async () => {
    const res = await app.request(
      'http://localhost/api/ai/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test search', topK: 3 }),
      },
      {}
    );

    expect(res.status).toBe(401);
  });

  it('POST /api/ai/chat/stream should REJECT unauthenticated requests', async () => {
    const res = await app.request(
      'http://localhost/api/ai/chat/stream',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello AI' }],
        }),
      },
      {}
    );

    expect(res.status).toBe(401);
  });

  // ── Stripe Webhook Tests (SECURITY) ──

  it('POST /api/stripe/webhook should require signature header', async () => {
    const res = await app.request('http://localhost/api/stripe/webhook', {
      method: 'POST',
    });
    expect(res.status).toBe(400);
    const data = (await res.json()) as any;
    expect(data.error).toContain('Stripe webhook signature or secret missing');
  });

  it('POST /api/stripe/webhook should REJECT invalid HMAC signature', async () => {
    const mockEnv = {
      DB: {
        prepare: () => ({
          bind: () => ({
            run: async () => ({ success: true }),
          }),
          run: async () => ({ success: true }),
        }),
      },
      STRIPE_WEBHOOK_SECRET: 'whsec_test_secret_key_12345',
    };

    const res = await app.request(
      'http://localhost/api/stripe/webhook',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 't=1234567890,v1=invalid_signature_here',
        },
        body: JSON.stringify({ type: 'customer.subscription.created', data: { object: {} } }),
      },
      mockEnv
    );

    expect(res.status).toBe(403);
    const data = (await res.json()) as any;
    expect(data.error).toBe('Invalid webhook signature');
  });

  // ── Dual Email & SMS Engine Tests ──

  it('sendEmail should default to Resend provider', async () => {
    const result = await sendEmail(
      { to: 'test@example.com', subject: 'Hello', html: '<p>Test</p>' },
      {}
    );
    expect(result.success).toBe(true);
    expect(result.provider).toBe('resend');
    expect(result.simulated).toBe(true);
  });

  it('sendEmail should switch to Brevo when configured', async () => {
    const result = await sendEmail(
      { to: 'test@example.com', subject: 'Hello', html: '<p>Test</p>', provider: 'brevo' },
      {}
    );
    expect(result.success).toBe(true);
    expect(result.provider).toBe('brevo');
    expect(result.simulated).toBe(true);
  });

  it('sendSms should support Twilio and Plivo simulation', async () => {
    const twilioRes = await sendSms({ to: '+1234567890', message: 'OTP: 123456' }, {});
    expect(twilioRes.success).toBe(true);
    expect(twilioRes.provider).toBe('twilio');

    const plivoRes = await sendSms(
      { to: '+1234567890', message: 'OTP: 123456', provider: 'plivo' },
      {}
    );
    expect(plivoRes.success).toBe(true);
    expect(plivoRes.provider).toBe('plivo');
  });

  it('chunkText should divide long document into overlapping chunks', () => {
    const longText = 'Sentence one. Sentence two. Sentence three. Sentence four. Sentence five.';
    const chunks = chunkText(longText, { chunkSize: 30, overlap: 10 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].text.length).toBeLessThanOrEqual(30);
  });
});
