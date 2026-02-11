const https = require('https');

const BASE_URL = process.env.BINANCE_API_BASE || 'https://fapi.binance.com';

/**
 * Make an HTTPS GET request to Binance API
 */
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(new Error(`Failed to parse JSON: ${err.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Fetch klines (candlestick data) from Binance
 * @param {string} symbol - Trading pair symbol (e.g., 'BTCUSDT')
 * @param {string} interval - Timeframe (e.g., '1d', '4h', '1h', '15m')
 * @param {number} limit - Number of candles to fetch (default: 500, max: 1500)
 * @param {number} startTime - Start time in milliseconds (optional)
 * @param {number} endTime - End time in milliseconds (optional)
 * @returns {Promise<Array>} Array of kline data
 */
async function fetchKlines(symbol, interval, limit = 500, startTime = null, endTime = null) {
  let url = `${BASE_URL}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  
  if (startTime) {
    url += `&startTime=${startTime}`;
  }
  if (endTime) {
    url += `&endTime=${endTime}`;
  }

  const data = await httpsGet(url);
  
  // Transform Binance kline format to our internal format
  return data.map(k => ({
    openTime: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
    closeTime: k[6],
    quoteVolume: parseFloat(k[7]),
    trades: k[8],
    takerBuyBaseVolume: parseFloat(k[9]),
    takerBuyQuoteVolume: parseFloat(k[10]),
    isClosed: true // Historical klines are always closed
  }));
}

/**
 * Fetch 24hr ticker price change statistics
 * @param {string} symbol - Trading pair symbol
 * @returns {Promise<Object>} 24hr ticker data
 */
async function fetch24hrTicker(symbol) {
  const url = `${BASE_URL}/fapi/v1/ticker/24hr?symbol=${symbol}`;
  return await httpsGet(url);
}

module.exports = {
  fetchKlines,
  fetch24hrTicker
};
