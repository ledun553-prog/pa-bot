# PA-Bot: 100% Price Action Signal Bot

**Signal-only trading alert bot for Binance USDT-M futures** focusing on **pure Price Action analysis** with comprehensive candlestick pattern recognition and market structure.

⚠️ **DISCLAIMER**: This bot provides trading signals for educational purposes only. It does NOT execute trades automatically. All trading decisions and their consequences are the sole responsibility of the user. Cryptocurrency trading carries substantial risk of loss.

## 🎯 100% Price Action Strategy

This bot follows a **pure price action methodology** without relying on volume or indicators as required conditions. Instead, it focuses on:

- **Market Structure Analysis**: HH/HL (uptrend), LH/LL (downtrend) detection
- **Support & Resistance Zones**: Dynamic S/R identification from swing points
- **Breakout & Retest**: True breakout detection and retest confirmation
- **Candlestick Patterns**: 10+ reversal patterns for entry signals
- **Trend Following**: HTF bias alignment for high-probability setups

**Volume and RSI** are used as **scoring bonuses** only - they enhance signal quality but never block signals.

## Features

### Core Features

- 📊 **Multi-Timeframe Analysis**: Monitors 1d, 4h, 1h timeframes (configurable)
- 🎯 **100% Price Action Focus**: Pure price action without volume/indicator requirements
- 🕯️ **10+ Candlestick Patterns**: Comprehensive pattern library (see below)
- 📈 **Market Structure**: HH/HL, LH/LL detection, BOS/CHOCH identification
- 🎨 **Multiple Setup Types**: Reversals, breakouts, retests, liquidity sweeps, false break fades
- ⚡ **Real-Time WebSocket**: Live data from Binance with auto-reconnect
- 📱 **Telegram Alerts**: Formatted signals with all key information in Vietnamese
- 🗄️ **SQLite Storage**: Persistent signal history and cooldown management
- 🚫 **Deduplication**: Smart cooldown system to prevent spam
- 🏆 **Signal Scoring**: 0-145+ score based on multiple factors (configurable)

### Candlestick Patterns (100% Price Action)

The bot detects and scores these reversal patterns:

**Single Candle Patterns:**
- 🔨 **Pin Bar / Hammer** - Long lower wick rejection (bullish)
- 🌟 **Shooting Star** - Long upper wick rejection (bearish)
- ⚖️ **Doji** - Indecision candle (neutral, context-dependent)

**Two Candle Patterns:**
- 🟢 **Bullish Engulfing** - Large bullish candle engulfs previous bearish
- 🔴 **Bearish Engulfing** - Large bearish candle engulfs previous bullish
- 🟩 **Bullish Harami** - Small bullish inside large bearish (reversal signal)
- 🟥 **Bearish Harami** - Small bearish inside large bullish (reversal signal)
- 📦 **Inside Bar** - Consolidation awaiting breakout
- 🔧 **Tweezer Bottom** - Double bottom with similar lows (bullish reversal)
- 🔧 **Tweezer Top** - Double top with similar highs (bearish reversal)

**Three Candle Patterns:**
- ⭐ **Morning Star** - Bullish reversal at support (star gap down + bullish confirmation)
- 🌙 **Evening Star** - Bearish reversal at resistance (star gap up + bearish confirmation)
- ⬆️⬆️⬆️ **Three White Soldiers** - Strong bullish continuation (3 consecutive bullish candles)
- ⬇️⬇️⬇️ **Three Black Crows** - Strong bearish continuation (3 consecutive bearish candles)

**Pattern Configuration:** Each pattern can be enabled/disabled and has configurable weight for scoring.

### NEW: Advanced Signal Engine (100% Price Action)

- 🎚️ **Entry-Only Mode** (default):
  - **ENTRY**: Confirmed signal with clear entry/SL/TP, ready for action
  - Requires HTF alignment and minimum score threshold (default: 70)
  - Optional SETUP stage for early warnings (disabled by default)
  
- 🚦 **Anti-Chase Logic**: Prevents late entries with intelligent chase detection
  - ATR-based distance checks
  - Volume climax detection (bonus, not required)
  - Momentum analysis
  - Micro-structure analysis (CHoCH/BOS)
  
- 🎭 **Enhanced Patterns** (10+ patterns):
  - Pin bar (hammer/shooting star)
  - Engulfing patterns (bullish/bearish)
  - **Harami patterns** (bullish/bearish) - NEW
  - Inside bar + break
  - Morning/evening star
  - Tweezer top/bottom
  - Doji patterns
  - **Three White Soldiers** - NEW
  - **Three Black Crows** - NEW
  
- 📊 **Configurable Scoring** (100% Price Action): 
  - Separate thresholds for SETUP (50) and ENTRY (70)
  - **Pattern-based scoring** with configurable weights
  - RSI divergence as bonus (not required)
  - Volume as bonus (not required) - **Volume does NOT block signals**
  - Price action and structure are primary factors
  
- ✅ **Quality Filters**:
  - Minimum R:R ratio (default 1.5)
  - HTF alignment requirement for ENTRY
  - Pattern strength evaluation
  
- 📈 **Backtesting Tool**: Evaluate signal quality on historical data
  - Per-symbol and per-timeframe reporting
  - Win rate, avg R:R, and expectancy calculation

## Requirements

- **Node.js**: v18.0.0 or higher
- **npm**: Package manager
- **Binance Account**: Not required for data access (public API)
- **Telegram Bot**: Bot token and chat ID for notifications

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/posiyatu2037-eng/pa-bot.git
cd pa-bot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file and edit it:

```bash
cp .env.example .env
nano .env  # or use your preferred editor
```

**Required Variables:**

```env
# Symbols to monitor (comma-separated)
SYMBOLS=BTCUSDT,ETHUSDT,BNBUSDT

# Timeframes to monitor (default: 1d,4h,1h for pro-grade PA)
TIMEFRAMES=1d,4h,1h

# Telegram Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_id_here

# Optional: Send to Telegram group (e.g., -1001234567890)
TELEGRAM_GROUP_ID=

# Optional: Enable startup/connection test messages (default: false)
TELEGRAM_SEND_STARTUP=false
TELEGRAM_SEND_CONNECTION_TEST=false

# Optional: Customize signal source footer (default: "Posiya Tú zalo 0763888872")
SIGNAL_SOURCE_TEXT=Posiya Tú zalo 0763888872

# Signal Configuration (100% Price Action)
SIGNAL_COOLDOWN_MINUTES=60
MIN_SIGNAL_SCORE=70  # Legacy, kept for backward compatibility

# Two-Stage Alerts Configuration (ENTRY-only mode by default)
ENTRY_TIMEFRAMES=1h             # Timeframe(s) for entry signals
HTF_TIMEFRAMES=4h,1d            # Higher timeframes for bias
SIGNAL_STAGE_ENABLED=entry      # Only ENTRY stage (100% PA: no premature SETUP alerts)
SETUP_SCORE_THRESHOLD=50        # Score threshold for SETUP alerts (if enabled)
ENTRY_SCORE_THRESHOLD=70        # Score threshold for ENTRY alerts

# Risk & Quality Filters
MIN_RR=1.5                      # Minimum risk-reward ratio

# Anti-Chase Configuration
ANTI_CHASE_MAX_ATR=2.0          # Max ATR multiple for chase detection
ANTI_CHASE_MAX_PCT=3.0          # Max percentage move for chase detection

# 100% Price Action Scoring Configuration
RSI_DIVERGENCE_BONUS=10         # Bonus points for RSI divergence (optional)
REQUIRE_VOLUME_CONFIRMATION=false  # Volume is BONUS only, NOT required (100% PA)

# Pattern Detection Configuration (100% Price Action)
# Enable/disable specific candlestick patterns (default: all enabled)
PATTERN_PINBAR_ENABLED=true
PATTERN_ENGULFING_ENABLED=true
PATTERN_HARAMI_ENABLED=true
PATTERN_INSIDE_BAR_ENABLED=true
PATTERN_MORNING_STAR_ENABLED=true
PATTERN_EVENING_STAR_ENABLED=true
PATTERN_TWEEZER_ENABLED=true
PATTERN_DOJI_ENABLED=true
PATTERN_THREE_WHITE_SOLDIERS_ENABLED=true
PATTERN_THREE_BLACK_CROWS_ENABLED=true

# Pattern Scoring Weights (base points for each pattern type)
# These multiply with pattern strength (0-1) for final score contribution
PATTERN_PINBAR_WEIGHT=8
PATTERN_ENGULFING_WEIGHT=10
PATTERN_HARAMI_WEIGHT=9
PATTERN_INSIDE_BAR_WEIGHT=7
PATTERN_MORNING_STAR_WEIGHT=12
PATTERN_EVENING_STAR_WEIGHT=12
PATTERN_TWEEZER_WEIGHT=9
PATTERN_DOJI_WEIGHT=5
PATTERN_THREE_WHITE_SOLDIERS_WEIGHT=13
PATTERN_THREE_BLACK_CROWS_WEIGHT=13

# Price Action Configuration
PIVOT_WINDOW=5
ZONE_LOOKBACK=100
ZONE_TOLERANCE_PCT=0.5
VOLUME_SPIKE_THRESHOLD=1.5      # Used for scoring bonus only

# Breakout/Retest Parameters (100% Price Action)
BREAKOUT_TOLERANCE_PCT=0.3      # Tolerance for "touching" a zone
BREAKOUT_CONFIRMATION_CANDLES=2 # Candles to confirm breakout
BREAKOUT_MOVE_PCT=0.5           # % move to confirm breakout

# Zone-based SL/TP Configuration
ZONE_SL_BUFFER_PCT=0.2
MIN_ZONES_REQUIRED=2

# Application Settings
DRY_RUN=false
LOG_LEVEL=info
```

### 4. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` and follow the instructions
3. Copy the bot token and add it to `.env` as `TELEGRAM_BOT_TOKEN`
4. Start a chat with your bot
5. Get your chat ID by sending a message to your bot, then visiting:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
6. Look for `"chat":{"id":123456789}` in the response
7. Add the chat ID to `.env` as `TELEGRAM_CHAT_ID`

**Optional - Send to Group:**
- Add your bot to a Telegram group
- Get the group chat ID (usually starts with `-100`) from `/getUpdates`
- Add it to `.env` as `TELEGRAM_GROUP_ID`
- The bot will send signals to both private chat and group (duplicates are filtered)

## Configuration

### 100% Price Action Pattern Configuration

You can enable/disable individual candlestick patterns and configure their scoring weights:

**Pattern Enable/Disable:**
```env
# Set to false to disable a specific pattern
PATTERN_HARAMI_ENABLED=true
PATTERN_THREE_WHITE_SOLDIERS_ENABLED=true
# ... etc
```

**Pattern Scoring Weights:**
```env
# Adjust the base score contribution for each pattern
PATTERN_HARAMI_WEIGHT=9              # Harami patterns worth 9 points max
PATTERN_THREE_WHITE_SOLDIERS_WEIGHT=13  # Strong continuation patterns worth more
PATTERN_DOJI_WEIGHT=5                # Doji less significant (indecision)
```

**How Pattern Scoring Works:**
1. Pattern is detected with strength value (0-1)
2. Base weight is retrieved from config (default or env variable)
3. Final contribution = Weight × Strength
4. Example: Bullish Harami with 0.8 strength = 9 × 0.8 = 7.2 points

This allows you to:
- Disable patterns you don't trust
- Adjust importance of each pattern type
- Fine-tune scoring to match your trading style

### Symbol Mapping

- **XAUUSD**: Automatically mapped to **XAUUSDT** if it exists on Binance Futures
- Only active (TRADING status) symbols are validated
- Invalid symbols are automatically filtered out

### Timeframe Mode B (Default - Pro-Grade)

Optimized for stability with professional price action analysis:
- **1d**: Daily trend analysis for HTF bias (Higher Timeframe context)
- **4h**: Major swing structure and zone identification
- **1h**: Primary entry/analysis timeframe

**Note**: The 15m timeframe has been removed from the default configuration to focus on higher-quality, higher-timeframe setups that align with professional trading methodologies.

### Signal Scoring System (0-145+) - 100% Price Action

Signals are scored based on multiple factors. **Volume and RSI are bonus points only** - they never block signals.

| Factor | Max Points | Description | Required |
|--------|------------|-------------|----------|
| HTF Alignment | 30 | 1d & 4h structure alignment with signal direction | Yes |
| Setup Quality | 35 | Reversal patterns, true breakouts, retests | Yes |
| Candle Strength | 25 | Directional momentum of current candle | Yes |
| Volume Context | 15 | Volume spike and comparison to average | **Bonus** |
| RSI Divergence | 10* | Bullish/bearish divergence confluence | **Bonus** |
| BOS/CHOCH | 15 | Market structure events | **Bonus** |
| Sweep/Trap | 12 | Liquidity sweep strength | **Bonus** |
| Retest Quality | 10 | Breakout retest confirmation | **Bonus** |
| False Break | 8 | False breakout fade quality | **Bonus** |

**Score Thresholds:**
- **ENTRY Signal**: 70+ points (confirmed, action-ready)
- **SETUP Alert** (optional): 50+ points (early warning, if enabled)
- **Configurable**: Can adjust thresholds via ENTRY_SCORE_THRESHOLD and SETUP_SCORE_THRESHOLD

**Pattern Weights:** Each candlestick pattern contributes to the Setup Quality score based on:
- Pattern type (configurable weight, e.g., Morning Star = 12 points)
- Pattern strength (0-1, based on quality of pattern formation)
- Final contribution = Weight × Strength

Example: A Morning Star with 0.8 strength = 12 × 0.8 = 9.6 points added to setup score.

### Two-Stage Alert System (ENTRY-only by default)

**SETUP Stage (Optional, disabled by default)**:
- Detects forming setups in real-time
- Lower score threshold (default 50)
- Early warning before candle close
- Allows preparation time
- Does not require HTF alignment

**ENTRY Stage (Default)**:
- Only after clear trigger/confirmation
- Higher score threshold (default 70)
- Includes entry/SL/TP levels
- Requires HTF alignment
- Anti-chase logic applied
- Minimum R:R check (default 1.5)
- **Volume is bonus, NOT required** (100% Price Action)

### Anti-Chase Logic

Prevents late entries by evaluating:

1. **Distance Checks**: Price movement vs ATR and percentage
2. **Volume Analysis**: Spike vs climax detection (bonus scoring)
3. **Momentum**: Consecutive candles and acceleration/slowdown
4. **Micro-Structure**: CHoCH (Change of Character) and BOS (Break of Structure)

**Chase Decisions**:
- `CHASE_NO`: Skip signal (too extended, likely trap)
- `CHASE_OK`: Allow entry (within acceptable range)
- `REVERSAL_WATCH`: Trend exhaustion (watch for reversal)

### Cooldown System

Prevents duplicate signals for the same setup:
- **Key**: `symbol_timeframe_side_zoneKey`
- **Default Duration**: 60 minutes (configurable)
- **Database**: Persistent across restarts

## Usage

### Development Mode

Run the bot with console output:

```bash
npm start
```

Or with Node.js directly:

```bash
node src/index.js
```

### Dry Run Mode

Test without sending Telegram messages:

```bash
DRY_RUN=true npm start
```

Signals will be logged to console in formatted output.

### Preview Telegram Messages

Preview the formatted message output without running the full bot:

```bash
node scripts/preview-telegram-message.js
```

This script generates sample signals (LONG and SHORT) to show how messages will appear in Telegram with your current configuration (including custom `SIGNAL_SOURCE_TEXT` if set).

### Production with PM2

Install PM2 globally:

```bash
npm install -g pm2
```

Start the bot:

```bash
pm2 start src/index.js --name pa-bot
```

Monitor:

```bash
pm2 logs pa-bot
pm2 status
```

Setup auto-restart on reboot:

```bash
pm2 startup
pm2 save
```

### Production with systemd

**Note**: Adjust paths in `deploy/pa-bot.service` to match your setup.

1. **Copy service file**:
   ```bash
   sudo cp deploy/pa-bot.service /etc/systemd/system/
   ```

2. **Edit service file** with your paths and user:
   ```bash
   sudo nano /etc/systemd/system/pa-bot.service
   ```

3. **Create log directory**:
   ```bash
   sudo mkdir -p /var/log/pa-bot
   sudo chown $USER:$USER /var/log/pa-bot
   ```

4. **Enable and start**:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable pa-bot
   sudo systemctl start pa-bot
   ```

5. **Check status**:
   ```bash
   sudo systemctl status pa-bot
   sudo journalctl -u pa-bot -f
   ```

### Backtesting

Run backtests to evaluate signal quality on historical data:

```bash
# Backtest single symbol, 30 days
node scripts/backtest.js --symbol BTCUSDT --timeframe 1h --period 30d


# Backtest multiple symbols, 7 days
node scripts/backtest.js --symbols BTCUSDT,ETHUSDT --timeframe 1h --period 7d

Signals are sent to Telegram with HTML formatting in a professional Vietnamese layout:

# Use .env configuration
node scripts/backtest.js --config --period 90d

# Save report to file
node scripts/backtest.js --symbol BTCUSDT --timeframe 1h --period 30d --output report.txt

# Detailed output with signal logs
node scripts/backtest.js --symbol BTCUSDT --timeframe 1h --period 7d --detailed
```


**Backtest Output:**
- Total signals generated
- Number of trades (wins/losses)
- Win rate percentage
- Average risk:reward ratio
- Expectancy (expected profit per trade)
- Total P&L

**Options:**
- `--symbol <SYMBOL>` - Single symbol to backtest
- `--symbols <SYMBOLS>` - Comma-separated list of symbols
- `--timeframe <TF>` - Timeframe (e.g., 1h, 4h)
- `--period <PERIOD>` - Period (e.g., 7d, 30d, 90d)
- `--start <DATE>` - Start date (YYYY-MM-DD)
- `--end <DATE>` - End date (YYYY-MM-DD)
- `--config` - Use symbols/timeframes from .env
- `--output <FILE>` - Save report to file
- `--min-score <N>` - Minimum signal score threshold
- `--detailed` - Show detailed signal logs

## Signal Format (100% Price Action)

### SETUP Alert (Early Warning) - Optional

```
⚠️ SETUP - CẢNH BÁO SỚM ⚠️
📈 Hướng: 🟢 MUA 📈
BTCUSDT | 1h

━━━ SETUP ĐANG HÌNH THÀNH ━━━
⏳ Setup: Bullish Reversal at Support
📊 Điểm: 55/100
💡 Entry dự kiến: ~43300.00
🛑 SL dự kiến: ~43100.00
🎯 TP1 dự kiến: ~43600.00

🕯️ Mô hình: Bullish Harami (độ mạnh 78%)

⚠️ Chờ xác nhận trước khi vào lệnh!

━━━ ĐỘ TIN CẬY ━━━
🟡 CAO 55/100 điểm
...
```

### ENTRY Signal (Confirmed) - Default Mode

```
📈 TÍN HIỆU 🟢 MUA 📈
BTCUSDT | 1h

━━━ KẾ HOẠCH GIAO DỊCH ━━━
Entry:  43300.00000000
SL:     43100.00000000
TP1:    43600.00000000 (1.5R) [kháng cự]
TP2:    43900.00000000 (3.0R) [kháng cự]

━━━ ĐỘ TIN CẬY ━━━
🟢 RẤT CAO 85/100 điểm

✅ Khung lớn: 1D 🟢 Tăng | 4H 🟢 Tăng

🕯️ Mô hình nến: Three White Soldiers (độ mạnh 85%)

✅ Anti-Chase: Good entry conditions

━━━ TẠI SAO VÀO KÈO ━━━
  • Pattern: Three White Soldiers (strength: 85%)
  • Volume: 1.85x average (BONUS - không bắt buộc)
  • HTF Structure: HH/HL uptrend
  • Zone: support @ 43250.50

🕐 2026-02-13T14:30:00.000Z

--------------------
PA-Bot | 100% Price Action Analysis
```

**Message Features:**
- **Header**: Side (🟢 LONG / 🔴 SHORT), symbol, timeframe, setup type in Vietnamese
- **Trade Plan**: Entry, SL, and up to 3 TPs with percentages and risk/reward ratios
- **Pattern Display**: Shows detected candlestick pattern name and strength percentage
- **Signal Score**: 0-145+ score indicating signal quality
- **Reasons**: Vietnamese bullet points explaining the trade setup
- **100% PA Note**: Volume shown as bonus, not requirement
- **Footer**: Timestamp and customizable source text (configurable via `SIGNAL_SOURCE_TEXT`)
```

## Project Structure

```
pa-bot/
├── src/
│   ├── app/
│   │   └── engine.js          # Main signal detection engine
│   ├── binance/
│   │   ├── rest.js            # REST API client
│   │   ├── ws.js              # WebSocket client with reconnect
│   │   ├── exchangeInfo.js    # Symbol validation
│   │   └── klinesCache.js     # In-memory klines cache
│   ├── indicators/
│   │   └── rsi.js             # RSI calculation & divergence
│   ├── pa/                    # Price Action modules
│   │   ├── pivots.js          # Swing/pivot detection
│   │   ├── structure.js       # Market structure & HTF bias
│   │   ├── zones.js           # Support/resistance zones
│   │   ├── patterns.js        # Candlestick patterns
│   │   ├── setups.js          # Setup detection
│   │   └── score.js           # Signal scoring & levels
│   ├── store/                 # Database modules
│   │   ├── db.js              # SQLite initialization
│   │   ├── cooldown.js        # Cooldown management
│   │   └── signals.js         # Signal persistence
│   ├── notify/                # Notification modules
│   │   ├── format.js          # Message formatting
│   │   └── telegram.js        # Telegram bot client
│   └── index.js               # Application entry point
├── deploy/
│   └── pa-bot.service         # systemd service unit
├── data/                      # Created at runtime
│   └── signals.db             # SQLite database
├── .env.example               # Environment template
├── .gitignore
├── package.json
└── README.md
```

## Troubleshooting

### WebSocket Disconnections

The bot has automatic reconnection with exponential backoff. If disconnections persist:
- Check your internet connection
- Verify Binance API is accessible
- Check for rate limiting

### Telegram Errors

If messages fail to send:
1. Verify `TELEGRAM_BOT_TOKEN` is correct
2. Verify `TELEGRAM_CHAT_ID` is correct
3. Ensure the bot has been started (send `/start` to your bot)
4. Check Telegram API status

### Database Errors

If database errors occur:
- Ensure the `data/` directory is writable
- Check disk space
- Verify `DB_PATH` is accessible

### No Signals Generated

If no signals are appearing:
1. Check `ENTRY_SCORE_THRESHOLD` (default 70) - try lowering it temporarily to 50-60
2. Verify symbols are valid and trading on Binance USDT-M futures
3. Enable `DIAGNOSTIC_MODE=true` to see detailed rejection reasons for each candle
4. Check logs for setup detection and rejection messages
5. Enable `DRY_RUN=true` to see would-be signals
6. Ensure sufficient historical data has been loaded (100+ candles per symbol/timeframe)
7. Check HTF alignment - signals require higher timeframe confirmation

**Using Diagnostic Mode:**
```bash
# Add to .env or run with:
DIAGNOSTIC_MODE=true npm start
```

This will print concise rejection reasons like:
```
[Engine] BTCUSDT 1h: ✗ Insufficient data (95 candles, need 100+)
[Engine] ETHUSDT 1h: ✗ No setup detected
[Engine] BNBUSDT 1h: ✗ HTF misalignment (setup=LONG, HTF=4h:SHORT)
[Engine] XRPUSDT 1h: ✗ Score below threshold (62 < 70)
[Engine] ADAUSDT 1h: ✗ Anti-chase rejected (too extended)
```

### Symbol Cannot Be Analyzed

If you see errors that specific symbols (e.g., TRB, TRIA) cannot be analyzed:

**1. Check Symbol Availability:**
- Not all symbols are available on Binance USDT-M perpetual futures
- Some symbols may be on spot markets only, or on different contract types
- Enable verbose validation to see detailed reasons:

```bash
# Add to .env or run with:
VERBOSE_SYMBOL_VALIDATION=true npm start
```

This will print a validation table on startup:
```
================================================================================
SYMBOL VALIDATION REPORT
================================================================================
Requested       Normalized      Status              Reason
--------------------------------------------------------------------------------
BTCUSDT         BTCUSDT         accepted            Valid TRADING USDT-M perpetual futures
TRBUSDT         TRBUSDT         rejected            Symbol not found on Binance USDT-M futures
TRIAUSDT        TRIAUSDT        rejected            Contract type is DELIVERY, not PERPETUAL
XAUUSD          XAUUSDT         accepted (mapped)   Mapped from XAUUSD to XAUUSDT
================================================================================
Total Requested: 4, Accepted: 2, Rejected: 2
================================================================================
```

**2. Common Rejection Reasons:**
- **Symbol not found**: Symbol doesn't exist on USDT-M futures (may be spot-only or use different ticker)
- **Status not TRADING**: Symbol is paused, delisted, or in pre-launch
- **Contract type not PERPETUAL**: Symbol is a delivery contract, not perpetual futures

**3. How to Find Valid Symbols:**
- Visit https://www.binance.com/en/futures/BTCUSDT and check available perpetual contracts
- Look for symbols with "USDT Perpetual" label
- Use the verbose validation mode to see which of your symbols are valid

**4. TRB/TRIA Case Study:**
Some symbols that exist on Binance spot may not be available as USDT-M perpetual futures:
- **TRB**: Check if TRBUSDT perpetual exists (may be available as delivery futures instead)
- **TRIA**: May not be available on futures markets at all
- Bot will automatically skip unavailable symbols and continue monitoring valid ones

**5. Monitoring Changes:**
The bot will:
- Log clear rejection reasons during startup validation
- Remove invalid symbols from the monitoring list automatically
- Continue running with remaining valid symbols
- Retry failed symbol data fetches up to 3 times before disabling

### Rate Limiting

Binance has rate limits. The bot:
- Uses REST API only for initial data fetch
- Uses WebSocket for real-time updates (no rate limit)
- Adds small delays between initial fetch requests

## Development

### 100% Price Action Methodology

This bot implements a pure price action trading approach where **price movement and market structure are the primary decision factors**. Here's how it works:

**Core Principles:**

1. **Price is King**: All decisions based on price structure, patterns, and levels
2. **No Indicator Dependencies**: Volume and RSI are bonus factors, never requirements
3. **Market Structure First**: HH/HL (uptrend) and LH/LL (downtrend) guide direction
4. **Pattern Confirmation**: Multiple candlestick patterns validate reversals

**How Signals Are Generated:**

```
1. Market Structure Analysis (HTF)
   ↓
2. Swing Point & Zone Detection
   ↓
3. Setup Detection (Reversal/Breakout/Retest)
   ↓
4. Pattern Recognition (10+ patterns)
   ↓
5. Scoring (HTF + Setup + Candle + Bonuses)
   ↓
6. Threshold Check (≥70 points)
   ↓
7. Risk Management (R:R ≥1.5)
   ↓
8. Anti-Chase Filter
   ↓
9. Signal Generated ✓
```

**Volume Role (Bonus Only):**
- Adds 0-15 points to score if present
- Strong volume = higher confidence
- **Weak/no volume does NOT block signal**
- Pure PA signals can score 70-130+ without volume

**Pattern Weighting:**
Each pattern has a configurable weight reflecting its reliability:
- Strong reversal patterns (Morning/Evening Star, Three Soldiers/Crows): 12-13 points
- Classic patterns (Engulfing, Harami): 9-10 points  
- Pin bars: 8 points
- Inside bar: 7 points (needs breakout)
- Doji: 5 points (indecision)

### Adding New Indicators

Create a new file in `src/indicators/` and import it in `src/app/engine.js`.

### Adding New Setup Types

Implement detection logic in `src/pa/setups.js` and update scoring in `src/pa/score.js`.

### Modifying Signal Format

Edit `src/notify/format.js` to customize message appearance.

## Performance

- **Memory Usage**: ~50-100 MB (depends on symbol/timeframe count)
- **CPU Usage**: Minimal (event-driven architecture)
- **Network**: WebSocket connection with periodic pings
- **Database**: SQLite with WAL mode for performance

## Security

- **No Trading**: Bot only generates signals, never executes trades
- **No API Keys**: Does not require Binance API keys (uses public data)
- **Environment Variables**: Sensitive data in `.env` (not committed)
- **Telegram**: Uses official node-telegram-bot-api library

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues and questions:
- **GitHub Issues**: [Create an issue](https://github.com/posiyatu2037-eng/pa-bot/issues)
- **Documentation**: This README and inline code comments

## Changelog

### v2.0.0 (2026-02-13) - 100% Price Action Upgrade
- **BREAKING**: Changed to 100% Price Action methodology
- **NEW**: Volume no longer blocks signals (scoring bonus only)
- **NEW**: Added Harami bullish/bearish pattern detection
- **NEW**: Added Three White Soldiers pattern
- **NEW**: Added Three Black Crows pattern
- **NEW**: Configurable pattern enable/disable system
- **NEW**: Configurable pattern scoring weights
- **IMPROVED**: Pattern detection now uses configuration
- **IMPROVED**: Scoring system enhanced with pattern weights
- **IMPROVED**: Documentation updated for 100% PA strategy
- **FIXED**: Bug in engulfing pattern detection
- **DEFAULT**: REQUIRE_VOLUME_CONFIRMATION now false by default
- **DEFAULT**: ENTRY-only mode (SETUP stage disabled by default)

### v1.0.0 (2026-02-11)
- Initial release
- Multi-timeframe price action analysis
- Volume spike detection
- RSI divergence detection
- Telegram notifications
- SQLite persistence
- Cooldown system
- Scoring system (0-100)
- WebSocket with auto-reconnect

---

**Remember**: This bot provides signals only using 100% Price Action methodology. Volume and indicators are bonus factors, not requirements. Always do your own research and never risk more than you can afford to lose.
