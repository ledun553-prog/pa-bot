/**
 * Breakout → Retest → Confirmation Logic
 * Detects breakout, waits for retest, then requires confirmation candle
 */

const { detectReversalPattern, detectPinBar, detectEngulfing } = require('./patterns');

/**
 * Detect if a breakout occurred in recent candles
 * @param {Array} candles - Array of candles
 * @param {Object} zone - Zone that was broken
 * @param {string} direction - 'bullish' or 'bearish'
 * @param {number} lookback - How many candles to look back (default: 10)
 * @returns {Object|null} Breakout info or null
 */
function detectBreakout(candles, zone, direction, lookback = 10) {
  if (candles.length < lookback + 1) return null;

  const recentCandles = candles.slice(-lookback);

  for (let i = 0; i < recentCandles.length; i++) {
    const candle = recentCandles[i];
    const candleIndex = candles.length - lookback + i;

    if (direction === 'bullish') {
      // Bullish breakout: close above resistance zone
      if (candle.close > zone.upper) {
        return {
          found: true,
          candleIndex,
          candle,
          breakoutPrice: candle.close,
          zone
        };
      }
    } else if (direction === 'bearish') {
      // Bearish breakout: close below support zone
      if (candle.close < zone.lower) {
        return {
          found: true,
          candleIndex,
          candle,
          breakoutPrice: candle.close,
          zone
        };
      }
    }
  }

  return null;
}

/**
 * Detect if price is retesting a broken zone
 * @param {Array} candles - Array of candles
 * @param {number} breakoutIndex - Index where breakout occurred
 * @param {Object} zone - Zone being retested
 * @param {string} direction - 'bullish' or 'bearish'
 * @param {number} maxBars - Max bars to wait for retest (default: 4)
 * @returns {Object|null} Retest info or null
 */
function detectRetest(candles, breakoutIndex, zone, direction, maxBars = 4) {
  const currentIndex = candles.length - 1;
  const barsSinceBreakout = currentIndex - breakoutIndex;

  if (barsSinceBreakout > maxBars || barsSinceBreakout < 1) {
    return null;
  }

  const currentCandle = candles[currentIndex];

  if (direction === 'bullish') {
    // After bullish breakout, retest from above (resistance becomes support)
    const isTouching = currentCandle.low <= zone.upper && currentCandle.close >= zone.lower;
    const aboveZone = currentCandle.close > zone.center;

    if (isTouching && aboveZone) {
      return {
        found: true,
        candleIndex: currentIndex,
        candle: currentCandle,
        retestPrice: currentCandle.low,
        zone,
        barsSinceBreakout
      };
    }
  } else if (direction === 'bearish') {
    // After bearish breakout, retest from below (support becomes resistance)
    const isTouching = currentCandle.high >= zone.lower && currentCandle.close <= zone.upper;
    const belowZone = currentCandle.close < zone.center;

    if (isTouching && belowZone) {
      return {
        found: true,
        candleIndex: currentIndex,
        candle: currentCandle,
        retestPrice: currentCandle.high,
        zone,
        barsSinceBreakout
      };
    }
  }

  return null;
}

/**
 * Detect confirmation candle (pinbar or engulfing)
 * @param {Array} candles - Array of candles
 * @param {number} retestIndex - Index where retest occurred
 * @param {string} direction - 'bullish' or 'bearish'
 * @param {number} confirmationWindow - How many candles to check for confirmation (default: 2)
 * @returns {Object|null} Confirmation info or null
 */
function detectConfirmation(candles, retestIndex, direction, confirmationWindow = 2) {
  const currentIndex = candles.length - 1;
  const barsSinceRetest = currentIndex - retestIndex;

  if (barsSinceRetest > confirmationWindow || barsSinceRetest < 0) {
    return null;
  }

  // Check for confirmation patterns
  const currentCandle = candles[currentIndex];
  const prevCandle = candles.length >= 2 ? candles[currentIndex - 1] : null;

  // Try pinbar
  const pinBar = detectPinBar(currentCandle);
  if (pinBar.isPinBar) {
    const aligned = (direction === 'bullish' && pinBar.type === 'bullish') ||
                    (direction === 'bearish' && pinBar.type === 'bearish');
    if (aligned) {
      return {
        found: true,
        type: 'pinbar',
        pattern: pinBar,
        candleIndex: currentIndex,
        barsSinceRetest
      };
    }
  }

  // Try engulfing
  if (prevCandle) {
    const engulfing = detectEngulfing(prevCandle, currentCandle);
    if (engulfing.isEngulfing) {
      const aligned = (direction === 'bullish' && engulfing.type === 'bullish') ||
                      (direction === 'bearish' && engulfing.type === 'bearish');
      if (aligned) {
        return {
          found: true,
          type: 'engulfing',
          pattern: engulfing,
          candleIndex: currentIndex,
          barsSinceRetest
        };
      }
    }
  }

  return null;
}

/**
 * Detect complete breakout-retest-confirmation setup
 * @param {Array} candles - Array of candles
 * @param {Object} zones - Zones object { support: [], resistance: [] }
 * @param {Object} config - Configuration
 * @returns {Object|null} Complete setup or null
 */
function detectBreakoutRetestSetup(candles, zones, config = {}) {
  if (candles.length < 20) return null;

  const retestMaxBars = config.RETEST_MAX_BARS || 4;
  const confirmationWindow = config.CONFIRMATION_WINDOW || 2;

  // Check bullish breakout-retest
  for (const zone of zones.resistance || []) {
    const breakout = detectBreakout(candles, zone, 'bullish', 10);
    if (!breakout) continue;

    const retest = detectRetest(candles, breakout.candleIndex, zone, 'bullish', retestMaxBars);
    if (!retest) continue;

    const confirmation = detectConfirmation(candles, retest.candleIndex, 'bullish', confirmationWindow);
    if (!confirmation) continue;

    return {
      type: 'breakout_retest',
      side: 'LONG',
      zone,
      breakout,
      retest,
      confirmation,
      name: 'Bullish Breakout-Retest-Confirmation',
      strength: confirmation.pattern.strength || 0.8
    };
  }

  // Check bearish breakout-retest
  for (const zone of zones.support || []) {
    const breakout = detectBreakout(candles, zone, 'bearish', 10);
    if (!breakout) continue;

    const retest = detectRetest(candles, breakout.candleIndex, zone, 'bearish', retestMaxBars);
    if (!retest) continue;

    const confirmation = detectConfirmation(candles, retest.candleIndex, 'bearish', confirmationWindow);
    if (!confirmation) continue;

    return {
      type: 'breakout_retest',
      side: 'SHORT',
      zone,
      breakout,
      retest,
      confirmation,
      name: 'Bearish Breakout-Retest-Confirmation',
      strength: confirmation.pattern.strength || 0.8
    };
  }

  return null;
}

/**
 * Detect false breakout with confirmation requirement
 * @param {Array} candles - Array of candles
 * @param {Object} zones - Zones object
 * @param {Object} config - Configuration
 * @returns {Object|null} False break setup or null
 */
function detectFalseBreakWithConfirmation(candles, zones, config = {}) {
  if (candles.length < 5) return null;

  const confirmationWindow = config.CONFIRMATION_WINDOW || 2;
  const currentCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];

  // Bullish false break: wick below support, close back inside, confirmation
  for (const zone of zones.support || []) {
    const wickBelow = currentCandle.low < zone.lower;
    const closedInside = currentCandle.close > zone.lower;

    if (wickBelow && closedInside) {
      // Look for confirmation in current or next candle (we check current only in this pass)
      const pattern = detectReversalPattern(candles);
      if (pattern && pattern.type === 'bullish') {
        return {
          type: 'false_break_confirmed',
          side: 'LONG',
          zone,
          pattern,
          name: 'False Breakdown + Confirmation',
          strength: pattern.strength || 0.7
        };
      }
    }
  }

  // Bearish false break: wick above resistance, close back inside, confirmation
  for (const zone of zones.resistance || []) {
    const wickAbove = currentCandle.high > zone.upper;
    const closedInside = currentCandle.close < zone.upper;

    if (wickAbove && closedInside) {
      const pattern = detectReversalPattern(candles);
      if (pattern && pattern.type === 'bearish') {
        return {
          type: 'false_break_confirmed',
          side: 'SHORT',
          zone,
          pattern,
          name: 'False Breakout + Confirmation',
          strength: pattern.strength || 0.7
        };
      }
    }
  }

  return null;
}

module.exports = {
  detectBreakout,
  detectRetest,
  detectConfirmation,
  detectBreakoutRetestSetup,
  detectFalseBreakWithConfirmation
};
