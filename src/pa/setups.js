const { detectReversalPattern, getCandleStrength } = require('./patterns');
const { buildZones, isTouchingZone, findNearestZone } = require('./zones');
const { detectLiquiditySweep, detectTrap } = require('./liquidity');
const { detectBreakoutRetestSetup, detectFalseBreakWithConfirmation } = require('./retest');

/**
 * Detect trading setups based on price action
 */

/**
 * Calculate average volume over last N candles
 */
function calculateAverageVolume(candles, period = 20) {
  if (candles.length < period) {
    period = candles.length;
  }
  
  const recentCandles = candles.slice(-period);
  const totalVolume = recentCandles.reduce((sum, c) => sum + c.volume, 0);
  return totalVolume / period;
}

/**
 * Check for volume spike
 */
function hasVolumeSpark(currentVolume, avgVolume, threshold = 1.5) {
  return currentVolume > avgVolume * threshold;
}

/**
 * Detect reversal setup at support/resistance zone
 * @param {Array} candles - Array of candles
 * @param {Object} zones - { support: [], resistance: [] }
 * @param {Object} config - Configuration
 * @returns {Object|null} Setup info or null
 */
function detectReversalSetup(candles, zones, config = {}) {
  if (candles.length < 20) return null;

  const currentCandle = candles[candles.length - 1];
  const currentPrice = currentCandle.close;

  // Build pattern config from environment
  const patternConfig = buildPatternConfig();

  // Check for reversal pattern with configuration
  const pattern = detectReversalPattern(candles, patternConfig);
  if (!pattern) return null;

  // Check if near support (for bullish reversal) or resistance (for bearish reversal)
  if (pattern.type === 'bullish') {
    const nearestSupport = findNearestZone(currentPrice, zones.support, 1);
    if (nearestSupport && isTouchingZone(currentPrice, nearestSupport)) {
      return {
        type: 'reversal',
        side: 'LONG',
        pattern,
        zone: nearestSupport,
        price: currentPrice,
        name: 'Bullish Reversal at Support'
      };
    }
  } else if (pattern.type === 'bearish') {
    const nearestResistance = findNearestZone(currentPrice, zones.resistance, 1);
    if (nearestResistance && isTouchingZone(currentPrice, nearestResistance)) {
      return {
        type: 'reversal',
        side: 'SHORT',
        pattern,
        zone: nearestResistance,
        price: currentPrice,
        name: 'Bearish Reversal at Resistance'
      };
    }
  }

  return null;
}

/**
 * Build pattern configuration from environment variables
 * @returns {Object} Pattern configuration
 */
function buildPatternConfig() {
  return {
    enabledPatterns: {
      pinBar: (process.env.PATTERN_PINBAR_ENABLED || 'true') === 'true',
      engulfing: (process.env.PATTERN_ENGULFING_ENABLED || 'true') === 'true',
      harami: (process.env.PATTERN_HARAMI_ENABLED || 'true') === 'true',
      insideBar: (process.env.PATTERN_INSIDE_BAR_ENABLED || 'true') === 'true',
      morningStar: (process.env.PATTERN_MORNING_STAR_ENABLED || 'true') === 'true',
      eveningStar: (process.env.PATTERN_EVENING_STAR_ENABLED || 'true') === 'true',
      tweezer: (process.env.PATTERN_TWEEZER_ENABLED || 'true') === 'true',
      doji: (process.env.PATTERN_DOJI_ENABLED || 'true') === 'true',
      threeWhiteSoldiers: (process.env.PATTERN_THREE_WHITE_SOLDIERS_ENABLED || 'true') === 'true',
      threeBlackCrows: (process.env.PATTERN_THREE_BLACK_CROWS_ENABLED || 'true') === 'true'
    }
  };
}

/**
 * Detect breakout/breakdown setup
 * True breakout: close outside zone + volume spike
 * False breakout: wick beyond zone but close back inside + weak volume
 */
function detectBreakoutSetup(candles, zones, config = {}) {
  if (candles.length < 20) return null;

  const currentCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];
  const currentPrice = currentCandle.close;

  const avgVolume = calculateAverageVolume(candles, 20);
  const volumeSpike = hasVolumeSpark(currentCandle.volume, avgVolume, config.volumeSpikeThreshold || 1.5);

  // Check resistance breakout
  for (const zone of zones.resistance) {
    const prevBelowZone = prevCandle.close < zone.center;
    const currentAboveZone = currentCandle.close > zone.upper;

    if (prevBelowZone && currentAboveZone) {
      // True breakout
      if (volumeSpike) {
        return {
          type: 'breakout',
          side: 'LONG',
          zone,
          price: currentPrice,
          volumeSpike: true,
          volumeRatio: currentCandle.volume / avgVolume,
          name: 'True Breakout Above Resistance',
          isTrue: true
        };
      } else {
        // Potential false breakout (weak volume)
        return {
          type: 'breakout',
          side: 'SHORT', // Fade the breakout
          zone,
          price: currentPrice,
          volumeSpike: false,
          volumeRatio: currentCandle.volume / avgVolume,
          name: 'False Breakout (Weak Volume)',
          isTrue: false
        };
      }
    }

    // Check for false breakout: wick above but close back inside
    const wickAbove = currentCandle.high > zone.upper;
    const closedInside = currentCandle.close < zone.upper;
    if (wickAbove && closedInside && !volumeSpike) {
      return {
        type: 'false_breakout',
        side: 'SHORT',
        zone,
        price: currentPrice,
        volumeSpike: false,
        volumeRatio: currentCandle.volume / avgVolume,
        name: 'False Breakout Rejection',
        isTrue: false
      };
    }
  }

  // Check support breakdown
  for (const zone of zones.support) {
    const prevAboveZone = prevCandle.close > zone.center;
    const currentBelowZone = currentCandle.close < zone.lower;

    if (prevAboveZone && currentBelowZone) {
      // True breakdown
      if (volumeSpike) {
        return {
          type: 'breakdown',
          side: 'SHORT',
          zone,
          price: currentPrice,
          volumeSpike: true,
          volumeRatio: currentCandle.volume / avgVolume,
          name: 'True Breakdown Below Support',
          isTrue: true
        };
      } else {
        // Potential false breakdown
        return {
          type: 'breakdown',
          side: 'LONG', // Fade the breakdown
          zone,
          price: currentPrice,
          volumeSpike: false,
          volumeRatio: currentCandle.volume / avgVolume,
          name: 'False Breakdown (Weak Volume)',
          isTrue: false
        };
      }
    }

    // Check for false breakdown: wick below but close back inside
    const wickBelow = currentCandle.low < zone.lower;
    const closedInside = currentCandle.close > zone.lower;
    if (wickBelow && closedInside && !volumeSpike) {
      return {
        type: 'false_breakdown',
        side: 'LONG',
        zone,
        price: currentPrice,
        volumeSpike: false,
        volumeRatio: currentCandle.volume / avgVolume,
        name: 'False Breakdown Rejection',
        isTrue: false
      };
    }
  }

  return null;
}

/**
 * Detect retest setup after breakout
 */
function detectRetestSetup(candles, zones, config = {}) {
  if (candles.length < 30) return null;

  const currentCandle = candles[candles.length - 1];
  const currentPrice = currentCandle.close;

  // Look for recent breakout (in last 10-20 candles)
  const recentCandles = candles.slice(-20);
  
  // Build pattern config
  const patternConfig = buildPatternConfig();
  
  // Check if we're retesting a broken resistance (now support)
  for (const zone of zones.resistance) {
    const aboveZone = currentPrice > zone.center;
    const touching = isTouchingZone(currentPrice, zone);

    if (aboveZone && touching) {
      // Check if there was a breakout in recent history
      const hadBreakout = recentCandles.some(c => c.close > zone.upper);
      if (hadBreakout) {
        const pattern = detectReversalPattern(candles, patternConfig);
        if (pattern && pattern.type === 'bullish') {
          return {
            type: 'retest',
            side: 'LONG',
            zone,
            price: currentPrice,
            pattern,
            name: 'Retest of Broken Resistance'
          };
        }
      }
    }
  }

  // Check if we're retesting a broken support (now resistance)
  for (const zone of zones.support) {
    const belowZone = currentPrice < zone.center;
    const touching = isTouchingZone(currentPrice, zone);

    if (belowZone && touching) {
      const hadBreakdown = recentCandles.some(c => c.close < zone.lower);
      if (hadBreakdown) {
        const pattern = detectReversalPattern(candles, patternConfig);
        if (pattern && pattern.type === 'bearish') {
          return {
            type: 'retest',
            side: 'SHORT',
            zone,
            price: currentPrice,
            pattern,
            name: 'Retest of Broken Support'
          };
        }
      }
    }
  }

  return null;
}

/**
 * Detect any setup - V2 Enhanced
 * Priority order: Liquidity sweep > Breakout-retest > False break confirmed > Original setups
 */
function detectSetup(candles, config = {}) {
  const zones = buildZones(
    candles,
    config.zoneLookback || 100,
    config.pivotWindow || 5,
    config.zoneTolerance || 0.5
  );

  // Validate zones exist
  const minZonesRequired = config.minZonesRequired || 2;
  const totalZones = zones.support.length + zones.resistance.length;
  
  if (totalZones < minZonesRequired) {
    console.log(`[Setup] Insufficient zones: ${totalZones} zones found, minimum ${minZonesRequired} required. Skipping signal.`);
    return null;
  }

  // V2 Priority 1: Liquidity sweep/trap (highest quality)
  let setup = detectLiquiditySweep(candles, config);
  if (setup) {
    setup.zones = zones;
    setup.setupType = setup.type; // liquidity_sweep_bull or liquidity_sweep_bear
    return setup;
  }

  // V2 Priority 2: Trap detection at zones
  setup = detectTrap(candles, zones, config);
  if (setup) {
    setup.zones = zones;
    setup.setupType = setup.type; // trap_bull or trap_bear
    return setup;
  }

  // V2 Priority 3: Breakout-retest-confirmation (high quality)
  setup = detectBreakoutRetestSetup(candles, zones, config);
  if (setup) {
    setup.zones = zones;
    setup.setupType = 'breakout_retest';
    return setup;
  }

  // V2 Priority 4: False break with confirmation
  setup = detectFalseBreakWithConfirmation(candles, zones, config);
  if (setup) {
    setup.zones = zones;
    setup.setupType = 'false_break_confirmed';
    return setup;
  }

  // Original setups (lower priority but still valid)
  // Try reversal
  setup = detectReversalSetup(candles, zones, config);
  if (setup) {
    setup.zones = zones;
    setup.setupType = setup.type; // 'reversal'
    return setup;
  }

  // Try breakout
  setup = detectBreakoutSetup(candles, zones, config);
  if (setup) {
    setup.zones = zones;
    setup.setupType = setup.type; // 'breakout' or 'breakdown'
    return setup;
  }

  // Try retest
  setup = detectRetestSetup(candles, zones, config);
  if (setup) {
    setup.zones = zones;
    setup.setupType = 'retest';
    return setup;
  }

  return null;
}

module.exports = {
  detectReversalSetup,
  detectBreakoutSetup,
  detectRetestSetup,
  detectSetup,
  calculateAverageVolume,
  hasVolumeSpark,
  buildPatternConfig
};
