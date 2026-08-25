import { describe, it, expect, vi } from 'vitest';
import { createSparrowClient } from './index';

describe('SparrowBase Client SDK Suite', () => {
  it('should initialize client with default domain sparrowbase.dev', () => {
    const client = createSparrowClient();
    expect(client.baseUrl).toBe('https://api.sparrowbase.dev');
  });

  it('should call health endpoint correctly', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', version: '1.0.0' }),
    });

    const client = createSparrowClient({ fetch: mockFetch as any });
    const res = await client.getHealth();

    expect(mockFetch).toHaveBeenCalledWith('https://api.sparrowbase.dev/api/health');
    expect(res.status).toBe('ok');
  });

  it('should execute vector search via client SDK', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, matches: [] }),
    });

    const client = createSparrowClient({ fetch: mockFetch as any });
    const res = await client.ai.search('edge native databases');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.sparrowbase.dev/api/ai/search',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ query: 'edge native databases', topK: 5 }),
      })
    );
    expect(res.success).toBe(true);
  });

  it('should call auth signIn correctly', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: 'user_1', email: 'test@example.com' } }),
    });

    const client = createSparrowClient({ fetch: mockFetch as any });
    const res = await client.auth.signIn({ email: 'test@example.com', password: 'password123' });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.sparrowbase.dev/api/auth/sign-in/email',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      })
    );
    expect(res.user.email).toBe('test@example.com');
  });

  it('should stream AI chat chunks', async () => {
    const ssePayload = 'data: {"response":"Sparrow"}\n\ndata: {"response":"Base"}\n\ndata: [DONE]\n\n';
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(ssePayload));
        controller.close();
      },
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
    });

    const client = createSparrowClient({ fetch: mockFetch as any });
    const chunks: string[] = [];
    const fullText = await client.ai.streamChat({
      messages: [{ role: 'user', content: 'What is SparrowBase?' }],
      onChunk: (token) => chunks.push(token),
    });

    expect(fullText).toBe('SparrowBase');
    expect(chunks).toEqual(['Sparrow', 'Base']);
  });
});
