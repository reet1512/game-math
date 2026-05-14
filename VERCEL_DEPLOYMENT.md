# Vercel Deployment Guide

## ✅ Frontend Deployment Structure

This project is configured for static frontend deployment on Vercel. The frontend pages are located at the root level:

- `/index.html` - Main game interface (Lucky Sevens slot machine)
- `/dashboard.html` - Analytics dashboard with Monte Carlo visualization  
- `/model-generator.html` - AI model generator with three modes (Build/Import/Rate)
- `/vercel.json` - Routing configuration for Vercel

All static assets (CSS, JS, images) are in the `/static/` directory.

## 🚀 How to Deploy

### Deploy to Vercel via CLI

```bash
# Install Vercel CLI (if needed)
npm i -g vercel

# Deploy from the root directory
vercel --prod
```

### Deploy via Git

Push changes to your GitHub repository:
```bash
git add .
git commit -m "Deploy to Vercel"
git push origin main
```

Then connect your repository to Vercel:
1. Go to https://vercel.com
2. Click "New Project"
3. Select your GitHub repository
4. Vercel will auto-detect the root-level HTML files
5. Click "Deploy"

## 📄 URL Routes

Once deployed, the following routes will be accessible:

- `https://your-domain.vercel.app/` → Main game
- `https://your-domain.vercel.app/dashboard` → Analytics
- `https://your-domain.vercel.app/model-generator` → AI Generator

## 🔧 Configuration

**vercel.json** includes:
- `cleanUrls: true` - Removes `.html` extensions from URLs
- `rewrites` - Maps clean URLs to HTML files
- `headers` - Caches static assets for 1 hour

## 📱 Frontend Features

✅ **Interactive Slot Machine** - Full game logic with betting system  
✅ **Analytics Dashboard** - Monte Carlo simulation, RTP convergence analysis  
✅ **AI Model Generator** - Three modes: Build, Import, Rate configurations  
✅ **Neon Casino Aesthetic** - Modern, polished UI with animations  

## ⚠️ Backend APIs

When deployed on Vercel without a backend:

- File upload (Import/Rate modes) - **Mock responses** shown if backend unavailable
- Generated configurations - **Demo values** displayed for UI demonstration

To enable backend APIs, you can:
1. Deploy Flask backend separately (e.g., Heroku, Railway, AWS)
2. Update API endpoints in JavaScript files
3. Update CORS headers if cross-origin requests needed

## 🎨 Customization

All styling is in `static/`:
- `style.css` - Global styles (neon purple, cyan accents)
- `ai-analyst.css` - Analytics AI section
- `model-generator.css` - Generator interface (3500+ lines)
- `math-config-viewer.css` - Config viewer
- `rtp-stabilization.css` - Monte Carlo visualization

## 💡 Notes

- Frontend is fully functional as a **demo/presentation platform**
- All CSS, JS, and fonts load correctly on Vercel
- No server-side compilation needed
- Lighthouse scores optimized for performance
- Mobile responsive design maintained

---

**Deployment Status**: Ready for production  
**Last Updated**: 2026-05-14
