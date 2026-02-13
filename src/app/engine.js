const klinesCache = require('../binance/klinesCache');
const { analyzeMarketStructure, determineHTFBias, checkHTFAlignment, detectRecentStructureEvents } = require('../pa/structure');
const { detectSetup } = require('../pa/setups');
const { calculateScore, calculateLevels } = require('../pa/score');
const { detectRSIDivergence } = require('../indicators/rsi');
const { detectATRSpike } = require('../indicators/atr');
const { getRecentPivotHighs, getRecentPivotLows } = require('../pa/pivots');
const { isOnCooldown, addCooldown, evaluateCooldownBypass } = require('../store/cooldown');
const { saveSignal } = require('../store/signals');
const { sendSignal } = require('../notify/telegram');
const { evaluateChaseRisk } = require('../pa/antiChase');
const fs = require('fs');
const path = require('path');

/**
 * Main signal detection engine
 * ENTRY-only by default (SETUP disabled unless explicitly enabled)
 * V2: Enhanced with market configs, cooldown bypass, BOS/CHOCH, ATR spike detection
 */
class SignalEngine {
  constructor(config = {}) {
    // Default ENTRY-only
    const stagesEnabled = (process.env.SIGNAL_STAGE_ENABLED || 'entry')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const entryTimeframes = (process.env.ENTRY_TIMEFRAMES || '1h,4h')
      .split(',')
      .map((tf) => tf.trim())
      .filter(Boolean);

    const htfTimeframes = (process.env.HTF_TIMEFRAMES || '1h,4h')
      .split(',')
      .map((tf) => tf.trim())
      .filter(Boolean);

    // Load market-specific configs
    this.marketConfigs = this.loadMarketConfigs();

    this.config = {
      pivotWindow: parseInt(process.env.PIVOT_WINDOW) || 5,
      zoneLookback: parseInt(process.env.ZONE_LOOKBACK) || 100,
      zoneTolerance: parseFloat(process.env.ZONE_TOLERANCE_PCT) || 0.5,
      volumeSpikeThreshold: parseFloat(process.env.VOLUME_SPIKE_THRESHOLD) || 1.5,
      minScore: parseInt(process.env.MIN_SIGNAL_SCORE) || 70, // legacy
      setupScoreThreshold: parseInt(process.env.SETUP_SCORE_THRESHOLD) || 50,
      entryScoreThreshold: parseInt(process.env.ENTRY_SCORE_THRESHOLD) || 70,
      cooldownMinutes: parseInt(process.env.SIGNAL_COOLDOWN_MINUTES) || 90,
      zoneSLBuffer: parseFloat(process.env.ZONE_SL_BUFFER_PCT) || 0.2,
      minZonesRequired: parseInt(process.env.MIN_ZONES_REQUIRED) || 2,
      minRR: parseFloat(process.env.MIN_RR) || 1.5,
      antiChaseMaxATR: parseFloat(process.env.ANTI_CHASE_MAX_ATR) || 2.0,
      antiChaseMaxPct: parseFloat(process.env.ANTI_CHASE_MAX_PCT) || 3.0,
      rsiDivergenceBonus: parseInt(process.env.RSI_DIVERGENCE_BONUS) || 10,
      requireVolumeConfirmation: (process.env.REQUIRE_VOLUME_CONFIRMATION || 'false') === 'true', // Changed default to false for 100% PA
      setupStageEnabled: stagesEnabled.includes('setup'),
      entryStageEnabled: stagesEnabled.includes('entry'),
      entryTimeframes,
      htfTimeframes,
      // V2 configs
      SWEEP_PCT: parseFloat(process.env.SWEEP_PCT) || 0.3,
      RECLAIM_PCT: parseFloat(process.env.RECLAIM_PCT) || 0.2,
      WICK_REJECTION_MIN: parseFloat(process.env.WICK_REJECTION_MIN) || 0.5,
      RETEST_MAX_BARS: parseInt(process.env.RETEST_MAX_BARS) || 4,
      CONFIRMATION_WINDOW: parseInt(process.env.CONFIRMATION_WINDOW) || 2,
      ATR_SPIKE_RATIO: parseFloat(process.env.ATR_SPIKE_RATIO) || 1.5,
      COOLDOWN_BYPASS_ON_CHOCH: (process.env.COOLDOWN_BYPASS_ON_CHOCH !== 'false'),
      ...config
    };

    // Keep map for compatibility, but setup is off by default
    this.setupAlerts = new Map();

    console.log('[Engine] Signal engine initialized with config:', this.config);
  }

  /**
   * Load market-specific configurations from config/markets.json
   */
  loadMarketConfigs() {
    try {
      const configPath = path.join(process.cwd(), 'config', 'markets.json');
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, 'utf8');
        const configs = JSON.parse(data);
        console.log('[Engine] Loaded market configs:', Object.keys(configs));
        return configs;
      }
    } catch (err) {
      console.warn('[Engine] Could not load market configs:', err.message);
    }
    return {};
  }

  /**
   * Get market-specific config merged with defaults
   */
  getMarketConfig(symbol) {
    const marketConfig = this.marketConfigs[symbol] || {};
    const defaults = this.marketConfigs._defaults || {};
    
    return {
      ...this.config,
      ...defaults,
      ...marketConfig
    };
  }

  async analyzeForEntry(symbol, timeframe, isIntrabar = false) {
    if (!this.config.entryStageEnabled) return null;

    try {
      const candles = klinesCache.get(symbol, timeframe);
      if (!candles || candles.length < 100) return null;

      // Get market-specific config
      const marketConfig = this.getMarketConfig(symbol);

      const setup = detectSetup(candles, marketConfig);
      if (!setup) return null;

      console.log(`[Engine] ENTRY: Setup detected: ${symbol} ${timeframe} - ${setup.name} (type: ${setup.setupType})`);

      const htfBias = await this.getHTFBias(symbol);
      const htfAlignment = checkHTFAlignment(setup.side, htfBias);

      if (!htfAlignment.aligned) {
        console.log(`[Engine] ENTRY: HTF not aligned for ${symbol} ${timeframe}, skipping ENTRY`);
        return null;
      }

      const pivotHighs = getRecentPivotHighs(candles, marketConfig.pivotWindow, 10);
      const pivotLows = getRecentPivotLows(candles, marketConfig.pivotWindow, 10);
      const divergence = detectRSIDivergence(candles, pivotHighs, pivotLows);

      // V2: Detect BOS/CHOCH events
      const structureEvents = detectRecentStructureEvents(candles, marketConfig.pivotWindow, 10);

      // V2: Detect ATR spike
      const atrSpike = detectATRSpike(candles, 14, marketConfig.ATR_SPIKE_RATIO);

      const currentCandle = candles[candles.length - 1];
      const recentCandles = candles.slice(-20);
      const avgVolume = recentCandles.reduce((sum, c) => sum + c.volume, 0) / recentCandles.length;
      const volumeRatio = currentCandle.volume / avgVolume;

      // Volume is now a scoring bonus, not a blocker (100% Price Action)
      if (marketConfig.requireVolumeConfirmation && volumeRatio < marketConfig.volumeSpikeThreshold) {
        console.log(
          `[Engine] ENTRY: Low volume (${volumeRatio.toFixed(2)}x < ${marketConfig.volumeSpikeThreshold}x) - will reduce score but not block signal`
        );
        // Note: Volume contributes to score but does NOT block signal
      }

      // V2: Enhanced scoring with structure events
      const scoreResult = calculateScore(setup, htfAlignment, candles, divergence, structureEvents, marketConfig);

      if (scoreResult.score < marketConfig.entryScoreThreshold) {
        console.log(
          `[Engine] ENTRY: Score too low (${scoreResult.score} < ${marketConfig.entryScoreThreshold}), skipping`
        );
        return null;
      }

      const levels = calculateLevels(setup, marketConfig.zoneSLBuffer);

      if (typeof levels.riskReward1 === 'number' && levels.riskReward1 < marketConfig.minRR) {
        console.log(
          `[Engine] ENTRY: R:R too low (${levels.riskReward1.toFixed(2)} < ${marketConfig.minRR}), skipping`
        );
        return null;
      }

      const chaseEval = evaluateChaseRisk(candles, setup, marketConfig);
      if (chaseEval.decision === 'CHASE_NO') return null;

      const zoneKey = setup.zone ? setup.zone.key : 'none';
      
      // V2: Check cooldown with bypass evaluation
      const signal = {
        stage: 'ENTRY',
        symbol,
        timeframe,
        side: setup.side,
        score: scoreResult.score,
        scoreBreakdown: scoreResult.breakdown,
        setup,
        htfBias,
        divergence,
        volumeRatio,
        levels,
        chaseEval,
        timestamp: currentCandle.closeTime,
        setup_type: setup.setupType || setup.type,
        setup_name: setup.name,
        entry: levels.entry,
        stop_loss: levels.stopLoss,
        take_profit1: levels.takeProfit1,
        take_profit2: levels.takeProfit2,
        take_profit3: levels.takeProfit3,
        risk_reward: levels.riskReward1,
        zone_key: zoneKey,
        // V2 additions
        bosEvent: structureEvents.bos,
        chochEvent: structureEvents.choch,
        atrSpike: atrSpike
      };

      const bypassEval = evaluateCooldownBypass(signal, marketConfig);
      
      if (isOnCooldown(symbol, timeframe, setup.side, zoneKey)) {
        if (bypassEval.bypass) {
          console.log(`[Engine] ENTRY: Cooldown bypassed - ${bypassEval.reason}`);
          signal.cooldownBypassed = true;
          signal.bypassReason = bypassEval.reason;
        } else {
          return null;
        }
      }

      console.log(`[Engine] 🎯 ENTRY SIGNAL: ${symbol} ${timeframe} ${setup.side} @ ${levels.entry}`);

      const sent = await sendSignal(signal);
      if (!sent) return null;

      saveSignal(signal);
      addCooldown(symbol, timeframe, setup.side, zoneKey, marketConfig.cooldownMinutes);

      return signal;
    } catch (err) {
      console.error(`[Engine] ENTRY: Error analyzing ${symbol} ${timeframe}:`, err.message);
      return null;
    }
  }

  // SETUP disabled by default: keep method for backward compatibility but short-circuit unless enabled
  async analyzeForSetup(symbol, timeframe) {
    if (!this.config.setupStageEnabled) return null;
    // If you ever re-enable setup, keep your old implementation or re-add here.
    return null;
  }

  async getHTFBias(symbol) {
    const structures = {};
    for (const tf of this.config.htfTimeframes) {
      const candles = klinesCache.get(symbol, tf);
      if (candles && candles.length >= 20) {
        structures[tf] = analyzeMarketStructure(candles, this.config.pivotWindow);
      }
    }
    return determineHTFBias(structures);
  }

  async onCandleClosed(symbol, timeframe, candle) {
    if (this.config.entryTimeframes.includes(timeframe)) {
      await this.analyzeForEntry(symbol, timeframe, false);
    }
  }

  async onIntrabarUpdate(symbol, timeframe, formingCandle) {
    // ENTRY-only: do nothing (intrabar setup disabled)
    return;
  }
}

module.exports = SignalEngine;
