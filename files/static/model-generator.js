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
        iterations: 5000,
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

  // Display results with enhanced analytics
  displayResults() {
    const config = this.currentConfig;

    // Hide progress, show results
    document.getElementById('progress-section').classList.add('hidden');
    document.getElementById('results-section').classList.remove('hidden');

    // Calculate and display analytics
    this.calculateAndDisplayAccuracies();
    this.displayComparisonPanel();
    this.displayQualityScore();
    this.displayFitnessGraph();
    this.displayGenerationMetrics();
    this.displayFeasibilityIndicator();

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

  // Calculate and display optimization accuracy metrics
  calculateAndDisplayAccuracies() {
    const config = this.currentConfig;
    
    // RTP Accuracy (100 - |target - generated|)
    const rtpError = Math.abs(this.targetRTP - config.rtp_pct);
    const rtpAccuracy = Math.max(0, Math.min(100, 100 - rtpError));
    
    // Volatility Accuracy
    const volError = Math.abs(this.targetVolatility - config.std_dev);
    const volAccuracy = Math.max(0, Math.min(100, 100 - volError * 10));
    
    // Hit Frequency Accuracy
    const hitError = Math.abs(this.targetHitFreq - config.hit_freq);
    const hitAccuracy = Math.max(0, Math.min(100, 100 - hitError));
    
    // Constraint Satisfaction Score (average of accuracies)
    const constraintScore = Math.round((rtpAccuracy + volAccuracy + hitAccuracy) / 3);
    
    // Display accuracy bars with animation
    this.animateAccuracyBar('rtp-accuracy-bar', rtpAccuracy);
    this.animateAccuracyBar('vol-accuracy-bar', volAccuracy);
    this.animateAccuracyBar('hit-accuracy-bar', hitAccuracy);
    
    // Display percentages
    document.getElementById('rtp-accuracy-pct').textContent = rtpAccuracy.toFixed(1);
    document.getElementById('vol-accuracy-pct').textContent = volAccuracy.toFixed(1);
    document.getElementById('hit-accuracy-pct').textContent = hitAccuracy.toFixed(1);
    document.getElementById('constraint-score').textContent = constraintScore;
    
    // Determine constraint status
    this.displayConstraintStatus(rtpAccuracy, volAccuracy, hitAccuracy, constraintScore);
  },

  // Animate accuracy bar
  animateAccuracyBar(elementId, accuracy) {
    const bar = document.getElementById(elementId);
    if (bar) {
      bar.style.width = '0%';
      setTimeout(() => {
        bar.style.width = accuracy + '%';
      }, 50);
    }
  },

  // Determine and display constraint status
  displayConstraintStatus(rtpAcc, volAcc, hitAcc, score) {
    let status = 'BALANCED';
    let className = 'balanced';
    
    // Logic for constraint classification
    if (score >= 85) {
      status = 'BALANCED';
      className = 'balanced';
    } else if (score >= 70) {
      status = 'PARTIALLY SATISFIED';
      className = 'partially-satisfied';
    } else if (score >= 50) {
      status = 'UNSTABLE';
      className = 'unstable';
    } else {
      status = 'OVER-CONSTRAINED';
      className = 'over-constrained';
    }
    
    const badge = document.getElementById('constraint-badge');
    if (badge) {
      badge.textContent = status;
      badge.className = 'constraint-badge ' + className;
    }
  },

  // Display target vs generated comparison panel
  displayComparisonPanel() {
    const config = this.currentConfig;
    
    // Display target values
    document.getElementById('target-rtp-display').textContent = this.targetRTP.toFixed(2) + '%';
    document.getElementById('target-vol-display').textContent = this.targetVolatility.toFixed(2) + 'σ';
    document.getElementById('target-hit-display').textContent = this.targetHitFreq.toFixed(2) + '%';
    
    // Display generated values
    document.getElementById('gen-rtp-display').textContent = config.rtp_pct.toFixed(2) + '%';
    document.getElementById('gen-vol-display').textContent = config.std_dev.toFixed(2) + 'σ';
    document.getElementById('gen-hit-display').textContent = config.hit_freq.toFixed(2) + '%';
    
    // Calculate and display deltas
    const rtpDelta = config.rtp_pct - this.targetRTP;
    const volDelta = config.std_dev - this.targetVolatility;
    const hitDelta = config.hit_freq - this.targetHitFreq;
    
    const rtpDeltaStr = rtpDelta >= 0 ? '+' + rtpDelta.toFixed(2) : rtpDelta.toFixed(2);
    const volDeltaStr = volDelta >= 0 ? '+' + volDelta.toFixed(2) : volDelta.toFixed(2);
    const hitDeltaStr = hitDelta >= 0 ? '+' + hitDelta.toFixed(2) : hitDelta.toFixed(2);
    
    document.getElementById('delta-rtp').textContent = rtpDeltaStr + '%';
    document.getElementById('delta-vol').textContent = volDeltaStr + 'σ';
    document.getElementById('delta-hit').textContent = hitDeltaStr + '%';
  },

  // Display quality score with gauge
  displayQualityScore() {
    const config = this.currentConfig;
    
    // RTP closeness (0-100)
    const rtpCloseness = Math.max(0, Math.min(100, 100 - Math.abs(this.targetRTP - config.rtp_pct)));
    
    // Volatility closeness (0-100)
    const volCloseness = Math.max(0, Math.min(100, 100 - Math.abs(this.targetVolatility - config.std_dev) * 10));
    
    // Hit frequency closeness (0-100)
    const hitCloseness = Math.max(0, Math.min(100, 100 - Math.abs(this.targetHitFreq - config.hit_freq)));
    
    // Overall quality score
    const qualityScore = Math.round((rtpCloseness + volCloseness + hitCloseness) / 3);
    
    // Display score
    document.getElementById('quality-score').textContent = qualityScore;
    
    // Animate gauge
    const gauge = document.getElementById('quality-gauge-fill');
    if (gauge) {
      const circumference = 2 * Math.PI * 50;
      const offset = circumference - (qualityScore / 100) * circumference;
      gauge.style.strokeDashoffset = offset;
    }
    
    // Update mini bars
    this.animateQualityBar('quality-rtp-bar', rtpCloseness);
    this.animateQualityBar('quality-vol-bar', volCloseness);
    this.animateQualityBar('quality-hit-bar', hitCloseness);
    
    // Update percentages
    document.querySelectorAll('.quality-metric-pct')[0].textContent = rtpCloseness.toFixed(0) + '%';
    document.querySelectorAll('.quality-metric-pct')[1].textContent = volCloseness.toFixed(0) + '%';
    document.querySelectorAll('.quality-metric-pct')[2].textContent = hitCloseness.toFixed(0) + '%';
  },

  // Animate quality bar
  animateQualityBar(elementId, value) {
    const bar = document.getElementById(elementId);
    if (bar) {
      bar.style.width = '0%';
      setTimeout(() => {
        bar.style.width = value + '%';
      }, 50);
    }
  },

  // Display fitness convergence graph
  displayFitnessGraph() {
    const canvas = document.getElementById('fitness-graph-canvas');
    if (!canvas || !this.currentHistory || this.currentHistory.length === 0) return;
    
    canvas.innerHTML = '';
    
    const maxScore = Math.max(...this.currentHistory.map(h => h.score));
    const minScore = Math.min(...this.currentHistory.map(h => h.score));
    const range = maxScore - minScore || 1;
    
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const barWidth = Math.max(2, width / this.currentHistory.length);
    
    this.currentHistory.forEach((item, idx) => {
      const normalized = (item.score - minScore) / range;
      const barHeight = normalized * (height - 20);
      
      const bar = document.createElement('div');
      bar.style.position = 'absolute';
      bar.style.left = (idx * barWidth) + 'px';
      bar.style.bottom = '0px';
      bar.style.width = barWidth + 'px';
      bar.style.height = barHeight + 'px';
      bar.style.background = 'linear-gradient(180deg, rgba(157, 78, 221, 0.8) 0%, rgba(0, 217, 255, 0.3) 100%)';
      bar.style.borderRadius = '2px 2px 0 0';
      bar.style.borderTop = '1px solid rgba(0, 217, 255, 0.8)';
      bar.style.boxShadow = '0 0 10px rgba(0, 217, 255, 0.4)';
      bar.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
      
      canvas.appendChild(bar);
    });
  },

  // Display generation metrics
  displayGenerationMetrics() {
    const config = this.currentConfig;
    const totalSlots = Object.values(config.reel_weights || {})
      .reduce((sum, val) => sum + val, 0);
    
    document.getElementById('metrics-iterations').textContent = this.currentHistory.length;
    document.getElementById('metrics-time').textContent = this.generationTime + ' ms';
    document.getElementById('metrics-reel-size').textContent = totalSlots;
    
    const convergenceRate = (this.currentHistory.length / this.generationTime).toFixed(2);
    document.getElementById('metrics-convergence').textContent = convergenceRate + ' iters/ms';
  },

  // Display target feasibility indicator
  displayFeasibilityIndicator() {
    const feasibility = this.assessTargetFeasibility();
    const badge = document.getElementById('feasibility-badge');
    const status = document.getElementById('feasibility-status');
    
    if (badge && status) {
      badge.textContent = feasibility.label;
      badge.className = 'feasibility-badge ' + feasibility.className;
      status.textContent = feasibility.label;
    }
  },

  // Assess feasibility of target parameters
  assessTargetFeasibility() {
    const constraints = [];
    
    // Check if volatility is achievable with hit frequency
    if (this.targetVolatility < 0.5 && this.targetHitFreq > 70) {
      constraints.push('low_vol_high_hit');
    }
    
    // Check if RTP is extreme
    if (this.targetRTP < 85 || this.targetRTP > 97) {
      constraints.push('extreme_rtp');
    }
    
    // Check constraint count
    if (constraints.length === 0) {
      return { label: 'Feasible', className: 'feasible' };
    } else if (constraints.length === 1) {
      return { label: 'Difficult', className: 'difficult' };
    } else if (constraints.length === 2) {
      return { label: 'Highly Constrained', className: 'constrained' };
    } else {
      return { label: 'Low Probability Solution', className: 'constrained' };
    }
  },

  // Display reel weights
  displayWeights(weights) {
    const grid = document.getElementById('weights-grid');
    grid.innerHTML = '';

    const symbolOrder = ['diamond', 'seven', 'star', 'lemon', 'cherry'];
    symbolOrder.forEach(symbol => {
      if (!weights) {
        console.error("Weights undefined");
        return;
      }

      const count = weights[symbol] || 0;

      const totalSlots = Object.values(weights || {})
        .reduce((sum, val) => sum + val, 0);

      const pct = totalSlots > 0
        ? ((count / totalSlots) * 100).toFixed(0)
        : 0;

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

  // ========================================================================
  // IMPORT MODE FUNCTIONS
  // ========================================================================

  // Switch between build, import, and rate modes
  switchMode(mode) {
    console.log(`📋 Switching to ${mode} mode`);
    
    // Update mode toggle buttons
    document.querySelectorAll('.mode-toggle').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.mode === mode) btn.classList.add('active');
    });
    
    // Hide all panels
    const buildPanel = document.getElementById('build-mode');
    const importPanel = document.getElementById('import-mode');
    const ratePanel = document.getElementById('rate-mode');
    
    if (buildPanel) buildPanel.classList.add('hidden');
    if (importPanel) importPanel.classList.add('hidden');
    if (ratePanel) ratePanel.classList.add('hidden');
    
    // Show active panel and initialize
    if (mode === 'build') {
      if (buildPanel) buildPanel.classList.remove('hidden');
    } else if (mode === 'import') {
      if (importPanel) importPanel.classList.remove('hidden');
      this.initializeImportMode();
    } else if (mode === 'rate') {
      if (ratePanel) ratePanel.classList.remove('hidden');
      this.initializeRateMode();
    }
  },

  // Initialize import mode UI
  initializeImportMode() {
    const uploadZone = document.getElementById('importUploadZone');
    const fileInput = document.getElementById('importFileInput');
    
    if (!uploadZone || !fileInput) return;
    
    // Upload zone click handler
    uploadZone.addEventListener('click', () => fileInput.click());
    
    // File input handler
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleImportFile(e.target.files[0]);
      }
    });
    
    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('drag-over');
    });
    
    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('drag-over');
    });
    
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('drag-over');
      if (e.dataTransfer.files.length > 0) {
        this.handleImportFile(e.dataTransfer.files[0]);
      }
    });
    
    // Load button handler
    const loadBtn = document.getElementById('importLoadBtn');
    if (loadBtn) {
      loadBtn.addEventListener('click', () => this.loadImportedConfig());
    }
  },

  // Handle imported file
  async handleImportFile(file) {
    console.log(`📤 Importing file: ${file.name}`);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload-analysis', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const data = await response.json();
      if (data.success) {
        this.displayImportAnalysis(data.analysis);
      } else {
        alert('Analysis failed: ' + data.error);
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Error importing file: ' + error.message);
    }
  },

  // Display import analysis results
  displayImportAnalysis(analysis) {
    console.log('📊 Import analysis:', analysis);
    
    const container = document.getElementById('importAnalysisContainer');
    const summary = document.getElementById('importSummary');
    const confidence = document.getElementById('importConfidence');
    
    // Update summary
    summary.textContent = analysis.summary;
    confidence.textContent = analysis.confidence + '% Confidence';
    
    // Update metrics
    document.getElementById('importRTP').textContent = 
      analysis.detected_rtp !== null ? analysis.detected_rtp.toFixed(2) + '%' : 'Not detected';
    
    document.getElementById('importVolatility').textContent = 
      analysis.volatility_profile !== 'Not detected' ? analysis.volatility_profile : 'Not detected';
    
    document.getElementById('importHitFreq').textContent = 
      analysis.detected_hit_frequency !== null ? analysis.detected_hit_frequency.toFixed(2) + '%' : 'Not detected';
    
    document.getElementById('importStrategy').textContent = 
      analysis.balancing_strategy !== 'Not detected' ? analysis.balancing_strategy : 'Not detected';
    
    // Store analysis for loading
    this.importedAnalysis = analysis;
    
    // Show analysis container
    container.classList.remove('hidden');
  },

  // Load imported configuration
  loadImportedConfig() {
    if (!this.importedAnalysis) {
      alert('No analysis available. Please upload a file first.');
      return;
    }
    
    const analysis = this.importedAnalysis;
    
    // Set slider values from imported data
    if (analysis.detected_rtp !== null) {
      this.targetRTP = analysis.detected_rtp;
      document.getElementById('target-rtp').value = analysis.detected_rtp;
      document.getElementById('rtp-value').textContent = analysis.detected_rtp.toFixed(2);
    }
    
    if (analysis.detected_volatility !== null) {
      this.targetVolatility = analysis.detected_volatility;
      document.getElementById('target-volatility').value = analysis.detected_volatility;
      document.getElementById('vol-value').textContent = analysis.detected_volatility.toFixed(2);
    }
    
    if (analysis.detected_hit_frequency !== null) {
      this.targetHitFreq = analysis.detected_hit_frequency;
      document.getElementById('target-hit-freq').value = analysis.detected_hit_frequency;
      document.getElementById('hit-value').textContent = analysis.detected_hit_frequency.toFixed(2);
    }
    
    console.log('✅ Configuration loaded from import:', {
      rtp: this.targetRTP,
      volatility: this.targetVolatility,
      hitFreq: this.targetHitFreq
    });
    
    // Switch back to build mode
    this.switchMode('build');
    
    // Auto-start generation
    setTimeout(() => {
      this.startGeneration();
    }, 500);
  },

  // ========================================================================
  // AI CONFIG RATER FUNCTIONS
  // ========================================================================

  // Initialize rate mode UI
  initializeRateMode() {
    const uploadZone = document.getElementById('rateUploadZone');
    const fileInput = document.getElementById('rateFileInput');
    
    if (!uploadZone || !fileInput) return;
    
    // Upload zone click handler
    uploadZone.addEventListener('click', () => fileInput.click());
    
    // File input handler
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleRateFile(e.target.files[0]);
      }
    });
    
    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('drag-over');
    });
    
    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('drag-over');
    });
    
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('drag-over');
      if (e.dataTransfer.files.length > 0) {
        this.handleRateFile(e.dataTransfer.files[0]);
      }
    });
    
    // Action buttons
    const importBtn = document.getElementById('rateImportBtn');
    const exportBtn = document.getElementById('rateExportBtn');
    
    if (importBtn) {
      importBtn.addEventListener('click', () => this.importRatedConfig());
    }
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportRatingReport());
    }
  },

  // Handle rate file upload
  async handleRateFile(file) {
    console.log(`📊 Rating file: ${file.name}`);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload-analysis', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const data = await response.json();
      if (data.success) {
        this.ratedConfig = data.analysis;
        this.displayConfigRating(data.analysis);
      } else {
        alert('Analysis failed: ' + data.error);
      }
    } catch (error) {
      console.error('Rate error:', error);
      alert('Error rating config: ' + error.message);
    }
  },

  // Display AI config rating
  displayConfigRating(analysis) {
    console.log('⭐ Displaying rating for config:', analysis);
    
    // Calculate comprehensive quality scores
    const scores = this.calculateConfigScores(analysis);
    
    // Display overall rating
    this.displayOverallRating(scores);
    
    // Display category scores
    this.displayCategoryScores(scores);
    
    // Display AI recommendations
    this.displayRatingRecommendations(scores, analysis);
    
    // Display detailed metrics
    this.displayRatingMetrics(analysis);
    
    // Show results container
    document.getElementById('rateResultsContainer').classList.remove('hidden');
  },

  // Calculate comprehensive configuration scores
  calculateConfigScores(analysis) {
    const rtp = analysis.detected_rtp || 93;
    const volatility = analysis.detected_volatility || 4;
    const hitFreq = analysis.detected_hit_frequency || 50;

    // RTP Fairness Score (0-100)
    let rtpScore = 100;
    if (rtp < 85 || rtp > 97) rtpScore = 60; // Outside standard range
    else if (rtp < 90 || rtp > 95) rtpScore = 85;
    else rtpScore = 100; // Within optimal range

    // Volatility Balance Score (0-100)
    let volScore = 100;
    if (volatility < 1.0 || volatility > 12.0) volScore = 50;
    else if (volatility < 1.5 || volatility > 10.0) volScore = 75;
    else volScore = 100;

    // Hit Frequency Score (0-100)
    let hitScore = 100;
    if (hitFreq < 25 || hitFreq > 80) hitScore = 60;
    else if (hitFreq < 30 || hitFreq > 70) hitScore = 85;
    else hitScore = 100;

    // Configuration Completeness Score (0-100)
    let configScore = 0;
    if (analysis.detected_rtp !== null) configScore += 25;
    if (analysis.detected_volatility !== null) configScore += 25;
    if (analysis.detected_hit_frequency !== null) configScore += 25;
    if (analysis.reel_pattern !== null) configScore += 25;

    // Overall score (weighted average)
    const overallScore = Math.round(
      rtpScore * 0.3 + volScore * 0.3 + hitScore * 0.2 + configScore * 0.2
    );

    // Volatility-HitFreq Balance Penalty
    const volHitBalancePenalty = this.assessVolHitBalance(volatility, hitFreq);
    const finalScore = Math.max(0, Math.min(100, overallScore - volHitBalancePenalty));

    return {
      overall: finalScore,
      rtp: rtpScore,
      volatility: volScore,
      hitFreq: hitScore,
      configuration: configScore,
      rtp_value: rtp,
      volatility_value: volatility,
      hit_freq_value: hitFreq,
      balance_penalty: volHitBalancePenalty
    };
  },

  // Assess volatility and hit frequency balance
  assessVolHitBalance(volatility, hitFreq) {
    // High volatility should have lower hit frequency
    const expectedLowHit = volatility > 5.0;
    const expectedHighHit = volatility < 2.0;

    if (expectedLowHit && hitFreq > 65) return 15; // High vol + high hit = bad
    if (expectedHighHit && hitFreq < 35) return 15; // Low vol + low hit = bad
    if (expectedLowHit && hitFreq > 55) return 5;
    if (expectedHighHit && hitFreq < 45) return 5;
    return 0;
  },

  // Display overall rating
  displayOverallRating(scores) {
    const score = scores.overall;
    const rtp = scores.rtp_value;
    const vol = scores.volatility_value;
    const hit = scores.hit_freq_value;

    document.getElementById('rateOverallScore').textContent = Math.round(score);

    // Determine title and summary based on score
    let title, summary;
    if (score >= 85) {
      title = '✅ Excellent Configuration';
      summary = `This configuration is well-balanced and production-ready. RTP ${rtp.toFixed(1)}%, Volatility ${vol.toFixed(1)}σ, Hit Frequency ${hit.toFixed(1)}%. All metrics are within optimal ranges.`;
    } else if (score >= 70) {
      title = '⚠️ Good Configuration';
      summary = `This configuration is acceptable with minor improvement opportunities. Consider adjusting some parameters for better balance and player experience.`;
    } else if (score >= 50) {
      title = '⚠️ Fair Configuration';
      summary = `This configuration has several balance issues. Review the recommendations below to improve fairness and engagement metrics.`;
    } else {
      title = '❌ Poor Configuration';
      summary = `This configuration needs significant improvements. High risk of player dissatisfaction or regulatory issues. Implement recommendations immediately.`;
    }

    document.getElementById('rateOverallTitle').textContent = title;
    document.getElementById('rateOverallSummary').textContent = summary;

    // Animate gauge
    const gauge = document.getElementById('rateGaugeFill');
    if (gauge) {
      const circumference = 2 * Math.PI * 50;
      const offset = circumference - (score / 100) * circumference;
      setTimeout(() => {
        gauge.style.strokeDashoffset = offset;
      }, 100);
    }
  },

  // Display category scores
  displayCategoryScores(scores) {
    const categories = [
      { id: 'RTP', score: scores.rtp, label: 'RTP Fairness' },
      { id: 'Vol', score: scores.volatility, label: 'Volatility Balance' },
      { id: 'Hit', score: scores.hitFreq, label: 'Hit Frequency' },
      { id: 'Config', score: scores.configuration, label: 'Configuration' }
    ];

    categories.forEach(cat => {
      const bar = document.getElementById(`rate${cat.id}Bar`);
      const scoreEl = document.getElementById(`rate${cat.id}Score`);
      const feedback = document.getElementById(`rate${cat.id}Feedback`);

      if (bar) {
        setTimeout(() => {
          bar.style.width = cat.score + '%';
        }, 100);
      }
      if (scoreEl) scoreEl.textContent = Math.round(cat.score);
      if (feedback) {
        if (cat.score >= 85) feedback.textContent = 'Excellent';
        else if (cat.score >= 70) feedback.textContent = 'Good';
        else if (cat.score >= 50) feedback.textContent = 'Fair';
        else feedback.textContent = 'Poor';
      }
    });
  },

  // Display AI recommendations
  displayRatingRecommendations(scores, analysis) {
    const recommendations = [];
    const rtp = scores.rtp_value;
    const vol = scores.volatility_value;
    const hit = scores.hit_freq_value;

    // RTP recommendations
    if (rtp < 85) {
      recommendations.push(`🔴 RTP is too low (${rtp.toFixed(1)}%). Increase payout multipliers or reduce hit frequency to balance.`);
    } else if (rtp > 97) {
      recommendations.push(`🟡 RTP is too high (${rtp.toFixed(1)}%). Reduce payout multipliers to meet regulatory limits.`);
    }

    // Volatility recommendations
    if (vol < 1.5 && hit > 60) {
      recommendations.push(`🟡 Low volatility with high hit frequency may reduce engagement. Consider increasing premium symbol payouts.`);
    } else if (vol > 10 && hit < 30) {
      recommendations.push(`🟡 Very high volatility with low hit frequency risks excessive variance. Consider adding mid-tier wins.`);
    }

    // Hit frequency recommendations
    if (hit < 30) {
      recommendations.push(`💡 Hit frequency is very low. Players may experience long losing streaks. Consider increasing pair win frequency.`);
    } else if (hit > 70) {
      recommendations.push(`💡 Hit frequency is very high. Consider increasing win values to maintain engagement without excessive payouts.`);
    }

    // Balance recommendations
    if (scores.balance_penalty > 10) {
      recommendations.push(`⚡ Volatility and hit frequency are imbalanced. High volatility typically requires lower hit frequency for proper balance.`);
    }

    // Configuration recommendations
    if (!analysis.reel_pattern) {
      recommendations.push(`📋 Configuration lacks reel weight information. Complete the reel configuration for optimal analysis.`);
    }

    // Positive recommendations
    if (scores.overall >= 85) {
      recommendations.push(`✅ Configuration meets all best practices. Ready for production deployment.`);
    }

    const list = document.getElementById('rateRecommendations');
    list.innerHTML = recommendations
      .map(rec => `<li>${rec}</li>`)
      .join('');
  },

  // Display detailed metrics
  displayRatingMetrics(analysis) {
    const metrics = [];

    if (analysis.detected_rtp !== null) {
      metrics.push({
        label: 'RTP',
        value: analysis.detected_rtp.toFixed(2) + '%'
      });
    }

    if (analysis.detected_volatility !== null) {
      const volLabel = analysis.volatility_profile || analysis.detected_volatility.toFixed(2) + 'σ';
      metrics.push({
        label: 'Volatility',
        value: volLabel
      });
    }

    if (analysis.detected_hit_frequency !== null) {
      metrics.push({
        label: 'Hit Frequency',
        value: analysis.detected_hit_frequency.toFixed(2) + '%'
      });
    }

    if (analysis.balancing_strategy !== 'Not detected') {
      metrics.push({
        label: 'Strategy',
        value: analysis.balancing_strategy
      });
    }

    metrics.push({
      label: 'Confidence',
      value: Math.round(analysis.confidence) + '%'
    });

    const container = document.getElementById('rateDetailedMetrics');
    container.innerHTML = metrics
      .map(m => `
        <div class="rate-metric-row">
          <span class="rate-metric-label">${m.label}</span>
          <span class="rate-metric-value">${m.value}</span>
        </div>
      `)
      .join('');
  },

  // Import rated configuration
  importRatedConfig() {
    if (!this.ratedConfig) {
      alert('No rating available. Please upload a file first.');
      return;
    }

    const analysis = this.ratedConfig;
    
    // Set slider values from rated config
    if (analysis.detected_rtp !== null) {
      this.targetRTP = analysis.detected_rtp;
      document.getElementById('target-rtp').value = analysis.detected_rtp;
      document.getElementById('rtp-value').textContent = analysis.detected_rtp.toFixed(2);
    }
    
    if (analysis.detected_volatility !== null) {
      this.targetVolatility = analysis.detected_volatility;
      document.getElementById('target-volatility').value = analysis.detected_volatility;
      document.getElementById('vol-value').textContent = analysis.detected_volatility.toFixed(2);
    }
    
    if (analysis.detected_hit_frequency !== null) {
      this.targetHitFreq = analysis.detected_hit_frequency;
      document.getElementById('target-hit-freq').value = analysis.detected_hit_frequency;
      document.getElementById('hit-value').textContent = analysis.detected_hit_frequency.toFixed(2);
    }
    
    console.log('✅ Rated configuration loaded:', {
      rtp: this.targetRTP,
      volatility: this.targetVolatility,
      hitFreq: this.targetHitFreq
    });
    
    // Switch to build mode
    this.switchMode('build');
  },

  // Export rating report
  exportRatingReport() {
    if (!this.ratedConfig) {
      alert('No rating available. Please upload a file first.');
      return;
    }

    const scores = this.calculateConfigScores(this.ratedConfig);
    
    const reportData = {
      generated_at: new Date().toISOString(),
      overall_score: scores.overall,
      category_scores: {
        rtp_fairness: scores.rtp,
        volatility_balance: scores.volatility,
        hit_frequency: scores.hitFreq,
        configuration: scores.configuration
      },
      metrics: {
        rtp: scores.rtp_value,
        volatility: scores.volatility_value,
        hit_frequency: scores.hit_freq_value
      },
      configuration: this.ratedConfig
    };

    const json = JSON.stringify(reportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `config-rating-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('Report exported:', reportData);
  },
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  MODEL_GENERATOR.init();
  MODEL_GENERATOR.initializeImportMode();
  MODEL_GENERATOR.initializeRateMode();

  // Make switchMode globally available for onclick
  window.switchMode = (mode) => MODEL_GENERATOR.switchMode(mode);

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
