# 🦜 SparrowBase (sparrowbase.dev)

> **Zero-Cost Cloudflare Edge-Native Platform & AI Rules Engine for Vibe Coders**

SparrowBase is an opinionated, production-grade backend platform and AI-agent rule pack designed specifically for **Vibe Coders** using Cursor, Windsurf, v0, Lovable, or Claude.

It bridges the gap between quick frontend MVPs and full production, multi-tenant applications running on **Cloudflare's $0 free tier**.

---

## 🌟 Why SparrowBase?

| Challenge in Vibe Coding | SparrowBase Solution |
| :--- | :--- |
| **Traditional PaaS Costs ($25+/mo)** | Runs on Cloudflare Free Tier ($0/mo: 100k Workers req/day, 5M D1 reads/day, 10GB R2 storage). |
| **AI Hallucinates Node Modules (`fs`, `express`)** | Pre-bundled `.sparrowbase/CLAUDE.md` and `.cursorrules` enforce strict Cloudflare Workers edge runtime compatibility. |
| **Complex Token Setup & Key Fatigue** | BYOK CLI (`npx sparrowbase init`) provisions D1, R2, KV, and Vectorize bindings locally via 1-time OAuth login. Zero server custody of secrets. |
| **Production Multi-Tenancy & Billing** | Pre-wired Multi-Tenant Organizations, Better-Auth (D1 session store), Stripe Subscriptions, and Resend Transactional Email. |
| **AI Vector Search & RAG** | Native Cloudflare Workers AI + Vectorize vector embeddings for instant semantic search. |

---

## 🚀 Quick Start

```bash
# 1. Initialize a new SparrowBase project
npx sparrowbase init my-app

# 2. Navigate to project
cd my-app

# 3. Install dependencies
npm install

# 4. Provision $0 Cloudflare resources
npx wrangler d1 create sparrowbase-db
npx wrangler r2 bucket create sparrowbase-uploads

# 5. Start local Edge development server (with Miniflare D1/R2/KV emulation)
npm run dev
```

---

## 🏗️ Production Platform Architecture

```
my-app/
├── src/
│   ├── index.ts               # Hono.js main application & routing
│   ├── auth/                  # Better-Auth (D1 Web Crypto authentication)
│   ├── db/                    # D1 SQLite + Drizzle ORM schemas & migrations
│   ├── middleware/            # KV-backed Rate Limiter, CORS, Request Tracing
│   ├── email/                 # Resend Transactional Email Client
│   └── routes/
│       ├── health.ts          # Edge region latency & diagnostic metrics
│       ├── storage.ts         # R2 direct file upload endpoints
│       ├── stripe.ts          # Stripe Subscriptions & Webhook Processing Engine
│       └── ai.ts              # Workers AI + Vectorize Vector Search & RAG
├── .sparrowbase/              # AI Rules Pack for Cursor, Windsurf, & Claude
│   ├── CLAUDE.md
│   └── .cursorrules
├── wrangler.toml              # Cloudflare Workers configuration (api.sparrowbase.dev)
└── drizzle.config.ts          # Drizzle D1 migration config
```

---

## 🧪 Testing & Verification

Run edge unit and integration tests powered by Vitest and Miniflare:

```bash
npm run test
```

---

## 📦 Monorepo Workspace Structure

| Package | Directory | Description |
| :--- | :--- | :--- |
| **`@sparrowbase/core`** | [`packages/template-core`](packages/template-core) | Core Edge Backend Platform & Starter Template (Hono + D1 + Better-Auth + R2 + AI) |
| **`@sparrowbase/client`** | [`packages/client`](packages/client) | Universal TypeScript SDK Client for frontend apps (React, Next.js, Vue, Node) |
| **`sparrowbase`** | [`packages/cli`](packages/cli) | Project Scaffolding CLI (`npx sparrowbase init`) |
| **`@sparrowbase/docs-site`** | [`packages/docs-site`](packages/docs-site) | Documentation Portal & Landing Site ([sparrowbase.dev](https://sparrowbase.dev)) |
| **`sparrowbase-demo-app`** | [`sparrowbase-demo-app`](sparrowbase-demo-app) | Reference & Standalone Test Demo Application |

---

## 👩‍💻 Contributing & Developer Guide

Please see [**`CONTRIBUTING.md`**](CONTRIBUTING.md) for full setup instructions, edge runtime constraints, test execution, and pull request guidelines.

---

## 🌐 Documentation & Community

Visit **[sparrowbase.dev](https://sparrowbase.dev)** for full documentation, API references, and AI prompt guides.
