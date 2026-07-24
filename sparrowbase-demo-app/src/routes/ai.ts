import { Hono } from 'hono';
import { z } from 'zod';
import { EnvBindings } from '../auth';

export interface AiEnvBindings extends EnvBindings {
  AI?: any; // Cloudflare Workers AI Binding
  VECTORIZE_INDEX?: any; // Cloudflare Vectorize Index Binding
}

export const aiRouter = new Hono<{ Bindings: AiEnvBindings }>();

const embedSchema = z.object({
  text: z.string().min(1),
  id: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Endpoint to generate vector embedding and insert into Vectorize
aiRouter.post('/embed', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = embedSchema.parse(body);

    const ai = c.env.AI;
    const vectorIndex = c.env.VECTORIZE_INDEX;

    if (!ai || !vectorIndex) {
      return c.json({
        error: 'Cloudflare Workers AI or Vectorize binding not configured in wrangler.toml',
        simulated: true,
        embeddingLength: 384,
      });
    }

    // Generate 384-dim BGE embeddings using Cloudflare Workers AI
    const embeddingsResponse = await ai.run('@cf/baai/bge-small-en-v1.5', {
      text: [parsed.text],
    });

    const vector = embeddingsResponse.data[0];
    const vectorId = parsed.id || crypto.randomUUID();

    // Insert vector into Vectorize index
    await vectorIndex.insert([
      {
        id: vectorId,
        values: vector,
        metadata: { text: parsed.text, ...(parsed.metadata || {}) },
      },
    ]);

    return c.json({ success: true, vectorId, vectorDimensions: vector.length });
  } catch (err: any) {
    return c.json({ error: err.message || 'Vector embedding failure' }, 400);
  }
});

// Endpoint to query vector similarity (RAG Search)
aiRouter.post('/search', async (c) => {
  try {
    const { query, topK = 5 } = await c.req.json();
    const ai = c.env.AI;
    const vectorIndex = c.env.VECTORIZE_INDEX;

    if (!ai || !vectorIndex) {
      return c.json({
        simulated: true,
        query,
        matches: [],
      });
    }

    // Generate query embedding
    const embeddingsResponse = await ai.run('@cf/baai/bge-small-en-v1.5', {
      text: [query],
    });

    const queryVector = embeddingsResponse.data[0];

    // Search Vectorize index
    const searchResults = await vectorIndex.query(queryVector, {
      topK,
      returnMetadata: true,
    });

    return c.json({ success: true, query, matches: searchResults.matches });
  } catch (err: any) {
    return c.json({ error: err.message || 'Vector search failure' }, 400);
  }
});
