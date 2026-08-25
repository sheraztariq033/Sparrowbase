import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import { EnvBindings } from '../auth';
import { chunkText } from '../ai/chunker';

export interface AiEnvBindings extends EnvBindings {
  AI?: any;
  VECTORIZE_INDEX?: any;
}

export const aiRouter = new Hono<{ Bindings: AiEnvBindings }>();

const embedSchema = z.object({
  text: z.string().min(1),
  id: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const ingestSchema = z.object({
  documentId: z.string().optional(),
  text: z.string().min(1),
  chunkSize: z.number().optional().default(500),
  overlap: z.number().optional().default(50),
  metadata: z.record(z.any()).optional(),
});

const chatStreamSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string().min(1),
    })
  ),
  model: z.string().optional().default('@cf/meta/llama-3-8b-instruct'),
  max_tokens: z.number().optional().default(512),
});

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

    const embeddingsResponse = await ai.run('@cf/baai/bge-small-en-v1.5', {
      text: [parsed.text],
    });

    const vector = embeddingsResponse.data[0];
    const vectorId = parsed.id || crypto.randomUUID();

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

aiRouter.post('/ingest', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = ingestSchema.parse(body);

    const chunks = chunkText(parsed.text, {
      chunkSize: parsed.chunkSize,
      overlap: parsed.overlap,
    });

    const docId = parsed.documentId || crypto.randomUUID();
    const ai = c.env.AI;
    const vectorIndex = c.env.VECTORIZE_INDEX;

    if (!ai || !vectorIndex) {
      return c.json({
        success: true,
        simulated: true,
        documentId: docId,
        totalChunks: chunks.length,
        chunksPreview: chunks.slice(0, 3),
      });
    }

    const vectorsToInsert = [];
    for (const chunk of chunks) {
      const embeddingsResponse = await ai.run('@cf/baai/bge-small-en-v1.5', {
        text: [chunk.text],
      });
      const vector = embeddingsResponse.data[0];
      const vectorId = `${docId}_chunk_${chunk.index}`;

      vectorsToInsert.push({
        id: vectorId,
        values: vector,
        metadata: {
          documentId: docId,
          chunkIndex: chunk.index,
          text: chunk.text,
          ...(parsed.metadata || {}),
        },
      });
    }

    await vectorIndex.insert(vectorsToInsert);

    return c.json({
      success: true,
      documentId: docId,
      totalChunks: chunks.length,
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Document ingestion failure' }, 400);
  }
});

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

    const embeddingsResponse = await ai.run('@cf/baai/bge-small-en-v1.5', {
      text: [query],
    });

    const queryVector = embeddingsResponse.data[0];

    const searchResults = await vectorIndex.query(queryVector, {
      topK,
      returnMetadata: true,
    });

    return c.json({ success: true, query, matches: searchResults.matches });
  } catch (err: any) {
    return c.json({ error: err.message || 'Vector search failure' }, 400);
  }
});

aiRouter.post('/chat/stream', async (c) => {
  try {
    const body = await c.req.json();
    const { messages, model, max_tokens } = chatStreamSchema.parse(body);

    const ai = c.env.AI;

    if (!ai) {
      return streamSSE(c, async (stream) => {
        const mockResponses = [
          'SparrowBase ',
          'provides ',
          'zero-cost ',
          'edge-native ',
          'AI streaming ',
          'capabilities.',
        ];
        for (const token of mockResponses) {
          await stream.writeSSE({
            data: JSON.stringify({ response: token }),
          });
          await stream.sleep(20);
        }
        await stream.writeSSE({ data: '[DONE]' });
      });
    }

    const responseStream = await ai.run(model, {
      messages,
      max_tokens,
      stream: true,
    });

    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'AI streaming failure' }, 400);
  }
});
