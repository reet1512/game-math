/* Lucky Sevens — Analytics dashboard */

const SYMBOL_COLORS = {
  diamond: '#7fb4d4',
  seven:   '#e54c3c',
  star:    '#f0c674',
  lemon:   '#d4d161',
  cherry:  '#c4476b',
};

const CREAM = '#f5ead0';
const CREAM_DIM = 'rgba(245, 234, 208, 0.6)';
const BRASS = '#c9a25e';
const BRASS_BRIGHT = '#f0c674';
const GRID = 'rgba(201, 162, 94, 0.12)';

Chart.defaults.font.family = "'DM Mono', monospace";
Chart.defaults.font.size = 11;
Chart.defaults.color = CREAM_DIM;

let contribChart, outcomeChart, trendChart;
let currentGameData = null;

async function loadStats() {
  const data = await fetch('/api/stats').then(r => r.json());
  currentGameData = data;
  renderHero(data.theoretical);
  renderBigMetrics(data.theoretical);
  renderContribChart(data.theoretical);
  renderOutcomeChart(data.theoretical);
  renderTrendChart(data.history);
  renderSymbolTable(data.theoretical);
  renderConvergence(data.session, data.theoretical);
  document.getElementById('live-spins-tag').textContent = `${data.session.spins} spins`;
  // Update math config viewer
  if (window.MATH_CONFIG_VIEWER) {
    window.MATH_CONFIG_VIEWER.updateConfig(data);
  }
}

function renderHero(theo) {
  document.getElementById('vol-class').textContent = theo.volatility_class;
}

function renderBigMetrics(theo) {
  document.getElementById('theo-rtp').textContent = theo.rtp_pct.toFixed(2) + '%';
  document.getElementById('house-edge').textContent = theo.house_edge_pct.toFixed(2) + '%';
  document.getElementById('std-dev').textContent = theo.std_dev.toFixed(2);
  document.getElementById('hit-freq').textContent = theo.hit_frequency_pct.toFixed(1) + '%';
}

function renderContribChart(theo) {
  const ctx = document.getElementById('contribChart');
  const labels = theo.breakdown.map(r => `${r.glyph}  ${r.label}`);
  const data = theo.breakdown.map(r => +(r.contribution * 100).toFixed(3));
  const colors = theo.breakdown.map(r => SYMBOL_COLORS[r.symbol]);

  if (contribChart) contribChart.destroy();
  contribChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Contribution to RTP (%)',
        data,
        backgroundColor: colors,
        borderColor: colors,
        borderWidth: 0,
        borderRadius: 2,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a1410',
          borderColor: BRASS,
          borderWidth: 1,
          titleColor: BRASS_BRIGHT,
          bodyColor: CREAM,
          padding: 12,
          callbacks: {
            label: c => `Contributes ${c.parsed.x.toFixed(3)}% to RTP`
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: GRID },
          ticks: { color: CREAM_DIM, callback: v => v + '%' }
        },
        y: { grid: { display: false }, ticks: { color: CREAM } }
      }
    }
  });
}

function renderOutcomeChart(theo) {
  const ctx = document.getElementById('outcomeChart');
  if (outcomeChart) outcomeChart.destroy();
  outcomeChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Triple match', 'Pair only', 'No match'],
      datasets: [{
        data: [theo.p_triple_pct, theo.p_pair_only_pct, theo.p_loss_pct],
        backgroundColor: ['#f0c674', '#c9a25e', '#5b1a25'],
        borderColor: '#1a1410',
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: CREAM, padding: 14, font: { size: 11 }, boxWidth: 12 }
        },
        tooltip: {
          backgroundColor: '#1a1410',
          borderColor: BRASS,
          borderWidth: 1,
          titleColor: BRASS_BRIGHT,
          bodyColor: CREAM,
          padding: 12,
          callbacks: {
            label: c => `${c.label}: ${c.parsed.toFixed(2)}%`
          }
        }
      }
    }
  });
}

function renderTrendChart(history) {
  const ctx = document.getElementById('trendChart');
  if (trendChart) trendChart.destroy();

  // Compute rolling RTP at each spin
  let cumulativeBet = 0, cumulativeWon = 0;
  const rolling = history.map(h => {
    cumulativeBet += h.bet;
    cumulativeWon += h.payout;
    return cumulativeBet > 0 ? (cumulativeWon / cumulativeBet * 100) : 0;
  });

  const labels = history.map(h => h.spin);

  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Rolling RTP %',
          data: rolling,
          borderColor: BRASS_BRIGHT,
          backgroundColor: 'rgba(240, 198, 116, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointBackgroundColor: BRASS_BRIGHT,
        },
        {
          label: 'Spin multiplier',
          data: history.map(h => h.multiplier),
          borderColor: '#e54c3c',
          backgroundColor: 'transparent',
          borderWidth: 1,
          pointRadius: 3,
          pointBackgroundColor: '#e54c3c',
          showLine: false,
          yAxisID: 'y1',
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: { color: CREAM, font: { size: 11 }, boxWidth: 14 }
        },
        tooltip: {
          backgroundColor: '#1a1410',
          borderColor: BRASS,
          borderWidth: 1,
          titleColor: BRASS_BRIGHT,
          bodyColor: CREAM,
          padding: 12,
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Spin number', color: CREAM_DIM, font: { size: 10 } },
          grid: { color: GRID },
          ticks: { color: CREAM_DIM, maxTicksLimit: 10 }
        },
        y: {
          position: 'left',
          title: { display: true, text: 'RTP %', color: CREAM_DIM, font: { size: 10 } },
          grid: { color: GRID },
          ticks: { color: CREAM_DIM, callback: v => v + '%' }
        },
        y1: {
          position: 'right',
          title: { display: true, text: 'Win × bet', color: CREAM_DIM, font: { size: 10 } },
          grid: { display: false },
          ticks: { color: CREAM_DIM }
        }
      }
    }
  });
}

function renderSymbolTable(theo) {
  const tbody = document.querySelector('#symbol-table tbody');
  tbody.innerHTML = theo.breakdown.map(r => `
    <tr>
      <td class="glyph-cell">${r.glyph} ${r.label}</td>
      <td>${r.reel_count} / 9</td>
      <td>${r.p_triple_pct.toFixed(3)}%</td>
      <td>${r.expected_freq}</td>
      <td class="payout-cell">×${r.payout}</td>
      <td>${(r.contribution * 100).toFixed(3)}%</td>
    </tr>
  `).join('');
}

function renderConvergence(session, theo) {
  document.getElementById('conv-theo').textContent = theo.rtp_pct.toFixed(2) + '%';

  if (session.total_bet > 0) {
    const actualRtp = session.actual_rtp_pct;
    const diff = actualRtp - theo.rtp_pct;
    const sign = diff >= 0 ? '+' : '';
    document.getElementById('conv-actual').textContent = actualRtp.toFixed(2) + '%';
    document.getElementById('conv-diff').textContent = sign + diff.toFixed(2) + '%';
    document.getElementById('conv-std').textContent = session.observed_std.toFixed(2);

    if (session.spins < 30) {
      document.getElementById('conv-note').textContent =
        `Only ${session.spins} spins recorded. Wide divergence from theory is expected at low sample sizes.`;
    } else if (Math.abs(diff) < 5) {
      document.getElementById('conv-note').textContent =
        `Your actual RTP is within ${Math.abs(diff).toFixed(2)}% of theory — close to expected.`;
    } else {
      document.getElementById('conv-note').textContent =
        `${Math.abs(diff).toFixed(1)}% gap from theory — variance still dominates. Play more spins to converge.`;
    }
  } else {
    document.getElementById('conv-actual').textContent = '—';
    document.getElementById('conv-diff').textContent = '—';
    document.getElementById('conv-std').textContent = '—';
  }
}

loadStats();
// Refresh every 5 seconds so the dashboard stays in sync if user plays in another tab
setInterval(loadStats, 5000);


// Store data for AI Analyst
let currentGameData = null;

original_loadStats = loadStats;
loadStats = async function() {
  await original_loadStats();
  if (window.AI_ANALYST) AI_ANALYST.currentAnalysis = null;
}

