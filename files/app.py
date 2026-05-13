"""
Lucky Sevens — Slot game backend.

Handles:
  - Spin RNG with weighted reel composition
  - Payout resolution
  - Session-level stats: RTP, volatility (std dev of returns), hit frequency
  - Theoretical math (closed-form RTP/variance) for the dashboard
"""

import math
import random
from collections import deque
from flask import Flask, jsonify, render_template, request, session

app = Flask(__name__)
app.secret_key = "change-me-in-prod"

# ---------------------------------------------------------------------------
# Game configuration
# ---------------------------------------------------------------------------

REEL = ["cherry", "cherry", "cherry", "lemon", "lemon", "star", "star", "seven", "diamond"]

SYMBOLS = {
    "cherry":  {"glyph": "🍒",  "label": "Cherry"},
    "lemon":   {"glyph": "🍋",  "label": "Lemon"},
    "star":    {"glyph": "⭐",  "label": "Star"},
    "seven":   {"glyph": "7️⃣", "label": "Seven"},
    "diamond": {"glyph": "💎",  "label": "Diamond"},
}

# Triple-match payouts (multiplier on bet)
TRIPLE_PAYOUTS = {
    "diamond": 50,
    "seven":   20,
    "star":    10,
    "lemon":   6,
    "cherry":  4,
}

# Two-of-a-kind returns the bet
PAIR_PAYOUT = 1

STARTING_CREDITS = 100
REFILL_CREDITS = 100


# ---------------------------------------------------------------------------
# Math helpers (theoretical RTP & variance)
# ---------------------------------------------------------------------------

def theoretical_stats():
    """Closed-form RTP, variance, std dev and hit frequency for the configured reels."""
    n = len(REEL)
    counts = {s: REEL.count(s) for s in SYMBOLS}
    total_outcomes = n ** 3

    # P(triple) and P(any pair but not triple)
    triple_probs = {s: (counts[s] / n) ** 3 for s in SYMBOLS}

    # P(exactly two reels match) = 3 * (k/n)^2 * ((n-k)/n)  for each symbol s with count k
    pair_only_probs = {
        s: 3 * (counts[s] / n) ** 2 * ((n - counts[s]) / n) for s in SYMBOLS
    }

    p_triple_total = sum(triple_probs.values())
    p_pair_total = sum(pair_only_probs.values())
    p_loss = 1.0 - p_triple_total - p_pair_total

    # E[return per unit bet]
    rtp = sum(triple_probs[s] * TRIPLE_PAYOUTS[s] for s in SYMBOLS) + p_pair_total * PAIR_PAYOUT

    # E[return^2] for variance
    e_x2 = (
        sum(triple_probs[s] * (TRIPLE_PAYOUTS[s] ** 2) for s in SYMBOLS)
        + p_pair_total * (PAIR_PAYOUT ** 2)
        + p_loss * 0
    )
    variance = e_x2 - rtp ** 2
    std_dev = math.sqrt(variance)

    # Per-symbol breakdown for the dashboard
    breakdown = []
    for s, info in SYMBOLS.items():
        breakdown.append({
            "symbol": s,
            "glyph": info["glyph"],
            "label": info["label"],
            "reel_count": counts[s],
            "p_triple": triple_probs[s],
            "p_triple_pct": triple_probs[s] * 100,
            "payout": TRIPLE_PAYOUTS[s],
            "contribution": triple_probs[s] * TRIPLE_PAYOUTS[s],
            "expected_freq": f"1 in {round(1 / triple_probs[s]):,}" if triple_probs[s] > 0 else "—",
        })
    # Sort by payout descending
    breakdown.sort(key=lambda r: -r["payout"])

    return {
        "rtp": rtp,
        "rtp_pct": rtp * 100,
        "house_edge_pct": (1 - rtp) * 100,
        "variance": variance,
        "std_dev": std_dev,
        "hit_frequency_pct": (p_triple_total + p_pair_total) * 100,
        "p_triple_pct": p_triple_total * 100,
        "p_pair_only_pct": p_pair_total * 100,
        "p_loss_pct": p_loss * 100,
        "total_outcomes": total_outcomes,
        "volatility_class": classify_volatility(std_dev),
        "breakdown": breakdown,
    }


def classify_volatility(std_dev):
    """Industry-style bucketing of std dev per unit bet."""
    if std_dev < 1.5:
        return "Very low"
    if std_dev < 3:
        return "Low"
    if std_dev < 6:
        return "Medium"
    if std_dev < 12:
        return "High"
    return "Very high"


# ---------------------------------------------------------------------------
# Model generation engine (optimization for target RTP/volatility/hit freq)
# ---------------------------------------------------------------------------

def generate_reel_candidate():
    """Create a random reel composition with 9 slots."""
    candidates = []
    remaining = 9
    
    # Randomly allocate slots to each symbol, ensuring at least 1 of each
    for symbol in list(SYMBOLS.keys())[:-1]:  # All but last
        count = random.randint(1, remaining - (len(SYMBOLS) - len(candidates) - 1))
        candidates.append((symbol, count))
        remaining -= count
    
    candidates.append((list(SYMBOLS.keys())[-1], remaining))
    
    # Shuffle and expand to full reel
    reel = []
    for symbol, count in candidates:
        reel.extend([symbol] * count)
    
    random.shuffle(reel)
    return reel


def evaluate_reel_config(test_reel):
    """Calculate theoretical stats for a given reel configuration."""
    n = len(test_reel)
    counts = {s: test_reel.count(s) for s in SYMBOLS}
    
    triple_probs = {s: (counts[s] / n) ** 3 for s in SYMBOLS}
    pair_only_probs = {
        s: 3 * (counts[s] / n) ** 2 * ((n - counts[s]) / n) for s in SYMBOLS
    }
    
    p_triple_total = sum(triple_probs.values())
    p_pair_total = sum(pair_only_probs.values())
    p_loss = 1.0 - p_triple_total - p_pair_total
    
    rtp = sum(triple_probs[s] * TRIPLE_PAYOUTS[s] for s in SYMBOLS) + p_pair_total * PAIR_PAYOUT
    e_x2 = (
        sum(triple_probs[s] * (TRIPLE_PAYOUTS[s] ** 2) for s in SYMBOLS)
        + p_pair_total * (PAIR_PAYOUT ** 2)
        + p_loss * 0
    )
    variance = e_x2 - rtp ** 2
    std_dev = math.sqrt(variance)
    hit_freq = (p_triple_total + p_pair_total) * 100
    
    return {
        "rtp": rtp,
        "rtp_pct": rtp * 100,
        "std_dev": std_dev,
        "volatility_class": classify_volatility(std_dev),
        "hit_freq": hit_freq,
        "counts": counts,
    }


def fitness_score(config, target_rtp, target_volatility, target_hit_freq):
    """
    Compute fitness as distance from targets (lower is better).
    Weighted combination of RTP, volatility, and hit frequency deviations.
    """
    rtp_error = abs(config["rtp_pct"] - target_rtp)
    vol_error = abs(config["std_dev"] - target_volatility)
    hit_error = abs(config["hit_freq"] - target_hit_freq)
    
    # Normalize and weight (RTP importance > volatility > hit freq)
    score = (rtp_error * 2.0) + (vol_error * 1.5) + (hit_error * 1.0)
    return score


def optimize_reel_config(target_rtp, target_volatility, target_hit_freq, iterations=200):
    """
    Generate and test reel configs to find the best match for targets.
    Returns best config, reel composition, and iteration history.
    """
    print(f"\n🎲 OPTIMIZING FOR: RTP={target_rtp}%, Vol={target_volatility}σ, HitFreq={target_hit_freq}%")
    
    best_config = None
    best_reel = None
    best_score = float('inf')
    history = []
    
    for i in range(iterations):
        test_reel = generate_reel_candidate()
        config = evaluate_reel_config(test_reel)
        score = fitness_score(config, target_rtp, target_volatility, target_hit_freq)
        
        if i == 0 or i % 50 == 0:
            print(f"   Iteration {i+1}: RTP={config['rtp_pct']:.2f}%, Vol={config['std_dev']:.4f}, Score={score:.4f}")
        
        history.append({
            "iteration": i + 1,
            "score": score,
            "rtp": config["rtp_pct"],
            "volatility": config["std_dev"],
        })
        
        if score < best_score:
            best_score = score
            best_config = config
            best_reel = test_reel
    
    print(f"✅ BEST FOUND: RTP={best_config['rtp_pct']:.2f}%, Vol={best_config['std_dev']:.4f}, Score={best_score:.4f}")
    return best_reel, best_config, history


def compute_max_exposure(reel_config):
    """Compute the maximum single-spin payout for this reel (triple + best symbol)."""
    counts = {s: reel_config.count(s) for s in SYMBOLS}
    max_payout_per_symbol = 0
    for symbol in SYMBOLS:
        if counts[symbol] > 0:
            p = (counts[symbol] / len(reel_config)) ** 3
            max_payout_per_symbol = max(max_payout_per_symbol, TRIPLE_PAYOUTS[symbol])
    return max_payout_per_symbol


# ---------------------------------------------------------------------------
# Session state
# ---------------------------------------------------------------------------

def init_session():
    session.setdefault("credits", STARTING_CREDITS)
    session.setdefault("total_bet", 0)
    session.setdefault("total_won", 0)
    session.setdefault("spins", 0)
    session.setdefault("wins", 0)
    session.setdefault("biggest_win", 0)
    session.setdefault("history", [])  # last N spin returns (multiplier)
    session.setdefault("return_history", [])  # actual coin return for trend chart


def record_spin(bet, payout, multiplier):
    session["spins"] += 1
    session["total_bet"] += bet
    session["total_won"] += payout
    if payout > 0:
        session["wins"] += 1
    if payout > session["biggest_win"]:
        session["biggest_win"] = payout

    # Keep last 50 entries for trend chart
    hist = session["return_history"]
    hist.append({"spin": session["spins"], "multiplier": multiplier, "bet": bet, "payout": payout})
    if len(hist) > 50:
        hist.pop(0)
    session["return_history"] = hist


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    init_session()
    return render_template("index.html", symbols=SYMBOLS, payouts=TRIPLE_PAYOUTS)


@app.route("/dashboard")
def dashboard():
    init_session()
    return render_template("dashboard.html")


@app.route("/model-generator")
def model_generator():
    return render_template("model-generator.html")


@app.route("/api/spin", methods=["POST"])
def spin():
    init_session()
    data = request.get_json() or {}
    bet = int(data.get("bet", 5))
    bet = max(1, min(bet, 50))

    if session["credits"] < bet:
        # Auto-refill so the demo never dead-ends
        session["credits"] = REFILL_CREDITS
        return jsonify({"error": "refilled", "credits": session["credits"]})

    session["credits"] -= bet

    reels = [random.choice(REEL) for _ in range(3)]
    a, b, c = reels

    multiplier = 0
    if a == b == c:
        multiplier = TRIPLE_PAYOUTS[a]
        win_type = f"three_{a}"
    elif a == b or b == c or a == c:
        multiplier = PAIR_PAYOUT
        win_type = "pair"
    else:
        win_type = "loss"

    payout = bet * multiplier
    session["credits"] += payout

    record_spin(bet, payout, multiplier)

    return jsonify({
        "reels": reels,
        "glyphs": [SYMBOLS[s]["glyph"] for s in reels],
        "multiplier": multiplier,
        "payout": payout,
        "bet": bet,
        "win_type": win_type,
        "credits": session["credits"],
        "stats": session_stats(),
    })


@app.route("/api/stats")
def stats():
    init_session()
    return jsonify({
        "session": session_stats(),
        "theoretical": theoretical_stats(),
        "history": session["return_history"],
    })


@app.route("/api/reset", methods=["POST"])
def reset():
    for k in ("credits", "total_bet", "total_won", "spins", "wins", "biggest_win", "history", "return_history"):
        session.pop(k, None)
    init_session()
    return jsonify({"ok": True, "stats": session_stats()})


@app.route("/api/generate-model", methods=["POST"])
def generate_model():
    """
    Optimize reel configuration for target RTP, volatility, and hit frequency.
    
    Request JSON:
    {
        "target_rtp": 93.5,
        "target_volatility": 2.5,
        "target_hit_freq": 58.0,
        "iterations": 200
    }
    
    Returns:
    {
        "success": true,
        "config": {...},
        "history": [...],
        "generation_time_ms": 123
    }
    """
    import time
    start = time.time()
    
    data = request.get_json() or {}
    print(f"\n🔍 RECEIVED API DATA: {data}")
    
    target_rtp = float(data.get("target_rtp", 93.83))
    target_volatility = float(data.get("target_volatility", 2.39))
    target_hit_freq = float(data.get("target_hit_freq", 58.0))
    iterations = int(data.get("iterations", 200))
    
    print(f"📊 PARSED TARGETS:")
    print(f"   RTP: {target_rtp}%")
    print(f"   Volatility: {target_volatility}σ")
    print(f"   Hit Freq: {target_hit_freq}%")
    print(f"   Iterations: {iterations}")
    
    try:
        best_reel, best_config, history = optimize_reel_config(
            target_rtp, target_volatility, target_hit_freq, iterations
        )
        
        max_exposure = compute_max_exposure(best_reel)
        
        elapsed_ms = int((time.time() - start) * 1000)
        
        return jsonify({
            "success": True,
            "config": {
                "rtp_pct": round(best_config["rtp_pct"], 2),
                "std_dev": round(best_config["std_dev"], 4),
                "volatility_class": best_config["volatility_class"],
                "hit_freq": round(best_config["hit_freq"], 2),
                "max_exposure": max_exposure,
                "reel_weights": {s: best_config["counts"][s] for s in SYMBOLS},
            },
            "history": history,
            "generation_time_ms": elapsed_ms,
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


def session_stats():
    spins = session["spins"]
    total_bet = session["total_bet"]
    total_won = session["total_won"]
    wins = session["wins"]

    actual_rtp = (total_won / total_bet * 100) if total_bet > 0 else 0.0
    hit_freq = (wins / spins * 100) if spins > 0 else 0.0

    # Session variance from observed returns
    history = session["return_history"]
    if len(history) > 1:
        multipliers = [h["multiplier"] for h in history]
        mean = sum(multipliers) / len(multipliers)
        var = sum((m - mean) ** 2 for m in multipliers) / len(multipliers)
        observed_std = math.sqrt(var)
    else:
        observed_std = 0.0

    return {
        "credits": session["credits"],
        "spins": spins,
        "total_bet": total_bet,
        "total_won": total_won,
        "net": total_won - total_bet,
        "wins": wins,
        "biggest_win": session["biggest_win"],
        "actual_rtp_pct": actual_rtp,
        "hit_freq_pct": hit_freq,
        "observed_std": observed_std,
    }


if __name__ == "__main__":
    app.run(debug=True, port=5000)
