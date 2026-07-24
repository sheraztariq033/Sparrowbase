import { describe, it, expect } from 'vitest';
import app from './index';

describe('SparrowBase Production Platform API Suite', () => {
  it('GET / should return SparrowBase Edge Platform info', async () => {
    const res = await app.request('http://localhost/');
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.name).toBe('SparrowBase Production Edge Platform API');
    expect(data.domain).toBe('sparrowbase.dev');
    expect(data.status).toBe('running');
    expect(data.version).toBe('1.0.0');
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

  it('POST /api/storage/upload should validate request body', async () => {
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
          userId: 'user_123',
        }),
      },
      mockEnv
    );

    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.publicUrl).toContain('/api/storage/file/');
  });

  it('POST /api/stripe/webhook should require signature', async () => {
    const res = await app.request('http://localhost/api/stripe/webhook', {
      method: 'POST',
    });
    expect(res.status).toBe(400);
    const data = await res.json() as any;
    expect(data.error).toContain('Stripe webhook signature or secret missing');
  });

  it('POST /api/ai/embed should handle unconfigured vector bindings gracefully', async () => {
    const res = await app.request(
      'http://localhost/api/ai/embed',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Hello SparrowBase Vector Search' }),
      },
      {}
    );

    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.simulated).toBe(true);
    expect(data.embeddingLength).toBe(384);
  });
});
