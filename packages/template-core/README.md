# 🦜 `@sparrowbase/core`

> Zero-Cost Cloudflare Edge Backend Platform & Starter Template

`@sparrowbase/core` provides an opinionated, production-grade backend architecture running entirely on the **Cloudflare Free Tier**.

---

## 🏗️ Architecture & Modules

```
src/
├── index.ts               # Application entry point, global middleware & routing
├── auth/                  # Better-Auth D1 session adapter & Web Crypto auth
├── db/                    # D1 SQLite & Drizzle ORM schema, migrations, Hyperdrive
├── email/                 # Resend Transactional Email adapter & templates
├── middleware/            # KV Rate Limiting, Request Tracing, CORS, RBAC
└── routes/
    ├── health.ts          # Edge region latency, colocation & uptime metrics
    ├── storage.ts         # Direct R2 streaming upload/download
    ├── stripe.ts          # Stripe subscriptions & HMAC webhook processing
    └── ai.ts              # Workers AI (@cf/baai/bge-base-en-v1.5) & Vectorize
```

---

## ⚡ Local Development

1. **Configure local environment variables**:
   ```bash
   cp .dev.vars.example .dev.vars
   ```

2. **Start Miniflare Edge emulator**:
   ```bash
   npm run dev
   ```

3. **Run database migrations locally**:
   ```bash
   npm run db:migrate:local
   ```

4. **Run test suite**:
   ```bash
   npm run test
   ```

---

## 🚀 Deployment to Cloudflare

```bash
# 1. Login to Cloudflare
npx wrangler login

# 2. Deploy Worker
npm run deploy

# 3. Apply Remote Migrations
npm run db:migrate:prod
```
