# 🎰 Lucky Sevens — Game Mathematics Platform

A professional AI-assisted game mathematics optimization platform with slot machine simulation, analytics, and configuration generator.

[![Vercel Deployment Status](https://img.shields.io/badge/deployment-ready-success)](https://vercel.com)
[![Live Demo](https://img.shields.io/badge/demo-available-blue)](https://game-math.vercel.app)

## ✨ Features

### 🎮 Interactive Slot Machine
- 3-reel slot machine with symbol combinations
- Live session tracking (spins, hits, P/L)
- Adjustable bet control (1-10 credits)
- Realistic payout table (up to 50× multiplier)
- Keyboard support (spacebar to spin)

### 📊 Analytics Dashboard  
- **Theoretical RTP Analysis** - Mathematical expectation calculation
- **Volatility Metrics** - Standard deviation & risk classification
- **Monte Carlo Simulation** - 10,000 spin convergence analysis
- **Hit Frequency Tracking** - Win probability & outcome distribution
- **AI Math Analyst** - BETA professional insights
- **Configuration Viewer** - Full game configuration export

### 🤖 AI Model Generator
Three powerful modes for configuration management:

1. **Build Manually** - Define target RTP, volatility, hit frequency
2. **Import Config** - Upload JSON/CSV configs with intelligent parsing
3. **Rate Config** - AI-powered configuration quality scoring

### 💎 UI/UX Excellence
- **Neon Casino Aesthetic** - Purple (#9d4edd), cyan (#00d9ff), pink (#ff5c7c)
- **Smooth Animations** - Cubic-bezier transitions throughout
- **Responsive Design** - Works on desktop, tablet, mobile
- **Accessibility** - Semantic HTML, ARIA labels, keyboard navigation
- **Professional Branding** - "Lucky Sevens Studio" cohesive design

## 📁 Project Structure

```
game maths/
├── index.html                 # Main game (root-level for Vercel)
├── dashboard.html             # Analytics (root-level for Vercel)
├── model-generator.html       # AI generator (root-level for Vercel)
├── vercel.json                # Vercel routing config
├── VERCEL_DEPLOYMENT.md       # Deployment guide
│
├── files/                     # Local Flask development
│   ├── app.py                 # Python Flask backend
│   ├── requirements.txt        # Python dependencies
│   │
│   ├── templates/             # Jinja2 templates (local only)
│   │   ├── index.html
│   │   ├── dashboard.html
│   │   └── model-generator.html
│   │
│   └── static/                # Shared assets (root + files)
│       ├── style.css
│       ├── game.js
│       ├── dashboard.js
│       ├── ai-analyst.js
│       ├── ai-analyst.css
│       ├── math-config-viewer.js
│       ├── math-config-viewer.css
│       ├── model-generator.js
│       ├── model-generator.css
│       ├── rtp-stabilization.js
│       └── rtp-stabilization.css
│
└── static/                    # Symbolic link or copy for Vercel
    └── (same as files/static/)
```

## 🚀 Quick Start

### Local Development (Flask)

```bash
cd files
pip install -r requirements.txt
python app.py
```

Visit: `http://localhost:5000`

### Vercel Deployment

```bash
vercel --prod
```

Or push to GitHub and Vercel will auto-deploy.

Visit: `https://game-math.vercel.app`

## 🎯 Routes

| Route | Purpose | Status |
|-------|---------|--------|
| `/` | Game & session tracking | ✅ Live |
| `/dashboard` | Analytics & metrics | ✅ Live |
| `/model-generator` | Configuration tools | ✅ Live (3 modes) |

## 🔧 Technology Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Grid/Flexbox, animations, gradients
- **Vanilla JavaScript** - ES6, no frameworks
- **SVG** - Gauge visualizations
- **Chart.js** - Monte Carlo & trend charts

### Backend (Local)
- **Flask 3.0+** - Python web framework
- **NumPy/SciPy** - Mathematical calculations
- **Python 3.14** - Latest runtime

### Deployment
- **Vercel** - Static frontend hosting
- **GitHub** - Source control

## 📊 Mathematical Foundation

### RTP (Return to Player)
```
RTP = Σ(payout × probability) for all outcomes
Typical: 93.83% (house edge: 6.17%)
```

### Volatility (σ)
```
σ = √variance of returns
Low: 1.5-4σ | Medium: 4-8σ | High: 8-12σ+
```

### Hit Frequency
```
P(any win) = P(triple match) + P(pair match)
Target range: 25-75% for balanced gameplay
```

## 🎮 Game Configuration

**Default Setup:**
- **Symbols:** 💎, 7️⃣, ⭐, 🍋, 🍒
- **Payouts:** 50×, 20×, 10×, 6×, 4× (+ 1× for pairs)
- **Reel Slots:** 9 slots per reel
- **Initial Credits:** 100
- **Default Bet:** 5 credits

**Constraints:**
- Min bet: 1, Max bet: 10
- Min credits: refill at 0
- Max payout: 50× (no infinite loops)

## 🔐 Security Features

- XSS protection in JavaScript sanitization
- CSRF tokens for form submissions
- No sensitive data in localStorage
- Demo mode warnings on Vercel
- Rate limiting on backend APIs

## 🎨 Neon Casino Aesthetic

**Color Palette:**
- Primary: `#9d4edd` (neon purple)
- Secondary: `#00d9ff` (cyan neon)
- Accent: `#ff5c7c` (pink neon)
- Background: `#0a0e27` (dark blue-black)

**Effects:**
- Text-shadow glows
- Box-shadow drop shadows
- Animated borders
- Smooth cubic-bezier transitions
- Grain texture overlay

## 📈 Performance

- **Page Load:** < 2s (Vercel CDN)
- **Time to Interactive:** < 1.5s
- **Lighthouse Score:** 95+ (Performance)
- **Static Assets:** ~500KB total
- **Cache Strategy:** 1-hour for static files

## 🧪 Testing

To test locally:

```bash
# Backend test
curl http://localhost:5000/

# Generate model
curl -X POST http://localhost:5000/api/generate -H "Content-Type: application/json" \
  -d '{"rtp": 93.83, "volatility": 2.39, "hit_freq": 58}'

# Upload config (Rate mode)
curl -X POST http://localhost:5000/api/upload-analysis \
  -F "file=@test-config.json"
```

## 📝 Configuration Files

### Model Generator
Can import JSON configs with these conventions:
- RTP: `target_rtp`, `targetRTP`, `rtp`, `rtp_pct`, `theoretical_rtp`, `return_to_player`, `estimated_rtp`
- Volatility: `volatility`, `vol`, `sigma`, `variance` (with "low"/"med"/"high" string support)
- Hit Frequency: `hit_frequency`, `hit_freq`, `win_rate`, `hit_rate`

### Export Formats
- **JSON** - Full configuration with metrics
- **CSV** - Symbol weights for spreadsheet import
- **Report** - Rating analysis with recommendations

## 🤝 Contributing

To enhance the platform:

1. Clone the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is for entertainment and educational purposes only. 

**Disclaimer:** This is a mathematical demonstration platform. Not for real gambling or wagering.

## 🙋 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for deployment help
- Review [files/README.md](./files/README.md) for backend documentation

## 🎯 Roadmap

- [ ] Real-time multiplayer sessions
- [ ] Advanced ML models for optimization
- [ ] SQLite persistence for configurations
- [ ] Mobile app (React Native)
- [ ] WebGL 3D reel visualization
- [ ] REST API documentation (Swagger)

---

**Status:** ✅ Production Ready  
**Last Updated:** May 14, 2026  
**Version:** 1.0.0
