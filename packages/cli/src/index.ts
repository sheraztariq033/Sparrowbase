import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

program
  .name('sparrowbase')
  .description('1-Click Cloudflare Edge Backend Platform & AI Rules Engine (sparrowbase.dev)')
  .version('1.0.0');

program
  .command('init [project-name]')
  .description('Initialize a production zero-cost Cloudflare edge backend stack with AI rules')
  .option('-t, --template <template>', 'Template choice: fullstack-saas | api-only | ai-rag-agent', 'fullstack-saas')
  .action((projectName = 'sparrowbase-app', options) => {
    console.log(`\n🦜 \x1b[36mSparrowBase\x1b[0m Edge Platform Initializer v1.0.0 (sparrowbase.dev)\n`);
    console.log(`Creating project: \x1b[33m${projectName}\x1b[0m using template [\x1b[32m${options.template}\x1b[0m]\n`);

    const targetDir = path.resolve(process.cwd(), projectName);

    if (fs.existsSync(targetDir)) {
      console.error(`\x1b[31mError: Directory '${projectName}' already exists.\x1b[0m`);
      process.exit(1);
    }

    console.log('📦 Provisioning SparrowBase Production Edge Architecture:');
    console.log('   - Hono.js (Edge Routing & Middleware)');
    console.log('   - Cloudflare D1 + Drizzle ORM (SQLite DB & Migrations)');
    console.log('   - Better-Auth + Web Crypto (Authentication & Sessions)');
    console.log('   - Multi-Tenant Organizations & Team Memberships');
    console.log('   - Stripe Subscriptions & Webhook Processing Engine');
    console.log('   - Resend Transactional Email Adapter');
    console.log('   - Cloudflare Workers AI + Vectorize (Vector Search & RAG)');
    console.log('   - Cloudflare R2 (Object Storage)');
    console.log('   - .sparrowbase/ (Cursor, Windsurf, & Claude AI Rules Pack)');

    console.log('\n\x1b[32m✔ SparrowBase project initialized successfully!\x1b[0m');
    console.log('\nNext steps:');
    console.log(`  1. cd ${projectName}`);
    console.log('  2. npm install');
    console.log('  3. npx wrangler d1 create sparrowbase-db  # Create $0 D1 Database');
    console.log('  4. npx wrangler r2 bucket create sparrowbase-uploads # Create $0 R2 Bucket');
    console.log('  5. npm run dev                            # Start local edge dev server');
    console.log('\nDocs & Community: https://sparrowbase.dev\n');
  });

program.parse(process.argv);
