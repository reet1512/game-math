/* Game Model Generator — Frontend Logic */

const MODEL_GENERATOR = {
  // State
  isGenerating: false,
  currentConfig: null,
  currentHistory: null,
  generationTime: null,
  targetRTP: 93.83,
  targetVolatility: 2.39,
  targetHitFreq: 58.0,
  currentTheme: 'neon',

  // Symbol emojis
  SYMBOLS: {
    diamond: '💎',
    seven: '7️⃣',
    star: '⭐',
    lemon: '🍋',
    cherry: '🍒',
  },

  // Initialize
  init() {
    this.attachEventListeners();
    this.updateSliderValues();
    console.log('Model Generator initialized');
  },

  // Attach event listeners
  attachEventListeners() {
    // Slider updates - use 'this' binding carefully
    const self = this;
    
    document.getElementById('target-rtp').addEventListener('input', (e) => {
      self.targetRTP = parseFloat(e.target.value);
      document.getElementById('rtp-value').textContent = self.targetRTP.toFixed(2);
      console.log('RTP updated to:', self.targetRTP);
    });

    document.getElementById('target-volatility').addEventListener('input', (e) => {
      self.targetVolatility = parseFloat(e.target.value);
      document.getElementById('vol-value').textContent = self.targetVolatility.toFixed(2);
      console.log('Volatility updated to:', self.targetVolatility);
    });

    document.getElementById('target-hit-freq').addEventListener('input', (e) => {
      self.targetHitFreq = parseFloat(e.target.value);
      document.getElementById('hit-value').textContent = self.targetHitFreq.toFixed(2);
      console.log('Hit Frequency updated to:', self.targetHitFreq);
    });

    // Theme selector
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        self.currentTheme = e.target.dataset.theme;
        document.body.setAttribute('data-theme', self.currentTheme);
        self.updateThemeColors();
      });
    });

    // Generate button
    document.getElementById('generate-btn').addEventListener('click', () => self.startGeneration());

    // Results action buttons
    document.getElementById('apply-model-btn')?.addEventListener('click', () => self.applyModel());
    document.getElementById('export-model-btn')?.addEventListener('click', () => self.exportModel());
    document.getElementById('regenerate-btn')?.addEventListener('click', () => self.resetAndRegenerate());
  },

  // Update theme colors
  updateThemeColors() {
    const root = document.documentElement;
    switch (this.currentTheme) {
      case 'midnight':
        root.style.setProperty('--theme-neon-accent', '#00d9ff');
        root.style.setProperty('--theme-neon-secondary', '#6366f1');
        break;
      case 'gold':
        root.style.setProperty('--theme-neon-accent', '#f0c674');
        root.style.setProperty('--theme-neon-secondary', '#d4a574');
        break;
      default: // neon
        root.style.setProperty('--theme-neon-accent', '#9d4edd');
        root.style.setProperty('--theme-neon-secondary', '#ff5c7c');
    }
  },

  // Update slider display values
  updateSliderValues() {
    document.getElementById('rtp-value').textContent = this.targetRTP.toFixed(2);
    document.getElementById('vol-value').textContent = this.targetVolatility.toFixed(2);
    document.getElementById('hit-value').textContent = this.targetHitFreq.toFixed(2);
  },

  // Refresh target values from sliders (ensure we get latest values)
  refreshTargetValues() {
    this.targetRTP = parseFloat(document.getElementById('target-rtp').value);
    this.targetVolatility = parseFloat(document.getElementById('target-volatility').value);
    this.targetHitFreq = parseFloat(document.getElementById('target-hit-freq').value);
    console.log('Target values refreshed:', {
      rtp: this.targetRTP,
      volatility: this.targetVolatility,
      hitFreq: this.targetHitFreq
    });
  },

  // Start generation
  async startGeneration() {
    if (this.isGenerating) return;

    // Refresh values from sliders to ensure we have the latest
    this.refreshTargetValues();
    
    console.log('🚀 GENERATION STARTED WITH TARGETS:', {
      rtp: this.targetRTP,
      volatility: this.targetVolatility,
      hitFreq: this.targetHitFreq
    });

    this.isGenerating = true;
    const btn = document.getElementById('generate-btn');
    btn.disabled = true;
    btn.querySelector('.btn-text').textContent = 'Generating...';

    // Show progress section
    document.getElementById('results-section').classList.add('hidden');
    document.getElementById('progress-section').classList.remove('hidden');

    try {
      const payload = {
        target_rtp: this.targetRTP,
        target_volatility: this.targetVolatility,
        target_hit_freq: this.targetHitFreq,
        iterations: 200,
      };
      
      console.log('📤 SENDING TO API:', payload);
      
      const response = await fetch('/api/generate-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();

      console.log('📥 RECEIVED FROM API:', data);

      if (data.success) {
        this.currentConfig = data.config;
        this.currentHistory = data.history;
        this.generationTime = data.generation_time_ms;

        console.log('✅ GENERATION COMPLETE:', {
          generatedRtp: data.config.rtp_pct,
          generatedVol: data.config.std_dev,
          generatedHitFreq: data.config.hit_freq
        });

        // Simulate optimization progress
        await this.simulateOptimization(data.history);

        // Display results
        this.displayResults();
      } else {
        console.error('Generation failed:', data.error);
        alert('Generation failed: ' + data.error);
      }
    } catch (error) {
      console.error('Generation error:', error);
      alert('Error during generation: ' + error.message);
    } finally {
      this.isGenerating = false;
      btn.disabled = false;
      btn.querySelector('.btn-text').textContent = 'Generate Optimal Model';
    }
  },

  // Simulate optimization progress animation
  async simulateOptimization(history) {
    return new Promise((resolve) => {
      const totalIterations = history.length;
      const animationDuration = 2000; // 2 seconds
      const startTime = Date.now();

      const animateProgress = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / animationDuration, 1);
        const currentIteration = Math.floor(progress * totalIterations);

        // Update UI
        document.getElementById('progress-iteration').textContent =
          `Iteration: ${currentIteration}/${totalIterations}`;

        if (currentIteration > 0 && currentIteration <= totalIterations) {
          const config = history[currentIteration - 1];
          document.getElementById('progress-fitness').textContent =
            `Fitness: ${config.score.toFixed(4)}`;
        }

        // Update chart
        this.updateOptimizationChart(history.slice(0, currentIteration));

        if (progress < 1) {
          requestAnimationFrame(animateProgress);
        } else {
          resolve();
        }
      };

      animateProgress();
    });
  },

  // Update optimization chart visualization
  updateOptimizationChart(historyData) {
    const chart = document.getElementById('optimization-chart');
    if (historyData.length === 0) return;

    // Simple ASCII visualization
    const maxScore = Math.max(...historyData.map(h => h.score));
    const minScore = Math.min(...historyData.map(h => h.score));
    const range = maxScore - minScore || 1;

    const width = chart.clientWidth;
    const height = chart.clientHeight;
    const barWidth = width / historyData.length;

    // Clear and redraw
    chart.innerHTML = '';

    historyData.forEach((item, idx) => {
      const normalized = (item.score - minScore) / range;
      const barHeight = normalized * (height - 20);

      const bar = document.createElement('div');
      bar.style.position = 'absolute';
      bar.style.left = idx * barWidth + 'px';
      bar.style.bottom = '10px';
      bar.style.width = barWidth + 'px';
      bar.style.height = barHeight + 'px';
      bar.style.background = `linear-gradient(180deg, rgba(157, 78, 221, 0.8) 0%, rgba(0, 217, 255, 0.3) 100%)`;
      bar.style.borderRadius = '2px';
      bar.style.borderTop = '1px solid rgba(0, 217, 255, 0.8)';

      chart.appendChild(bar);
    });
  },

  // Display results
  displayResults() {
    const config = this.currentConfig;

    // Hide progress, show results
    document.getElementById('progress-section').classList.add('hidden');
    document.getElementById('results-section').classList.remove('hidden');

    // Update results cards
    document.getElementById('result-rtp').textContent = config.rtp_pct.toFixed(2) + '%';
    document.getElementById('result-vol').textContent = config.std_dev.toFixed(4) + 'σ';
    document.getElementById('result-vol-class').textContent = config.volatility_class;
    document.getElementById('result-hit').textContent = config.hit_freq.toFixed(1) + '%';
    document.getElementById('result-exposure').textContent = '×' + config.max_exposure;

    // Populate weights
    this.displayWeights(config.reel_weights);

    // Update timeline
    document.getElementById('timeline-iterations').textContent = this.currentHistory.length;
    const bestFitness = Math.min(...this.currentHistory.map(h => h.score));
    document.getElementById('timeline-fitness').textContent = bestFitness.toFixed(4);
    document.getElementById('timeline-time').textContent = this.generationTime + ' ms';
    document.getElementById('timeline-rate').textContent =
      (this.currentHistory.length / this.generationTime).toFixed(2) + ' iters/ms';

    // Play success animation
    this.playSuccessAnimation();
  },

  // Display reel weights
  displayWeights(weights) {
    const grid = document.getElementById('weights-grid');
    grid.innerHTML = '';

    const symbolOrder = ['diamond', 'seven', 'star', 'lemon', 'cherry'];
    symbolOrder.forEach(symbol => {
      const count = weights[symbol] || 0;
      const pct = (count / 9 * 100).toFixed(0);

      const item = document.createElement('div');
      item.className = 'weight-item';
      item.innerHTML = `
        <div class="weight-glyph">${this.SYMBOLS[symbol]}</div>
        <div class="weight-label">${this.capitalizeFirst(symbol)}</div>
        <div class="weight-count">${count}</div>
        <div class="weight-slots">${pct}% of reel</div>
      `;
      grid.appendChild(item);
    });
  },

  // Play success animation
  playSuccessAnimation() {
    const cards = document.querySelectorAll('.config-card');
    cards.forEach((card, idx) => {
      card.style.animation = 'none';
      setTimeout(() => {
        card.style.animation = `fadeInScale 0.5s ease-out ${idx * 0.1}s both`;
      }, 10);
    });
  },

  // Apply model to game (placeholder)
  applyModel() {
    if (!this.currentConfig) return;
    
    const targetStr = `\nTarget Values You Set:\n` +
      `  • RTP: ${this.targetRTP.toFixed(2)}%\n` +
      `  • Volatility: ${this.targetVolatility.toFixed(2)}σ\n` +
      `  • Hit Frequency: ${this.targetHitFreq.toFixed(2)}%\n\n`;
    
    const generatedStr = `Generated Configuration:\n` +
      `  • RTP: ${this.currentConfig.rtp_pct.toFixed(2)}%\n` +
      `  • Volatility: ${this.currentConfig.std_dev.toFixed(4)}σ\n` +
      `  • Hit Frequency: ${this.currentConfig.hit_freq.toFixed(1)}%\n\n`;
    
    alert(
      '✓ Model Applied!\n\n' +
      targetStr +
      generatedStr +
      'This would update your game configuration in production.'
    );
  },

  // Export model configuration
  exportModel() {
    if (!this.currentConfig) return;

    const exportData = {
      generated_at: new Date().toISOString(),
      targets: {
        rtp: this.targetRTP,
        volatility: this.targetVolatility,
        hit_frequency: this.targetHitFreq,
      },
      results: this.currentConfig,
      generation_time_ms: this.generationTime,
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `slot-model-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('Model exported:', exportData);
  },

  // Reset and regenerate
  resetAndRegenerate() {
    document.getElementById('results-section').classList.add('hidden');
    document.getElementById('progress-section').classList.add('hidden');
    this.startGeneration();
  },

  // Utility: capitalize first letter
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  MODEL_GENERATOR.init();

  // Add CSS animation for results cards
  if (!document.querySelector('style[data-model-gen]')) {
    const style = document.createElement('style');
    style.setAttribute('data-model-gen', 'true');
    style.textContent = `
      @keyframes fadeInScale {
        from {
          opacity: 0;
          transform: scale(0.9);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
    `;
    document.head.appendChild(style);
  }
});
