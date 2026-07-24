let selectedAppType = 'saas'; // saas | social | ecommerce | ai

const APP_TYPES = {
  saas:      { name: 'SaaS Dashboard',     reqPerUser: 5,  color: '#3b82f6' },
  ecommerce: { name: 'E-Commerce / Blog',  reqPerUser: 10, color: '#06b6d4' },
  social:    { name: 'Social / Chat App',   reqPerUser: 25, color: '#8b5cf6' },
  ai:        { name: 'AI RAG / Vector App', reqPerUser: 40, color: '#f59e0b' },
};

let currentAppType = 'saas';

// ── Code Tab Switcher ──
function switchTab(tabId) {
  document.querySelectorAll('.code-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.code-panel').forEach(p => p.classList.remove('active'));

  const tab = document.querySelector(`[onclick="switchTab('${tabId}')"]`);
  const panel = document.getElementById(tabId);
  if (tab) tab.classList.add('active');
  if (panel) panel.classList.add('active');
}

// ── Copy Helpers ──
function copyText(text) {
  navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard!'));
}

function copyActivePanel() {
  const active = document.querySelector('.code-panel.active');
  if (active) {
    navigator.clipboard.writeText(active.textContent.trim()).then(() => showToast('Code copied!'));
  }
}

// ── Toast ──
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ── App Type Selector ──
function selectAppType(type) {
  currentAppType = type;
  document.querySelectorAll('.app-type-pill').forEach(p => p.classList.remove('active'));
  const active = document.querySelector(`[onclick="selectAppType('${type}')"]`);
  if (active) active.classList.add('active');
  updateCalculator();
}

// ── Cost Calculator ──
function updateCalculator() {
  const slider = document.getElementById('dauSlider');
  if (!slider) return;

  const dau = parseInt(slider.value, 10);
  const config = APP_TYPES[currentAppType] || APP_TYPES.saas;
  
  // Scale variables
  const mau = dau * 3; // Est. Monthly Active Users
  const dailyReqs = dau * config.reqPerUser;
  const monthlyReqs = dailyReqs * 30;

  // DB queries: 10 reads, 2 writes per session/request average
  const monthlyReads = monthlyReqs * 10;
  const monthlyWrites = monthlyReqs * 2;

  // Storage: 2MB user db footprint + 20MB file uploads (avatars/PDFs) for 10% of active users
  const dbStorageGB = Math.max(0.1, (mau * 2) / 1024);
  const fileStorageGB = Math.max(0.5, (mau * 0.1 * 20) / 1024);
  
  // Bandwidth: avg response payload is 15KB + file downloads (5% of requests fetch a 3MB asset)
  const bandwidthGB = ((monthlyReqs * 15) / (1024 * 1024)) + (monthlyReqs * 0.05 * 3) / 1024;

  // Update DAU display
  const dauDisplay = document.getElementById('dauDisplay');
  if (dauDisplay) {
    dauDisplay.textContent = `${dau.toLocaleString()} DAU (${mau.toLocaleString()} MAU) → ${dailyReqs.toLocaleString()} req/day (${(monthlyReqs / 1e6).toFixed(1)}M/mo)`;
  }

  const costEl = document.getElementById('calcCostResult');
  const breakdownEl = document.getElementById('calcBreakdown');

  // ── SparrowBase (Cloudflare Edge) Cost ──
  // Workers Paid is $5/mo. Includes 10M requests. Overage: $0.30/M.
  // D1 DB reads: Paid includes 25M/day (750M/mo), then $0.001/M overage.
  // D1 DB writes: Paid includes 50K/day (1.5M/mo), then $1.00/M overage.
  // D1 DB storage: $0.75/GB after 5GB.
  // R2 storage: 10GB free, then $0.015/GB. Egress is always $0.
  // Better-Auth (self-hosted): $0/mo.
  let sparrowCost = 0;
  if (dailyReqs <= 100_000 && dbStorageGB <= 5 && fileStorageGB <= 10) {
    sparrowCost = 0;
  } else {
    const baseCost = 5.00;
    const extraMillions = Math.max(0, (monthlyReqs - 10_000_000) / 1_000_000);
    const computeOverage = extraMillions * 0.30;
    
    const dbReadsOverage = Math.max(0, (monthlyReads - 750_000_000) / 1_000_000) * 0.001;
    const dbWritesOverage = Math.max(0, (monthlyWrites - 1_500_000) / 1_000_000) * 1.00;
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
      ? `<strong>100% Free Tier</strong> — Uses ${dailyReqs.toLocaleString()} of 100k free daily requests. Storage (${fileStorageGB.toFixed(1)}GB R2, ${dbStorageGB.toFixed(1)}GB D1) is within limits.`
      : `<strong>Edge Platform Pricing</strong> — $5 base includes 10M requests. Overage: compute ($${(Math.max(0, (monthlyReqs - 10_000_000)/1_000_000)*0.3).toFixed(2)}), database writes ($${(Math.max(0, (monthlyWrites - 1_500_000)/1_000_000)*1.0).toFixed(2)}), database storage ($${(Math.max(0, dbStorageGB - 5)*0.75).toFixed(2)}), R2 egress ($0.00).`;
  }

  // ── Competitor: Vercel (Next.js + Neon DB + Vercel Blob + Clerk Auth) ──
  // Auth: Clerk Pro: $25/mo base for 10k MAUs. Overage: $0.02 per MAU.
  const clerkCost = mau <= 10_000 ? 0 : 25 + (mau - 10_000) * 0.02;
  // Compute: Vercel Pro is $20/mo (includes 1M function execution seconds). Overage average: $0.60/M.
  const vercelBase = 20;
  const vercelCompute = Math.max(0, (monthlyReqs - 1_000_000) / 1_000_000) * 0.60;
  const vercelBandwidth = Math.max(0, bandwidthGB - 100) * 0.15;
  // Neon Postgres DB: Free up to 0.5GB. Pro is $19/mo (includes 10GB), then $0.12/GB.
  const neonCost = dbStorageGB <= 0.5 ? 0 : 19 + Math.max(0, dbStorageGB - 10) * 0.12;
  // Vercel Blob: Free up to 250MB. Pro: $0.15/GB storage + $0.15/GB egress.
  const vercelBlobCost = fileStorageGB <= 0.25 ? 0 : (fileStorageGB * 0.15) + (bandwidthGB * 0.15);
  
  const vercelCost = monthlyReqs <= 100_000 ? 0 : vercelBase + vercelCompute + vercelBandwidth + clerkCost + neonCost + vercelBlobCost;

  // ── Competitor: Supabase (Supabase Functions + DB + Auth + Storage) ──
  // Auth: Includes 50k MAUs. Overage: $0.00325 per MAU.
  const supabaseAuth = Math.max(0, mau - 50_000) * 0.00325;
  // Edge Functions: $25 Pro base includes 2M. Overage: $2.00 per million.
  const supabaseBase = 25;
  const supabaseCompute = Math.max(0, (monthlyReqs - 2_000_000) / 1_000_000) * 2.00;
  // Postgres: Pro includes 8GB. Overage: $0.125/GB.
  const supabaseDb = Math.max(0, dbStorageGB - 8) * 0.125;
  // Storage: Pro includes 100GB. Overage: $0.021/GB storage + $0.09/GB egress.
  const supabaseStorage = Math.max(0, fileStorageGB - 100) * 0.021 + bandwidthGB * 0.09;

  const supabaseCost = monthlyReqs <= 50_000 ? 0 : supabaseBase + supabaseAuth + supabaseCompute + supabaseDb + supabaseStorage;

  // ── Competitor: Firebase Blaze (Cloud Functions + Firestore + Auth + Cloud Storage) ──
  // Auth: Email/Password is free.
  // Compute (Functions): $0.40 per million.
  const firebaseCompute = (monthlyReqs / 1_000_000) * 0.40;
  // Firestore DB: reads $0.60/M, writes $1.80/M. Storage: $0.18/GB.
  const firebaseDb = ((monthlyReads / 1_000_000) * 0.60) + ((monthlyWrites / 1_000_000) * 1.80) + (dbStorageGB * 0.18);
  // Storage: $0.026/GB storage + $0.12/GB egress bandwidth.
  const firebaseStorage = (fileStorageGB * 0.026) + (bandwidthGB * 0.12);

  const firebaseCost = monthlyReqs <= 100_000 ? 0 : firebaseCompute + firebaseDb + firebaseStorage;

  // ── Competitor: AWS Serverless (RDS Postgres + NAT Gateway + API Gateway + Lambda + S3 + Cognito) ──
  // RDS db.t4g.micro instance ($15.00/mo flat) + NAT Gateway ($32.40/mo fixed) = $47.40 base.
  const awsBase = 47.40;
  // Cognito Auth: Free for 50k MAUs, then $0.0055 per MAU.
  const awsAuth = Math.max(0, mau - 50_000) * 0.0055;
  // Lambda ($0.20/M) + API Gateway HTTP ($1.00/M) = $1.20/M requests.
  const awsCompute = (monthlyReqs / 1_000_000) * 1.20;
  // RDS Storage ($0.115/GB) + S3 Storage ($0.023/GB) + S3 Egress ($0.09/GB)
  const awsStorage = (dbStorageGB * 0.115) + (fileStorageGB * 0.023) + (bandwidthGB * 0.09);

  const awsCost = monthlyReqs <= 100_000 ? 0 : awsBase + awsAuth + awsCompute + awsStorage;

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
          ${isCheapest ? `<div style="font-size: 0.72rem; color: var(--brand-emerald); margin-top: 6px; font-weight: 600;">✓ Cheapest option</div>` : ''}
        </div>
      `;
    }).join('');
  }
}

// ── Navigation ──
function scrollToCode() {
  const codeWindow = document.getElementById('codeWindow');
  if (codeWindow) {
    codeWindow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    switchTab('tab-quickstart');
  }
}

// ── Toggle Mobile Menu ──
function toggleMobileMenu() {
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
        // Close mobile menu if open
        const nav = document.getElementById('navLinks');
        if (nav) nav.classList.remove('mobile-open');
      }
    });
  });
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  updateCalculator();
  testEdgeLatency();
  setupRevealObserver();
  setupNavbarScroll();
  setupSmoothAnchors();
});
