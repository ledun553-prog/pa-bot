const { getCandleStrength } = require('./patterns');
const { calculateAverageVolume } = require('./setups');

/**
 * Score a trading signal (0-100)
 * Combines: HTF alignment, setup quality, candle strength, volume context, RSI divergence
 */

/**
 * Calculate signal score
 * @param {Object} setup - Setup object from setups.js
 * @param {Object} htfAlignment - HTF alignment from structure.js
 * @param {Array} candles - Recent candles
 * @param {Object} divergence - RSI divergence info
 * @returns {Object} { score, breakdown }
 */
function calculateScore(setup, htfAlignment, candles, divergence) {
  let score = 0;
  const breakdown = {};

  // 1. HTF Alignment Score (0-30 points)
  const htfScore = calculateHTFScore(setup.side, htfAlignment);
  score += htfScore;
  breakdown.htf = htfScore;

  // 2. Setup Quality Score (0-25 points)
  const setupScore = calculateSetupScore(setup);
  score += setupScore;
  breakdown.setup = setupScore;

  // 3. Candle Strength Score (0-20 points)
  const candleScore = calculateCandleScore(candles, setup.side);
  score += candleScore;
  breakdown.candle = candleScore;

  // 4. Volume Context Score (0-15 points)
  const volumeScore = calculateVolumeScore(candles, setup);
  score += volumeScore;
  breakdown.volume = volumeScore;

  // 5. RSI Divergence Score (0-10 points)
  const divergenceScore = calculateDivergenceScore(divergence, setup.side);
  score += divergenceScore;
  breakdown.divergence = divergenceScore;

  return {
    score: Math.round(score),
    breakdown,
    maxScore: 100
  };
}

/**
 * Calculate HTF alignment score (0-30)
 */
function calculateHTFScore(side, htfAlignment) {
  if (!htfAlignment) return 15;

  const { aligned, score: alignScore } = htfAlignment;

  if (aligned) {
    // Perfect alignment: 25-30 points
    return 25 + (alignScore * 5);
  } else {
    // Partial or no alignment: 5-20 points
    return 5 + (alignScore * 15);
  }
}

/**
 * Calculate setup quality score (0-25)
 */
function calculateSetupScore(setup) {
  let score = 10; // Base score for having a setup

  // Bonus for setup type
  if (setup.type === 'reversal') {
    score += 10; // Reversals at key levels are high quality
    
    // Extra bonus for strong pattern
    if (setup.pattern && setup.pattern.strength) {
      score += setup.pattern.strength * 5;
    }
  } else if (setup.type === 'breakout' && setup.isTrue) {
    score += 12; // True breakouts with volume
  } else if (setup.type === 'retest') {
    score += 10; // Retests are high quality
    if (setup.pattern) {
      score += 3;
    }
  } else if (setup.type === 'false_breakout' || setup.type === 'false_breakdown') {
    score += 8; // False breakout fades
  } else {
    score += 5; // Other setups
  }

  return Math.min(score, 25);
}

/**
 * Calculate candle strength score (0-20)
 */
function calculateCandleScore(candles, side) {
  if (candles.length < 2) return 10;

  const currentCandle = candles[candles.length - 1];
  const strength = getCandleStrength(currentCandle);

  let score = 10; // Base score

  // Bonus for strong directional candle
  if (side === 'LONG' && strength.isBullish) {
    score += strength.strength * 10;
  } else if (side === 'SHORT' && strength.isBearish) {
    score += strength.strength * 10;
  } else {
    // Candle not aligned with signal direction
    score -= 5;
  }

  return Math.max(0, Math.min(score, 20));
}

/**
 * Calculate volume context score (0-15)
 */
function calculateVolumeScore(candles, setup) {
  if (candles.length < 20) return 7;

  const currentCandle = candles[candles.length - 1];
  const avgVolume = calculateAverageVolume(candles, 20);
  const volumeRatio = currentCandle.volume / avgVolume;

  let score = 5; // Base score

  // Bonus for volume spike
  if (volumeRatio > 2.0) {
    score += 10; // Very strong volume
  } else if (volumeRatio > 1.5) {
    score += 7; // Strong volume
  } else if (volumeRatio > 1.2) {
    score += 5; // Above average
  } else if (volumeRatio < 0.8) {
    score -= 3; // Below average (potential weakness)
  }

  // Extra bonus if setup already indicates volume spike
  if (setup.volumeSpike) {
    score += 3;
  }

  return Math.max(0, Math.min(score, 15));
}

/**
 * Calculate RSI divergence score (0-10)
 */
function calculateDivergenceScore(divergence, side) {
  if (!divergence) return 0;

  let score = 0;

  // Bonus for divergence aligned with signal direction
  if (side === 'LONG' && divergence.bullish) {
    score = 10;
  } else if (side === 'SHORT' && divergence.bearish) {
    score = 10;
  }

  return score;
}

/**
 * Calculate risk/reward levels
 * @param {Object} setup - Setup object
 * @param {number} atr - Average True Range (optional, for dynamic SL/TP)
 * @returns {Object} { entry, stopLoss, takeProfit1, takeProfit2, riskReward }
 */
function calculateLevels(setup, atr = null) {
  const entry = setup.price;
  let stopLoss, tp1, tp2;

  if (setup.side === 'LONG') {
    // Stop loss below zone or recent low
    if (setup.zone) {
      stopLoss = setup.zone.lower * 0.998; // Slightly below zone
    } else {
      stopLoss = entry * 0.99; // 1% below entry
    }

    const risk = entry - stopLoss;
    tp1 = entry + risk * 1.5; // 1.5R
    tp2 = entry + risk * 3.0; // 3R

  } else { // SHORT
    // Stop loss above zone or recent high
    if (setup.zone) {
      stopLoss = setup.zone.upper * 1.002; // Slightly above zone
    } else {
      stopLoss = entry * 1.01; // 1% above entry
    }

    const risk = stopLoss - entry;
    tp1 = entry - risk * 1.5; // 1.5R
    tp2 = entry - risk * 3.0; // 3R
  }

  const risk = Math.abs(entry - stopLoss);
  const reward1 = Math.abs(tp1 - entry);
  const rr1 = reward1 / risk;
  const reward2 = Math.abs(tp2 - entry);
  const rr2 = reward2 / risk;

  return {
    entry: parseFloat(entry.toFixed(8)),
    stopLoss: parseFloat(stopLoss.toFixed(8)),
    takeProfit1: parseFloat(tp1.toFixed(8)),
    takeProfit2: parseFloat(tp2.toFixed(8)),
    riskReward1: parseFloat(rr1.toFixed(2)),
    riskReward2: parseFloat(rr2.toFixed(2))
  };
}

module.exports = {
  calculateScore,
  calculateLevels,
  calculateHTFScore,
  calculateSetupScore,
  calculateCandleScore,
  calculateVolumeScore,
  calculateDivergenceScore
};
