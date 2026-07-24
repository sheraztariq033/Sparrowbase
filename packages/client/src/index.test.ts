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
});
