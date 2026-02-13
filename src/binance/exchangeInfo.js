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
  const allSymbols = exchangeInfo.symbols;
  
  // Create map of symbol -> info for quick lookups
  const symbolInfoMap = new Map();
  allSymbols.forEach(s => symbolInfoMap.set(s.symbol, s));

  const validSymbols = allSymbols
    .filter(s => s.status === 'TRADING' && s.contractType === 'PERPETUAL')
    .map(s => s.symbol);

  const validSymbolsSet = new Set(validSymbols);
  const normalized = [];
  const verboseMode = process.env.VERBOSE_SYMBOL_VALIDATION === 'true';
  const validationResults = [];

  for (const symbol of symbols) {
    const trimmed = symbol.trim().toUpperCase();
    let status = 'unknown';
    let reason = '';
    let normalizedSymbol = trimmed;
    
    // Handle XAUUSD -> XAUUSDT mapping
    if (trimmed === 'XAUUSD' && validSymbolsSet.has('XAUUSDT')) {
      console.log(`[ExchangeInfo] ✓ Mapping ${trimmed} to XAUUSDT`);
      normalized.push('XAUUSDT');
      normalizedSymbol = 'XAUUSDT';
      status = 'accepted (mapped)';
      reason = 'Mapped from XAUUSD to XAUUSDT';
    } else if (validSymbolsSet.has(trimmed)) {
      console.log(`[ExchangeInfo] ✓ Symbol ${trimmed} validated`);
      normalized.push(trimmed);
      status = 'accepted';
      reason = 'Valid TRADING USDT-M perpetual futures';
    } else {
      // Detailed rejection reason
      const symbolInfo = symbolInfoMap.get(trimmed);
      if (!symbolInfo) {
        status = 'rejected';
        reason = 'Symbol not found on Binance USDT-M futures';
        console.warn(`[ExchangeInfo] ✗ Symbol ${trimmed} REJECTED: Not found on exchange`);
      } else if (symbolInfo.status !== 'TRADING') {
        status = 'rejected';
        reason = `Symbol status is ${symbolInfo.status}, not TRADING`;
        console.warn(`[ExchangeInfo] ✗ Symbol ${trimmed} REJECTED: Status ${symbolInfo.status}`);
      } else if (symbolInfo.contractType !== 'PERPETUAL') {
        status = 'rejected';
        reason = `Contract type is ${symbolInfo.contractType}, not PERPETUAL`;
        console.warn(`[ExchangeInfo] ✗ Symbol ${trimmed} REJECTED: Contract type ${symbolInfo.contractType}`);
      } else {
        status = 'rejected';
        reason = 'Unknown rejection reason';
        console.warn(`[ExchangeInfo] ✗ Symbol ${trimmed} REJECTED: Unknown reason`);
      }
    }

    validationResults.push({
      requested: symbol,
      normalized: normalizedSymbol,
      status,
      reason
    });
  }

  // Print validation table if verbose mode enabled
  if (verboseMode) {
    console.log('\n' + '='.repeat(80));
    console.log('SYMBOL VALIDATION REPORT');
    console.log('='.repeat(80));
    console.log(
      'Requested'.padEnd(15) + 
      'Normalized'.padEnd(15) + 
      'Status'.padEnd(20) + 
      'Reason'
    );
    console.log('-'.repeat(80));
    validationResults.forEach(r => {
      console.log(
        r.requested.padEnd(15) +
        r.normalized.padEnd(15) +
        r.status.padEnd(20) +
        r.reason
      );
    });
    console.log('='.repeat(80));
    console.log(`Total Requested: ${symbols.length}, Accepted: ${normalized.length}, Rejected: ${symbols.length - normalized.length}`);
    console.log('='.repeat(80) + '\n');
  }

  return normalized;
}

module.exports = {
  fetchExchangeInfo,
  validateSymbols
};
