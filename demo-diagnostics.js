#!/usr/bin/env node
/**
 * Demonstration of all diagnostic features
 * Shows examples of all new functionality
 */

const chalk = require('chalk');

console.log('='.repeat(80));
console.log('                  PA-BOT DIAGNOSTICS DEMONSTRATION');
console.log('='.repeat(80));
console.log();

// Feature 1: Candle Validation
console.log(chalk.bold.blue('1. CANDLE DATA VALIDATION'));
console.log('-'.repeat(80));
console.log();

const { validateCandle, validateCandles } = require('./src/utils/validateCandle');

console.log(chalk.yellow('Example 1: Valid candle'));
const validCandle = { open: 100, high: 105, low: 95, close: 102, volume: 1000 };
const result1 = validateCandle(validCandle);
console.log(`  Input:  open=100, high=105, low=95, close=102, volume=1000`);
console.log(`  Result: ${result1.valid ? chalk.green('✓ Valid') : chalk.red('✗ Invalid')}`);
console.log();

console.log(chalk.yellow('Example 2: Invalid candle (high < close)'));
const invalidCandle = { open: 100, high: 99, low: 95, close: 102, volume: 1000 };
const result2 = validateCandle(invalidCandle);
console.log(`  Input:  open=100, high=99, low=95, close=102, volume=1000`);
console.log(`  Result: ${result2.valid ? chalk.green('✓ Valid') : chalk.red('✗ Invalid')}`);
if (!result2.valid) console.log(`  Reason: ${chalk.red(result2.reason)}`);
console.log();

console.log(chalk.yellow('Example 3: Array validation (filters out invalid)'));
const testCandles = [
  { open: 100, high: 105, low: 95, close: 102, volume: 1000 },  // valid
  { open: 102, high: 107, low: 100, close: 105, volume: 1200 }, // valid
  { open: 105, high: 103, low: 100, close: 102, volume: 900 },  // invalid
  { open: 102, high: 108, low: 95, close: 100, volume: NaN }    // invalid
];
const arrayResult = validateCandles(testCandles, 'DEMO', '1h');
console.log(`  Input:  4 candles`);
console.log(`  Result: ${chalk.green(arrayResult.valid.length + ' valid')}, ${chalk.red(arrayResult.invalidCount + ' invalid')}`);
console.log();

// Feature 2: Diagnostic Mode Examples
console.log(chalk.bold.blue('2. DIAGNOSTIC MODE (DIAGNOSTIC_MODE=true)'));
console.log('-'.repeat(80));
console.log();

console.log(chalk.yellow('Example rejection messages:'));
const diagnosticMessages = [
  { symbol: 'BTCUSDT', tf: '1h', status: chalk.red('✗'), reason: 'Insufficient data (95 candles, need 100+)' },
  { symbol: 'ETHUSDT', tf: '1h', status: chalk.red('✗'), reason: 'No setup detected' },
  { symbol: 'BNBUSDT', tf: '4h', status: chalk.red('✗'), reason: 'HTF misalignment (setup=LONG, HTF=4h:SHORT)' },
  { symbol: 'XRPUSDT', tf: '1h', status: chalk.red('✗'), reason: 'Score below threshold (62 < 70)' },
  { symbol: 'ADAUSDT', tf: '1h', status: chalk.red('✗'), reason: 'Min RR not met (1.2 < 1.5)' },
  { symbol: 'DOGEUSDT', tf: '1h', status: chalk.red('✗'), reason: 'Anti-chase rejected (too extended)' },
  { symbol: 'SOLUSDT', tf: '1h', status: chalk.red('✗'), reason: 'Cooldown active (zone=support_43250)' },
];

diagnosticMessages.forEach(msg => {
  console.log(`  [Engine] ${msg.symbol} ${msg.tf}: ${msg.status} ${msg.reason}`);
});
console.log();

// Feature 3: Symbol Validation
console.log(chalk.bold.blue('3. SYMBOL VALIDATION (VERBOSE_SYMBOL_VALIDATION=true)'));
console.log('-'.repeat(80));
console.log();

console.log(chalk.yellow('Example validation table:'));
console.log();
console.log('================================================================================');
console.log('SYMBOL VALIDATION REPORT');
console.log('================================================================================');
console.log(
  'Requested'.padEnd(15) + 
  'Normalized'.padEnd(15) + 
  'Status'.padEnd(20) + 
  'Reason'
);
console.log('-'.repeat(80));

const validationExamples = [
  { req: 'BTCUSDT', norm: 'BTCUSDT', status: chalk.green('accepted'), reason: 'Valid TRADING USDT-M perpetual futures' },
  { req: 'ETHUSDT', norm: 'ETHUSDT', status: chalk.green('accepted'), reason: 'Valid TRADING USDT-M perpetual futures' },
  { req: 'XAUUSD', norm: 'XAUUSDT', status: chalk.green('accepted (mapped)'), reason: 'Mapped from XAUUSD to XAUUSDT' },
  { req: 'TRBUSDT', norm: 'TRBUSDT', status: chalk.red('rejected'), reason: 'Symbol not found on Binance USDT-M futures' },
  { req: 'TRIAUSDT', norm: 'TRIAUSDT', status: chalk.red('rejected'), reason: 'Contract type is DELIVERY, not PERPETUAL' },
];

validationExamples.forEach(v => {
  console.log(
    v.req.padEnd(15) +
    v.norm.padEnd(15) +
    v.status.padEnd(20 + (v.status.includes('\x1b') ? 9 : 0)) + // adjust for ANSI codes
    v.reason
  );
});

console.log('================================================================================');
console.log(`Total Requested: 5, ${chalk.green('Accepted: 3')}, ${chalk.red('Rejected: 2')}`);
console.log('================================================================================');
console.log();

// Feature 4: Initial Fetch Retry
console.log(chalk.bold.blue('4. INITIAL FETCH RETRY & DISABLE'));
console.log('-'.repeat(80));
console.log();

console.log(chalk.yellow('Example retry sequence:'));
console.log('  [Init] Fetching TRBUSDT 1h...');
console.log('  [Init] ' + chalk.red('✗ Failed to fetch TRBUSDT 1h (attempt 1/3): HTTP 400'));
console.log('  [Init] Fetching TRBUSDT 1h (retry 1/3)...');
console.log('  [Init] ' + chalk.red('✗ Failed to fetch TRBUSDT 1h (attempt 2/3): HTTP 400'));
console.log('  [Init] Fetching TRBUSDT 1h (retry 2/3)...');
console.log('  [Init] ' + chalk.red('✗ Failed to fetch TRBUSDT 1h (attempt 3/3): HTTP 400'));
console.log('  [Init] ' + chalk.red('✗✗ TRBUSDT 1h: MAX RETRIES REACHED - Symbol/timeframe disabled'));
console.log();

console.log(chalk.yellow('Example disabled symbols warning:'));
console.log();
console.log('============================================================');
console.log(chalk.yellow('⚠️  WARNING: Some symbols could not be initialized:'));
console.log('   - TRBUSDT');
console.log('   - TRIAUSDT');
console.log('These symbols will be removed from monitoring.');
console.log('============================================================');
console.log();
console.log('  [Init] Active symbols after filtering: BTCUSDT, ETHUSDT, BNBUSDT');
console.log();

// Feature 5: WebSocket Error Handling
console.log(chalk.bold.blue('5. WEBSOCKET ERROR HANDLING'));
console.log('-'.repeat(80));
console.log();

console.log(chalk.yellow('Example WebSocket error messages:'));
console.log('  [WS] Error parsing message: Unexpected token < in JSON');
console.log('  [WS] Raw message: <html>503 Service Unavailable</html>');
console.log();
console.log('  [WS] Error handling kline message from stream ' + chalk.cyan('btcusdt@kline_1h') + ': k is undefined');
console.log('  [WS] Data keys: stream, data');
console.log();

// Summary
console.log('='.repeat(80));
console.log(chalk.bold.green('✓ ALL DIAGNOSTIC FEATURES DEMONSTRATED'));
console.log('='.repeat(80));
console.log();

console.log(chalk.bold('To enable these features in production:'));
console.log();
console.log('  # In your .env file:');
console.log('  VERBOSE_SYMBOL_VALIDATION=true  # Show validation table on startup');
console.log('  DIAGNOSTIC_MODE=true            # Show rejection reasons per candle');
console.log();
console.log('='.repeat(80));
