import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const program = new Command();

program
  .name('sparrowbase')
  .description('1-Click Cloudflare Edge Backend Platform & AI Rules Engine (sparrowbase.dev)')
  .version('1.0.0');

// Helper to recursively copy directories
function copyFolderSync(from: string, to: string) {
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach((element) => {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    if (fs.lstatSync(fromPath).isDirectory()) {
      copyFolderSync(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  });
}

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
    console.log('   - Cloudflare R2 (Object Storage)');
    console.log('   - .sparrowbase/ (Cursor, Windsurf, & Claude AI Rules Pack)');

    // ── File Scaffolding Logic ──
    const tempDir = path.join(process.cwd(), `.sparrowbase-temp-${Date.now()}`);
    let success = false;

    try {
      // 1. Check if we are running in the monorepo and copy locally if possible
      const localTemplatePath = path.resolve(__dirname, '../../template-core');
      if (fs.existsSync(localTemplatePath)) {
        console.log('\n🔧 Copying from local monorepo templates...');
        copyFolderSync(localTemplatePath, targetDir);
        success = true;
      } else {
        // 2. Otherwise clone from GitHub
        console.log('\n📥 Downloading templates from GitHub repository...');
        execSync(`git clone --depth=1 https://github.com/sheraztariq033/Sparrowbase.git "${tempDir}"`, { stdio: 'ignore' });
        
        const gitTemplatePath = path.join(tempDir, 'packages/template-core');
        if (fs.existsSync(gitTemplatePath)) {
          copyFolderSync(gitTemplatePath, targetDir);
          success = true;
        }
      }
    } catch (error) {
      console.error('\n\x1b[31mError downloading templates. Make sure Git is installed and you are online.\x1b[0m');
      // Cleanup temp dir if it exists
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      process.exit(1);
    } finally {
      // Clean up temp clone directory
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }

    if (success) {
      // Rename name property in package.json to the user's project name
      const packageJsonPath = path.join(targetDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        pkg.name = projectName;
        pkg.description = `SparrowBase Edge project scaffolded from template: ${options.template}`;
        fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
      }

      console.log('\n\x1b[32m✔ SparrowBase project initialized successfully!\x1b[0m');
      console.log('\nNext steps:');
      console.log(`  1. cd ${projectName}`);
      console.log('  2. npm install');
      console.log('  3. npx wrangler d1 create sparrowbase-db  # Create $0 D1 Database');
      console.log('  4. npx wrangler r2 bucket create sparrowbase-uploads # Create $0 R2 Bucket');
      console.log('  5. npm run dev                            # Start local edge dev server');
      console.log('\nDocs & Community: https://sparrowbase.dev\n');
    } else {
      console.error('\n\x1b[31mError: Template provisioning failed.\x1b[0m');
    }
  });

program.parse(process.argv);
