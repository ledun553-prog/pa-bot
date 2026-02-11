/**
 * Cache for klines data organized by symbol and timeframe
 */
class KlinesCache {
  constructor() {
    // Structure: { symbol: { timeframe: [klines] } }
    this.cache = {};
  }

  /**
   * Initialize cache for a symbol/timeframe pair
   */
  init(symbol, timeframe, initialKlines = []) {
    if (!this.cache[symbol]) {
      this.cache[symbol] = {};
    }
    this.cache[symbol][timeframe] = initialKlines;
    console.log(`[KlinesCache] Initialized ${symbol} ${timeframe} with ${initialKlines.length} candles`);
  }

  /**
   * Update cache with a new closed candle
   * Replaces the last candle if it has the same openTime, otherwise appends
   */
  updateCandle(symbol, timeframe, newCandle) {
    if (!this.cache[symbol] || !this.cache[symbol][timeframe]) {
      console.warn(`[KlinesCache] Cache not initialized for ${symbol} ${timeframe}`);
      return;
    }

    const candles = this.cache[symbol][timeframe];
    
    if (candles.length === 0) {
      candles.push(newCandle);
      return;
    }

    const lastCandle = candles[candles.length - 1];
    
    // If same openTime, replace (update in progress)
    if (lastCandle.openTime === newCandle.openTime) {
      candles[candles.length - 1] = newCandle;
    } else {
      // New candle, append
      candles.push(newCandle);
      
      // Keep cache size reasonable (last 1000 candles)
      if (candles.length > 1000) {
        candles.shift();
      }
    }
  }

  /**
   * Get klines for a symbol/timeframe
   */
  get(symbol, timeframe) {
    if (!this.cache[symbol] || !this.cache[symbol][timeframe]) {
      return [];
    }
    return this.cache[symbol][timeframe];
  }

  /**
   * Get the most recent N candles
   */
  getRecent(symbol, timeframe, count) {
    const candles = this.get(symbol, timeframe);
    return candles.slice(-count);
  }

  /**
   * Get all symbols being cached
   */
  getSymbols() {
    return Object.keys(this.cache);
  }

  /**
   * Get all timeframes for a symbol
   */
  getTimeframes(symbol) {
    if (!this.cache[symbol]) {
      return [];
    }
    return Object.keys(this.cache[symbol]);
  }

  /**
   * Check if cache exists for symbol/timeframe
   */
  has(symbol, timeframe) {
    return this.cache[symbol] && this.cache[symbol][timeframe];
  }
}

module.exports = new KlinesCache();
