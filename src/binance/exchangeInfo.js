const https = require('https');

const BASE_URL = process.env.BINANCE_API_BASE || 'https://fapi.binance.com';

/**
 * Make an HTTPS GET request
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
 * Fetch exchange info to validate symbols
 * @returns {Promise<Object>} Exchange info with symbols array
 */
async function fetchExchangeInfo() {
  const url = `${BASE_URL}/fapi/v1/exchangeInfo`;
  return await httpsGet(url);
}

/**
 * Validate and normalize symbols
 * Maps XAUUSD to XAUUSDT if XAUUSDT exists
 * @param {Array<string>} symbols - Array of symbol strings
 * @returns {Promise<Array<string>>} Validated and normalized symbols
 */
async function validateSymbols(symbols) {
  const exchangeInfo = await fetchExchangeInfo();
  const validSymbols = exchangeInfo.symbols
    .filter(s => s.status === 'TRADING')
    .map(s => s.symbol);

  const validSymbolsSet = new Set(validSymbols);
  const normalized = [];

  for (const symbol of symbols) {
    const trimmed = symbol.trim().toUpperCase();
    
    // Handle XAUUSD -> XAUUSDT mapping
    if (trimmed === 'XAUUSD' && validSymbolsSet.has('XAUUSDT')) {
      console.log(`[ExchangeInfo] Mapping ${trimmed} to XAUUSDT`);
      normalized.push('XAUUSDT');
    } else if (validSymbolsSet.has(trimmed)) {
      normalized.push(trimmed);
    } else {
      console.warn(`[ExchangeInfo] Symbol ${trimmed} not found or not trading`);
    }
  }

  return normalized;
}

module.exports = {
  fetchExchangeInfo,
  validateSymbols
};
