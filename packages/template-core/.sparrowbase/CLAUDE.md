# SparrowBase Rules for AI Coding Assistants (Cursor / Claude / Windsurf / v0)

You are building on top of **SparrowBase** (sparrowbase.dev), a production-grade, edge-native Cloudflare Workers + Hono.js + D1 SQLite + Drizzle ORM + Better-Auth + Stripe + Workers AI + R2 platform.

## 🚨 STRICT EDGE COMPATIBILITY RULES (CRITICAL)
- **NO NODE.JS NATIVE MODULES**: Never import `fs`, `path`, `net`, `tls`, `http`, `os`, or `child_process`. They DO NOT exist in Cloudflare Workers.
- **NO C++ NATIVE OR HEAVY NODE CRYPTO**: Never use `bcrypt`, `jsonwebtoken`, or `crypto` (node module). Use Web Crypto API `crypto.subtle` or `Better-Auth` utilities.
- **NO EXPRESS / KOA**: Use `Hono.js` for all routing (`import { Hono } from 'hono'`).
- **NO PROCESS.ENV**: Use `c.env.BINDING_NAME` inside Hono route handlers to access D1, R2, KV, Vectorize, or environment variables.

## 🗄️ DATABASE & DRIZZLE (Cloudflare D1)
1. All database schemas are defined in `src/db/schema.ts` using `drizzle-orm/sqlite-core`.
2. Tables included: `users`, `sessions`, `organizations`, `memberships`, `subscriptions`, `fileUploads`, `auditLogs`.
3. Access database in route handlers using `getDb(c.env.DB)`.

## 💳 STRIPE BILLING & WEBHOOKS
- Webhooks are mounted at `/api/stripe/webhook`.
- Signature verification uses raw body parsing: `await c.req.raw.arrayBuffer()`.

## 🤖 AI VECTOR SEARCH & RAG (Workers AI + Vectorize)
- Generate vector embeddings using `@cf/baai/bge-small-en-v1.5`.
- Query similarity vectors using `c.env.VECTORIZE_INDEX`.

## 📦 FILE STORAGE (Cloudflare R2)
- Use `/api/storage/upload` to request file upload metadata and stream directly into R2 via `c.env.UPLOADS_BUCKET`.

## ⚡ HONO ROUTE PATTERN EXAMPLE
```typescript
import { Hono } from 'hono';
import { getDb } from '../db';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

export const itemsRouter = new Hono<{ Bindings: EnvBindings }>();

const createItemSchema = z.object({
  title: z.string().min(1),
});

itemsRouter.post('/', zValidator('json', createItemSchema), async (c) => {
  const { title } = c.req.valid('json');
  const db = getDb(c.env.DB);
  // Perform Drizzle queries here...
  return c.json({ success: true, title });
});
```
