require('dotenv').config();

const { validateSymbols } = require('./binance/exchangeInfo');
const { fetchKlines } = require('./binance/rest');
const klinesCache = require('./binance/klinesCache');
const binanceWS = require('./binance/ws');
const { initDatabase, cleanupExpiredCooldowns } = require('./store/db');
const telegram = require('./notify/telegram');
const SignalEngine = require('./app/engine');

class PABot {
  constructor() {
    this.symbols = [];
    this.timeframes = [];
    this.engine = null;
  }

  async init() {
    console.log('='.repeat(60));
    console.log('PA-Bot: Price Action + Volume Signal Bot');
    console.log('='.repeat(60));
    console.log();

    try {
      this.loadConfig();

      initDatabase();
      cleanupExpiredCooldowns();

      // Validate telegram module exports before using
      if (typeof telegram !== 'object') {
        throw new Error('Telegram module must export an object');
      }
      if (typeof telegram.initTelegram !== 'function') {
        throw new Error('telegram.initTelegram must be a function');
      }
      if (typeof telegram.testConnection !== 'function') {
        throw new Error('telegram.testConnection must be a function');
      }
      if (typeof telegram.sendMessage !== 'function') {
        throw new Error('telegram.sendMessage must be a function');
      }
      if (typeof telegram.sendSignal !== 'function') {
        throw new Error('telegram.sendSignal must be a function');
      }

      telegram.initTelegram();

      const testConnectionEnabled = process.env.TELEGRAM_SEND_CONNECTION_TEST === 'true';
      if (testConnectionEnabled) {
        await telegram.testConnection();
      } else {
        console.log('[Init] Telegram connection test disabled (TELEGRAM_SEND_CONNECTION_TEST not set to true)');
      }

      console.log('[Init] Validating symbols...');
      this.symbols = await validateSymbols(this.rawSymbols);
      console.log('[Init] Validated symbols:', this.symbols.join(', '));
      if (this.symbols.length === 0) throw new Error('No valid symbols to monitor');

      this.engine = new SignalEngine();

      await this.fetchInitialData();

      this.connectWebSocket();

      this.setupCleanup();

      const startupNotificationEnabled = process.env.TELEGRAM_SEND_STARTUP === 'true';
      if (startupNotificationEnabled) {
        await this.sendStartupNotification();
      } else {
        console.log('[Init] Startup notification disabled (TELEGRAM_SEND_STARTUP not set to true)');
      }

      console.log();
      console.log('='.repeat(60));
      console.log('✅ PA-Bot started successfully!');
      console.log('='.repeat(60));
      console.log();
    } catch (err) {
      console.error('❌ Failed to initialize PA-Bot:', err.message);
      console.error(err.stack);
      process.exit(1);
    }
  }

  loadConfig() {
    const symbolsEnv = process.env.SYMBOLS || 'BTCUSDT,ETHUSDT';
    this.rawSymbols = symbolsEnv.split(',').map((s) => s.trim()).filter((s) => s);

    const timeframesEnv = process.env.TIMEFRAMES || '4h,1h,15m';
    this.timeframes = timeframesEnv.split(',').map((tf) => tf.trim()).filter((tf) => tf);

    console.log('[Config] Symbols:', this.rawSymbols.join(', '));
    console.log('[Config] Timeframes:', this.timeframes.join(', '));
    console.log('[Config] DRY_RUN:', process.env.DRY_RUN === 'true' ? 'YES' : 'NO');

    // ENTRY-only defaults (informational)
    console.log('[Config] SIGNAL_STAGE_ENABLED:', process.env.SIGNAL_STAGE_ENABLED || 'entry');
    console.log('[Config] ENTRY_TIMEFRAMES:', process.env.ENTRY_TIMEFRAMES || '15m,1h');
    console.log('[Config] HTF_TIMEFRAMES:', process.env.HTF_TIMEFRAMES || '4h,1h');
  }

  async fetchInitialData() {
    console.log('[Init] Fetching initial historical data...');

    const disabledSymbols = new Set();
    const maxRetries = 3;

    for (const symbol of this.symbols) {
      for (const timeframe of this.timeframes) {
        let retries = 0;
        let success = false;

        while (retries < maxRetries && !success) {
          try {
            console.log(`[Init] Fetching ${symbol} ${timeframe}${retries > 0 ? ` (retry ${retries}/${maxRetries})` : ''}...`);
            const klines = await fetchKlines(symbol, timeframe, 500);
            klinesCache.init(symbol, timeframe, klines);
            console.log(`[Init] ✓ ${symbol} ${timeframe}: ${klines.length} candles`);
            success = true;
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (err) {
            retries++;
            console.error(`[Init] ✗ Failed to fetch ${symbol} ${timeframe} (attempt ${retries}/${maxRetries}):`, err.message);
            
            if (retries >= maxRetries) {
              disabledSymbols.add(symbol);
              console.error(`[Init] ✗✗ ${symbol} ${timeframe}: MAX RETRIES REACHED - Symbol/timeframe disabled`);
            } else {
              // Wait before retry with exponential backoff
              await new Promise((resolve) => setTimeout(resolve, 1000 * retries));
            }
          }
        }
      }
    }

    // Remove disabled symbols from active symbols list
    if (disabledSymbols.size > 0) {
      console.warn('\n' + '='.repeat(60));
      console.warn('⚠️  WARNING: Some symbols could not be initialized:');
      disabledSymbols.forEach(sym => console.warn(`   - ${sym}`));
      console.warn('These symbols will be removed from monitoring.');
      console.warn('='.repeat(60) + '\n');

      this.symbols = this.symbols.filter(s => !disabledSymbols.has(s));
      
      if (this.symbols.length === 0) {
        throw new Error('All symbols failed to initialize. Cannot continue.');
      }

      console.log(`[Init] Active symbols after filtering: ${this.symbols.join(', ')}`);
    }

    console.log('[Init] Initial data fetch complete');
  }

  connectWebSocket() {
    console.log('[Init] Connecting to Binance WebSocket...');

    binanceWS.connect(
      this.symbols,
      this.timeframes,
      (symbol, timeframe, candle) => {
        this.engine.onCandleClosed(symbol, timeframe, candle);
      },
      // ENTRY-only: ignore intrabar callback to reduce CPU/network on VPS
      null
    );
  }

  setupCleanup() {
    setInterval(() => {
      console.log('[Cleanup] Running periodic cleanup...');
      cleanupExpiredCooldowns();
    }, 60 * 60 * 1000);
  }

  async sendStartupNotification() {
    const message =
      `🚀 <b>PA-Bot Started</b>\n\n` +
      `Monitoring: ${this.symbols.length} symbols\n` +
      `Timeframes: ${this.timeframes.join(', ')}\n` +
      `ENTRY Timeframes: ${process.env.ENTRY_TIMEFRAMES || '1h'}\n` +
      `Min Score: ${process.env.ENTRY_SCORE_THRESHOLD || process.env.MIN_SIGNAL_SCORE || 70}\n` +
      `Cooldown: ${process.env.SIGNAL_COOLDOWN_MINUTES || 60}m`;

    await telegram.sendMessage(message);
  }

  async shutdown() {
    console.log('\n[Shutdown] Shutting down PA-Bot...');
    try {
      binanceWS.close();
      const { closeDatabase } = require('./store/db');
      closeDatabase();
      console.log('[Shutdown] ✓ Shutdown complete');
      process.exit(0);
    } catch (err) {
      console.error('[Shutdown] Error during shutdown:', err.message);
      process.exit(1);
    }
  }
}

const bot = new PABot();

process.on('SIGINT', () => bot.shutdown());
process.on('SIGTERM', () => bot.shutdown());

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  bot.shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

bot.init().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
