const { detectPivotHighs, detectPivotLows } = require('./pivots');

/**
 * Determine market structure and HTF (Higher Timeframe) bias
 * Based on recent pivot analysis
 */

/**
 * Analyze market structure from pivots
 * @param {Array} candles - Array of candles
 * @param {number} window - Pivot detection window
 * @returns {string} 'up', 'down', or 'neutral'
 */
function analyzeMarketStructure(candles, window = 5) {
  if (candles.length < 20) {
    return 'neutral';
  }

  const pivotHighs = detectPivotHighs(candles, window);
  const pivotLows = detectPivotLows(candles, window);

  // Get last 3 pivots of each type
  const recentHighs = pivotHighs.slice(-3);
  const recentLows = pivotLows.slice(-3);

  // Need at least 2 pivots of each type
  if (recentHighs.length < 2 || recentLows.length < 2) {
    return 'neutral';
  }

  // Check for higher highs and higher lows (uptrend)
  const higherHighs = recentHighs.length >= 2 && 
    candles[recentHighs[recentHighs.length - 1]].high > candles[recentHighs[recentHighs.length - 2]].high;
  
  const higherLows = recentLows.length >= 2 && 
    candles[recentLows[recentLows.length - 1]].low > candles[recentLows[recentLows.length - 2]].low;

  // Check for lower highs and lower lows (downtrend)
  const lowerHighs = recentHighs.length >= 2 && 
    candles[recentHighs[recentHighs.length - 1]].high < candles[recentHighs[recentHighs.length - 2]].high;
  
  const lowerLows = recentLows.length >= 2 && 
    candles[recentLows[recentLows.length - 1]].low < candles[recentLows[recentLows.length - 2]].low;

  if (higherHighs && higherLows) {
    return 'up';
  } else if (lowerHighs && lowerLows) {
    return 'down';
  } else {
    return 'neutral';
  }
}

/**
 * Determine HTF (Higher Timeframe) bias from 1d and 4h structures
 * @param {Object} structures - { '1d': 'up'|'down'|'neutral', '4h': 'up'|'down'|'neutral' }
 * @returns {Object} { bias: 'bullish'|'bearish'|'neutral', score: 0-1, alignment: boolean }
 */
function determineHTFBias(structures) {
  const dayStructure = structures['1d'] || 'neutral';
  const fourHourStructure = structures['4h'] || 'neutral';

  let bias = 'neutral';
  let score = 0.5;
  let alignment = false;

  // Both up -> bullish bias
  if (dayStructure === 'up' && fourHourStructure === 'up') {
    bias = 'bullish';
    score = 1.0;
    alignment = true;
  }
  // Both down -> bearish bias
  else if (dayStructure === 'down' && fourHourStructure === 'down') {
    bias = 'bearish';
    score = 1.0;
    alignment = true;
  }
  // Mixed -> partial bias, lower score
  else if (dayStructure === 'up' || fourHourStructure === 'up') {
    bias = 'bullish';
    score = 0.6;
    alignment = false;
  }
  else if (dayStructure === 'down' || fourHourStructure === 'down') {
    bias = 'bearish';
    score = 0.6;
    alignment = false;
  }
  // Both neutral
  else {
    bias = 'neutral';
    score = 0.5;
    alignment = false;
  }

  return {
    bias,
    score,
    alignment,
    structures: {
      '1d': dayStructure,
      '4h': fourHourStructure
    }
  };
}

/**
 * Check if signal direction aligns with HTF bias
 */
function checkHTFAlignment(signalSide, htfBias) {
  if (htfBias.bias === 'neutral') {
    return { aligned: false, score: 0.5 };
  }

  const aligned = (signalSide === 'LONG' && htfBias.bias === 'bullish') ||
                  (signalSide === 'SHORT' && htfBias.bias === 'bearish');

  return {
    aligned,
    score: aligned ? htfBias.score : (1 - htfBias.score)
  };
}

module.exports = {
  analyzeMarketStructure,
  determineHTFBias,
  checkHTFAlignment
};
