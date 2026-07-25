import { Hono } from 'hono';
import { z } from 'zod';
import { getDb } from '../db';
import { fileUploads } from '../db/schema';
import { EnvBindings } from '../auth';

export const storageRouter = new Hono<{ Bindings: EnvBindings; Variables: { userId: string; sessionId: string } }>();

// ── SECURITY: userId is NO LONGER accepted from the client ──
// It is pulled from the authenticated session (set by authGuard middleware).
const requestUploadSchema = z.object({
  fileName: z.string().min(1),
  fileSize: z.number().positive().max(100 * 1024 * 1024), // Max 100MB
  mimeType: z.string().min(1),
});

// Endpoint to request an R2 upload target or direct upload stream
storageRouter.post('/upload', async (c) => {
  try {
    // ── SECURITY: Get userId from authenticated session ──
    const userId = c.get('userId') as string;
    if (!userId) {
      return c.json({ error: 'Unauthorized', message: 'Authentication required.' }, 401);
    }

    const body = await c.req.json();
    const parsed = requestUploadSchema.parse(body);

    const fileId = crypto.randomUUID();
    const extension = parsed.fileName.includes('.')
      ? parsed.fileName.split('.').pop()
      : 'bin';
    const r2Key = `uploads/${userId}/${fileId}.${extension}`;

    const db = getDb(c.env.DB);
    
    // Save metadata record in D1 SQLite
    await db.insert(fileUploads).values({
      id: fileId,
      userId: userId,
      fileName: parsed.fileName,
      fileSize: parsed.fileSize,
      mimeType: parsed.mimeType,
      r2Key: r2Key,
      publicUrl: `/api/storage/file/${fileId}`,
      createdAt: new Date(),
    });

    return c.json({
      success: true,
      fileId,
      r2Key,
      uploadUrl: `/api/storage/raw-upload/${encodeURIComponent(r2Key)}`,
      publicUrl: `/api/storage/file/${fileId}`,
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return c.json({ error: 'Validation Error', details: err.errors }, 400);
    }
    return c.json({ error: err.message || 'Invalid upload payload' }, 400);
  }
});

// Endpoint to stream upload directly into R2 bucket (Edge native)
storageRouter.put('/raw-upload/:r2Key', async (c) => {
  const userId = c.get('userId') as string;
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const r2Key = decodeURIComponent(c.req.param('r2Key'));
  
  // ── SECURITY: Ensure user can only upload to their own path ──
  if (!r2Key.startsWith(`uploads/${userId}/`)) {
    return c.json({ error: 'Forbidden', message: 'Cannot upload to another user\'s storage path.' }, 403);
  }

  const bucket = c.env.UPLOADS_BUCKET;

  if (!bucket) {
    return c.json({ error: 'R2 Bucket UPLOADS_BUCKET not bound. Check wrangler.toml.' }, 500);
  }

  const contentType = c.req.header('content-type') || 'application/octet-stream';
  await bucket.put(r2Key, c.req.raw.body, {
    httpMetadata: { contentType },
  });

  return c.json({ success: true, r2Key });
});

// Endpoint to retrieve file from R2
storageRouter.get('/file/:fileId', async (c) => {
  const fileId = c.req.param('fileId');
  const db = getDb(c.env.DB);

  const fileRecord = await db.query.fileUploads.findFirst({
    where: (uploads, { eq }) => eq(uploads.id, fileId),
  });

  if (!fileRecord) {
    return c.json({ error: 'File not found' }, 404);
  }

  const object = await c.env.UPLOADS_BUCKET.get(fileRecord.r2Key);
  if (!object) {
    return c.json({ error: 'Object missing from R2 storage' }, 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');

  return new Response(object.body, { headers });
});
