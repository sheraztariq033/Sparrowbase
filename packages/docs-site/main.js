// ═══════════════════════════════════════════
// SparrowBase Landing Page — Interactive Logic
// ═══════════════════════════════════════════

// ── App Type Config ──
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
  const dailyReqs = dau * config.reqPerUser;
  const monthlyReqs = dailyReqs * 30;

  // Estimate ~0.5KB average response → bandwidth in GB
  const monthlyBandwidthGB = (monthlyReqs * 0.5) / (1024 * 1024); // 0.5KB per req

  // Update DAU display
  const dauDisplay = document.getElementById('dauDisplay');
  if (dauDisplay) {
    dauDisplay.textContent = `${dau.toLocaleString()} Daily Active Users → ${dailyReqs.toLocaleString()} req/day (${(monthlyReqs / 1e6).toFixed(1)}M/month)`;
  }

  const costEl = document.getElementById('calcCostResult');
  const breakdownEl = document.getElementById('calcBreakdown');

  // ── SparrowBase (Cloudflare Workers) Pricing ──
  // Free: 100,000 req/day (3M/month)
  // Paid: $5/mo base → includes 10M req/month → then $0.30 per million additional
  let sparrowCost = 0;
  if (dailyReqs <= 100_000) {
    sparrowCost = 0;
    if (costEl) {
      costEl.textContent = '$0.00 / month';
      costEl.className = 'calc-result free';
    }
    if (breakdownEl) {
      breakdownEl.innerHTML = `
        <strong>100% Free Tier</strong> — No credit card required.<br>
        Your ${config.name} at ${dau.toLocaleString()} DAU uses ${dailyReqs.toLocaleString()} of 100,000 daily requests 
        (${Math.round(dailyReqs / 1000)}% utilization). 
        Plus 5M D1 reads/day, 10GB R2 storage, and $0 bandwidth egress.
      `;
    }
  } else {
    const baseCost = 5.00;
    const extraMillions = Math.max(0, (monthlyReqs - 10_000_000) / 1_000_000);
    sparrowCost = baseCost + (extraMillions * 0.30);

    if (costEl) {
      costEl.textContent = `$${sparrowCost.toFixed(2)} / month`;
      costEl.className = 'calc-result paid';
    }
    if (breakdownEl) {
      breakdownEl.innerHTML = `
        <strong>Workers Paid Tier</strong> — $5/mo base includes 10M requests/month.<br>
        Your ${config.name} at ${dau.toLocaleString()} DAU generates ${(monthlyReqs / 1e6).toFixed(1)}M monthly requests.
        ${extraMillions > 0 ? `Overage: ${extraMillions.toFixed(1)}M × $0.30 = $${(extraMillions * 0.30).toFixed(2)}` : 'No overage charges.'} 
        All bandwidth egress is $0.
      `;
    }
  }

  // ── Competitor Cost Calculations (official pricing) ──

  // Vercel Pro: $20/mo base. 1M serverless function invocations included.
  // Then $0.60 per additional million. Bandwidth: 100GB included, then $0.15/GB.
  // Let's assume average request payload is 10KB.
  const bandwidthGB = (monthlyReqs * 10) / (1024 * 1024); // 10KB average payload
  const vercelBase = 20;
  const vercelExtraInvocations = Math.max(0, (monthlyReqs - 1_000_000) / 1_000_000) * 0.60;
  const vercelExtraBW = Math.max(0, bandwidthGB - 100) * 0.15;
  const vercelCost = monthlyReqs <= 100_000 ? 0 : vercelBase + vercelExtraInvocations + vercelExtraBW;

  // Supabase Pro: $25/mo base. 2M Edge Function invocations included (then $2.00/million).
  // 250GB bandwidth included (then $0.09/GB).
  const supabaseBase = 25;
  const supabaseExtraInvocations = Math.max(0, (monthlyReqs - 2_000_000) / 1_000_000) * 2.00;
  const supabaseExtraBW = Math.max(0, bandwidthGB - 250) * 0.09;
  const supabaseCost = monthlyReqs <= 50_000 ? 0 : supabaseBase + supabaseExtraInvocations + supabaseExtraBW;

  // Firebase Blaze: Cloud Functions: $0.40 per million. Bandwidth: $0.12/GB after 10GB.
  // Firestore DB: $0.06 per 100k reads ($0.60/M) + $0.18 per 100k writes ($1.80/M).
  // Assuming 1 read/write per request on average: ~$1.00/M database operations cost.
  const firebaseInvocations = (monthlyReqs / 1_000_000) * 0.40;
  const firebaseDbOps = (monthlyReqs / 1_000_000) * 1.00;
  const firebaseExtraBW = Math.max(0, bandwidthGB - 10) * 0.12;
  const firebaseCost = monthlyReqs <= 125_000 ? 0 : firebaseInvocations + firebaseDbOps + firebaseExtraBW;

  // AWS RDS + Lambda:
  // Requires: NAT Gateway ($32.40/mo fixed) + RDS PostgreSQL db.t4g.micro (~$15.00/mo) = $47.40 base.
  // Plus Lambda ($0.20/M) + API Gateway HTTP ($1.00/M) = $1.20/M requests.
  // Plus S3 storage egress: $0.09/GB.
  const awsBase = 47.40;
  const awsReqCost = (monthlyReqs / 1_000_000) * 1.20;
  const awsExtraBW = bandwidthGB * 0.09;
  const awsCost = monthlyReqs <= 100_000 ? 0 : awsBase + awsReqCost + awsExtraBW;

  // ── Render Competitor Grid ──
  const competitorGrid = document.getElementById('competitorCosts');
  if (competitorGrid) {
    const competitors = [
      { name: '🦜 SparrowBase',   cost: sparrowCost,  color: '#10b981', note: 'Cloudflare Workers Edge' },
      { name: '▲ Vercel Pro',      cost: vercelCost,   color: '#f59e0b', note: '$20/mo base + $0.60/M + $0.15/GB' },
      { name: '⚡ Supabase Pro',   cost: supabaseCost, color: '#f59e0b', note: '$25/mo base + $2.00/M + $0.09/GB' },
      { name: '🔥 Firebase Blaze', cost: firebaseCost, color: '#f43f5e', note: '$0.40/M func + database + $0.12/GB' },
      { name: '☁️ AWS (RDS+NAT)',  cost: awsCost,      color: '#f43f5e', note: '$47.40/mo NAT/RDS + $1.20/M + egress' },
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
          ${!isCheapest && savings > 0 ? `<div style="font-size: 0.72rem; color: var(--brand-rose); margin-top: 6px; font-weight: 600;">+$${savings.toFixed(2)} more than SparrowBase</div>` : ''}
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
