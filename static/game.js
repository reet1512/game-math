/* Lucky Sevens — game page client */

const SYMBOLS_POOL = ['🍒','🍒','🍒','🍋','🍋','⭐','⭐','7️⃣','💎'];
const REEL_DELAYS = [600, 900, 1200];
const SYMBOL_NAMES = {
  '🍒': 'Cherry', '🍋': 'Lemon', '⭐': 'Star', '7️⃣': 'Seven', '💎': 'Diamond'
};

let bet = 5;
let spinning = false;
let stats = null;

const $ = id => document.getElementById(id);
const spinBtn = $('spin-btn');
const reels = [$('reel-0'), $('reel-1'), $('reel-2')];
const strips = reels.map(r => r.querySelector('.reel-strip'));
const msg = $('message');
const msgTape = document.querySelector('.message-tape');

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function createConfetti() {
  for (let i = 0; i < 20; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.textContent = ['🎉', '✨', '🌟', '💫', '⭐'][Math.floor(Math.random() * 5)];
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.delay = Math.random() * 0.2 + 's';
    msgTape.appendChild(confetti);
    setTimeout(() => confetti.remove(), 1000);
  }
}

function setBet(v) {
  bet = Math.max(1, Math.min(50, v));
  $('bet').textContent = bet;
  refreshButtonState();
}

function refreshButtonState() {
  const credits = parseInt($('credits').textContent, 10) || 0;
  spinBtn.disabled = spinning || credits < bet;
  $('bet-down').disabled = bet <= 1 || spinning;
  $('bet-up').disabled = bet >= 50 || spinning;
}

async function spin() {
  if (spinning) return;
  spinning = true;
  msgTape.classList.remove('win', 'big-win', 'no-match');
  msg.textContent = '🎰 Reels spinning…';
  reels.forEach(r => { r.classList.add('spinning'); r.classList.remove('win'); });
  msgTape.style.animation = 'none';
  setTimeout(() => { msgTape.style.animation = ''; }, 10);
  refreshButtonState();

  // Flicker symbols while spinning - faster flicker
  const flickerIntervals = strips.map(s =>
    setInterval(() => { s.querySelector('span').textContent = rand(SYMBOLS_POOL); }, 50)
  );

  // Fire the API call in parallel with animation
  const responsePromise = fetch('/api/spin', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({bet})
  }).then(r => r.json());

  // Stop reels one by one
  responsePromise.then(data => {
    if (data.error === 'refilled') {
      $('credits').textContent = data.credits;
      msg.textContent = '💰 House refilled! Your credits + 100';
      reels.forEach((r, i) => { clearInterval(flickerIntervals[i]); r.classList.remove('spinning'); });
      msgTape.classList.add('refill');
      spinning = false;
      refreshButtonState();
      return;
    }

    REEL_DELAYS.forEach((d, i) => {
      setTimeout(() => {
        clearInterval(flickerIntervals[i]);
        strips[i].querySelector('span').textContent = data.glyphs[i];
        reels[i].classList.remove('spinning');
        // Add pop sound effect (visual pulse)
        reels[i].classList.add('land');
        setTimeout(() => reels[i].classList.remove('land'), 300);
        if (i === 2) finalizeSpin(data);
      }, d);
    });
  });
}

function finalizeSpin(data) {
  spinning = false;
  const glyphs = data.glyphs;
  const symbolNames = glyphs.map(g => SYMBOL_NAMES[g]).join(', ');

  if (data.multiplier >= 10) {
    msgTape.classList.add('big-win');
    msg.innerHTML = `
      <div style="font-size: 20px; margin-bottom: 8px;">🎉 JACKPOT! 🎉</div>
      <div style="font-size: 14px; margin-bottom: 4px;">${data.multiplier}× Multiplier</div>
      <div style="color: #7fc89c; font-weight: bold;">+ ${data.payout} Credits Won!</div>
    `;
    reels.forEach(r => r.classList.add('win'));
    createConfetti();
  } else if (data.multiplier > 1) {
    msgTape.classList.add('win');
    msg.innerHTML = `
      <div style="font-size: 16px; margin-bottom: 6px;">✨ Triple Match! ✨</div>
      <div style="font-size: 13px;">${data.multiplier}× on ${symbolNames}</div>
      <div style="color: #7fc89c; font-weight: bold;">+ ${data.payout} Credits</div>
    `;
    reels.forEach(r => r.classList.add('win'));
  } else if (data.multiplier === 1) {
    msgTape.classList.add('win');
    msg.innerHTML = `
      <div style="font-size: 14px; margin-bottom: 4px;">Pair Match ✓</div>
      <div style="color: #7fc89c;">Bet returned: +${data.payout}</div>
    `;
  } else {
    msgTape.classList.add('no-match');
    msg.textContent = '❌ No match — try again!';
  }

  $('credits').textContent = data.credits;
  $('total-won').textContent = data.stats.total_won.toLocaleString();
  updateLiveStats(data.stats);
  refreshButtonState();
}

function updateLiveStats(s) {
  $('ls-spins').textContent = s.spins;
  $('ls-hit').textContent = s.spins > 0 ? s.hit_freq_pct.toFixed(1) + '%' : '—';
  $('ls-rtp').textContent = s.total_bet > 0 ? s.actual_rtp_pct.toFixed(1) + '%' : '—';
  $('ls-biggest').textContent = s.biggest_win.toLocaleString();
  const net = s.net;
  const sign = net >= 0 ? '+' : '';
  $('ls-net').textContent = sign + net.toLocaleString();
  $('ls-net').style.color = net > 0 ? '#7fc89c' : net < 0 ? '#e09385' : '';
}

async function resetSession() {
  if (!confirm('Reset your session stats and credits to 100?')) return;
  const data = await fetch('/api/reset', {method: 'POST'}).then(r => r.json());
  $('credits').textContent = data.stats.credits;
  $('total-won').textContent = '0';
  updateLiveStats(data.stats);
  msg.textContent = 'Session reset. Good luck!';
  msgTape.classList.remove('win', 'big-win');
}

async function loadInitialStats() {
  const data = await fetch('/api/stats').then(r => r.json());
  $('credits').textContent = data.session.credits;
  $('total-won').textContent = data.session.total_won.toLocaleString();
  updateLiveStats(data.session);
}

// Event bindings
spinBtn.addEventListener('click', spin);
$('bet-down').addEventListener('click', () => setBet(bet - 1));
$('bet-up').addEventListener('click', () => setBet(bet + 1));
$('reset-btn').addEventListener('click', resetSession);
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !spinning) { e.preventDefault(); spin(); }
});

loadInitialStats();
