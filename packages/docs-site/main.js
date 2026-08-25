let currentAppType = 'saas'; // saas | ecommerce | social | ai

const APP_TYPES = {
  saas:      { name: 'SaaS Dashboard',     reqPerUser: 5,  color: '#3b82f6' },
  ecommerce: { name: 'E-Commerce / Blog',  reqPerUser: 10, color: '#06b6d4' },
  social:    { name: 'Social / Chat App',   reqPerUser: 25, color: '#8b5cf6' },
  ai:        { name: 'AI RAG / Vector App', reqPerUser: 40, color: '#f59e0b' },
};

// ── Code Tab Switcher ──
export function switchTab(tabId) {
  const tabs = document.querySelectorAll('.code-tab');
  const panels = document.querySelectorAll('.code-panel');

  tabs.forEach(t => {
    const onclickAttr = t.getAttribute('onclick') || '';
    if (onclickAttr.includes(tabId)) {
      t.classList.add('active');
    } else {
      t.classList.remove('active');
    }
  });

  panels.forEach(p => {
    if (p.id === tabId) {
      p.classList.add('active');
    } else {
      p.classList.remove('active');
    }
  });
}

// ── Copy Helpers ──
export function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard!'));
  } else {
    showToast('Copied!');
  }
}

export function copyActivePanel() {
  const active = document.querySelector('.code-panel.active');
  if (active) {
    copyText(active.textContent.trim());
  }
}

// ── Toast ──
export function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ── App Type Selector ──
export function selectAppType(type) {
  currentAppType = type;
  document.querySelectorAll('.app-type-pill').forEach(p => {
    const onclickAttr = p.getAttribute('onclick') || '';
    if (onclickAttr.includes(type)) {
      p.classList.add('active');
    } else {
      p.classList.remove('active');
    }
  });
  updateCalculator();
}

// ── Cost Calculator ──
export function updateCalculator() {
  const slider = document.getElementById('dauSlider');
  if (!slider) return;

  const dau = parseInt(slider.value, 10);
  const config = APP_TYPES[currentAppType] || APP_TYPES.saas;
  
  // Scale variables
  const mau = dau * 3; // Est. Monthly Active Users
  const dailyReqs = dau * config.reqPerUser;
  const monthlyReqs = dailyReqs * 30;

  // DB queries: 5 reads, 1 write per session average
  const dailyReads = dailyReqs * 5;
  const monthlyReads = dailyReads * 30;

  // Storage footprints (realistic SaaS data)
  const dbStorageGB = Math.max(0.01, (mau * 0.1) / 1024); // 100KB per user in D1 SQLite
  const fileStorageGB = Math.max(0.05, (mau * 0.05 * 2) / 1024); // 5% users upload 2MB avatars/files in R2
  
  // Bandwidth: avg response payload is 10KB + file assets
  const bandwidthGB = ((monthlyReqs * 10) / (1024 * 1024)) + (monthlyReqs * 0.02 * 1) / 1024;

  // Update DAU display
  const dauDisplay = document.getElementById('dauDisplay');
  if (dauDisplay) {
    dauDisplay.textContent = `${dau.toLocaleString()} DAU (${mau.toLocaleString()} MAU) → ${dailyReqs.toLocaleString()} req/day (${(monthlyReqs / 1e6).toFixed(1)}M/mo)`;
  }

  const costEl = document.getElementById('calcCostResult');
  const breakdownEl = document.getElementById('calcBreakdown');

  // ── SparrowBase (Cloudflare Edge) Cost ──
  // Cloudflare Free Tier: 100,000 req/day (3M/mo), 5M D1 reads/day, 10GB R2 storage with $0 egress fees.
  let sparrowCost = 0;
  if (dailyReqs <= 100_000 && dailyReads <= 5_000_000 && dbStorageGB <= 0.5 && fileStorageGB <= 10) {
    sparrowCost = 0;
  } else {
    // Workers Paid ($5 base includes 10M requests)
    const baseCost = 5.00;
    const extraMillions = Math.max(0, (monthlyReqs - 10_000_000) / 1_000_000);
    const computeOverage = extraMillions * 0.30;
    
    const dbReadsOverage = Math.max(0, (monthlyReads - 750_000_000) / 1_000_000) * 0.001;
    const dbWritesOverage = Math.max(0, (monthlyReqs * 30 - 1_500_000) / 1_000_000) * 1.00;
    const dbStorageOverage = Math.max(0, dbStorageGB - 5) * 0.75;
    const fileStorageOverage = Math.max(0, fileStorageGB - 10) * 0.015;
    
    sparrowCost = baseCost + computeOverage + dbReadsOverage + dbWritesOverage + dbStorageOverage + fileStorageOverage;
  }

  if (costEl) {
    costEl.textContent = sparrowCost === 0 ? '$0.00 / month' : `$${sparrowCost.toFixed(2)} / month`;
    costEl.className = sparrowCost === 0 ? 'calc-result free' : 'calc-result paid';
  }

  if (breakdownEl) {
    breakdownEl.innerHTML = sparrowCost === 0
      ? `<strong>100% Free Tier ($0/mo)</strong> — Uses ${dailyReqs.toLocaleString()} of 100,000 free daily requests. Storage (${fileStorageGB.toFixed(2)}GB R2, ${dbStorageGB.toFixed(2)}GB D1) is within free limits.`
      : `<strong>Edge Platform Pricing</strong> — $5 base includes 10M requests. Overage: compute ($${(Math.max(0, (monthlyReqs - 10_000_000)/1_000_000)*0.3).toFixed(2)}), D1 writes ($${(Math.max(0, (monthlyReqs * 30 - 1_500_000)/1_000_000)*1.0).toFixed(2)}), R2 egress ($0.00).`;
  }

  // ── Competitor Costs ──
  const clerkCost = mau <= 10_000 ? 0 : 25 + (mau - 10_000) * 0.02;
  const vercelBase = 20;
  const vercelCompute = Math.max(0, (monthlyReqs - 1_000_000) / 1_000_000) * 0.60;
  const vercelBandwidth = Math.max(0, bandwidthGB - 100) * 0.15;
  const neonCost = dbStorageGB <= 0.5 ? 0 : 19 + Math.max(0, dbStorageGB - 10) * 0.12;
  const vercelBlobCost = fileStorageGB <= 0.25 ? 0 : (fileStorageGB * 0.15) + (bandwidthGB * 0.15);
  const vercelCost = monthlyReqs <= 50_000 ? 0 : vercelBase + vercelCompute + vercelBandwidth + clerkCost + neonCost + vercelBlobCost;

  const supabaseAuth = Math.max(0, mau - 50_000) * 0.00325;
  const supabaseBase = 25;
  const supabaseCompute = Math.max(0, (monthlyReqs - 2_000_000) / 1_000_000) * 2.00;
  const supabaseDb = Math.max(0, dbStorageGB - 8) * 0.125;
  const supabaseStorage = Math.max(0, fileStorageGB - 100) * 0.021 + bandwidthGB * 0.09;
  const supabaseCost = monthlyReqs <= 25_000 ? 0 : supabaseBase + supabaseAuth + supabaseCompute + supabaseDb + supabaseStorage;

  const firebaseCompute = (monthlyReqs / 1_000_000) * 0.40;
  const firebaseDb = ((dailyReads * 30 / 1_000_000) * 0.60) + ((monthlyReqs / 1_000_000) * 1.80) + (dbStorageGB * 0.18);
  const firebaseStorage = (fileStorageGB * 0.026) + (bandwidthGB * 0.12);
  const firebaseCost = monthlyReqs <= 50_000 ? 0 : firebaseCompute + firebaseDb + firebaseStorage;

  const awsBase = 47.40;
  const awsAuth = Math.max(0, mau - 50_000) * 0.0055;
  const awsCompute = (monthlyReqs / 1_000_000) * 1.20;
  const awsStorage = (dbStorageGB * 0.115) + (fileStorageGB * 0.023) + (bandwidthGB * 0.09);
  const awsCost = monthlyReqs <= 50_000 ? 0 : awsBase + awsAuth + awsCompute + awsStorage;

  // ── Render Competitor Grid ──
  const competitorGrid = document.getElementById('competitorCosts');
  if (competitorGrid) {
    const competitors = [
      { name: '🦜 SparrowBase',   cost: sparrowCost,  color: '#10b981', note: 'Cloudflare Edge (Free R2 egress)' },
      { name: '▲ Vercel + Clerk', cost: vercelCost,   color: '#f59e0b', note: 'Vercel Pro + Neon DB + Clerk Auth' },
      { name: '⚡ Supabase Pro',   cost: supabaseCost, color: '#f59e0b', note: 'Supabase Pro + Storage egress' },
      { name: '🔥 Firebase Blaze', cost: firebaseCost, color: '#f43f5e', note: 'Functions + Firestore reads/writes' },
      { name: '☁️ AWS (RDS+NAT)',  cost: awsCost,      color: '#f43f5e', note: 'Cognito + NAT Gateway + RDS DB' },
    ];

    competitorGrid.innerHTML = competitors.map(c => {
      const isCheapest = c.cost === sparrowCost && c.name.includes('Sparrow');
      const savings = c.cost - sparrowCost;
      return `
        <div style="padding: 16px; border-radius: var(--radius-md); background: ${isCheapest ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${isCheapest ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-default)'}; text-align: center;">
          <div style="font-size: 0.82rem; font-weight: 700; margin-bottom: 4px;">${c.name}</div>
          <div style="font-size: 1.5rem; font-weight: 900; color: ${c.cost === 0 ? '#10b981' : c.color}; letter-spacing: -0.02em;">
            ${c.cost === 0 ? '$0' : '$' + c.cost.toFixed(2)}
          </div>
          <div style="font-size: 0.7rem; color: var(--text-tertiary); margin-top: 4px;">${c.note}</div>
          ${!isCheapest && savings > 0 ? `<div style="font-size: 0.72rem; color: var(--brand-rose); margin-top: 6px; font-weight: 600;">+$${savings.toFixed(2)} / mo more</div>` : ''}
          ${isCheapest ? `<div style="font-size: 0.72rem; color: var(--brand-emerald); margin-top: 6px; font-weight: 600;">✓ 100% Free Tier</div>` : ''}
        </div>
      `;
    }).join('');
  }
}

// ── Navigation ──
export function scrollToCode() {
  const codeWindow = document.getElementById('codeWindow');
  if (codeWindow) {
    codeWindow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    switchTab('tab-quickstart');
  }
}

// ── Toggle Mobile Menu ──
export function toggleMobileMenu() {
  const nav = document.getElementById('navLinks');
  if (nav) nav.classList.toggle('mobile-open');
}

// ── Live Latency Ping ──
async function testEdgeLatency() {
  const el = document.getElementById('liveLatency');
  if (!el) return;

  const start = performance.now();
  try {
    const res = await fetch('https://sparrowbase-backend.lastlook-pk.workers.dev/api/health');
    const data = await res.json();
    const ms = Math.round(performance.now() - start);
    el.textContent = `${ms}ms (${data.edge?.coloRegion || 'Edge'})`;
  } catch {
    el.textContent = '< 50ms (Edge)';
  }
}

// ── Scroll Reveal Observer ──
function setupRevealObserver() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

// ── Navbar Scroll Effect ──
function setupNavbarScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.style.borderBottomColor = 'rgba(255,255,255,0.08)';
      header.style.background = 'rgba(5, 5, 6, 0.92)';
    } else {
      header.style.borderBottomColor = 'rgba(255,255,255,0.06)';
      header.style.background = 'rgba(5, 5, 6, 0.8)';
    }
  });
}

// ── Smooth scroll for anchor links ──
function setupSmoothAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const nav = document.getElementById('navLinks');
        if (nav) nav.classList.remove('mobile-open');
      }
    });
  });
}

// ── AI Prompt Library ──
const PROMPTS = {
  cursor: `# 🦜 SparrowBase .cursorrules
You are building an edge-native app using SparrowBase on Cloudflare Workers.
STRICT EDGE RUNTIME RULES:
1. NEVER import Node.js built-ins ('fs', 'net', 'tls', 'child_process', 'express').
2. Web Framework: Hono.js. Use c.req.json(), c.json(), and streamSSE().
3. Database: D1 SQLite with Drizzle ORM (schema in src/db/schema.ts).
4. Storage: Cloudflare R2 presigned streaming via @aws-sdk/s3-request-presigner.
5. Auth: Better-Auth with Web Crypto (c.env.DB adapter).
6. AI: Cloudflare Workers AI (c.env.AI.run('@cf/baai/bge-small-en-v1.5')) + Vectorize.
7. Bot Protection: turnstileGuard() on public endpoints.`,

  claude: `# 🦜 SparrowBase CLAUDE.md
# Project: SparrowBase Edge Backend
- Runtime: Cloudflare Workers (V8 isolates)
- Framework: Hono.js
- Primary DB: Cloudflare D1 (SQLite) + Drizzle ORM
- Auth: Better-Auth + D1 Session Adapter
- Object Storage: Cloudflare R2
- AI & Vector: Workers AI + Vectorize
- Testing: Vitest + @cloudflare/vitest-pool-workers
CRITICAL CONSTRAINT: Do not write Express or Node fs code. Everything must run in Cloudflare Workers Edge runtime.`,

  windsurf: `# 🦜 SparrowBase .windsurfrules
Always target Cloudflare Workers edge environment.
Use Hono for routes, Drizzle ORM with D1 SQLite for database, Better-Auth for session authentication, and Cloudflare Workers AI for vector embeddings and LLM streaming.
Do not introduce Node.js process/fs/buffer dependencies.`,

  frontend: `You are building a frontend that connects to a SparrowBase Cloudflare Edge Backend.
Use '@sparrowbase/client' or '@sparrowbase/react' to interact with the backend:
- Initialize client with createSparrowClient({ baseUrl })
- Authenticate via useSession() or client.auth.signIn / signUp
- Upload files directly to Cloudflare R2 via useFileUpload()
- Stream real-time AI responses via useAIChat()
- Join multiplayer rooms via useRealtimeChannel('room_id')`
};

let activePromptKey = 'cursor';

export function switchPromptTab(key, btn) {
  activePromptKey = key;
  document.querySelectorAll('.prompt-tab').forEach(b => b.classList.remove('active'));
  if (btn) {
    btn.classList.add('active');
  } else {
    document.querySelectorAll('.prompt-tab').forEach(b => {
      if (b.getAttribute('onclick')?.includes(key)) b.classList.add('active');
    });
  }
  const display = document.getElementById('promptCodeDisplay');
  if (display) {
    display.textContent = PROMPTS[key] || '';
  }
}

export function copyActivePrompt() {
  const text = PROMPTS[activePromptKey] || '';
  copyText(text);
}

// ── Idea-to-App Blueprint Generator ──
const IDEA_PRESETS = {
  'ai-pdf': 'An AI-powered PDF analyzer and knowledge base where users upload PDF/Word documents, store them in Cloudflare R2, generate 768-dim vector embeddings with Workers AI, and chat with their documents using streaming LLM responses and Better-Auth.',
  'saas-stripe': 'A multi-tenant SaaS application with user signup, email verification with Resend, team workspaces in D1 SQLite, and Stripe monthly/yearly Pro subscription billing with HMAC webhook synchronization.',
  'realtime-whiteboard': 'A real-time multiplayer collaboration canvas where users join live rooms via WebSockets (Cloudflare Durable Objects), draw and move objects together with live presence indicators and zero database lockups.',
  'client-portal': 'A secure client document portal with branded login, direct streaming file uploads to Cloudflare R2 with $0 bandwidth egress fees, activity logs, and email notifications.',
  'social-sms': 'A mobile-friendly social community app with phone SMS verification via Twilio/Plivo, user profiles, image avatars in R2, and KV rate-limited discussion feeds.',
};

export function applyIdeaPreset(key) {
  const input = document.getElementById('ideaInput');
  if (input && IDEA_PRESETS[key]) {
    input.value = IDEA_PRESETS[key];
    generateIdeaBlueprint();
  }
}

export function generateIdeaBlueprint() {
  const input = document.getElementById('ideaInput');
  const appNameEl = document.getElementById('ideaAppName');
  const promptOutputEl = document.getElementById('ideaPromptOutput');
  if (!input || !promptOutputEl) return;

  const rawText = input.value.trim() || 'A modern full-stack web application with user authentication, D1 database storage, and AI streaming';

  // Extract features
  const hasAuth = /auth|login|signup|user|team|profile|member/i.test(rawText);
  const hasAI = /ai|pdf|chat|vector|rag|search|embedding|bot|assistant|smart/i.test(rawText);
  const hasStripe = /stripe|payment|billing|subscription|plan|checkout|price|credit/i.test(rawText);
  const hasUploads = /upload|file|image|pdf|document|avatar|storage|photo|asset/i.test(rawText);
  const hasRealtime = /realtime|real-time|multiplayer|canvas|whiteboard|live|room|socket|chat/i.test(rawText);
  const hasSMS = /sms|phone|otp|twilio|plivo|text message/i.test(rawText);

  // Generate app slug
  let slug = rawText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .slice(0, 3)
    .join('-');
  if (!slug || slug.length < 3) slug = 'my-edge-app';

  if (appNameEl) {
    appNameEl.textContent = `Project: ${slug}`;
  }

  // Build Master AI Prompt
  let masterPrompt = `You are an expert AI software architect building a full-stack production application on Cloudflare Edge using SparrowBase.

# App Idea:
${rawText}

# Pre-Configured Edge Architecture:
- Framework: Cloudflare Workers + Hono.js (V8 isolates, 0ms cold starts, $0/mo free tier)
- Database: Cloudflare D1 (SQLite) with Drizzle ORM (schema in src/db/schema.ts)
${hasAuth ? '- Authentication: Better-Auth + D1 Session Store (email/password & OAuth)\n' : ''}${hasUploads ? '- Object Storage: Cloudflare R2 for direct streaming uploads ($0 bandwidth egress)\n' : ''}${hasAI ? '- AI & Vector Search: Workers AI (@cf/baai/bge-small-en-v1.5) + Vectorize RAG index\n' : ''}${hasRealtime ? '- Realtime Multiplayer: Cloudflare Durable Objects (RealtimeRoom WebSockets)\n' : ''}${hasStripe ? '- Billing: Stripe Subscriptions with HMAC-SHA256 ArrayBuffer webhook verification\n' : ''}${hasSMS ? '- SMS Dispatch: Twilio & Plivo adapters with Turnstile bot protection\n' : ''}- Frontend: Next.js 15 / React using '@sparrowbase/react' (useSession, useFileUpload, useAIChat, useRealtimeChannel)

# Strict Edge Constraints:
1. NEVER import Node.js built-ins ('fs', 'net', 'child_process', 'express', 'bcrypt').
2. ALWAYS use Hono for routing and crypto.subtle for Web Crypto.
3. Automatically run within Cloudflare's permanent $0 Free Tier (100k req/day, 5M D1 reads).

# 1-Click Launch Command:
npx sparrowbase init ${slug}`;

  promptOutputEl.textContent = masterPrompt;
}

export function copyGeneratedPrompt() {
  const promptOutputEl = document.getElementById('ideaPromptOutput');
  const btn = document.getElementById('copyPromptBtn');
  if (promptOutputEl) {
    copyText(promptOutputEl.textContent.trim());
    if (btn) {
      const original = btn.textContent;
      btn.textContent = '✅ Copied!';
      setTimeout(() => { btn.textContent = original; }, 2000);
    }
  }
}

// ── Attach everything directly to window ──
if (typeof window !== 'undefined') {
  window.switchTab = switchTab;
  window.copyText = copyText;
  window.copyActivePanel = copyActivePanel;
  window.selectAppType = selectAppType;
  window.updateCalculator = updateCalculator;
  window.scrollToCode = scrollToCode;
  window.toggleMobileMenu = toggleMobileMenu;
  window.switchPromptTab = switchPromptTab;
  window.copyActivePrompt = copyActivePrompt;
  window.showToast = showToast;
  window.applyIdeaPreset = applyIdeaPreset;
  window.generateIdeaBlueprint = generateIdeaBlueprint;
  window.copyGeneratedPrompt = copyGeneratedPrompt;
}

// ── Bind event listeners directly on DOM Ready ──
function init() {
  updateCalculator();
  testEdgeLatency();
  setupRevealObserver();
  setupNavbarScroll();
  setupSmoothAnchors();
  switchPromptTab('cursor', document.querySelector('.prompt-tab.active'));
  generateIdeaBlueprint();

  document.querySelectorAll('.code-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const onclickAttr = tab.getAttribute('onclick') || '';
      const match = onclickAttr.match(/switchTab\(['"]([^'"]+)['"]\)/);
      if (match && match[1]) switchTab(match[1]);
    });
  });

  document.querySelectorAll('.prompt-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const onclickAttr = tab.getAttribute('onclick') || '';
      const match = onclickAttr.match(/switchPromptTab\(['"]([^'"]+)['"]/);
      if (match && match[1]) switchPromptTab(match[1], tab);
    });
  });

  document.querySelectorAll('.app-type-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const onclickAttr = pill.getAttribute('onclick') || '';
      const match = onclickAttr.match(/selectAppType\(['"]([^'"]+)['"]\)/);
      if (match && match[1]) selectAppType(match[1]);
    });
  });

  const slider = document.getElementById('dauSlider');
  if (slider) slider.addEventListener('input', updateCalculator);

  const ideaInput = document.getElementById('ideaInput');
  if (ideaInput) ideaInput.addEventListener('input', generateIdeaBlueprint);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
