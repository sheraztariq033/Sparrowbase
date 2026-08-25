# 🦜 `sparrowbase` CLI

> 1-Click Cloudflare Edge Backend Platform & AI Rules Initializer

The `sparrowbase` CLI enables developers and vibe coders to scaffold production-ready Cloudflare Workers backend architectures with zero configuration.

---

## 🚀 Quick Usage

Initialize a new project in seconds:

```bash
# Using npx
npx sparrowbase init my-app

# Or specify a template
npx sparrowbase init my-app --template fullstack-saas
```

---

## 🛠️ Local Development & Testing

```bash
# Build the CLI TypeScript files
npm run build

# Test the CLI binary locally
node bin/sparrowbase.js init test-app
```

---

## 📦 What It Scaffolds

When you run `npx sparrowbase init`, it provisions:
- **Hono.js** lightweight edge routing & middleware
- **Cloudflare D1 + Drizzle ORM** for SQLite database & migrations
- **Better-Auth** session authentication via Web Crypto
- **Cloudflare R2** presigned streaming uploads
- **Workers AI + Vectorize** vector embeddings & RAG search
- **Stripe Subscriptions** & webhook HMAC signature verification
- **.sparrowbase/** AI rules pack for Cursor, Windsurf, & Claude
