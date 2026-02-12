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

/**
 * Get detailed market structure state (HH/HL/LH/LL)
 * @param {Array} candles - Array of candles
 * @param {number} window - Pivot detection window
 * @returns {Object} Detailed structure state
 */
function getMarketStructureState(candles, window = 5) {
  if (candles.length < 20) {
    return { state: 'neutral', pivotHighs: [], pivotLows: [] };
  }

  const pivotHighs = detectPivotHighs(candles, window);
  const pivotLows = detectPivotLows(candles, window);

  const recentHighs = pivotHighs.slice(-3);
  const recentLows = pivotLows.slice(-3);

  if (recentHighs.length < 2 || recentLows.length < 2) {
    return { state: 'neutral', pivotHighs, pivotLows };
  }

  // Analyze swing structure
  const lastHigh = candles[recentHighs[recentHighs.length - 1]].high;
  const prevHigh = candles[recentHighs[recentHighs.length - 2]].high;
  const lastLow = candles[recentLows[recentLows.length - 1]].low;
  const prevLow = candles[recentLows[recentLows.length - 2]].low;

  const higherHigh = lastHigh > prevHigh;
  const lowerHigh = lastHigh < prevHigh;
  const higherLow = lastLow > prevLow;
  const lowerLow = lastLow < prevLow;

  let state = 'neutral';
  if (higherHigh && higherLow) {
    state = 'HH_HL'; // Uptrend
  } else if (lowerHigh && lowerLow) {
    state = 'LH_LL'; // Downtrend
  } else if (higherHigh && lowerLow) {
    state = 'HH_LL'; // Mixed (potential reversal)
  } else if (lowerHigh && higherLow) {
    state = 'LH_HL'; // Mixed (potential reversal)
  }

  return {
    state,
    pivotHighs,
    pivotLows,
    recentHighs,
    recentLows,
    lastHigh,
    lastLow,
    prevHigh,
    prevLow
  };
}

/**
 * Detect Break of Structure (BOS) events
 * BOS = price breaks a recent swing high/low in the direction of trend
 * @param {Array} candles - Array of candles
 * @param {Object} structureState - Market structure state
 * @returns {Object|null} BOS event or null
 */
function detectBOS(candles, structureState) {
  if (!structureState || structureState.state === 'neutral') {
    return null;
  }

  const currentCandle = candles[candles.length - 1];
  const currentPrice = currentCandle.close;

  // Bullish BOS: in uptrend, price breaks above recent swing high
  if (structureState.state === 'HH_HL') {
    if (currentPrice > structureState.lastHigh) {
      return {
        type: 'BOS',
        direction: 'bullish',
        price: currentPrice,
        brokenLevel: structureState.lastHigh,
        timestamp: currentCandle.closeTime,
        candleIndex: candles.length - 1
      };
    }
  }

  // Bearish BOS: in downtrend, price breaks below recent swing low
  if (structureState.state === 'LH_LL') {
    if (currentPrice < structureState.lastLow) {
      return {
        type: 'BOS',
        direction: 'bearish',
        price: currentPrice,
        brokenLevel: structureState.lastLow,
        timestamp: currentCandle.closeTime,
        candleIndex: candles.length - 1
      };
    }
  }

  return null;
}

/**
 * Detect Change of Character (CHOCH) events
 * CHOCH = price breaks structure in opposite direction, suggesting reversal
 * @param {Array} candles - Array of candles
 * @param {Object} structureState - Market structure state
 * @returns {Object|null} CHOCH event or null
 */
function detectCHOCH(candles, structureState) {
  if (!structureState || structureState.state === 'neutral') {
    return null;
  }

  const currentCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];

  // Bullish CHOCH: in downtrend, price breaks above recent swing high
  if (structureState.state === 'LH_LL' || structureState.state === 'HH_LL') {
    const recentHigh = structureState.lastHigh;
    const brokeAbove = currentCandle.close > recentHigh && prevCandle.close <= recentHigh;

    if (brokeAbove) {
      return {
        type: 'CHOCH',
        direction: 'bullish',
        price: currentCandle.close,
        brokenLevel: recentHigh,
        prevStructure: structureState.state,
        timestamp: currentCandle.closeTime,
        candleIndex: candles.length - 1,
        strength: 'strong' // Can be enhanced based on additional factors
      };
    }
  }

  // Bearish CHOCH: in uptrend, price breaks below recent swing low
  if (structureState.state === 'HH_HL' || structureState.state === 'LH_HL') {
    const recentLow = structureState.lastLow;
    const brokeBelow = currentCandle.close < recentLow && prevCandle.close >= recentLow;

    if (brokeBelow) {
      return {
        type: 'CHOCH',
        direction: 'bearish',
        price: currentCandle.close,
        brokenLevel: recentLow,
        prevStructure: structureState.state,
        timestamp: currentCandle.closeTime,
        candleIndex: candles.length - 1,
        strength: 'strong'
      };
    }
  }

  return null;
}

/**
 * Detect recent BOS/CHOCH events in last N candles
 * @param {Array} candles - Array of candles
 * @param {number} window - Pivot window
 * @param {number} lookback - How many candles to check for recent events
 * @returns {Object} { bos: null|Object, choch: null|Object }
 */
function detectRecentStructureEvents(candles, window = 5, lookback = 10) {
  if (candles.length < 20) {
    return { bos: null, choch: null };
  }

  let recentBOS = null;
  let recentCHOCH = null;

  // Check recent candles for BOS/CHOCH
  for (let i = Math.max(20, candles.length - lookback); i < candles.length; i++) {
    const subset = candles.slice(0, i + 1);
    const structureState = getMarketStructureState(subset, window);

    const bos = detectBOS(subset, structureState);
    if (bos && (!recentBOS || bos.candleIndex > recentBOS.candleIndex)) {
      recentBOS = bos;
    }

    const choch = detectCHOCH(subset, structureState);
    if (choch && (!recentCHOCH || choch.candleIndex > recentCHOCH.candleIndex)) {
      recentCHOCH = choch;
    }
  }

  return { bos: recentBOS, choch: recentCHOCH };
}

module.exports = {
  analyzeMarketStructure,
  determineHTFBias,
  checkHTFAlignment,
  getMarketStructureState,
  detectBOS,
  detectCHOCH,
  detectRecentStructureEvents
};
