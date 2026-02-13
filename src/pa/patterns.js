/**
 * Detect reversal candlestick patterns
 */

/**
 * Detect pin bar / hammer / shooting star
 * @param {Object} candle - Candle object
 * @returns {Object} { isPinBar, type, strength }
 */
function detectPinBar(candle) {
  const body = Math.abs(candle.close - candle.open);
  const range = candle.high - candle.low;
  
  if (range === 0) return { isPinBar: false };

  const upperWick = candle.high - Math.max(candle.open, candle.close);
  const lowerWick = Math.min(candle.open, candle.close) - candle.low;

  const bodyPercent = (body / range) * 100;
  const upperWickPercent = (upperWick / range) * 100;
  const lowerWickPercent = (lowerWick / range) * 100;

  // Pin bar criteria: small body (< 30%), one long wick (> 60%)
  if (bodyPercent < 30) {
    // Bullish pin bar (hammer): long lower wick
    if (lowerWickPercent > 60 && upperWickPercent < 20) {
      return {
        isPinBar: true,
        type: 'bullish',
        name: 'Hammer',
        strength: lowerWickPercent / 100,
        rejection: 'downside'
      };
    }
    // Bearish pin bar (shooting star): long upper wick
    else if (upperWickPercent > 60 && lowerWickPercent < 20) {
      return {
        isPinBar: true,
        type: 'bearish',
        name: 'Shooting Star',
        strength: upperWickPercent / 100,
        rejection: 'upside'
      };
    }
  }

  return { isPinBar: false };
}

/**
 * Detect engulfing pattern (2-candle pattern)
 * @param {Object} prevCandle - Previous candle
 * @param {Object} currentCandle - Current candle
 * @returns {Object} { isEngulfing, type, strength }
 */
function detectEngulfing(prevCandle, currentCandle) {
  const prevBody = Math.abs(prevCandle.close - prevCandle.open);
  const currentBody = Math.abs(currentCandle.close - currentCandle.open);

  const prevIsBullish = prevCandle.close > prevCandle.open;
  const prevIsBearish = prevCandle.close < prevCandle.open;
  const currentIsBullish = currentCandle.close > currentCandle.open;
  const currentIsBearish = currentCandle.close < currentCandle.open;

  // Bullish engulfing: bearish candle followed by larger bullish candle
  if (prevIsBearish && currentIsBullish) {
    const engulfs = currentCandle.open <= prevCandle.close && 
                    currentCandle.close >= prevCandle.open;
    if (engulfs && currentBody > prevBody) {
      return {
        isEngulfing: true,
        type: 'bullish',
        name: 'Bullish Engulfing',
        strength: currentBody / prevBody
      };
    }
  }

  // Bearish engulfing: bullish candle followed by larger bearish candle
  if (prevIsBullish && currentIsBearish) {
    const engulfs = currentCandle.open >= prevCandle.close && 
                    currentCandle.close <= prevCandle.open;
    if (engulfs && currentBody > prevBody) {
      return {
        isEngulfing: true,
        type: 'bearish',
        name: 'Bearish Engulfing',
        strength: currentBody / prevBody
      };
    }
  }

  return { isEngulfing: false };
}

/**
 * Detect doji candle (indecision)
 * @param {Object} candle - Candle object
 * @returns {Object} { isDoji, type }
 */
function detectDoji(candle) {
  const body = Math.abs(candle.close - candle.open);
  const range = candle.high - candle.low;

  if (range === 0) return { isDoji: false };

  const bodyPercent = (body / range) * 100;

  // Doji: very small body (< 5% of range)
  if (bodyPercent < 5) {
    return {
      isDoji: true,
      type: 'neutral',
      name: 'Doji',
      strength: 1 - (bodyPercent / 5)
    };
  }

  return { isDoji: false };
}

/**
 * Detect inside bar pattern
 * @param {Object} prevCandle - Previous (mother) candle
 * @param {Object} currentCandle - Current (inside) candle
 * @returns {Object} { isInsideBar, type, strength }
 */
function detectInsideBar(prevCandle, currentCandle) {
  // Inside bar: current candle's high/low completely within previous candle's range
  const isInside = currentCandle.high <= prevCandle.high && 
                   currentCandle.low >= prevCandle.low;
  
  if (!isInside) return { isInsideBar: false };

  const prevRange = prevCandle.high - prevCandle.low;
  const currentRange = currentCandle.high - currentCandle.low;
  
  if (prevRange === 0) return { isInsideBar: false };

  // Strength based on how much smaller the inside bar is
  const compressionRatio = 1 - (currentRange / prevRange);
  
  return {
    isInsideBar: true,
    type: 'neutral', // Direction determined on breakout
    name: 'Inside Bar',
    strength: compressionRatio,
    awaitingBreakout: true
  };
}

/**
 * Detect morning star pattern (3-candle bullish reversal)
 * @param {Array} candles - Need at least last 3 candles
 * @returns {Object} { isMorningStar, type, strength }
 */
function detectMorningStar(candles) {
  if (candles.length < 3) return { isMorningStar: false };

  const candle1 = candles[candles.length - 3]; // First bearish candle
  const candle2 = candles[candles.length - 2]; // Small body (star)
  const candle3 = candles[candles.length - 1]; // Bullish confirmation

  // Check structure
  const c1Bearish = candle1.close < candle1.open;
  const c3Bullish = candle3.close > candle3.open;
  
  if (!c1Bearish || !c3Bullish) return { isMorningStar: false };

  const body1 = Math.abs(candle1.close - candle1.open);
  const body2 = Math.abs(candle2.close - candle2.open);
  const body3 = Math.abs(candle3.close - candle3.open);
  
  // Star candle should be small relative to first candle
  const isStarSmall = body2 < body1 * 0.3;
  
  // Star should gap down (or at least be lower)
  const hasGap = candle2.high < candle1.close;
  
  // Third candle should close well into first candle's body
  const goodConfirmation = candle3.close > (candle1.open + candle1.close) / 2;

  if (isStarSmall && goodConfirmation) {
    const strength = hasGap ? 0.9 : 0.7;
    return {
      isMorningStar: true,
      type: 'bullish',
      name: 'Morning Star',
      strength: strength * (body3 / body1)
    };
  }

  return { isMorningStar: false };
}

/**
 * Detect evening star pattern (3-candle bearish reversal)
 * @param {Array} candles - Need at least last 3 candles
 * @returns {Object} { isEveningStar, type, strength }
 */
function detectEveningStar(candles) {
  if (candles.length < 3) return { isEveningStar: false };

  const candle1 = candles[candles.length - 3]; // First bullish candle
  const candle2 = candles[candles.length - 2]; // Small body (star)
  const candle3 = candles[candles.length - 1]; // Bearish confirmation

  // Check structure
  const c1Bullish = candle1.close > candle1.open;
  const c3Bearish = candle3.close < candle3.open;
  
  if (!c1Bullish || !c3Bearish) return { isEveningStar: false };

  const body1 = Math.abs(candle1.close - candle1.open);
  const body2 = Math.abs(candle2.close - candle2.open);
  const body3 = Math.abs(candle3.close - candle3.open);
  
  // Star candle should be small relative to first candle
  const isStarSmall = body2 < body1 * 0.3;
  
  // Star should gap up (or at least be higher)
  const hasGap = candle2.low > candle1.close;
  
  // Third candle should close well into first candle's body
  const goodConfirmation = candle3.close < (candle1.open + candle1.close) / 2;

  if (isStarSmall && goodConfirmation) {
    const strength = hasGap ? 0.9 : 0.7;
    return {
      isEveningStar: true,
      type: 'bearish',
      name: 'Evening Star',
      strength: strength * (body3 / body1)
    };
  }

  return { isEveningStar: false };
}

/**
 * Detect Harami pattern (2-candle pattern)
 * Harami: Large candle followed by smaller candle completely inside
 * @param {Object} prevCandle - Previous (mother) candle
 * @param {Object} currentCandle - Current (inside) candle
 * @returns {Object} { isHarami, type, strength }
 */
function detectHarami(prevCandle, currentCandle) {
  const prevBody = Math.abs(prevCandle.close - prevCandle.open);
  const currentBody = Math.abs(currentCandle.close - currentCandle.open);
  
  if (prevBody === 0) return { isHarami: false };
  
  const prevIsBullish = prevCandle.close > prevCandle.open;
  const prevIsBearish = prevCandle.close < prevCandle.open;
  const currentIsBullish = currentCandle.close > currentCandle.open;
  const currentIsBearish = currentCandle.close < currentCandle.open;
  
  // Current candle must be completely inside previous candle's body
  const prevBodyHigh = Math.max(prevCandle.open, prevCandle.close);
  const prevBodyLow = Math.min(prevCandle.open, prevCandle.close);
  const currentBodyHigh = Math.max(currentCandle.open, currentCandle.close);
  const currentBodyLow = Math.min(currentCandle.open, currentCandle.close);
  
  const isInside = currentBodyHigh <= prevBodyHigh && currentBodyLow >= prevBodyLow;
  
  if (!isInside || currentBody >= prevBody * 0.5) {
    return { isHarami: false };
  }
  
  // Bullish Harami: bearish candle followed by smaller bullish candle inside
  if (prevIsBearish && currentIsBullish) {
    return {
      isHarami: true,
      type: 'bullish',
      name: 'Bullish Harami',
      strength: 0.8 * (1 - currentBody / prevBody)
    };
  }
  
  // Bearish Harami: bullish candle followed by smaller bearish candle inside
  if (prevIsBullish && currentIsBearish) {
    return {
      isHarami: true,
      type: 'bearish',
      name: 'Bearish Harami',
      strength: 0.8 * (1 - currentBody / prevBody)
    };
  }
  
  return { isHarami: false };
}

/**
 * Detect Three White Soldiers pattern (3-candle bullish continuation)
 * @param {Array} candles - Need at least last 3 candles
 * @returns {Object} { isThreeWhiteSoldiers, type, strength }
 */
function detectThreeWhiteSoldiers(candles) {
  if (candles.length < 3) return { isThreeWhiteSoldiers: false };
  
  const c1 = candles[candles.length - 3];
  const c2 = candles[candles.length - 2];
  const c3 = candles[candles.length - 1];
  
  // All three must be bullish
  const allBullish = (c1.close > c1.open) && (c2.close > c2.open) && (c3.close > c3.open);
  if (!allBullish) return { isThreeWhiteSoldiers: false };
  
  // Each candle should close higher than previous
  const progressiveHigher = (c2.close > c1.close) && (c3.close > c2.close);
  if (!progressiveHigher) return { isThreeWhiteSoldiers: false };
  
  // Each candle should open within previous candle's body
  const c2OpensInC1 = c2.open >= c1.open && c2.open <= c1.close;
  const c3OpensInC2 = c3.open >= c2.open && c3.open <= c2.close;
  
  // Bodies should be relatively similar in size (not too small)
  const body1 = Math.abs(c1.close - c1.open);
  const body2 = Math.abs(c2.close - c2.open);
  const body3 = Math.abs(c3.close - c3.open);
  const avgBody = (body1 + body2 + body3) / 3;
  const minBody = Math.min(body1, body2, body3);
  
  // All bodies should be at least 50% of average
  const bodiesConsistent = minBody >= avgBody * 0.5;
  
  if (c2OpensInC1 && c3OpensInC2 && bodiesConsistent) {
    return {
      isThreeWhiteSoldiers: true,
      type: 'bullish',
      name: 'Three White Soldiers',
      strength: 0.85
    };
  }
  
  return { isThreeWhiteSoldiers: false };
}

/**
 * Detect Three Black Crows pattern (3-candle bearish continuation)
 * @param {Array} candles - Need at least last 3 candles
 * @returns {Object} { isThreeBlackCrows, type, strength }
 */
function detectThreeBlackCrows(candles) {
  if (candles.length < 3) return { isThreeBlackCrows: false };
  
  const c1 = candles[candles.length - 3];
  const c2 = candles[candles.length - 2];
  const c3 = candles[candles.length - 1];
  
  // All three must be bearish
  const allBearish = (c1.close < c1.open) && (c2.close < c2.open) && (c3.close < c3.open);
  if (!allBearish) return { isThreeBlackCrows: false };
  
  // Each candle should close lower than previous
  const progressiveLower = (c2.close < c1.close) && (c3.close < c2.close);
  if (!progressiveLower) return { isThreeBlackCrows: false };
  
  // Each candle should open within previous candle's body
  const c2OpensInC1 = c2.open <= c1.open && c2.open >= c1.close;
  const c3OpensInC2 = c3.open <= c2.open && c3.open >= c2.close;
  
  // Bodies should be relatively similar in size
  const body1 = Math.abs(c1.close - c1.open);
  const body2 = Math.abs(c2.close - c2.open);
  const body3 = Math.abs(c3.close - c3.open);
  const avgBody = (body1 + body2 + body3) / 3;
  const minBody = Math.min(body1, body2, body3);
  
  const bodiesConsistent = minBody >= avgBody * 0.5;
  
  if (c2OpensInC1 && c3OpensInC2 && bodiesConsistent) {
    return {
      isThreeBlackCrows: true,
      type: 'bearish',
      name: 'Three Black Crows',
      strength: 0.85
    };
  }
  
  return { isThreeBlackCrows: false };
}

/**
 * Detect tweezer top/bottom pattern
 * @param {Object} prevCandle - Previous candle
 * @param {Object} currentCandle - Current candle
 * @returns {Object} { isTweezer, type, strength }
 */
function detectTweezer(prevCandle, currentCandle) {
  // Tweezer top: two candles with similar highs at resistance
  // Tweezer bottom: two candles with similar lows at support
  
  const highDiff = Math.abs(currentCandle.high - prevCandle.high);
  const lowDiff = Math.abs(currentCandle.low - prevCandle.low);
  
  const avgPrice = (currentCandle.close + prevCandle.close) / 2;
  const tolerance = avgPrice * 0.002; // 0.2% tolerance
  
  // Tweezer bottom (bullish reversal)
  if (lowDiff <= tolerance) {
    const prevBearish = prevCandle.close < prevCandle.open;
    const currentBullish = currentCandle.close > currentCandle.open;
    
    if (prevBearish && currentBullish) {
      return {
        isTweezer: true,
        type: 'bullish',
        name: 'Tweezer Bottom',
        strength: 0.75,
        level: prevCandle.low
      };
    }
  }
  
  // Tweezer top (bearish reversal)
  if (highDiff <= tolerance) {
    const prevBullish = prevCandle.close > prevCandle.open;
    const currentBearish = currentCandle.close < currentCandle.open;
    
    if (prevBullish && currentBearish) {
      return {
        isTweezer: true,
        type: 'bearish',
        name: 'Tweezer Top',
        strength: 0.75,
        level: prevCandle.high
      };
    }
  }
  
  return { isTweezer: false };
}

/**
 * Detect any reversal pattern
 * @param {Array} candles - Array of candles (needs at least last 2)
 * @param {Object} config - Configuration for pattern detection (optional)
 * @returns {Object|null} Pattern info or null
 */
function detectReversalPattern(candles, config = {}) {
  if (candles.length < 2) return null;

  const currentCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];

  // Get enabled patterns from config (default: all enabled)
  const enabledPatterns = config.enabledPatterns || {
    morningStar: true,
    eveningStar: true,
    threeWhiteSoldiers: true,
    threeBlackCrows: true,
    tweezer: true,
    engulfing: true,
    harami: true,
    insideBar: true,
    pinBar: true,
    doji: true
  };

  // Check 3-candle patterns first (if we have enough candles)
  if (candles.length >= 3) {
    // Check Three White Soldiers
    if (enabledPatterns.threeWhiteSoldiers !== false) {
      const threeWhiteSoldiers = detectThreeWhiteSoldiers(candles);
      if (threeWhiteSoldiers.isThreeWhiteSoldiers) {
        return threeWhiteSoldiers;
      }
    }

    // Check Three Black Crows
    if (enabledPatterns.threeBlackCrows !== false) {
      const threeBlackCrows = detectThreeBlackCrows(candles);
      if (threeBlackCrows.isThreeBlackCrows) {
        return threeBlackCrows;
      }
    }

    // Check morning star
    if (enabledPatterns.morningStar !== false) {
      const morningStar = detectMorningStar(candles);
      if (morningStar.isMorningStar) {
        return morningStar;
      }
    }

    // Check evening star
    if (enabledPatterns.eveningStar !== false) {
      const eveningStar = detectEveningStar(candles);
      if (eveningStar.isEveningStar) {
        return eveningStar;
      }
    }
  }

  // Check 2-candle patterns
  // Check tweezer
  if (enabledPatterns.tweezer !== false) {
    const tweezer = detectTweezer(prevCandle, currentCandle);
    if (tweezer.isTweezer) {
      return tweezer;
    }
  }

  // Check engulfing
  if (enabledPatterns.engulfing !== false) {
    const engulfing = detectEngulfing(prevCandle, currentCandle);
    if (engulfing.isEngulfing) {
      return engulfing;
    }
  }

  // Check Harami
  if (enabledPatterns.harami !== false) {
    const harami = detectHarami(prevCandle, currentCandle);
    if (harami.isHarami) {
      return harami;
    }
  }

  // Check inside bar
  if (enabledPatterns.insideBar !== false) {
    const insideBar = detectInsideBar(prevCandle, currentCandle);
    if (insideBar.isInsideBar) {
      return insideBar;
    }
  }

  // Check single candle patterns
  // Check pin bar
  if (enabledPatterns.pinBar !== false) {
    const pinBar = detectPinBar(currentCandle);
    if (pinBar.isPinBar) {
      return pinBar;
    }
  }

  // Check doji
  if (enabledPatterns.doji !== false) {
    const doji = detectDoji(currentCandle);
    if (doji.isDoji) {
      return doji;
    }
  }

  return null;
}

/**
 * Get candle strength/momentum
 * @param {Object} candle - Candle object
 * @returns {Object} { strength, direction, isBullish, isBearish }
 */
function getCandleStrength(candle) {
  const body = Math.abs(candle.close - candle.open);
  const range = candle.high - candle.low;

  if (range === 0) {
    return { 
      strength: 0, 
      direction: 'neutral', 
      isBullish: false, 
      isBearish: false,
      bodyPercent: 0,
      closeLocation: 0.5,
      rejection: null
    };
  }

  const bodyPercent = (body / range) * 100;
  const isBullish = candle.close > candle.open;
  const isBearish = candle.close < candle.open;
  
  // Calculate close location within range (0 = low, 1 = high)
  const closeLocation = (candle.close - candle.low) / range;
  
  // Assess rejection strength
  const upperWick = candle.high - Math.max(candle.open, candle.close);
  const lowerWick = Math.min(candle.open, candle.close) - candle.low;
  const upperWickPercent = (upperWick / range) * 100;
  const lowerWickPercent = (lowerWick / range) * 100;
  
  let rejection = null;
  if (upperWickPercent > 40) {
    rejection = { type: 'upside', strength: upperWickPercent / 100 };
  } else if (lowerWickPercent > 40) {
    rejection = { type: 'downside', strength: lowerWickPercent / 100 };
  }

  return {
    strength: bodyPercent / 100,
    direction: isBullish ? 'bullish' : (isBearish ? 'bearish' : 'neutral'),
    isBullish,
    isBearish,
    bodyPercent,
    closeLocation, // 0-1 where 0.5 is middle, >0.5 is upper half, <0.5 is lower half
    upperWickPercent,
    lowerWickPercent,
    rejection
  };
}

module.exports = {
  detectPinBar,
  detectEngulfing,
  detectDoji,
  detectInsideBar,
  detectMorningStar,
  detectEveningStar,
  detectTweezer,
  detectHarami,
  detectThreeWhiteSoldiers,
  detectThreeBlackCrows,
  detectReversalPattern,
  getCandleStrength
};
