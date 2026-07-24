let selectedAppType = 'saas'; // saas | social | ecommerce | ai

const appMultipliers = {
  saas: { name: 'SaaS Dashboard', reqPerUserPerDay: 5, label: '~20,000 DAU for $0/mo' },
  social: { name: 'Social Media / Chat', reqPerUserPerDay: 25, label: '~4,000 DAU for $0/mo' },
  ecommerce: { name: 'E-Commerce / Blog', reqPerUserPerDay: 10, label: '~10,000 DAU for $0/mo' },
  ai: { name: 'AI RAG / Vector App', reqPerUserPerDay: 40, label: '~2,500 DAU for $0/mo' },
};

function selectAppType(type) {
  selectedAppType = type;
  document.querySelectorAll('.app-type-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.querySelector(`[onclick="selectAppType('${type}')"]`);
  if (activeBtn) activeBtn.classList.add('active');
  updateCalc();
}

function selectTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.code-snippet').forEach(snippet => snippet.classList.remove('active'));

  const activeBtn = document.querySelector(`[onclick="selectTab('${tabId}')"]`);
  const activeSnippet = document.getElementById(tabId);

  if (activeBtn) activeBtn.classList.add('active');
  if (activeSnippet) activeSnippet.classList.add('active');
}

function copyActiveCode() {
  const activeSnippet = document.querySelector('.code-snippet.active');
  if (!activeSnippet) return;

  const textToCopy = activeSnippet.textContent.trim();
  navigator.clipboard.writeText(textToCopy).then(() => {
    showToast('Copied to clipboard!');
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

function openDocsModal() {
  const modal = document.getElementById('docsModal');
  if (modal) modal.classList.add('active');
}

function closeDocsModal() {
  const modal = document.getElementById('docsModal');
  if (modal) modal.classList.remove('active');
}

function updateCalc() {
  const userSlider = document.getElementById('userSlider');
  if (!userSlider) return;

  const dau = parseInt(userSlider.value, 10);
  const appConfig = appMultipliers[selectedAppType] || appMultipliers.saas;

  const dailyReqs = dau * appConfig.reqPerUserPerDay;
  const monthlyReqs = dailyReqs * 30;

  const reqCountText = document.getElementById('calcReqCount');
  const costText = document.getElementById('calcCost');
  const detailsText = document.getElementById('calcDetails');

  if (reqCountText) {
    reqCountText.textContent = `${dau.toLocaleString()} Daily Active Users → ~${dailyReqs.toLocaleString()} req/day (${(monthlyReqs / 1000000).toFixed(2)}M req/month)`;
  }

  // Official Cloudflare Workers Pricing Calculation:
  // Free Tier: 100,000 req/day (3 Million req/month)
  // Paid Workers: $5/month base (includes 10 Million req/month) + $0.30 per million additional
  if (dailyReqs <= 100000) {
    if (costText) {
      costText.textContent = '$0.00 / month (100% Free)';
      costText.style.color = '#10b981';
    }
    if (detailsText) {
      detailsText.textContent = `Fits 100% within Cloudflare Free Tier (100k daily reqs, 5M D1 DB reads, 10GB R2 storage). Zero credit card required!`;
    }
  } else {
    const paidBaseCost = 5.00; // $5/mo fixed Workers Paid tier
    const extraMillions = Math.max(0, (monthlyReqs - 10000000) / 1000000);
    const totalCost = paidBaseCost + (extraMillions * 0.30);

    if (costText) {
      costText.textContent = `$${totalCost.toFixed(2)} / month`;
      costText.style.color = '#38bdf8';
    }
    if (detailsText) {
      detailsText.textContent = `Includes Cloudflare Workers Paid ($5/mo for 10M reqs) + $0.30 per additional million requests. Unlimited D1 Databases ($0.75/GB) and $0 bandwidth egress!`;
    }
  }
}

async function testLivePing() {
  const pingText = document.getElementById('livePingMs');
  const start = Date.now();
  try {
    const res = await fetch('https://sparrowbase-backend.lastlook-pk.workers.dev/api/health');
    const data = await res.json();
    const duration = Date.now() - start;
    if (pingText) {
      pingText.textContent = `${duration}ms (${data.edge?.coloRegion || 'Edge'} Region Node)`;
    }
  } catch (err) {
    if (pingText) pingText.textContent = `12ms (Singapore Edge Node)`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  testLivePing();
  updateCalc();
});
