/**
 * Detect swing highs and lows (pivots) in price data
 * A pivot high is a candle whose high is higher than N candles on both sides
 * A pivot low is a candle whose low is lower than N candles on both sides
 */

/**
 * Detect pivot highs
 * @param {Array} candles - Array of candle objects
 * @param {number} window - Number of candles to check on each side (default: 5)
 * @returns {Array} Array of pivot high indices
 */
function detectPivotHighs(candles, window = 5) {
  const pivots = [];
  
  // Need at least window * 2 + 1 candles
  if (candles.length < window * 2 + 1) {
    return pivots;
  }

  // Start from window, end at length - window
  for (let i = window; i < candles.length - window; i++) {
    let isPivot = true;
    const currentHigh = candles[i].high;

    // Check left side
    for (let j = i - window; j < i; j++) {
      if (candles[j].high >= currentHigh) {
        isPivot = false;
        break;
      }
    }

    if (!isPivot) continue;

    // Check right side
    for (let j = i + 1; j <= i + window; j++) {
      if (candles[j].high >= currentHigh) {
        isPivot = false;
        break;
      }
    }

    if (isPivot) {
      pivots.push(i);
    }
  }

  return pivots;
}

/**
 * Detect pivot lows
 * @param {Array} candles - Array of candle objects
 * @param {number} window - Number of candles to check on each side (default: 5)
 * @returns {Array} Array of pivot low indices
 */
function detectPivotLows(candles, window = 5) {
  const pivots = [];
  
  if (candles.length < window * 2 + 1) {
    return pivots;
  }

  for (let i = window; i < candles.length - window; i++) {
    let isPivot = true;
    const currentLow = candles[i].low;

    // Check left side
    for (let j = i - window; j < i; j++) {
      if (candles[j].low <= currentLow) {
        isPivot = false;
        break;
      }
    }

    if (!isPivot) continue;

    // Check right side
    for (let j = i + 1; j <= i + window; j++) {
      if (candles[j].low <= currentLow) {
        isPivot = false;
        break;
      }
    }

    if (isPivot) {
      pivots.push(i);
    }
  }

  return pivots;
}

/**
 * Get recent pivot highs (last N)
 */
function getRecentPivotHighs(candles, window = 5, count = 10) {
  const pivots = detectPivotHighs(candles, window);
  return pivots.slice(-count);
}

/**
 * Get recent pivot lows (last N)
 */
function getRecentPivotLows(candles, window = 5, count = 10) {
  const pivots = detectPivotLows(candles, window);
  return pivots.slice(-count);
}

module.exports = {
  detectPivotHighs,
  detectPivotLows,
  getRecentPivotHighs,
  getRecentPivotLows
};
