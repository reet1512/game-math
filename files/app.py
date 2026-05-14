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
    "diamond": 20,
    "seven": 10,
    "star": 5,
    "lemon": 3,
    "cherry": 2,
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

def generate_reel_candidate(high_risk_mode=False):
    """
    Create a random reel composition with extreme flexibility.
    
    In high_risk_mode: Create highly skewed distributions with rare premium symbols
    Normal mode: Create balanced distributions
    """
    reel = []
    
    if high_risk_mode:
        # HIGH RISK: Create extreme skew - rare premiums, common low-value symbols
        # Example: diamond:1, seven:1, star:2, lemon:8, cherry:18 (total 30)
        
        symbol_list = list(SYMBOLS.keys())
        
        # Assign very sparse counts to premium symbols
        counts = {}
        counts['diamond'] = random.randint(0, 2)  # 0-2 diamonds
        counts['seven'] = random.randint(0, 3)    # 0-3 sevens
        counts['star'] = random.randint(1, 3)     # 1-3 stars
        
        remaining = 30 - counts['diamond'] - counts['seven'] - counts['star']
        
        # Distribute remaining slots heavily towards low-value symbols
        counts['lemon'] = random.randint(5, min(remaining - 1, 20))
        counts['cherry'] = remaining - counts['lemon']
        
    else:
        # NORMAL: More balanced allocation but still with flexibility
        candidates = []
        remaining = 30
        
        # Allow zero counts for more flexibility
        for symbol in list(SYMBOLS.keys())[:-1]:
            max_for_this = remaining - (len(SYMBOLS) - len(candidates) - 1)
            count = random.randint(0, max_for_this)
            candidates.append((symbol, count))
            remaining -= count
        
        candidates.append((list(SYMBOLS.keys())[-1], remaining))
        counts = {s: c for s, c in candidates}
    
    # Expand to full reel
    for symbol in SYMBOLS.keys():
        reel.extend([symbol] * counts[symbol])
    
    random.shuffle(reel)
    return reel


def get_dynamic_payouts(target_volatility):
    """
    Calculate dynamic payout multipliers based on target volatility.
    
    Higher volatility requires:
    - Much higher jackpot payouts
    - Lower frequency (achieved through reel config)
    """
    if target_volatility < 2:
        # Low volatility: modest payouts
        return {
            "diamond": 25,
            "seven": 12,
            "star": 6,
            "lemon": 3,
            "cherry": 2,
        }
    elif target_volatility < 4:
        # Medium volatility: moderate payouts
        return {
            "diamond": 40,
            "seven": 18,
            "star": 8,
            "lemon": 3,
            "cherry": 2,
        }
    elif target_volatility < 7:
        # High volatility: strong payouts
        return {
            "diamond": 75,
            "seven": 30,
            "star": 12,
            "lemon": 3,
            "cherry": 2,
        }
    else:
        # Very high volatility: extreme jackpot payouts
        return {
            "diamond": 150,
            "seven": 60,
            "star": 20,
            "lemon": 3,
            "cherry": 2,
        }


def evaluate_reel_config(test_reel, payouts=None):
    """
    Calculate theoretical stats for a given reel configuration with optional dynamic payouts.
    """
    if payouts is None:
        payouts = TRIPLE_PAYOUTS
    
    n = len(test_reel)
    counts = {s: test_reel.count(s) for s in SYMBOLS}
    
    triple_probs = {s: (counts[s] / n) ** 3 for s in SYMBOLS}
    pair_only_probs = {
        s: 3 * (counts[s] / n) ** 2 * ((n - counts[s]) / n) for s in SYMBOLS
    }
    
    p_triple_total = sum(triple_probs.values())
    p_pair_total = sum(pair_only_probs.values())
    p_loss = 1.0 - p_triple_total - p_pair_total
    
    rtp = sum(triple_probs[s] * payouts[s] for s in SYMBOLS) + p_pair_total * PAIR_PAYOUT
    e_x2 = (
        sum(triple_probs[s] * (payouts[s] ** 2) for s in SYMBOLS)
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
    
    IMPROVED WEIGHTING:
    - Volatility convergence: HEAVILY weighted (8.0)
    - RTP accuracy: Moderately weighted (3.0)
    - Hit frequency: Lightly weighted (2.0)
    
    This ensures the optimizer prioritizes matching the volatility target first,
    which is critical for high-volatility generation.
    """
    rtp_error = abs(config["rtp_pct"] - target_rtp)
    vol_error = abs(config["std_dev"] - target_volatility)
    hit_error = abs(config["hit_freq"] - target_hit_freq)
    
    # Strongly prioritize volatility convergence
    score = (rtp_error * 3.0) + (vol_error * 8.0) + (hit_error * 2.0)
    return score


def optimize_reel_config(target_rtp, target_volatility, target_hit_freq, iterations=200):
    """
    Generate and test reel configs to find the best match for targets.
    
    NEW: Implements HIGH_RISK_MODE for high volatility targets
    - Uses extreme reel generation
    - Dynamic payouts scaled to volatility
    - Automatic hit frequency constraint
    - Enhanced fitness scoring
    """
    # Determine if we're in HIGH_RISK_MODE
    high_risk_mode = target_volatility > 6.5
    
    # Apply constraint: high volatility conflicts with high hit frequency
    adjusted_hit_freq = target_hit_freq
    if target_volatility > 7:
        adjusted_hit_freq = min(target_hit_freq, 35)
        print(f"   ⚠️  HIGH VOLATILITY CONSTRAINT: Hit frequency capped at {adjusted_hit_freq}%")
    elif target_volatility > 6:
        adjusted_hit_freq = min(target_hit_freq, 40)
        print(f"   ⚠️  VOLATILITY CONSTRAINT: Hit frequency capped at {adjusted_hit_freq}%")
    
    # Get dynamic payouts based on volatility target
    payouts = get_dynamic_payouts(target_volatility)
    
    mode_label = "HIGH-RISK" if high_risk_mode else "BALANCED"
    print(f"\n🎲 OPTIMIZING FOR: RTP={target_rtp}%, Vol={target_volatility}σ, HitFreq={adjusted_hit_freq}%")
    print(f"   Mode: {mode_label}")
    if high_risk_mode:
        print(f"   Dynamic Payouts: Diamond={payouts['diamond']}, Seven={payouts['seven']}, Star={payouts['star']}")
    
    best_config = None
    best_reel = None
    best_score = float('inf')
    history = []
    
    for i in range(iterations):
        # Use extreme reel generation in high-risk mode
        test_reel = generate_reel_candidate(high_risk_mode=high_risk_mode)
        config = evaluate_reel_config(test_reel, payouts=payouts)
        
        # Use adjusted hit frequency for scoring
        score = fitness_score(config, target_rtp, target_volatility, adjusted_hit_freq)
        
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
    
    print(f"✅ BEST FOUND: RTP={best_config['rtp_pct']:.2f}%, Vol={best_config['std_dev']:.4f}, Hit={best_config['hit_freq']:.1f}%, Score={best_score:.4f}")
    return best_reel, best_config, history


def compute_max_exposure(reel_config, payouts=None):
    """
    Compute the maximum single-spin payout for this reel with given payouts.
    """
    if payouts is None:
        payouts = TRIPLE_PAYOUTS
    
    counts = {s: reel_config.count(s) for s in SYMBOLS}
    max_payout = 0
    for symbol in SYMBOLS:
        if counts[symbol] > 0:
            max_payout = max(max_payout, payouts[symbol])
    return max_payout


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
        
        # Get the payouts used in this optimization
        payouts = get_dynamic_payouts(target_volatility)
        max_exposure = compute_max_exposure(best_reel, payouts=payouts)
        
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


# ---------------------------------------------------------------------------
# File Upload & AI Analysis
# ---------------------------------------------------------------------------

import json
from werkzeug.utils import secure_filename

ALLOWED_EXTENSIONS = {'json', 'txt', 'csv'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def parse_uploaded_file(file_content, filename):
    """Parse uploaded file and extract game math configuration."""
    ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    
    data = None
    if ext == 'json':
        try:
            data = json.loads(file_content)
        except json.JSONDecodeError as e:
            return {"error": f"Invalid JSON: {str(e)}"}
    elif ext in ['txt', 'csv']:
        # Try to parse as JSON first
        try:
            data = json.loads(file_content)
        except:
            # If not JSON, parse as structured text
            data = {"raw_content": file_content, "format": ext}
    
    return data

def analyze_game_config(data):
    """
    AI analysis of uploaded game configuration with intelligent field detection.
    Supports multiple naming conventions and handles string/numeric volatility values.
    """
    analysis = {
        "detected_rtp": None,
        "detected_volatility": None,
        "detected_hit_frequency": None,
        "reel_pattern": None,
        "payout_structure": None,
        "balancing_strategy": "Not detected",
        "volatility_profile": "Not detected",
        "suggested_optimizations": [],
        "summary": "",
        "confidence": 0.0,
    }
    
    if not isinstance(data, dict):
        print("⚠️  PARSE ERROR: Data is not a dictionary")
        return analysis
    
    print(f"\n📋 ANALYZING UPLOADED CONFIG: {list(data.keys())}")
    
    # ====================================================================
    # 1. EXTRACT RTP WITH MULTIPLE NAMING CONVENTIONS
    # ====================================================================
    rtp_keys = [
        "target_rtp", "targetRTP", "targetRtp",
        "rtp", "rtp_pct", "rtp_percent", "rtpPercent",
        "theoretical_rtp", "theoreticalRTP",
        "return_to_player", "returnToPlayer",
        "estimated_rtp", "estimatedRTP",
    ]
    
    for key in rtp_keys:
        if key in data:
            try:
                analysis["detected_rtp"] = float(data[key])
                print(f"   ✓ RTP detected: {analysis['detected_rtp']}% (from '{key}')")
                break
            except (ValueError, TypeError):
                pass
    
    # ====================================================================
    # 2. EXTRACT VOLATILITY WITH MULTIPLE NAMING CONVENTIONS & STRING SUPPORT
    # ====================================================================
    vol_keys = [
        "target_volatility", "targetVolatility", "targetVol",
        "volatility", "vol",
        "std_dev", "standard_deviation", "standardDeviation",
        "estimated_std_dev", "estimatedStdDev",
        "variance", "volatility_class", "volatilityClass",
        "volatility_profile", "volatilityProfile",
    ]
    
    volatility_string_map = {
        "low": 1.5,
        "medium": 4.5,
        "high": 8.0,
        "extreme": 12.0,
        "stable": 1.5,
        "balanced": 4.5,
        "volatile": 8.0,
    }
    
    for key in vol_keys:
        if key in data:
            try:
                val = data[key]
                # Handle string volatility values
                if isinstance(val, str):
                    val_lower = val.lower().strip()
                    if val_lower in volatility_string_map:
                        analysis["detected_volatility"] = volatility_string_map[val_lower]
                        print(f"   ✓ Volatility detected: {analysis['detected_volatility']}σ (string: '{val}' mapped to '{key}')")
                    else:
                        # Try to parse string as float
                        try:
                            analysis["detected_volatility"] = float(val)
                            print(f"   ✓ Volatility detected: {analysis['detected_volatility']}σ (parsed string from '{key}')")
                        except:
                            pass
                else:
                    analysis["detected_volatility"] = float(val)
                    print(f"   ✓ Volatility detected: {analysis['detected_volatility']}σ (from '{key}')")
                
                if analysis["detected_volatility"] is not None:
                    break
            except (ValueError, TypeError):
                pass
    
    # ====================================================================
    # 3. EXTRACT HIT FREQUENCY WITH MULTIPLE NAMING CONVENTIONS
    # ====================================================================
    hit_keys = [
        "target_hit_frequency", "targetHitFrequency", "targetHitFreq",
        "hit_frequency", "hitFrequency", "hit_freq", "hitFreq",
        "hit_freq_pct", "hitFreqPct",
        "win_frequency", "winFrequency",
        "win_rate", "winRate",
        "frequency_pct", "frequencyPct",
    ]
    
    for key in hit_keys:
        if key in data:
            try:
                analysis["detected_hit_frequency"] = float(data[key])
                print(f"   ✓ Hit frequency detected: {analysis['detected_hit_frequency']}% (from '{key}')")
                break
            except (ValueError, TypeError):
                pass
    
    # ====================================================================
    # 4. EXTRACT REEL CONFIGURATION
    # ====================================================================
    reel_keys = [
        "reel_weights", "reelWeights", "reels",
        "reel_config", "reelConfig", "reel_configuration",
        "symbol_counts", "symbolCounts", "symbol_distribution",
        "counts", "distribution",
    ]
    
    for key in reel_keys:
        if key in data and isinstance(data[key], dict):
            analysis["reel_pattern"] = data[key]
            print(f"   ✓ Reel pattern detected: {len(data[key])} symbols (from '{key}')")
            break
    
    # ====================================================================
    # 5. EXTRACT PAYOUT STRUCTURE
    # ====================================================================
    payout_keys = [
        "payouts", "payouts_config", "payoutsConfig",
        "triple_payouts", "triplePayouts",
        "payout_table", "payoutTable",
        "payout_multipliers", "payoutMultipliers",
    ]
    
    for key in payout_keys:
        if key in data and isinstance(data[key], dict):
            analysis["payout_structure"] = data[key]
            print(f"   ✓ Payout structure detected: {len(data[key])} entries (from '{key}')")
            break
    
    # ====================================================================
    # 6. CALCULATE CONFIDENCE SCORE
    # ====================================================================
    detected_fields = 0
    data_completeness_factors = []
    
    if analysis["detected_rtp"] is not None:
        detected_fields += 1
        data_completeness_factors.append("RTP")
    
    if analysis["detected_volatility"] is not None:
        detected_fields += 1
        data_completeness_factors.append("Volatility")
    
    if analysis["detected_hit_frequency"] is not None:
        detected_fields += 1
        data_completeness_factors.append("Hit Frequency")
    
    if analysis["reel_pattern"] is not None:
        detected_fields += 1
        data_completeness_factors.append("Reel Weights")
    
    if analysis["payout_structure"] is not None:
        detected_fields += 0.5  # Bonus for payout table
        data_completeness_factors.append("Payouts")
    
    # Base confidence from detected fields
    base_confidence = (detected_fields / 4.5) * 90
    
    # Bonus for well-rounded configuration
    if len(data_completeness_factors) >= 3:
        base_confidence += 10
    
    analysis["confidence"] = min(100, round(base_confidence, 1))
    print(f"   📊 Confidence Score: {analysis['confidence']}% ({', '.join(data_completeness_factors)})")
    
    # ====================================================================
    # 7. DETERMINE VOLATILITY PROFILE
    # ====================================================================
    if analysis["detected_volatility"] is not None:
        vol = analysis["detected_volatility"]
        if vol < 2.0:
            analysis["volatility_profile"] = "Low Volatility (Stable)"
        elif 2.0 <= vol < 4.0:
            analysis["volatility_profile"] = "Medium-Low Volatility"
        elif 4.0 <= vol < 7.0:
            analysis["volatility_profile"] = "Medium Volatility"
        elif 7.0 <= vol < 10.0:
            analysis["volatility_profile"] = "High Volatility"
        else:
            analysis["volatility_profile"] = "Extreme Volatility"
    
    # ====================================================================
    # 8. GENERATE SMART BALANCING STRATEGY
    # ====================================================================
    if analysis["detected_rtp"] is not None or analysis["detected_volatility"] is not None or analysis["detected_hit_frequency"] is not None:
        rtp = analysis["detected_rtp"]
        vol = analysis["detected_volatility"]
        hit_freq = analysis["detected_hit_frequency"]
        
        # High volatility + low hit frequency
        if vol is not None and vol > 7.0 and hit_freq is not None and hit_freq < 35:
            analysis["balancing_strategy"] = "High Variance Jackpot Model"
        
        # High RTP + high hit frequency
        elif rtp is not None and rtp > 95 and hit_freq is not None and hit_freq > 50:
            analysis["balancing_strategy"] = "Retention-Focused Stable Model"
        
        # Low volatility + high hit frequency
        elif vol is not None and vol < 3.0 and hit_freq is not None and hit_freq > 55:
            analysis["balancing_strategy"] = "Frequent Winner Configuration"
        
        # Medium across the board
        elif (rtp is not None and 92 <= rtp <= 95 and 
              vol is not None and 3 <= vol <= 6 and 
              hit_freq is not None and 40 <= hit_freq <= 50):
            analysis["balancing_strategy"] = "Hybrid Balanced Configuration"
        
        # Based on RTP alone
        elif rtp is not None:
            if rtp < 90:
                analysis["balancing_strategy"] = "Ultra-Conservative RTP Model"
            elif 90 <= rtp < 92:
                analysis["balancing_strategy"] = "Conservative High RTP (90-92%)"
            elif 92 <= rtp <= 94:
                analysis["balancing_strategy"] = "Conservative High RTP (92-94%)"
            elif 94 < rtp <= 96:
                analysis["balancing_strategy"] = "Moderate RTP (94-96%)"
            elif 96 < rtp <= 98:
                analysis["balancing_strategy"] = "Aggressive High RTP (96-98%)"
            else:
                analysis["balancing_strategy"] = "Premium High RTP (>98%)"
    
    print(f"   🎯 Strategy: {analysis['balancing_strategy']}")
    
    # ====================================================================
    # 9. BUILD SUMMARY
    # ====================================================================
    summary_parts = []
    
    # Volatility + reel distribution insight
    if analysis["detected_volatility"] and analysis["reel_pattern"]:
        if analysis["detected_volatility"] < 3:
            summary_parts.append("This model is optimized for stability with balanced reel distributions.")
        elif analysis["detected_volatility"] < 7:
            summary_parts.append("This configuration targets medium volatility with moderate premium symbol density.")
        else:
            summary_parts.append("This model is engineered for high volatility with sparse premium symbol combinations.")
    
    # Hit frequency insight
    if analysis["detected_hit_frequency"]:
        hf = analysis["detected_hit_frequency"]
        if hf > 55:
            summary_parts.append("High hit frequency encourages frequent engagement with consistent small wins.")
        elif hf > 40:
            summary_parts.append("Balanced hit frequency creates a natural rhythm between wins and dry spells.")
        else:
            summary_parts.append("Low hit frequency creates dramatic variance with occasional substantial payouts.")
    
    # RTP insight
    if analysis["detected_rtp"]:
        rtp = analysis["detected_rtp"]
        summary_parts.append(f"Targets {rtp:.1f}% RTP for sustainable player retention.")
    
    # Strategy insight
    if analysis["balancing_strategy"] != "Not detected":
        summary_parts.append(f"Employs {analysis['balancing_strategy'].lower()} design philosophy.")
    
    analysis["summary"] = " ".join(summary_parts) if summary_parts else "Configuration data received but requires additional context for detailed analysis."
    print(f"   📝 Summary: {analysis['summary'][:100]}...")
    
    # ====================================================================
    # 10. GENERATE OPTIMIZATION SUGGESTIONS
    # ====================================================================
    suggestions = []
    
    if analysis["detected_rtp"]:
        if analysis["detected_rtp"] < 88:
            suggestions.append("Increase RTP above 88% to meet minimum player retention thresholds")
        elif analysis["detected_rtp"] > 98:
            suggestions.append("High RTP may limit operator profitability; consider 94-96% range")
    
    if analysis["detected_volatility"]:
        if analysis["detected_volatility"] < 1.5:
            suggestions.append("Low volatility limits excitement potential; consider increasing to 2-3σ range")
        elif analysis["detected_volatility"] > 12:
            suggestions.append("Extreme volatility may frustrate players; consider capping at 10σ")
    
    if analysis["detected_hit_frequency"]:
        if analysis["detected_hit_frequency"] < 25:
            suggestions.append("Hit frequency below 25% may cause extended losing streaks; increase to 30%+")
        elif analysis["detected_hit_frequency"] > 65:
            suggestions.append("Hit frequency above 65% reduces volatility perception; optimize to 45-55% range")
    
    # Cross-parameter suggestions
    if (analysis["detected_volatility"] and analysis["detected_hit_frequency"] and
        analysis["detected_volatility"] > 8 and analysis["detected_hit_frequency"] > 50):
        suggestions.append("High volatility typically requires lower hit frequency; consider reducing to <35%")
    
    if (analysis["detected_rtp"] and analysis["detected_volatility"] and
        analysis["detected_rtp"] > 96 and analysis["detected_volatility"] > 8):
        suggestions.append("High RTP + high volatility combination may be difficult to sustain; validate payouts")
    
    if not suggestions:
        suggestions.append("Configuration appears well-balanced across all parameters")
    
    analysis["suggested_optimizations"] = suggestions
    print(f"   💡 Suggestions: {len(suggestions)} optimization recommendations")
    
    return analysis

@app.route("/api/upload-analysis", methods=["POST"])
def upload_analysis():
    """Handle file upload and AI analysis."""
    try:
        # Check if file is present
        if "file" not in request.files:
            return jsonify({"success": False, "error": "No file provided"}), 400
        
        file = request.files["file"]
        if file.filename == "":
            return jsonify({"success": False, "error": "No file selected"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                "success": False,
                "error": f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            }), 400
        
        # Read file content
        try:
            file_content = file.read().decode('utf-8')
        except:
            return jsonify({"success": False, "error": "Could not read file. Ensure it's UTF-8 encoded."}), 400
        
        # Parse file
        parsed_data = parse_uploaded_file(file_content, file.filename)
        if "error" in parsed_data:
            return jsonify({"success": False, "error": parsed_data["error"]}), 400
        
        # Analyze configuration
        analysis = analyze_game_config(parsed_data)
        
        return jsonify({
            "success": True,
            "filename": secure_filename(file.filename),
            "analysis": analysis,
            "raw_data": parsed_data,
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": f"Server error: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
