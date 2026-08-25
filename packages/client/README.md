# 🦜 `@sparrowbase/client`

> Universal TypeScript SDK client for SparrowBase Edge Backend

A lightweight, type-safe client library to connect your frontend applications (React, Next.js, Vue, Svelte, Vite, Node) directly to your SparrowBase Edge backend.

---

## 📦 Installation

```bash
npm install @sparrowbase/client
```

---

## 🚀 Quick Start

```typescript
import { createSparrowClient } from '@sparrowbase/client';

const client = createSparrowClient({
  baseUrl: 'https://api.sparrowbase.dev', // Or http://localhost:8787 in dev
});

// 1. Check Backend Health & Edge Diagnostics
const health = await client.getHealth();
console.log('Edge Status:', health.status);

// 2. Direct Streaming File Upload to Cloudflare R2
const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
if (fileInput?.files?.[0]) {
  const result = await client.uploadFile(fileInput.files[0], 'user_123');
  console.log('Public R2 File URL:', result.publicUrl);
}

// 3. AI Semantic Embeddings & RAG Search
const embedding = await client.ai.embed('SparrowBase is zero-cost edge infrastructure.');
const searchResults = await client.ai.search('edge backend framework', 5);
console.log('Search Results:', searchResults);
```

---

## 🧪 Testing

```bash
npm run test
```
