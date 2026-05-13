/* AI Math Analyst — Premium Studio Analytics */

const AI_ANALYST = {
  isExpanded: false,
  isLoading: false,
  currentAnalysis: null,

  // Mock AI analysis engine with game logic insights
  generateAnalysis(data) {
    const { rtp, hitFreq, volatility, breakdownData } = data;

    const analyses = {
      rtp: this.analyzeRTP(rtp),
      volatility: this.analyzeVolatility(volatility, hitFreq),
      playerExp: this.analyzePlayerExperience(rtp, hitFreq, volatility),
      risk: this.analyzeRiskProfile(volatility, rtp),
      balance: this.analyzeBalance(breakdownData, rtp, hitFreq, volatility)
    };

    return analyses;
  },

  analyzeRTP(rtp) {
    if (rtp < 85) return "⚠️ BELOW STANDARD: This RTP is lower than industry standard (87-92%), potentially creating negative player perception over extended play sessions.";
    if (rtp < 90) return "✓ MODERATE: This RTP falls within lower-mid industry range. Suitable for high-volatility games targeting experienced players seeking bigger swings.";
    if (rtp < 95) return "✓ COMPETITIVE: This RTP is industry-competitive (89-94% range). Balances operator edge with player retention incentives effectively.";
    return "✓ PREMIUM: This RTP exceeds standard industry benchmarks, creating strong player value perception and extended session engagement potential.";
  },

  analyzeVolatility(volatility, hitFreq) {
    if (volatility > 8) return "🎢 EXTREME VOLATILITY: High variance creates dramatic swings. Long losing streaks mixed with big wins. Best for thrill-seeking players with larger bankrolls.";
    if (volatility > 5) return "🎢 HIGH VOLATILITY: Significant variance creates engaging tension. Players experience notable win droughts followed by satisfying payouts.";
    if (volatility > 2) return "⚙️ MEDIUM VOLATILITY: Balanced risk-reward profile. Frequent small wins interspersed with occasional larger payouts create steady engagement.";
    return "⚙️ LOW VOLATILITY: Consistent payouts create predictable gameplay. High hit frequency minimizes losses but caps excitement ceiling.";
  },

  analyzePlayerExperience(rtp, hitFreq, volatility) {
    let experience = [];
    if (hitFreq > 50) experience.push("Very frequent wins keep players engaged");
    if (hitFreq < 25) experience.push("Selective wins create high-anticipation moments");
    if (volatility > 5) experience.push("Big jackpots deliver memorable experiences");
    if (rtp > 92) experience.push("Strong payout potential builds session persistence");

    return experience.length > 0 
      ? experience.join(". ") + "."
      : "Balanced configuration supports moderate engagement and retention.";
  },

  analyzeRiskProfile(volatility, rtp) {
    const riskScore = volatility * (100 - rtp) / 100;
    if (riskScore > 7) return "🔴 HIGH OPERATOR RISK: Significant variance + lower RTP creates unpredictable session outcomes. Requires careful player segmentation.";
    if (riskScore > 4) return "🟡 MODERATE RISK: Standard operator position with manageable volatility. Suitable for general player base.";
    return "🟢 LOW OPERATOR RISK: Stable configuration minimizes extreme downside scenarios. Predictable long-term profitability.";
  },

  analyzeBalance(breakdown, rtp, hitFreq, volatility) {
    let observations = [];
    
    if (breakdown && breakdown.length > 0) {
      const topSymbol = breakdown[0];
      if (topSymbol.contribution > 40) {
        observations.push("⚡ SKEWED DISTRIBUTION: One symbol dominates RTP contribution");
      } else if (topSymbol.contribution > 20) {
        observations.push("⚖️ BALANCED SYMBOLS: RTP distributed across premium combinations");
      }
    }

    if (rtp < 90 && hitFreq > 40) {
      observations.push("📊 LOW RTP + HIGH HIT: Players win frequently but for small amounts");
    }
    
    observations.push(`Volatility-RTP ratio suggests ${volatility > 5 ? "adventure-seeking" : "steady-income"} player targeting.`);

    return observations.join(" ");
  },

  async expand() {
    const panel = document.getElementById('ai-analyst-panel');
    if (!panel) return;

    this.isExpanded = !this.isExpanded;
    panel.classList.toggle('expanded', this.isExpanded);

    if (this.isExpanded && !this.currentAnalysis) {
      await this.loadAnalysis();
    }
  },

  async loadAnalysis() {
    this.isLoading = true;
    const cardsContainer = document.getElementById('ai-cards-container');
    if (cardsContainer) {
      cardsContainer.innerHTML = '<div class="ai-loading"><div class="ai-spinner"></div><span>Analyzing game mathematics...</span></div>';
    }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Fetch actual game data
    const data = await fetch('/api/stats').then(r => r.json()).catch(() => ({
      session: { total_bet: 0, actual_rtp_pct: 0, hit_freq_pct: 0 },
      theoretical: { rtp_pct: 0, std_dev: 0, breakdown: [] }
    }));

    const analysis = this.generateAnalysis({
      rtp: data.theoretical.rtp_pct,
      hitFreq: data.theoretical.hit_frequency_pct || 0,
      volatility: data.theoretical.std_dev || 3,
      breakdownData: data.theoretical.breakdown || []
    });

    this.currentAnalysis = analysis;
    this.isLoading = false;
    this.renderAnalysis(analysis);
  },

  renderAnalysis(analysis) {
    const cardsContainer = document.getElementById('ai-cards-container');
    if (!cardsContainer) return;

    cardsContainer.innerHTML = `
      <div class="ai-card ai-rtp-card">
        <div class="ai-card-header">
          <span class="ai-icon">📊</span>
          <h3>RTP Analysis</h3>
        </div>
        <p class="ai-text">${analysis.rtp}</p>
      </div>

      <div class="ai-card ai-volatility-card">
        <div class="ai-card-header">
          <span class="ai-icon">🎢</span>
          <h3>Volatility Profile</h3>
        </div>
        <p class="ai-text">${analysis.volatility}</p>
      </div>

      <div class="ai-card ai-player-card">
        <div class="ai-card-header">
          <span class="ai-icon">👥</span>
          <h3>Player Experience</h3>
        </div>
        <p class="ai-text">${analysis.playerExp}</p>
      </div>

      <div class="ai-card ai-risk-card">
        <div class="ai-card-header">
          <span class="ai-icon">⚖️</span>
          <h3>Risk Profile</h3>
        </div>
        <p class="ai-text">${analysis.risk}</p>
      </div>

      <div class="ai-card ai-balance-card">
        <div class="ai-card-header">
          <span class="ai-icon">⚡</span>
          <h3>Balance Observations</h3>
        </div>
        <p class="ai-text">${analysis.balance}</p>
      </div>
    `;

    // Apply typewriter effect
    this.typewriterEffect(cardsContainer);
  },

  typewriterEffect(container) {
    const textElements = container.querySelectorAll('.ai-text');
    textElements.forEach((el, idx) => {
      const text = el.textContent;
      el.textContent = '';
      el.style.animation = `none`;
      
      setTimeout(() => {
        el.style.animation = `typewriter ${text.length * 0.03}s steps(${text.length}) forwards`;
        let charIndex = 0;
        const interval = setInterval(() => {
          if (charIndex < text.length) {
            el.textContent += text[charIndex];
            charIndex++;
          } else {
            clearInterval(interval);
          }
        }, 20);
      }, idx * 150);
    });
  },

  init() {
    const toggleBtn = document.getElementById('ai-analyst-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.expand());
    }
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => AI_ANALYST.init());
