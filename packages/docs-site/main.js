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

  // Update DAU display
  const dauDisplay = document.getElementById('dauDisplay');
  if (dauDisplay) {
    dauDisplay.textContent = `${dau.toLocaleString()} Daily Active Users → ${dailyReqs.toLocaleString()} req/day (${(monthlyReqs / 1e6).toFixed(1)}M/month)`;
  }

  const costEl = document.getElementById('calcCostResult');
  const breakdownEl = document.getElementById('calcBreakdown');

  // Cloudflare Workers Pricing:
  // Free: 100,000 req/day (3M/month)
  // Paid: $5/mo base → includes 10M req/month → then $0.30 per million additional
  if (dailyReqs <= 100_000) {
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
    const totalCost = baseCost + (extraMillions * 0.30);

    if (costEl) {
      costEl.textContent = `$${totalCost.toFixed(2)} / month`;
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
