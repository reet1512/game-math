/**
 * RTP Stabilization Analytics
 * Monte Carlo simulation visualizer for convergence to theoretical RTP
 */

const RTP_STABILIZATION = {
  // Configuration
  config: {
    maxSpins: 1000000,
    animationDuration: 3000, // ms
    gridLines: 10,
    sampleInterval: 50, // Draw every N spins
  },

  // State
  state: {
    isAnimating: false,
    simulationData: [],
    currentSpin: 0,
    targetRTP: 93.83, // From theoretical data
    actualRTP: 100,
    convergenceRate: 0,
  },

  // Canvas and context
  canvas: null,
  ctx: null,

  /**
   * Initialize the RTP visualization
   */
  init() {
    this.canvas = document.getElementById('rtpCanvas');
    if (!this.canvas) {
      console.warn('RTP Canvas not found');
      return;
    }

    this.ctx = this.canvas.getContext('2d');
    this.attachEventListeners();
    this.drawInitialChart();
    this.updateMetrics();
  },

  /**
   * Attach event listeners to control buttons
   */
  attachEventListeners() {
    const playBtn = document.querySelector('.rtp-play-btn');
    const resetBtn = document.querySelector('.rtp-reset-btn');
    const pauseBtn = document.querySelector('.rtp-pause-btn');

    if (playBtn) playBtn.addEventListener('click', () => this.startSimulation());
    if (resetBtn) resetBtn.addEventListener('click', () => this.resetSimulation());
    if (pauseBtn) pauseBtn.addEventListener('click', () => this.togglePause());
  },

  /**
   * Monte Carlo simulation - generate RTP convergence data
   * Simulates spinning the reel many times and calculates running RTP
   */
  generateSimulationData() {
    this.simulationData = [];
    this.state.currentSpin = 0;

    // Get theoretical breakdown from window
    const theoretical = window.currentGameData?.theoretical;
    if (!theoretical) {
      console.warn('No theoretical data available');
      return;
    }

    // Build symbol outcomes from breakdown
    const outcomes = [];
    theoretical.breakdown.forEach(item => {
      for (let i = 0; i < item.payout; i++) {
        outcomes.push({
          symbol: item.symbol,
          payout: item.payout,
          weight: item.reel_count || 1,
        });
      }
    });

    let totalWinnings = 0;
    let runningRTP = 100; // Start high (no losses yet)

    // Simulate spins with varying volatility
    for (let spin = 1; spin <= this.config.maxSpins; spin++) {
      // Random outcome weighted by symbol frequency
      const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
      const bet = 5; // Standard bet
      const payout = Math.random() < 0.06173 ? outcome.payout * bet : 0; // Hit frequency ~6.17%

      totalWinnings += payout;
      runningRTP = (totalWinnings / (spin * bet)) * 100;

      // Store data points at intervals
      if (spin % this.config.sampleInterval === 0 || spin === 1) {
        this.simulationData.push({
          spin,
          rtp: Math.max(runningRTP, 0),
          deviation: Math.abs(runningRTP - this.state.targetRTP),
        });
      }
    }

    this.state.actualRTP = runningRTP;
    this.calculateConvergenceRate();
  },

  /**
   * Calculate convergence rate (how close to target we are)
   */
  calculateConvergenceRate() {
    if (this.simulationData.length < 2) return;

    const recentData = this.simulationData.slice(-Math.ceil(this.simulationData.length * 0.2)); // Last 20% of data
    const recentDeviation = recentData.reduce((sum, d) => sum + d.deviation, 0) / recentData.length;
    
    // Convergence: 0-100%, where 100% = very close to target
    this.state.convergenceRate = Math.max(0, 100 - recentDeviation * 10);
  },

  /**
   * Start the animation
   */
  startSimulation() {
    if (this.state.isAnimating) return;

    // Generate fresh simulation data
    this.generateSimulationData();

    this.state.isAnimating = true;
    document.getElementById('rtp-stabilization').classList.add('rtp-animating');
    this.updateControlButtons();

    this.animateChart();
  },

  /**
   * Reset simulation
   */
  resetSimulation() {
    this.state.isAnimating = false;
    this.state.currentSpin = 0;
    this.simulationData = [];
    document.getElementById('rtp-stabilization').classList.remove('rtp-animating');
    this.updateControlButtons();
    this.drawInitialChart();
    this.updateMetrics();
  },

  /**
   * Toggle pause/resume
   */
  togglePause() {
    this.state.isAnimating = !this.state.isAnimating;
    this.updateControlButtons();
    if (this.state.isAnimating) {
      this.animateChart();
    }
  },

  /**
   * Animate chart drawing
   */
  animateChart() {
    const startTime = performance.now();
    const frameCount = Math.min(this.simulationData.length, 200); // Draw up to 200 frames

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / this.config.animationDuration, 1);

      // Draw up to current frame
      const frameIndex = Math.floor(progress * frameCount);
      this.drawChart(frameIndex);

      // Update metrics in real-time
      if (frameIndex < this.simulationData.length) {
        const currentData = this.simulationData[frameIndex];
        this.state.currentSpin = currentData.spin;
        this.updateMetrics();
      }

      if (progress < 1 && this.state.isAnimating) {
        requestAnimationFrame(animate);
      } else {
        document.getElementById('rtp-stabilization').classList.remove('rtp-animating');
        this.state.isAnimating = false;
        this.updateControlButtons();
      }
    };

    requestAnimationFrame(animate);
  },

  /**
   * Draw the initial empty chart
   */
  drawInitialChart() {
    this.canvas.width = this.canvas.offsetWidth * window.devicePixelRatio;
    this.canvas.height = this.canvas.offsetHeight * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const w = this.canvas.width / window.devicePixelRatio;
    const h = this.canvas.height / window.devicePixelRatio;

    // Clear
    this.ctx.fillStyle = 'rgba(9, 10, 20, 0.5)';
    this.ctx.fillRect(0, 0, w, h);

    // Draw grid and axes
    this.drawGrid(w, h);
    this.drawAxes(w, h);
  },

  /**
   * Draw the complete chart with data
   */
  drawChart(frameIndex) {
    const w = this.canvas.width / window.devicePixelRatio;
    const h = this.canvas.height / window.devicePixelRatio;
    const padding = { top: 40, right: 40, bottom: 60, left: 60 };

    // Clear
    this.ctx.fillStyle = 'rgba(9, 10, 20, 0.5)';
    this.ctx.fillRect(0, 0, w, h);

    // Draw components
    this.drawGrid(w, h);
    this.drawAxes(w, h);
    this.drawData(frameIndex, padding, w, h);
    this.drawLegend(padding, w, h);
  },

  /**
   * Draw grid lines
   */
  drawGrid(w, h) {
    const padding = { top: 40, right: 40, bottom: 60, left: 60 };
    const chartWidth = w - padding.left - padding.right;
    const chartHeight = h - padding.top - padding.bottom;

    this.ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
    this.ctx.lineWidth = 1;

    // Vertical grid lines
    for (let i = 0; i <= this.config.gridLines; i++) {
      const x = padding.left + (chartWidth / this.config.gridLines) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(x, padding.top);
      this.ctx.lineTo(x, h - padding.bottom);
      this.ctx.stroke();
    }

    // Horizontal grid lines
    for (let i = 0; i <= this.config.gridLines; i++) {
      const y = padding.top + (chartHeight / this.config.gridLines) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(padding.left, y);
      this.ctx.lineTo(w - padding.right, y);
      this.ctx.stroke();
    }
  },

  /**
   * Draw axes with labels
   */
  drawAxes(w, h) {
    const padding = { top: 40, right: 40, bottom: 60, left: 60 };

    // Axes
    this.ctx.strokeStyle = 'rgba(148, 163, 184, 0.26)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(padding.left, h - padding.bottom);
    this.ctx.lineTo(w - padding.right, h - padding.bottom);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(padding.left, padding.top);
    this.ctx.lineTo(padding.left, h - padding.bottom);
    this.ctx.stroke();

    // Y-axis label (RTP %)
    this.ctx.save();
    this.ctx.translate(15, h / 2);
    this.ctx.rotate(-Math.PI / 2);
    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.font = '12px DM Mono';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('RTP %', 0, 0);
    this.ctx.restore();

    // X-axis label (Spins)
    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.font = '12px DM Mono';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Spins', w / 2, h - 10);

    // Y-axis values
    this.ctx.font = '11px DM Mono';
    this.ctx.textAlign = 'right';
    for (let i = 0; i <= this.config.gridLines; i++) {
      const yVal = 80 + (20 / this.config.gridLines) * i; // RTP range 80-100%
      const y = h - padding.bottom - (i / this.config.gridLines) * (h - padding.top - padding.bottom);
      this.ctx.fillStyle = '#8b949e';
      this.ctx.fillText(yVal.toFixed(0) + '%', padding.left - 10, y + 4);
    }

    // X-axis values
    this.ctx.textAlign = 'center';
    for (let i = 0; i <= this.config.gridLines; i++) {
      const xVal = (i / this.config.gridLines) * this.config.maxSpins;
      const x = padding.left + (i / this.config.gridLines) * (w - padding.left - padding.right);
      this.ctx.fillStyle = '#8b949e';
      this.ctx.fillText((xVal / 1000).toFixed(1) + 'k', x, h - padding.bottom + 20);
    }
  },

  /**
   * Draw data lines with glow effect
   */
  drawData(frameIndex, padding, w, h) {
    if (this.simulationData.length === 0) return;

    const chartWidth = w - padding.left - padding.right;
    const chartHeight = h - padding.top - padding.bottom;

    // Draw actual RTP line with glow
    this.drawGlowingLine(
      this.simulationData.slice(0, frameIndex),
      padding,
      chartWidth,
      chartHeight,
      'rgba(167, 139, 250, 0.6)',
      'rgba(167, 139, 250, 0.3)',
      2
    );

    // Draw target RTP line
    this.drawTargetLine(padding, chartWidth, chartHeight);
  },

  /**
   * Draw a glowing line through the data points
   */
  drawGlowingLine(data, padding, chartWidth, chartHeight, strokeColor, glowColor, lineWidth) {
    if (data.length < 2) return;

    // Glow layers
    for (let blur = 20; blur >= 5; blur -= 5) {
      this.ctx.strokeStyle = glowColor;
      this.ctx.lineWidth = lineWidth + blur;
      this.ctx.globalAlpha = 0.2;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      this.ctx.beginPath();
      for (let i = 0; i < data.length; i++) {
        const point = data[i];
        const x = padding.left + (point.spin / this.config.maxSpins) * chartWidth;
        const y = padding.top + chartHeight - ((point.rtp - 80) / 20) * chartHeight;

        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
      this.ctx.stroke();
    }

    // Main line
    this.ctx.globalAlpha = 1;
    this.ctx.strokeStyle = strokeColor;
    this.ctx.lineWidth = lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const point = data[i];
      const x = padding.left + (point.spin / this.config.maxSpins) * chartWidth;
      const y = padding.top + chartHeight - ((point.rtp - 80) / 20) * chartHeight;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.stroke();

    // Draw endpoint dot with glow
    if (data.length > 0) {
      const lastPoint = data[data.length - 1];
      const x = padding.left + (lastPoint.spin / this.config.maxSpins) * chartWidth;
      const y = padding.top + chartHeight - ((lastPoint.rtp - 80) / 20) * chartHeight;

      // Glow
      this.ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 12, 0, Math.PI * 2);
      this.ctx.fill();

      // Dot
      this.ctx.fillStyle = 'rgba(56, 189, 248, 0.92)';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 5, 0, Math.PI * 2);
      this.ctx.fill();
    }
  },

  /**
   * Draw target RTP reference line
   */
  drawTargetLine(padding, chartWidth, chartHeight) {
    const targetRTP = this.state.targetRTP;
    const y = padding.top + chartHeight - ((targetRTP - 80) / 20) * chartHeight;

    // Dashed line
    this.ctx.strokeStyle = 'rgba(245, 158, 11, 0.38)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.lineCap = 'round';

    this.ctx.beginPath();
    this.ctx.moveTo(padding.left, y);
    this.ctx.lineTo(padding.left + chartWidth, y);
    this.ctx.stroke();

    this.ctx.setLineDash([]);

    // Label
    this.ctx.fillStyle = 'rgba(245, 158, 11, 0.82)';
    this.ctx.font = 'bold 11px DM Mono';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`Target ${targetRTP.toFixed(2)}%`, padding.left + chartWidth - 10, y - 8);
  },

  /**
   * Draw legend
   */
  drawLegend(padding, w, h) {
    const legendX = padding.left + 20;
    const legendY = padding.top + 20;

    // Actual line
    this.ctx.strokeStyle = 'rgba(167, 139, 250, 0.8)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(legendX, legendY);
    this.ctx.lineTo(legendX + 20, legendY);
    this.ctx.stroke();

    this.ctx.fillStyle = '#a78bfa';
    this.ctx.font = '11px DM Mono';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('Observed RTP', legendX + 30, legendY + 3);

    // Target line
    this.ctx.strokeStyle = 'rgba(0, 255, 136, 0.6)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(legendX + 150, legendY);
    this.ctx.lineTo(legendX + 170, legendY);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    this.ctx.fillStyle = 'rgba(0, 255, 136, 0.7)';
    this.ctx.fillText('Theoretical RTP', legendX + 180, legendY + 3);
  },

  /**
   * Update metrics display
   */
  updateMetrics() {
    // Current RTP
    const currentRtpEl = document.querySelector('.rtp-metric.current .rtp-metric-value');
    if (currentRtpEl) {
      const displayRtp = this.state.currentSpin > 0 ? this.state.actualRTP : this.state.targetRTP;
      currentRtpEl.innerHTML = displayRtp.toFixed(2) + '<span class="rtp-metric-unit">%</span>';
    }

    // Target RTP
    const targetRtpEl = document.querySelector('.rtp-metric.target .rtp-metric-value');
    if (targetRtpEl) {
      targetRtpEl.innerHTML = this.state.targetRTP.toFixed(2) + '<span class="rtp-metric-unit">%</span>';
    }

    // Total spins
    const spinsEl = document.querySelector('.rtp-metric.spins .rtp-metric-value');
    if (spinsEl) {
      spinsEl.innerHTML = (this.state.currentSpin || 0).toLocaleString() + '<span class="rtp-metric-unit">spins</span>';
    }

    // Convergence rate
    const convergenceEl = document.querySelector('.rtp-metric.convergence .rtp-metric-value');
    if (convergenceEl) {
      convergenceEl.innerHTML = this.state.convergenceRate.toFixed(1) + '<span class="rtp-metric-unit">%</span>';
    }

    // Progress bar
    const progressFill = document.querySelector('.rtp-progress-fill');
    if (progressFill) {
      const progressPercent = (this.state.currentSpin / this.config.maxSpins) * 100;
      progressFill.style.width = Math.min(progressPercent, 100) + '%';
    }

    // Progress text
    const progressText = document.querySelector('.rtp-progress-text');
    if (progressText) {
      const spinsFormatted = (this.state.currentSpin || 0).toLocaleString();
      progressText.textContent = `${spinsFormatted} / ${this.config.maxSpins.toLocaleString()} spins`;
    }
  },

  /**
   * Update button states
   */
  updateControlButtons() {
    const playBtn = document.querySelector('.rtp-play-btn');
    const pauseBtn = document.querySelector('.rtp-pause-btn');

    if (playBtn) {
      playBtn.classList.toggle('active', !this.state.isAnimating);
    }

    if (pauseBtn) {
      pauseBtn.classList.toggle('active', this.state.isAnimating);
    }
  },
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Wait for theoretical data to be available
  const initWithDelay = () => {
    if (window.currentGameData?.theoretical) {
      RTP_STABILIZATION.state.targetRTP = window.currentGameData.theoretical.rtp_pct;
      RTP_STABILIZATION.init();
    } else {
      setTimeout(initWithDelay, 100);
    }
  };
  initWithDelay();
});

// Export for global access
window.RTP_STABILIZATION = RTP_STABILIZATION;
