/**
 * Liquidity Sweep and Trap Detection
 * Detects when price sweeps liquidity at swing points and reverses
 */

const { getRecentPivotHighs, getRecentPivotLows } = require('./pivots');

/**
 * Detect bullish liquidity sweep at support/swing low
 * Pattern: wick breaks below pivot by SWEEP_PCT, closes back above by RECLAIM_PCT,
 * with long lower wick ratio >= WICK_REJECTION_MIN and volume confirmation
 * 
 * @param {Array} candles - Array of candles
 * @param {Object} config - Configuration with SWEEP_PCT, RECLAIM_PCT, WICK_REJECTION_MIN
 * @returns {Object|null} Sweep info or null
 */
function detectBullishSweep(candles, config = {}) {
  if (candles.length < 20) return null;

  const sweepPct = config.SWEEP_PCT || 0.3; // % below pivot to sweep
  const reclaimPct = config.RECLAIM_PCT || 0.2; // % above pivot to reclaim
  const wickRejectionMin = config.WICK_REJECTION_MIN || 0.5; // Min lower wick ratio

  const currentCandle = candles[candles.length - 1];
  const pivotWindow = config.pivotWindow || 5;

  // Get recent pivot lows (support levels)
  const pivotLowIndices = getRecentPivotLows(candles, pivotWindow, 10);
  if (pivotLowIndices.length === 0) return null;

  // Check the most recent pivot low
  const recentPivotIdx = pivotLowIndices[pivotLowIndices.length - 1];
  const pivotCandle = candles[recentPivotIdx];
  const pivotLow = pivotCandle.low;

  // Calculate zone around pivot
  const sweepLevel = pivotLow * (1 - sweepPct / 100);
  const reclaimLevel = pivotLow * (1 + reclaimPct / 100);

  // Check if current candle swept below and reclaimed
  const sweptBelow = currentCandle.low <= sweepLevel;
  const closedAbove = currentCandle.close >= reclaimLevel;

  if (!sweptBelow || !closedAbove) return null;

  // Check lower wick rejection strength
  const range = currentCandle.high - currentCandle.low;
  if (range === 0) return null;

  const lowerWick = Math.min(currentCandle.open, currentCandle.close) - currentCandle.low;
  const lowerWickRatio = lowerWick / range;

  if (lowerWickRatio < wickRejectionMin) return null;

  // Volume confirmation
  const recentCandles = candles.slice(-20);
  const avgVolume = recentCandles.reduce((sum, c) => sum + c.volume, 0) / recentCandles.length;
  const volumeRatio = currentCandle.volume / avgVolume;
  const volumeSpikeThreshold = config.volumeSpikeThreshold || 1.5;
  const hasVolume = volumeRatio >= volumeSpikeThreshold;

  return {
    type: 'liquidity_sweep_bull',
    side: 'LONG',
    pivotLow,
    sweepLevel,
    reclaimLevel,
    currentLow: currentCandle.low,
    currentClose: currentCandle.close,
    lowerWickRatio,
    volumeRatio,
    hasVolume,
    strength: lowerWickRatio * (hasVolume ? 1.2 : 1.0),
    name: 'Bullish Liquidity Sweep',
    candleIndex: candles.length - 1,
    pivotIndex: recentPivotIdx
  };
}

/**
 * Detect bearish liquidity sweep at resistance/swing high
 * Pattern: wick breaks above pivot by SWEEP_PCT, closes back below by RECLAIM_PCT,
 * with long upper wick ratio >= WICK_REJECTION_MIN and volume confirmation
 */
function detectBearishSweep(candles, config = {}) {
  if (candles.length < 20) return null;

  const sweepPct = config.SWEEP_PCT || 0.3;
  const reclaimPct = config.RECLAIM_PCT || 0.2;
  const wickRejectionMin = config.WICK_REJECTION_MIN || 0.5;

  const currentCandle = candles[candles.length - 1];
  const pivotWindow = config.pivotWindow || 5;

  // Get recent pivot highs (resistance levels)
  const pivotHighIndices = getRecentPivotHighs(candles, pivotWindow, 10);
  if (pivotHighIndices.length === 0) return null;

  const recentPivotIdx = pivotHighIndices[pivotHighIndices.length - 1];
  const pivotCandle = candles[recentPivotIdx];
  const pivotHigh = pivotCandle.high;

  // Calculate zone around pivot
  const sweepLevel = pivotHigh * (1 + sweepPct / 100);
  const reclaimLevel = pivotHigh * (1 - reclaimPct / 100);

  // Check if current candle swept above and reclaimed
  const sweptAbove = currentCandle.high >= sweepLevel;
  const closedBelow = currentCandle.close <= reclaimLevel;

  if (!sweptAbove || !closedBelow) return null;

  // Check upper wick rejection strength
  const range = currentCandle.high - currentCandle.low;
  if (range === 0) return null;

  const upperWick = currentCandle.high - Math.max(currentCandle.open, currentCandle.close);
  const upperWickRatio = upperWick / range;

  if (upperWickRatio < wickRejectionMin) return null;

  // Volume confirmation
  const recentCandles = candles.slice(-20);
  const avgVolume = recentCandles.reduce((sum, c) => sum + c.volume, 0) / recentCandles.length;
  const volumeRatio = currentCandle.volume / avgVolume;
  const volumeSpikeThreshold = config.volumeSpikeThreshold || 1.5;
  const hasVolume = volumeRatio >= volumeSpikeThreshold;

  return {
    type: 'liquidity_sweep_bear',
    side: 'SHORT',
    pivotHigh,
    sweepLevel,
    reclaimLevel,
    currentHigh: currentCandle.high,
    currentClose: currentCandle.close,
    upperWickRatio,
    volumeRatio,
    hasVolume,
    strength: upperWickRatio * (hasVolume ? 1.2 : 1.0),
    name: 'Bearish Liquidity Sweep',
    candleIndex: candles.length - 1,
    pivotIndex: recentPivotIdx
  };
}

/**
 * Detect any liquidity sweep or trap
 * @param {Array} candles - Array of candles
 * @param {Object} config - Configuration
 * @returns {Object|null} Sweep/trap info or null
 */
function detectLiquiditySweep(candles, config = {}) {
  // Try bullish sweep
  const bullishSweep = detectBullishSweep(candles, config);
  if (bullishSweep) return bullishSweep;

  // Try bearish sweep
  const bearishSweep = detectBearishSweep(candles, config);
  if (bearishSweep) return bearishSweep;

  return null;
}

/**
 * Detect trap patterns (similar to sweep but can be labeled differently)
 * A trap is a failed breakout that reverses strongly
 */
function detectTrap(candles, zones, config = {}) {
  if (candles.length < 10) return null;

  const currentCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];

  // Bullish trap: breaks below support zone with wick but closes back above
  for (const zone of zones.support || []) {
    const wickBelow = currentCandle.low < zone.lower;
    const closedInside = currentCandle.close > zone.center;
    const prevAbove = prevCandle.close > zone.lower;

    if (wickBelow && closedInside && prevAbove) {
      const range = currentCandle.high - currentCandle.low;
      if (range === 0) continue;

      const lowerWick = Math.min(currentCandle.open, currentCandle.close) - currentCandle.low;
      const wickRatio = lowerWick / range;

      if (wickRatio >= (config.WICK_REJECTION_MIN || 0.5)) {
        return {
          type: 'trap_bull',
          side: 'LONG',
          zone,
          wickRatio,
          name: 'Bullish Trap (False Breakdown)',
          strength: wickRatio
        };
      }
    }
  }

  // Bearish trap: breaks above resistance zone with wick but closes back below
  for (const zone of zones.resistance || []) {
    const wickAbove = currentCandle.high > zone.upper;
    const closedInside = currentCandle.close < zone.center;
    const prevBelow = prevCandle.close < zone.upper;

    if (wickAbove && closedInside && prevBelow) {
      const range = currentCandle.high - currentCandle.low;
      if (range === 0) continue;

      const upperWick = currentCandle.high - Math.max(currentCandle.open, currentCandle.close);
      const wickRatio = upperWick / range;

      if (wickRatio >= (config.WICK_REJECTION_MIN || 0.5)) {
        return {
          type: 'trap_bear',
          side: 'SHORT',
          zone,
          wickRatio,
          name: 'Bearish Trap (False Breakout)',
          strength: wickRatio
        };
      }
    }
  }

  return null;
}

module.exports = {
  detectBullishSweep,
  detectBearishSweep,
  detectLiquiditySweep,
  detectTrap
};
