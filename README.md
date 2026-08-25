<div align="center">

# 🦜 SparrowBase

### **The Zero-Cost Cloudflare Edge Backend & AI Rules Platform for Vibe Coders**

[![GitHub stars](https://img.shields.io/github/stars/sheraztariq033/Sparrowbase?style=for-the-badge&logo=github&color=10b981)](https://github.com/sheraztariq033/Sparrowbase)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Edge_Native-F38020?style=for-the-badge&logo=cloudflare)](https://workers.cloudflare.com)
[![Free Tier: $0/mo](https://img.shields.io/badge/Cost-$0_Free_Tier-10b981?style=for-the-badge)](https://sparrowbase.dev)
[![Tests](https://img.shields.io/badge/Tests-19%2F19_Passed-10b981?style=for-the-badge)](https://github.com/sheraztariq033/Sparrowbase)

[**Live Website**](https://sparrowbase.pages.dev) • [**Documentation**](https://sparrowbase.pages.dev#docs) • [**AI Prompt Library**](https://sparrowbase.pages.dev#prompt-library) • [**Launch Kit**](LAUNCH_KIT.md) • [**Contributing**](CONTRIBUTING.md)

</div>

---

## 🌟 Why SparrowBase?

When building apps with AI assistants (**Cursor, Windsurf, Claude, v0, Lovable**), LLMs constantly hallucinate heavy Node.js libraries (`fs`, `express`, `bcrypt`, `jsonwebtoken`) that crash when deploying to serverless edge runtimes.

Furthermore, traditional PaaS platforms charge **$25–$50/month**, pause databases after 7 days of inactivity, and bill unpredictable bandwidth egress fees.

**SparrowBase** bridges that gap:
- ⚡ **100% $0/mo Free Tier**: 100,000 requests/day, 5M D1 database reads/day, 10GB R2 storage with **$0 bandwidth egress fees forever**.
- 🤖 **AI-Native Rules Pack**: Pre-bundled `.cursorrules`, `CLAUDE.md`, and official Cloudflare MCP servers ensure AI tools generate 100% correct edge code on the first prompt.
- 📦 **Complete Production Backend**: Authentication (Better-Auth), SQLite Database (D1 + Drizzle ORM), Object Storage (R2), Vector Search (Workers AI + Vectorize), Realtime WebSockets (Durable Objects), Dual Email (Resend + Brevo), SMS (Twilio + Plivo), and Stripe Billing.
- ⚛️ **`@sparrowbase/react` Frontend SDK**: 1-line React & Next.js hooks for instant auth, streaming file uploads, AI chat, and multiplayer rooms.

---

## 📊 Platform Comparison

| Dimension | 🦜 **SparrowBase** | **Supabase** | **Vercel** | **Firebase** | **AWS Lambda** |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Monthly Cost to Start** | **$0 / month** (Permanent) | $0 (Pauses after 7 days) | $20/mo (Pro) | Pay-as-you-go | $47+/mo (RDS + NAT) |
| **Cold Start Latency** | **0ms (V8 Isolates)** | 300–800ms | 200–600ms | 400–1200ms | 500–2000ms |
| **Bandwidth Egress** | **$0.00 / GB (Always Free)** | $0.09 / GB | $0.15 / GB | $0.12 / GB | $0.09 / GB |
| **Database Sleeps/Pauses?** | **Never (D1 Edge SQLite)** | Pauses on Free Tier | Pauses on Neon | Never | Never |
| **AI Rules Engine** | **Built-in (.cursorrules / MCP)** | Manual setup | None | None | None |
| **Edge Global Network** | **330+ Cities (Cloudflare)** | 1 Region (Free) | Regional Functions | Regional | Regional VPC |

---

## 🚀 Quick Start in 60 Seconds

### 1. Create a new project
```bash
npx sparrowbase init my-saas-app
```

### 2. Provision free Cloudflare resources
```bash
cd my-saas-app
npx sparrowbase provision
```

### 3. Open the Visual Local Studio
```bash
npx sparrowbase studio
# → Opens http://localhost:4983 to inspect D1, R2, and AI Vectorize
```

### 4. Start local development
```bash
npm run dev
# → Edge server running at http://localhost:8787
```

---

## 🧩 Architecture & Monorepo Structure

```
sparrowbase/
├── packages/
│   ├── template-core/     # Core Edge Backend (Hono + D1 + Better-Auth + R2 + AI + Realtime)
│   ├── client/            # Universal TypeScript SDK Client (@sparrowbase/client)
│   ├── react/             # React & Next.js UI Hooks (@sparrowbase/react)
│   ├── cli/               # CLI Scaffolder, Provisioner, Visual Studio & MCP Server
│   └── docs-site/         # Documentation & AI Prompt Portal (sparrowbase.pages.dev)
├── templates/
│   └── nextjs-saas/       # Pre-built Next.js 15 Full-Stack SaaS Starter Template
├── .cursor/
│   └── mcp.json           # Official Cloudflare Model Context Protocol (MCP) servers
├── sparrowbase-demo-app/  # Standalone Reference Application
├── LAUNCH_KIT.md          # Product Hunt, Twitter/X, & Hacker News GTM Guide
├── CONTRIBUTING.md        # Developer Contribution Guidelines
└── SECURITY.md            # Security Policy & Vulnerability Disclosure
```

---

## ⚡ Core Features

### 1. 🔐 Better-Auth (Edge Authentication)
Multi-tenant organizations, sessions, email/password, and OAuth running entirely on the Web Crypto API:
```ts
import { initAuth } from '@sparrowbase/core';

// In Hono route handler:
app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  const auth = initAuth(c.env);
  return auth.handler(c.req.raw);
});
```

### 2. ⚛️ `@sparrowbase/react` Frontend Hooks
```tsx
import { useSession, useFileUpload, useAIChat, useRealtimeChannel } from '@sparrowbase/react';

export function Dashboard() {
  // Authentication state
  const { user, isAuthenticated, signOut } = useSession();

  // Direct R2 file uploads
  const { upload, isUploading, uploadResult } = useFileUpload();

  // Real-time Workers AI token streaming
  const { messages, input, setInput, sendMessage } = useAIChat();

  // Durable Objects multiplayer room
  const { isConnected, peers, sendMessage: broadcast } = useRealtimeChannel('room_123');

  return <div>Welcome, {user?.name}! ({peers.length} peers online)</div>;
}
```

### 3. 🧠 Workers AI & Vectorize RAG Pipeline
```ts
// Embedding + Vector Search in Hono
app.post('/api/ai/search', async (c) => {
  const { query } = await c.req.json();
  const { data } = await c.env.AI.run('@cf/baai/bge-small-en-v1.5', { text: [query] });
  const results = await c.env.VECTORIZE.query(data[0], { topK: 5, returnMetadata: 'all' });
  return c.json({ results });
});
```

### 4. ✉️ Dual Email Engine (Resend + Brevo) & SMS (Twilio + Plivo)
```ts
import { sendEmail } from './email';
import { sendSms } from './sms';

// Send transactional email (Resend default: 3,000/mo free, Brevo: 300/day free)
await sendEmail({ to: 'user@example.com', subject: 'Verify Email', html: '<p>Code: 123456</p>' }, env);

// Send SMS phone OTP
await sendSms({ to: '+1234567890', message: 'Your login OTP is: 123456' }, env);
```

---

## 🤖 Official Cloudflare MCP & Agent Setup

SparrowBase integrates with Cloudflare's official Model Context Protocol (MCP) servers ([`developers.cloudflare.com/agent-setup/prompt.md`](https://developers.cloudflare.com/agent-setup/prompt.md)).

### 1. Install Cloudflare Skills
```bash
npx -y skills add cloudflare/skills --skill '*' --yes --global
```

### 2. MCP Server Configuration (`.cursor/mcp.json` / `.vscode/mcp.json`)
```json
{
  "mcpServers": {
    "cloudflare": { "url": "https://mcp.cloudflare.com/mcp" },
    "cloudflare-docs": { "url": "https://docs.mcp.cloudflare.com/mcp" },
    "cloudflare-bindings": { "url": "https://bindings.mcp.cloudflare.com/mcp" },
    "cloudflare-builds": { "url": "https://builds.mcp.cloudflare.com/mcp" },
    "cloudflare-observability": { "url": "https://observability.mcp.cloudflare.com/mcp" }
  }
}
```

---

## 🧪 Testing & Verification

Run the comprehensive test suite across all monorepo packages:

```bash
# Build all packages
npm run build

# Run Vitest test suites (Workers, Client, React)
npm run test
```

---

## 📄 License & Community

- **License**: [MIT License](LICENSE) © 2026 SparrowBase Contributors.
- **Code of Conduct**: [Contributor Covenant](CODE_OF_CONDUCT.md).
- **Security Policy**: [Security & Disclosure](SECURITY.md).
- **Contributing**: [Contribution Guidelines](CONTRIBUTING.md).
- **Website**: [sparrowbase.pages.dev](https://sparrowbase.pages.dev).
