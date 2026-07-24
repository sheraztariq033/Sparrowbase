import { hc } from 'hono/client';

export interface SparrowClientOptions {
  baseUrl?: string;
  fetch?: typeof fetch;
}

export function createSparrowClient(options: SparrowClientOptions = {}) {
  const baseUrl = options.baseUrl || 'https://api.sparrowbase.dev';
  const customFetch = options.fetch || globalThis.fetch;

  return {
    baseUrl,
    
    // 1. Health Status Check
    async getHealth() {
      const res = await customFetch(`${baseUrl}/api/health`);
      if (!res.ok) throw new Error(`Health check failed (${res.status})`);
      return res.json();
    },

    // 2. Direct R2 File Upload Helper
    async uploadFile(file: File, userId: string, organizationId?: string) {
      // Step A: Get presigned upload target metadata
      const metaRes = await customFetch(`${baseUrl}/api/storage/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          userId,
          organizationId,
        }),
      });

      if (!metaRes.ok) {
        const err = await metaRes.json().catch(() => ({ error: 'Upload metadata failed' }));
        throw new Error(err.error || 'Upload request rejected');
      }

      const meta = await metaRes.json();

      // Step B: Stream upload directly into R2
      const uploadRes = await customFetch(`${baseUrl}${meta.uploadUrl}`, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`R2 streaming upload failed (${uploadRes.status})`);
      }

      return {
        fileId: meta.fileId,
        r2Key: meta.r2Key,
        publicUrl: `${baseUrl}${meta.publicUrl}`,
      };
    },

    // 3. AI RAG Vector Embed & Search Helpers
    ai: {
      async embed(text: string, metadata?: Record<string, any>) {
        const res = await customFetch(`${baseUrl}/api/ai/embed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, metadata }),
        });
        return res.json();
      },

      async search(query: string, topK = 5) {
        const res = await customFetch(`${baseUrl}/api/ai/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, topK }),
        });
        return res.json();
      },
    },
  };
}

export type SparrowClient = ReturnType<typeof createSparrowClient>;
