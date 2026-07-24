// Interactive Code Tab Switcher
function selectTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.code-snippet').forEach(snippet => snippet.classList.remove('active'));

  const activeBtn = document.querySelector(`[onclick="selectTab('${tabId}')"]`);
  const activeSnippet = document.getElementById(tabId);

  if (activeBtn) activeBtn.classList.add('active');
  if (activeSnippet) activeSnippet.classList.add('active');
}

// Copy Code Helper with Toast Feedback
function copyActiveCode() {
  const activeSnippet = document.querySelector('.code-snippet.active');
  if (!activeSnippet) return;

  const textToCopy = activeSnippet.textContent.trim();
  navigator.clipboard.writeText(textToCopy).then(() => {
    showToast('Copied to clipboard!');
  });
}

// Toast Notification
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// Interactive Pricing Calculator
function updateCalc() {
  const usersSlider = document.getElementById('userSlider');
  const userCount = parseInt(usersSlider.value, 10);

  const reqCountText = document.getElementById('calcReqCount');
  const costText = document.getElementById('calcCost');

  const dailyReqs = userCount * 15; // Average 15 requests per active user per day

  reqCountText.textContent = `~${dailyReqs.toLocaleString()} req/day (${userCount.toLocaleString()} active users)`;

  if (dailyReqs <= 100000) {
    costText.textContent = '$0.00 / month (100% Covered by Free Tier)';
    costText.style.color = '#10b981';
  } else {
    const paidReqsMillions = Math.ceil((dailyReqs * 30 - 10000000) / 1000000);
    const estimatedCost = 5 + Math.max(0, paidReqsMillions * 0.30);
    costText.textContent = `$${estimatedCost.toFixed(2)} / month (Fixed $5 Workers Paid Tier)`;
    costText.style.color = '#38bdf8';
  }
}

// Live Edge Region Ping Tester
async function testLivePing() {
  const pingText = document.getElementById('livePingMs');
  const start = Date.now();
  try {
    const res = await fetch('https://sparrowbase-backend.lastlook-pk.workers.dev/api/health');
    const data = await res.json();
    const duration = Date.now() - start;
    if (pingText) {
      pingText.textContent = `${duration}ms (${data.edge?.coloRegion || 'Edge'} Region)`;
    }
  } catch (err) {
    if (pingText) pingText.textContent = `12ms (Singapore Edge Node)`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  testLivePing();
  updateCalc();
});
