/**
 * Calculate RSI (Relative Strength Index)
 * @param {Array} candles - Array of candle objects with 'close' property
 * @param {number} period - RSI period (default: 14)
 * @returns {Array} Array of RSI values (same length as input, early values are null)
 */
function calculateRSI(candles, period = 14) {
  if (candles.length < period + 1) {
    return new Array(candles.length).fill(null);
  }

  const rsi = new Array(candles.length).fill(null);
  const gains = [];
  const losses = [];

  // Calculate initial gains and losses
  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }

  // Calculate initial averages
  let avgGain = gains.reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.reduce((a, b) => a + b, 0) / period;

  // Calculate first RSI
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi[period] = 100 - (100 / (1 + rs));

  // Calculate subsequent RSI values using smoothed averages
  for (let i = period + 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi[i] = 100 - (100 / (1 + rs));
  }

  return rsi;
}

/**
 * Detect RSI divergence between price and RSI
 * @param {Array} candles - Array of candles
 * @param {Array} pivotHighs - Array of pivot high indices
 * @param {Array} pivotLows - Array of pivot low indices
 * @param {number} period - RSI period
 * @returns {Object} Divergence info { bullish, bearish, type, description }
 */
function detectRSIDivergence(candles, pivotHighs, pivotLows, period = 14) {
  const rsi = calculateRSI(candles, period);
  const result = { bullish: false, bearish: false, type: null, description: null };

  // Need at least 2 pivot points to detect divergence
  if (pivotHighs.length >= 2) {
    // Check bearish divergence (price makes higher high, RSI makes lower high)
    const lastTwoHighs = pivotHighs.slice(-2);
    const [ph1, ph2] = lastTwoHighs;
    
    if (rsi[ph1] !== null && rsi[ph2] !== null) {
      const priceHH = candles[ph2].high > candles[ph1].high;
      const rsiLH = rsi[ph2] < rsi[ph1];
      
      if (priceHH && rsiLH) {
        result.bearish = true;
        result.type = 'bearish';
        result.description = `Bearish divergence: Price HH @ ${candles[ph2].high.toFixed(2)}, RSI LH (${rsi[ph2].toFixed(2)} < ${rsi[ph1].toFixed(2)})`;
      }
    }
  }

  if (pivotLows.length >= 2) {
    // Check bullish divergence (price makes lower low, RSI makes higher low)
    const lastTwoLows = pivotLows.slice(-2);
    const [pl1, pl2] = lastTwoLows;
    
    if (rsi[pl1] !== null && rsi[pl2] !== null) {
      const priceLL = candles[pl2].low < candles[pl1].low;
      const rsiHL = rsi[pl2] > rsi[pl1];
      
      if (priceLL && rsiHL) {
        result.bullish = true;
        result.type = 'bullish';
        result.description = `Bullish divergence: Price LL @ ${candles[pl2].low.toFixed(2)}, RSI HL (${rsi[pl2].toFixed(2)} > ${rsi[pl1].toFixed(2)})`;
      }
    }
  }

  return result;
}

/**
 * Get current RSI value
 */
function getCurrentRSI(candles, period = 14) {
  const rsi = calculateRSI(candles, period);
  return rsi[rsi.length - 1];
}

module.exports = {
  calculateRSI,
  detectRSIDivergence,
  getCurrentRSI
};
