# Lucky Sevens — Slot Game with RTP & Volatility Dashboard

A 3-reel slot game with a live analytics dashboard. Built with Flask (Python) for the backend math, vanilla HTML/CSS/JS for the front end, and Chart.js for visualizations.

## Stack

| Layer | Tech |
|---|---|
| Backend | Python 3 + Flask |
| Math | Closed-form RTP and variance computed server-side |
| Front end | HTML + CSS + vanilla JS |
| Charts | Chart.js (loaded via CDN) |
| Fonts | Google Fonts (Bungee Inline, DM Mono, Playfair Display) |

## Project layout

```
slot_game/
├── app.py                  # Flask app — game logic, RTP/volatility math, API routes
├── requirements.txt
├── templates/
│   ├── index.html          # The slot machine page
│   └── dashboard.html      # The analytics page
└── static/
    ├── style.css           # Shared retro art-deco styling
    ├── game.js             # Spin animation, live stats
    └── dashboard.js        # Charts + dashboard rendering
```

## Setup

```bash
pip install -r requirements.txt
python app.py
```

Open <http://localhost:5000> to play, or <http://localhost:5000/dashboard> for analytics.

## What the dashboard shows

**Theoretical metrics** (computed from the reel composition in closed form):
- **RTP** (return-to-player) — expected return per coin wagered
- **House edge** — the operator's mathematical advantage (`1 − RTP`)
- **Volatility σ** — standard deviation of the per-spin return distribution
- **Hit frequency** — probability any winning outcome occurs

**Charts**:
- Contribution to RTP by symbol (horizontal bar)
- Outcome split — triple vs pair vs loss (doughnut)
- Live session rolling RTP + individual spin multipliers (line + scatter)

**Symbol breakdown table** — per-symbol reel weight, triple probability, "1 in N" rarity, payout, and contribution to overall RTP.

**Session vs theory** — your observed RTP and standard deviation compared with the closed-form values, with a note on convergence.

## The math

Each reel is an array of 9 weighted symbols. Reels are drawn independently and uniformly:

- 🍒 Cherry × 3 → P = 3/9
- 🍋 Lemon × 2 → P = 2/9
- ⭐ Star × 2 → P = 2/9
- 7️⃣ Seven × 1 → P = 1/9
- 💎 Diamond × 1 → P = 1/9

For each symbol with count *k*:
- `P(triple) = (k/9)³`
- `P(exactly 2 reels match) = 3 · (k/9)² · ((9-k)/9)`

`RTP = Σ P(triple_s) · payout_s + P(any_pair) · 1`

`σ² = E[X²] − E[X]²` where X is the return per unit bet. The volatility class label maps σ to the industry buckets (Very low / Low / Medium / High / Very high).

## Notes

- Credits auto-refill at 0 — this is a demo, not a casino. No real money mechanics.
- Spin RNG uses Python's `random.choice` (Mersenne Twister). For a production game this would be a certified CSPRNG.
- Session state lives in the Flask session cookie. Hit "Reset session" to clear it.
