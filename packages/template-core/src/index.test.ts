import { describe, it, expect } from 'vitest';
import app from './index';

describe('SparrowBase Production Platform API Suite', () => {
  // ── Public Route Tests ──

  it('GET / should return SparrowBase Edge Platform info with security details', async () => {
    const res = await app.request('http://localhost/');
    expect(res.status).toBe(200);
    const data = await res.json() as any;
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
    const data = await res.json() as any;
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

    // Should be 401 Unauthorized (no session cookie/token)
    expect(res.status).toBe(401);
    const data = await res.json() as any;
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

    // Should be 401 Unauthorized (no session cookie/token)
    expect(res.status).toBe(401);
    const data = await res.json() as any;
    expect(data.error).toBe('Unauthorized');
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

  // ── Stripe Webhook Tests (SECURITY) ──

  it('POST /api/stripe/webhook should require signature header', async () => {
    const res = await app.request('http://localhost/api/stripe/webhook', {
      method: 'POST',
    });
    expect(res.status).toBe(400);
    const data = await res.json() as any;
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

    // Should be 403 Forbidden (invalid HMAC)
    expect(res.status).toBe(403);
    const data = await res.json() as any;
    expect(data.error).toBe('Invalid webhook signature');
  });
});
