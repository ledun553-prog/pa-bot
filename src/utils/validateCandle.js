/**
 * Candle data validation utilities
 * Validates candle field integrity before analysis
 */

/**
 * Validate a single candle's data integrity
 * @param {Object} candle - Candle object to validate
 * @param {string} symbol - Symbol name for logging
 * @param {string} timeframe - Timeframe for logging
 * @returns {Object} { valid: boolean, reason: string }
 */
function validateCandle(candle, symbol = '', timeframe = '') {
  if (!candle) {
    return { valid: false, reason: 'Candle is null or undefined' };
  }

  // Check required fields exist
  const requiredFields = ['open', 'high', 'low', 'close', 'volume'];
  for (const field of requiredFields) {
    if (!(field in candle)) {
      return { valid: false, reason: `Missing required field: ${field}` };
    }
  }

  // Validate OHLC are finite numbers
  const { open, high, low, close, volume } = candle;
  
  if (!isFinite(open) || isNaN(open)) {
    return { valid: false, reason: `Invalid open: ${open}` };
  }
  if (!isFinite(high) || isNaN(high)) {
    return { valid: false, reason: `Invalid high: ${high}` };
  }
  if (!isFinite(low) || isNaN(low)) {
    return { valid: false, reason: `Invalid low: ${low}` };
  }
  if (!isFinite(close) || isNaN(close)) {
    return { valid: false, reason: `Invalid close: ${close}` };
  }
  if (!isFinite(volume) || isNaN(volume)) {
    return { valid: false, reason: `Invalid volume: ${volume}` };
  }

  // Validate volume is non-negative
  if (volume < 0) {
    return { valid: false, reason: `Negative volume: ${volume}` };
  }

  // Validate OHLC relationships
  // high should be >= max(open, close)
  const maxOC = Math.max(open, close);
  if (high < maxOC) {
    return { 
      valid: false, 
      reason: `High (${high}) < max(open=${open}, close=${close})` 
    };
  }

  // low should be <= min(open, close)
  const minOC = Math.min(open, close);
  if (low > minOC) {
    return { 
      valid: false, 
      reason: `Low (${low}) > min(open=${open}, close=${close})` 
    };
  }

  // Additional sanity: high >= low
  if (high < low) {
    return { 
      valid: false, 
      reason: `High (${high}) < low (${low})` 
    };
  }

  return { valid: true, reason: '' };
}

/**
 * Validate an array of candles, filtering out invalid ones
 * @param {Array} candles - Array of candle objects
 * @param {string} symbol - Symbol name for logging
 * @param {string} timeframe - Timeframe for logging
 * @returns {Object} { valid: Array, invalid: Array, invalidCount: number }
 */
function validateCandles(candles, symbol = '', timeframe = '') {
  if (!Array.isArray(candles)) {
    console.error(`[ValidateCandle] ${symbol} ${timeframe}: candles is not an array`);
    return { valid: [], invalid: [], invalidCount: 0 };
  }

  const valid = [];
  const invalid = [];

  for (let i = 0; i < candles.length; i++) {
    const result = validateCandle(candles[i], symbol, timeframe);
    if (result.valid) {
      valid.push(candles[i]);
    } else {
      console.warn(
        `[ValidateCandle] ${symbol} ${timeframe} candle[${i}]: ${result.reason}`
      );
      invalid.push({ index: i, candle: candles[i], reason: result.reason });
    }
  }

  return { valid, invalid, invalidCount: invalid.length };
}

module.exports = {
  validateCandle,
  validateCandles
};
