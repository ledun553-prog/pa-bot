# PA-Bot V2 Enhancement Summary

## Overview
PA V2 brings advanced price action analysis capabilities with focus on high-quality setup detection, market structure awareness, and intelligent signal filtering.

## Major Features

### 1. Advanced Setup Detection
- **Liquidity Sweeps**: Detect when price sweeps liquidity at swing highs/lows and reverses
  - Configurable thresholds: `SWEEP_PCT`, `RECLAIM_PCT`, `WICK_REJECTION_MIN`
  - Volume confirmation required
  - Highest priority in setup detection

- **Trap Patterns**: Identify false breakouts/breakdowns with strong rejection
  - Similar to sweeps but at zone levels
  - Strong wick rejection required

- **Breakout-Retest-Confirmation**: 3-stage validation for entries
  1. Breakout: Close beyond zone
  2. Retest: Price returns to zone within `RETEST_MAX_BARS`
  3. Confirmation: Pinbar or engulfing pattern within `CONFIRMATION_WINDOW`

- **False Break Confirmation**: Detect false breaks with immediate confirmation
  - Wick beyond zone but close back inside
  - Requires confirmation candle in next N bars

### 2. Market Structure Analysis (BOS/CHOCH)
- **Break of Structure (BOS)**: Continuation pattern detection
  - Price breaks recent swing high/low in trend direction
  
- **Change of Character (CHOCH)**: Reversal detection
  - Price breaks structure against trend
  - Used as powerful cooldown bypass trigger
  
- **Market Structure States**: HH/HL, LH/LL, mixed states
  - Clearer trend identification
  - Enhanced scoring bonus

### 3. Cooldown Bypass System
Default cooldown: 90 minutes (configurable per market)

**Bypass conditions:**
1. **CHOCH Detected**: Strong reversal signal overrides cooldown
2. **ATR Spike**: Volatility surge indicates significant move
3. **Strong Sweep/Trap**: High-quality setup (strength >= 0.6)

Configure via:
- `COOLDOWN_BYPASS_ON_CHOCH=true` (default)
- `ATR_SPIKE_RATIO=1.5` (default)
- Per-market in `config/markets.json`

### 4. Enhanced Scoring
**V2 Setup Priority Scoring:**
- Liquidity Sweep: Up to 35 points (18 base + strength bonus)
- Trap: Up to 30 points
- Breakout-Retest: Up to 28 points
- False Break Confirmed: Up to 27 points
- Original setups: Lower base scores

**Bonus Points:**
- BOS/CHOCH Alignment: 0-15 points
- Sweep/Trap Strength: 0-12 points
- Retest Confirmation: 0-10 points
- False Break: 0-8 points
- RSI Divergence: 0-10 points (configurable)

### 5. Per-Market Configuration
File: `config/markets.json`

Override any threshold per symbol:
```json
{
  "BTCUSDT": {
    "VOLUME_SPIKE_THRESHOLD": 1.4,
    "SIGNAL_COOLDOWN_MINUTES": 120,
    "ENTRY_SCORE_THRESHOLD": 75
  }
}
```

All V2 parameters supported.

### 6. Telegram Message Enhancements
**Vietnamese Professional Format (maintained from PR #1)**

**New Information Displayed:**
- ⚡ CHOCH/�� BOS event mentions with direction
- 💥 ATR spike notifications
- Liquidity sweep details (wick %, volume confirmation)
- Retest + confirmation details
- Cooldown bypass reasons
- Enhanced volume ratio display

**Footer**: Configurable via `SIGNAL_SOURCE_TEXT`
- Default: `Nguồn Posiya Tú zalo 0763888872`

### 7. Backtesting Enhancements
**Setup Type Breakdown:**
- Per-setup win rate, R:R, expectancy
- Aggregated summary across all symbols
- Easy identification of best-performing setups

**Usage:**
```bash
node scripts/backtest.js --symbol BTCUSDT --timeframe 1h --period 30d
```

## Configuration

### Key Environment Variables
```bash
# Entry & HTF Timeframes (V2: both 1h,4h)
ENTRY_TIMEFRAMES=1h,4h
HTF_TIMEFRAMES=1h,4h

# Cooldown (V2: increased to 90)
SIGNAL_COOLDOWN_MINUTES=90

# Volume Confirmation
VOLUME_SPIKE_THRESHOLD=1.5
REQUIRE_VOLUME_CONFIRMATION=true

# Liquidity Sweep/Trap
SWEEP_PCT=0.3
RECLAIM_PCT=0.2
WICK_REJECTION_MIN=0.5

# Retest Logic
RETEST_MAX_BARS=4
CONFIRMATION_WINDOW=2

# ATR Spike
ATR_SPIKE_RATIO=1.5

# Cooldown Bypass
COOLDOWN_BYPASS_ON_CHOCH=true

# Telegram Footer
SIGNAL_SOURCE_TEXT=Nguồn Posiya Tú zalo 0763888872
```

### Changed Defaults
- `SIGNAL_COOLDOWN_MINUTES`: 60 → 90
- `ENTRY_TIMEFRAMES`: 1h → 1h,4h
- `HTF_TIMEFRAMES`: 4h,1d → 1h,4h
- `SIGNAL_STAGE_ENABLED`: setup,entry → entry (ENTRY-only)

## Files Added/Modified

### New Files
- `src/indicators/atr.js` - ATR calculation and spike detection
- `src/pa/liquidity.js` - Liquidity sweep and trap logic
- `src/pa/retest.js` - Breakout-retest-confirmation logic
- `config/markets.json` - Per-market threshold overrides
- `docs/ENV.example` - Comprehensive V2 environment docs

### Enhanced Files
- `src/pa/structure.js` - BOS/CHOCH detection
- `src/pa/setups.js` - V2 setup priority system
- `src/pa/score.js` - V2 scoring with bonuses
- `src/store/cooldown.js` - Bypass evaluation logic
- `src/app/engine.js` - V2 integration and market configs
- `src/notify/format.js` - V2 message formatting
- `scripts/backtest.js` - Setup type breakdown
- `.env.example` - V2 variables

## Quick Start

### 1. Configuration
```bash
cp .env.example .env
# Edit .env with your credentials and preferences
```

### 2. Market-Specific Tuning (Optional)
Edit `config/markets.json` to customize per symbol.

### 3. Run Bot
```bash
npm start
```

### 4. Backtest (Optional)
```bash
node scripts/backtest.js --symbol BTCUSDT --timeframe 1h --period 30d
```

## Migration from V1

### Automatic Migration
- All V2 features are opt-in via configuration
- Default behavior is ENTRY-only (no intrabar)
- Backward compatible with existing env variables

### Recommended Steps
1. Review `docs/ENV.example` for all new variables
2. Start with default V2 settings
3. Monitor signals for 1-2 days
4. Tune per market based on results
5. Use backtest to validate settings

### Breaking Changes
None! Fully backward compatible.

## Cooldown Bypass Examples

### Example 1: CHOCH Override
```
Normal: Cooldown active (45 min remaining)
CHOCH Detected: Cooldown bypassed - "CHOCH tăng - Đảo chiều cấu trúc thị trường"
Signal Sent: ✅
```

### Example 2: ATR Spike Override
```
Normal: Cooldown active
ATR Spike: Current ATR 2.1x average
Cooldown Bypassed: "ATR spike detected (2.1x avg)"
Signal Sent: ✅
```

### Example 3: Strong Sweep Override
```
Normal: Cooldown active
Liquidity Sweep: 72% wick rejection, volume confirmed
Strength: 0.86 (>= 0.6 threshold)
Cooldown Bypassed: "Strong liquidity_sweep_bull detected (strength: 86%)"
Signal Sent: ✅
```

## Tuning Tips

### Too Many Signals?
1. Increase `ENTRY_SCORE_THRESHOLD` (default: 70)
2. Increase `MIN_RR` (default: 1.5)
3. Tighten `VOLUME_SPIKE_THRESHOLD` (default: 1.5)
4. Increase `SIGNAL_COOLDOWN_MINUTES` per market

### Not Enough Signals?
1. Decrease `ENTRY_SCORE_THRESHOLD`
2. Lower `MIN_RR`
3. Relax `VOLUME_SPIKE_THRESHOLD`
4. Enable `COOLDOWN_BYPASS_ON_CHOCH=true`

### False Positives?
1. Increase `WICK_REJECTION_MIN` for sweeps (default: 0.5)
2. Increase `RETEST_MAX_BARS` for stricter retests
3. Increase `SWEEP_PCT` for deeper sweeps only

### Missing Good Setups?
1. Check cooldown bypass is enabled
2. Review `ATR_SPIKE_RATIO` - lower for more sensitivity
3. Check per-market configs aren't too restrictive

## Support

For issues or questions:
- GitHub Issues: [pa-bot repository]
- Review `docs/ENV.example` for detailed variable docs
- Check `config/markets.json` for per-market examples

## License

MIT
