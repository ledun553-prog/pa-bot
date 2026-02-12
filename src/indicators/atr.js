/**
 * Average True Range (ATR) Indicator
 * Used for volatility measurement and ATR spike detection
 */

/**
 * Calculate True Range for a single candle
 * @param {Object} candle - Current candle
 * @param {Object} prevCandle - Previous candle (optional)
 * @returns {number} True Range value
 */
function calculateTrueRange(candle, prevCandle) {
  if (!prevCandle) {
    // First candle: TR = high - low
    return candle.high - candle.low;
  }

  // True Range = max of:
  // 1. Current high - current low
  // 2. Abs(current high - previous close)
  // 3. Abs(current low - previous close)
  const range1 = candle.high - candle.low;
  const range2 = Math.abs(candle.high - prevCandle.close);
  const range3 = Math.abs(candle.low - prevCandle.close);

  return Math.max(range1, range2, range3);
}

/**
 * Calculate ATR (Average True Range) using simple moving average
 * @param {Array} candles - Array of candles
 * @param {number} period - ATR period (default: 14)
 * @returns {number} ATR value
 */
function calculateATR(candles, period = 14) {
  if (candles.length < period + 1) {
    return null;
  }

  const recentCandles = candles.slice(-(period + 1));
  let trSum = 0;

  for (let i = 1; i < recentCandles.length; i++) {
    const tr = calculateTrueRange(recentCandles[i], recentCandles[i - 1]);
    trSum += tr;
  }

  return trSum / period;
}

/**
 * Calculate ATR series for multiple candles
 * @param {Array} candles - Array of candles
 * @param {number} period - ATR period
 * @returns {Array} Array of ATR values
 */
function calculateATRSeries(candles, period = 14) {
  if (candles.length < period + 1) {
    return [];
  }

  const atrSeries = [];

  for (let i = period; i < candles.length; i++) {
    const subset = candles.slice(i - period, i + 1);
    const atr = calculateATR(subset, period);
    atrSeries.push(atr);
  }

  return atrSeries;
}

/**
 * Detect ATR spike (volatility surge)
 * @param {Array} candles - Array of candles
 * @param {number} period - ATR period (default: 14)
 * @param {number} spikeThreshold - Spike multiplier (default: 1.5)
 * @returns {Object} { hasSpike, currentATR, avgATR, ratio }
 */
function detectATRSpike(candles, period = 14, spikeThreshold = 1.5) {
  if (candles.length < period * 2 + 1) {
    return { hasSpike: false, currentATR: null, avgATR: null, ratio: null };
  }

  // Calculate current ATR
  const currentATR = calculateATR(candles, period);
  if (currentATR === null) {
    return { hasSpike: false, currentATR: null, avgATR: null, ratio: null };
  }

  // Calculate average ATR over recent period (e.g., last 20 ATR values)
  const atrSeries = calculateATRSeries(candles, period);
  const recentATRs = atrSeries.slice(-20);

  if (recentATRs.length === 0) {
    return { hasSpike: false, currentATR, avgATR: null, ratio: null };
  }

  const avgATR = recentATRs.reduce((sum, atr) => sum + atr, 0) / recentATRs.length;
  const ratio = currentATR / avgATR;

  const hasSpike = ratio >= spikeThreshold;

  return {
    hasSpike,
    currentATR,
    avgATR,
    ratio,
    threshold: spikeThreshold
  };
}

/**
 * Get current ATR value
 * @param {Array} candles - Array of candles
 * @param {number} period - ATR period (default: 14)
 * @returns {number|null} Current ATR value or null
 */
function getATR(candles, period = 14) {
  return calculateATR(candles, period);
}

module.exports = {
  calculateTrueRange,
  calculateATR,
  calculateATRSeries,
  detectATRSpike,
  getATR
};
