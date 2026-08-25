# Contributing to SparrowBase 🦜

Thank you for your interest in contributing to **SparrowBase**! This guide contains instructions and best practices for developing, testing, and contributing to the SparrowBase ecosystem.

---

## 🏗️ Monorepo Architecture

SparrowBase is structured as an npm workspaces monorepo:

| Package | Path | Role | Tech Stack |
| :--- | :--- | :--- | :--- |
| **`@sparrowbase/core`** | [`packages/template-core/`](packages/template-core) | Core Edge Backend Platform & Template | Hono.js, Cloudflare D1, Drizzle, Better-Auth, Workers AI, R2, Stripe |
| **`@sparrowbase/client`** | [`packages/client/`](packages/client) | Universal Frontend Client SDK | TypeScript, Hono Client, Fetch API |
| **`sparrowbase`** | [`packages/cli/`](packages/cli) | 1-Click Project Scaffolding CLI | Commander.js, TypeScript |
| **`@sparrowbase/docs-site`** | [`packages/docs-site/`](packages/docs-site) | Documentation & Landing Web App | Vite, HTML5, CSS3, JavaScript |
| **`sparrowbase-demo-app`** | [`sparrowbase-demo-app/`](sparrowbase-demo-app) | Reference & Standalone Demo App | Pre-configured full-stack instance |

---

## ⚡ Quick Start for Developers

### 1. Prerequisites
- **Node.js**: `v18.0.0` or `v20.0.0+`
- **npm**: `v9.0.0+`
- **Cloudflare Wrangler CLI**: (Installed locally via devDependencies or run via `npx wrangler`)

### 2. Setup
```bash
# Clone the repository
git clone https://github.com/sheraztariq033/Sparrowbase.git
cd Sparrowbase

# Install dependencies across all packages
npm install

# Copy environment variables template
cp packages/template-core/.dev.vars.example packages/template-core/.dev.vars
```

### 3. Common Development Commands
```bash
# Start local edge backend server (packages/template-core)
npm run dev

# Start documentation website (packages/docs-site)
npm run dev:docs

# Start the standalone demo app
npm run dev:app

# Build and typecheck all packages
npm run build

# Run all automated test suites
npm run test
```

---

## 🛡️ Edge Runtime Guidelines (Crucial)

SparrowBase runs directly on the **Cloudflare Workers Edge runtime** (V8 isolates). Keep these rules in mind when writing backend code:

1. **No Node-Specific Built-ins in Workers**:
   - ❌ Do NOT use `fs`, `net`, `tls`, `child_process`, or `cluster` inside `@sparrowbase/core`.
   - ✅ Use Cloudflare Edge APIs: `env.DB` (D1), `env.UPLOADS_BUCKET` (R2), `env.RATE_LIMIT_KV` (KV), `env.AI` (Workers AI).
2. **Web Standard APIs**:
   - Use standard `fetch`, `Request`, `Response`, `Headers`, and `crypto.subtle` (Web Crypto).
3. **Database Operations**:
   - Always write migrations in `packages/template-core/src/db/schema.ts` using Drizzle ORM.
   - Run `npm run db:generate` to produce SQL migration files.

---

## 🧪 Testing & Validation

SparrowBase uses **Vitest** with `@cloudflare/vitest-pool-workers` to emulate Cloudflare Workers locally.

```bash
# Run all tests
npm run test

# Run tests in watch mode for core template
npm --prefix packages/template-core run test -- --watch
```

---

## 🚀 Pull Request Checklist

Before submitting a PR:
- [ ] `npm run build` passes with zero TypeScript errors.
- [ ] `npm run test` passes with 100% green tests.
- [ ] New features include relevant unit/integration tests in `src/index.test.ts`.
- [ ] No sensitive secrets or API keys are committed.
