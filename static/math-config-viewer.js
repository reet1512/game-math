/* Math Configuration Viewer — Interactive Logic */

const MATH_CONFIG_VIEWER = {
  // State
  config: null,
  collapsedSections: {},
  
  // Initialize
  init() {
    this.attachEventListeners();
    this.loadConfig();
    console.log('Math Config Viewer initialized');
  },

  // Attach event listeners
  attachEventListeners() {
    document.addEventListener('click', (e) => {
      // Section header clicks for collapse/expand
      if (e.target.closest('.config-section-header')) {
        const header = e.target.closest('.config-section-header');
        const section = header.closest('.config-section');
        if (section) {
          const sectionId = section.id;
          section.classList.toggle('collapsed');
          this.collapsedSections[sectionId] = section.classList.contains('collapsed');
          localStorage.setItem('config-collapsed', JSON.stringify(this.collapsedSections));
        }
      }

      // Copy buttons
      if (e.target.closest('.config-btn-copy')) {
        this.handleCopy(e.target.closest('.config-btn-copy'));
      }

      // Line-specific copy
      if (e.target.closest('.config-line-copy')) {
        this.handleLineCopy(e.target.closest('.config-line-copy'));
      }

      // Export button
      if (e.target.closest('.config-btn-export')) {
        this.handleExport();
      }
    });
  },

  // Load current config
  loadConfig() {
    // Wait for data to be available
    if (window.currentGameData) {
      this.buildConfigDisplay(window.currentGameData.theoretical);
    } else {
      // Fetch fresh data if not available
      fetch('/api/stats')
        .then(r => r.json())
        .then(data => {
          window.currentGameData = data;
          this.buildConfigDisplay(data.theoretical);
        })
        .catch(err => console.error('Failed to load config:', err));
    }
  },

  // Build configuration display
  buildConfigDisplay(theoretical) {
    const viewer = document.getElementById('math-config-viewer-content');
    if (!viewer) return;

    // Restore collapsed state from localStorage
    const saved = localStorage.getItem('config-collapsed');
    this.collapsedSections = saved ? JSON.parse(saved) : {};

    const breakdown = theoretical.breakdown || [];

    // Build symbol weights map
    const weights = {
      diamond: 0,
      seven: 0,
      star: 0,
      lemon: 0,
      cherry: 0,
    };
    breakdown.forEach(item => {
      weights[item.symbol] = item.reel_count || 0;
    });

    // Build payouts map
    const payouts = {};
    breakdown.forEach(item => {
      payouts[item.symbol] = item.payout || 0;
    });

    // Store for later use
    this.config = {
      symbol_weights: weights,
      payouts: payouts,
      rtp: theoretical.rtp_pct,
      house_edge: theoretical.house_edge_pct,
      volatility: theoretical.volatility_class,
      std_dev: theoretical.std_dev,
      hit_frequency: theoretical.hit_frequency_pct,
      total_outcomes: theoretical.total_outcomes,
      breakdown: breakdown,
    };

    viewer.innerHTML = this.renderConfig(this.config);
    this.attachCollapsedState();
  },

  // Render configuration as formatted JSON-like structure
  renderConfig(cfg) {
    const symbolEmojis = {
      diamond: '💎',
      seven: '7️⃣',
      star: '⭐',
      lemon: '🍋',
      cherry: '🍒',
    };

    let html = `
      <div class="config-code">
        <!-- Symbol Weights Section -->
        <div class="config-section" id="section-weights">
          <div class="config-section-header">
            <span class="config-toggle-arrow">▼</span>
            <span class="config-key">symbol_weights</span>
            <span class="config-punctuation">: {</span>
          </div>
          <div class="config-section-content">
            <div class="config-grid">
    `;

    // Symbol weight grid
    Object.entries(cfg.symbol_weights).forEach(([symbol, count]) => {
      const emoji = symbolEmojis[symbol] || '?';
      html += `
        <div class="config-grid-item">
          <div class="config-grid-label">${emoji} ${symbol}</div>
          <div class="config-grid-value">${count}/9</div>
        </div>
      `;
    });

    html += `
            </div>
            <div class="config-line">
              <span class="config-punctuation">},</span>
            </div>
          </div>
        </div>

        <!-- Payout Table Section -->
        <div class="config-section" id="section-payouts">
          <div class="config-section-header">
            <span class="config-toggle-arrow">▼</span>
            <span class="config-key">payout_multipliers</span>
            <span class="config-punctuation">: {</span>
          </div>
          <div class="config-section-content">
    `;

    Object.entries(cfg.payouts).forEach(([symbol, payout]) => {
      const emoji = symbolEmojis[symbol] || '?';
      html += `
        <div class="config-line">
          <span class="config-property-key">${emoji} ${symbol}</span>
          <span class="config-punctuation">:</span>
          <span class="config-number">×${payout}</span>
          <button class="config-line-copy" title="Copy">📋</button>
        </div>
      `;
    });

    html += `
            <div class="config-line">
              <span class="config-punctuation">},</span>
            </div>
          </div>
        </div>

        <!-- RTP & Mathematics Section -->
        <div class="config-section" id="section-rtp">
          <div class="config-section-header">
            <span class="config-toggle-arrow">▼</span>
            <span class="config-key">game_mathematics</span>
            <span class="config-punctuation">: {</span>
          </div>
          <div class="config-section-content">
            <div class="config-line">
              <span class="config-property-key">rtp</span>
              <span class="config-punctuation">:</span>
              <span class="config-value-badge">${cfg.rtp.toFixed(2)}%</span>
            </div>
            <div class="config-line">
              <span class="config-property-key">house_edge</span>
              <span class="config-punctuation">:</span>
              <span class="config-value-badge">${cfg.house_edge.toFixed(2)}%</span>
            </div>
            <div class="config-line">
              <span class="config-property-key">volatility</span>
              <span class="config-punctuation">:</span>
              <span class="config-value-badge">${cfg.volatility}</span>
            </div>
            <div class="config-line">
              <span class="config-property-key">std_deviation</span>
              <span class="config-punctuation">:</span>
              <span class="config-number">${cfg.std_dev.toFixed(4)}σ</span>
            </div>
            <div class="config-line">
              <span class="config-property-key">hit_frequency</span>
              <span class="config-punctuation">:</span>
              <span class="config-number">${cfg.hit_frequency.toFixed(2)}%</span>
            </div>
            <div class="config-line">
              <span class="config-property-key">total_outcomes</span>
              <span class="config-punctuation">:</span>
              <span class="config-number">${cfg.total_outcomes.toLocaleString()}</span>
            </div>
            <div class="config-line">
              <span class="config-punctuation">},</span>
            </div>
          </div>
        </div>

        <!-- Symbol Details Section -->
        <div class="config-section" id="section-details">
          <div class="config-section-header">
            <span class="config-toggle-arrow">▼</span>
            <span class="config-key">symbol_details</span>
            <span class="config-punctuation">: [</span>
          </div>
          <div class="config-section-content">
    `;

    cfg.breakdown.forEach((item, idx) => {
      const emoji = item.glyph || '?';
      html += `
        <div class="config-line">
          <span class="config-comment">// ${emoji} ${item.label}</span>
        </div>
        <div class="config-line">
          <span class="config-punctuation">{</span>
        </div>
        <div class="config-line" style="margin-left: 1rem;">
          <span class="config-property-key">symbol</span>
          <span class="config-punctuation">:</span>
          <span class="config-string">"${item.symbol}"</span>
          <span class="config-punctuation">,</span>
        </div>
        <div class="config-line" style="margin-left: 1rem;">
          <span class="config-property-key">on_reel</span>
          <span class="config-punctuation">:</span>
          <span class="config-number">${item.reel_count}/9</span>
          <span class="config-punctuation">,</span>
        </div>
        <div class="config-line" style="margin-left: 1rem;">
          <span class="config-property-key">p_triple</span>
          <span class="config-punctuation">:</span>
          <span class="config-number">${item.p_triple_pct.toFixed(3)}%</span>
          <span class="config-punctuation">,</span>
        </div>
        <div class="config-line" style="margin-left: 1rem;">
          <span class="config-property-key">frequency</span>
          <span class="config-punctuation">:</span>
          <span class="config-string">"${item.expected_freq}"</span>
          <span class="config-punctuation">,</span>
        </div>
        <div class="config-line" style="margin-left: 1rem;">
          <span class="config-property-key">payout</span>
          <span class="config-punctuation">:</span>
          <span class="config-number">×${item.payout}</span>
          <span class="config-punctuation">,</span>
        </div>
        <div class="config-line" style="margin-left: 1rem;">
          <span class="config-property-key">rtp_contribution</span>
          <span class="config-punctuation">:</span>
          <span class="config-number">${item.contribution.toFixed(3)}%</span>
        </div>
        <div class="config-line">
          <span class="config-punctuation">}${idx < cfg.breakdown.length - 1 ? ',' : ''}</span>
        </div>
      `;
    });

    html += `
            <div class="config-line">
              <span class="config-punctuation">]</span>
            </div>
          </div>
        </div>

        <div class="config-line">
          <span class="config-punctuation">}</span>
        </div>
      </div>
    `;

    return html;
  },

  // Attach collapsed state from localStorage
  attachCollapsedState() {
    Object.entries(this.collapsedSections).forEach(([sectionId, isCollapsed]) => {
      const section = document.getElementById(sectionId);
      if (section && isCollapsed) {
        section.classList.add('collapsed');
      }
    });
  },

  // Handle copy button
  handleCopy(btn) {
    const configJson = JSON.stringify(this.config, null, 2);
    navigator.clipboard.writeText(configJson).then(() => {
      this.showFeedback('✓ Configuration copied to clipboard');
      btn.textContent = '✓';
      setTimeout(() => {
        btn.textContent = '📋';
      }, 2000);
    }).catch(err => {
      console.error('Copy failed:', err);
      this.showFeedback('✗ Failed to copy');
    });
  },

  // Handle line copy
  handleLineCopy(btn) {
    const line = btn.closest('.config-line');
    let text = '';
    
    // Extract readable text from the line
    const keySpan = line.querySelector('.config-property-key');
    const valueSpans = line.querySelectorAll('.config-number, .config-value-badge, .config-string');
    
    if (keySpan && valueSpans.length > 0) {
      const key = keySpan.textContent.trim();
      const value = Array.from(valueSpans)
        .map(s => s.textContent.trim())
        .join(' ');
      text = `${key}: ${value}`;
    } else {
      text = line.textContent.trim();
    }

    navigator.clipboard.writeText(text).then(() => {
      this.showFeedback('✓ Line copied');
      btn.textContent = '✓';
      setTimeout(() => {
        btn.textContent = '📋';
      }, 1500);
    });
  },

  // Handle export
  handleExport() {
    const configJson = JSON.stringify(this.config, null, 2);
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game-config-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showFeedback('✓ Configuration exported as JSON');
  },

  // Show feedback message
  showFeedback(message) {
    const feedback = document.createElement('div');
    feedback.className = 'config-copy-feedback';
    feedback.textContent = message;
    document.body.appendChild(feedback);
    
    setTimeout(() => {
      feedback.style.animation = 'feedback-slide 0.5s ease-out reverse';
      setTimeout(() => feedback.remove(), 500);
    }, 2000);
  },

  // Update config when stats change (called from dashboard.js)
  updateConfig(newData) {
    if (newData && newData.theoretical) {
      this.buildConfigDisplay(newData.theoretical);
    }
  },
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  MATH_CONFIG_VIEWER.init();
});

// Export for external access
window.MATH_CONFIG_VIEWER = MATH_CONFIG_VIEWER;
