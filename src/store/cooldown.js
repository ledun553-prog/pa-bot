const { getDatabase } = require('./db');

/**
 * Manage signal cooldowns to prevent duplicate signals
 * V2: Added cooldown bypass logic for CHOCH/ATR spike/sweep
 */

/**
 * Evaluate if cooldown should be bypassed
 * Bypass reasons:
 * 1) Strong CHOCH (change of character) suggests reversal
 * 2) Volatility spike (ATR spike) indicates strong movement
 * 3) Strong trap/sweep signal
 * 
 * @param {Object} signal - Signal object with setup info
 * @param {Object} config - Configuration
 * @returns {Object} { bypass: boolean, reason: string }
 */
function evaluateCooldownBypass(signal, config = {}) {
  const bypassOnCHOCH = (config.COOLDOWN_BYPASS_ON_CHOCH !== undefined) 
    ? config.COOLDOWN_BYPASS_ON_CHOCH 
    : (process.env.COOLDOWN_BYPASS_ON_CHOCH !== 'false');

  // Reason 1: CHOCH detected
  if (bypassOnCHOCH && signal.chochEvent) {
    return {
      bypass: true,
      reason: 'CHOCH detected - strong reversal signal'
    };
  }

  // Reason 2: ATR spike (volatility surge)
  if (signal.atrSpike && signal.atrSpike.hasSpike) {
    return {
      bypass: true,
      reason: `ATR spike detected (${signal.atrSpike.ratio.toFixed(2)}x avg)`
    };
  }

  // Reason 3: Strong sweep/trap signal
  const setupType = signal.setup?.setupType || signal.setup?.type;
  if (setupType && (setupType.includes('sweep') || setupType.includes('trap'))) {
    const strength = signal.setup.strength || 0;
    if (strength >= 0.6) {
      return {
        bypass: true,
        reason: `Strong ${setupType} detected (strength: ${(strength * 100).toFixed(0)}%)`
      };
    }
  }

  return {
    bypass: false,
    reason: null
  };
}

/**
 * Generate cooldown key from signal parameters
 */
function generateCooldownKey(symbol, timeframe, side, zoneKey) {
  return `${symbol}_${timeframe}_${side}_${zoneKey || 'none'}`;
}

/**
 * Check if a signal is on cooldown
 * @param {string} symbol
 * @param {string} timeframe
 * @param {string} side - 'LONG' or 'SHORT'
 * @param {string} zoneKey - Zone identifier
 * @returns {boolean} True if on cooldown
 */
function isOnCooldown(symbol, timeframe, side, zoneKey) {
  const db = getDatabase();
  const cooldownKey = generateCooldownKey(symbol, timeframe, side, zoneKey);
  const now = Date.now();

  const stmt = db.prepare(`
    SELECT COUNT(*) as count 
    FROM cooldowns 
    WHERE cooldown_key = ? AND expires_at > ?
  `);

  const result = stmt.get(cooldownKey, now);
  return result.count > 0;
}

/**
 * Add a new cooldown
 * @param {string} symbol
 * @param {string} timeframe
 * @param {string} side
 * @param {string} zoneKey
 * @param {number} cooldownMinutes - Cooldown duration in minutes
 */
function addCooldown(symbol, timeframe, side, zoneKey, cooldownMinutes) {
  const db = getDatabase();
  const cooldownKey = generateCooldownKey(symbol, timeframe, side, zoneKey);
  const now = Date.now();
  const expiresAt = now + (cooldownMinutes * 60 * 1000);

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO cooldowns (cooldown_key, symbol, timeframe, side, zone_key, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(cooldownKey, symbol, timeframe, side, zoneKey, expiresAt, now);

  console.log(`[Cooldown] Added cooldown for ${cooldownKey} until ${new Date(expiresAt).toISOString()}`);
}

/**
 * Get remaining cooldown time in minutes
 * @returns {number} Minutes remaining, or 0 if not on cooldown
 */
function getRemainingCooldown(symbol, timeframe, side, zoneKey) {
  const db = getDatabase();
  const cooldownKey = generateCooldownKey(symbol, timeframe, side, zoneKey);
  const now = Date.now();

  const stmt = db.prepare(`
    SELECT expires_at 
    FROM cooldowns 
    WHERE cooldown_key = ? AND expires_at > ?
  `);

  const result = stmt.get(cooldownKey, now);
  
  if (!result) {
    return 0;
  }

  const remaining = result.expires_at - now;
  return Math.ceil(remaining / (60 * 1000));
}

/**
 * Remove a cooldown (useful for testing)
 */
function removeCooldown(symbol, timeframe, side, zoneKey) {
  const db = getDatabase();
  const cooldownKey = generateCooldownKey(symbol, timeframe, side, zoneKey);

  const stmt = db.prepare('DELETE FROM cooldowns WHERE cooldown_key = ?');
  stmt.run(cooldownKey);
}

/**
 * Get all active cooldowns
 */
function getActiveCooldowns() {
  const db = getDatabase();
  const now = Date.now();

  const stmt = db.prepare(`
    SELECT * FROM cooldowns WHERE expires_at > ?
    ORDER BY expires_at ASC
  `);

  return stmt.all(now);
}

module.exports = {
  generateCooldownKey,
  isOnCooldown,
  addCooldown,
  getRemainingCooldown,
  removeCooldown,
  getActiveCooldowns,
  evaluateCooldownBypass
};
