/**
 * Format trading signals for Telegram messages
 * HTML-only (Telegram parse_mode: 'HTML')
 * ENTRY-only by default (SETUP will be formatted as a short note if ever sent).
 */

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatNumber(num, decimals = 2) {
  if (typeof num !== 'number' || Number.isNaN(num)) return '--';
  return num.toFixed(decimals);
}

function calculatePercent(from, to) {
  if (typeof from !== 'number' || typeof to !== 'number' || from === 0) return null;
  return ((to - from) / from) * 100;
}

const PATTERN_TRANSLATIONS = {
  Hammer: 'Búa (Hammer)',
  'Shooting Star': 'Sao Băng (Shooting Star)',
  'Bullish Engulfing': 'Nhấn chìm tăng (Bullish Engulfing)',
  'Bearish Engulfing': 'Nhấn chìm giảm (Bearish Engulfing)',
  Doji: 'Doji'
};

function translatePattern(patternName, patternType) {
  if (!patternName) return 'Không xác định';

  if (PATTERN_TRANSLATIONS[patternName]) return PATTERN_TRANSLATIONS[patternName];

  if (patternName.includes('Hammer')) return PATTERN_TRANSLATIONS.Hammer;
  if (patternName.includes('Shooting Star')) return PATTERN_TRANSLATIONS['Shooting Star'];
  if (patternName.includes('Engulfing')) {
    return patternType === 'bullish'
      ? PATTERN_TRANSLATIONS['Bullish Engulfing']
      : PATTERN_TRANSLATIONS['Bearish Engulfing'];
  }
  if (patternName.includes('Doji')) return PATTERN_TRANSLATIONS.Doji;

  return patternName;
}

function getSetupNameVN(setup) {
  if (!setup || (!setup.type && !setup.setupType)) return 'Không xác định';

  const setupType = String(setup.setupType || setup.type).toLowerCase();

  // V2 setup types
  if (setupType === 'liquidity_sweep_bull') return 'Quét thanh khoản tăng';
  if (setupType === 'liquidity_sweep_bear') return 'Quét thanh khoản giảm';
  if (setupType === 'trap_bull') return 'Bẫy tăng (False Breakdown)';
  if (setupType === 'trap_bear') return 'Bẫy giảm (False Breakout)';
  if (setupType === 'breakout_retest') return 'Breakout → Retest → Xác nhận';
  if (setupType === 'false_break_confirmed') return 'Bẫy breakout có xác nhận';

  // Original setup types
  if (setupType === 'reversal') return 'Đảo chiều';
  if (setupType === 'breakout') return 'Vượt vùng';
  if (setupType === 'breakdown') return 'Vượt vùng xuống';
  if (setupType === 'retest') return 'Test lại';
  if (setupType === 'false_breakout' || setupType === 'false_breakdown') return 'Bẫy breakout';

  return setupType;
}

function generateTradeReasons(signal) {
  const reasons = [];

  const { setup, htfBias, divergence, volumeRatio, bosEvent, chochEvent, atrSpike, cooldownBypassed, bypassReason } = signal || {};

  // V2: BOS/CHOCH events
  if (chochEvent) {
    const direction = chochEvent.direction === 'bullish' ? 'tăng' : 'giảm';
    reasons.push(`⚡ CHOCH ${direction} - Đảo chiều cấu trúc thị trường`);
  } else if (bosEvent) {
    const direction = bosEvent.direction === 'bullish' ? 'tăng' : 'giảm';
    reasons.push(`📈 BOS ${direction} - Phá vỡ cấu trúc theo xu hướng`);
  }

  // V2: ATR spike (volatility)
  if (atrSpike && atrSpike.hasSpike) {
    reasons.push(`💥 Biến động tăng cao (ATR ${formatNumber(atrSpike.ratio, 1)}x TB)`);
  }

  // HTF bias
  if (htfBias && htfBias.bias && htfBias.bias !== 'neutral') {
    const biasVN = htfBias.bias === 'bullish' ? 'TĂNG' : 'GIẢM';
    const structures = htfBias.structures || {};
    
    // V2: Support both 1h/4h and 1d/4h HTF structures
    // Prioritize showing two different timeframes if available
    const availableTFs = Object.keys(structures).filter(tf => structures[tf]);
    
    if (availableTFs.length >= 2) {
      // Show first two available timeframes
      const tf1Key = availableTFs[0];
      const tf2Key = availableTFs[1];
      const tf1 = structures[tf1Key] === 'up' ? 'tăng' : structures[tf1Key] === 'down' ? 'giảm' : 'ngang';
      const tf2 = structures[tf2Key] === 'up' ? 'tăng' : structures[tf2Key] === 'down' ? 'giảm' : 'ngang';
      reasons.push(`Xu hướng lớn ${biasVN} (${tf1Key.toUpperCase()} ${tf1}, ${tf2Key.toUpperCase()} ${tf2})`);
    } else if (availableTFs.length === 1) {
      // Only one timeframe available
      const tfKey = availableTFs[0];
      const tf = structures[tfKey] === 'up' ? 'tăng' : structures[tfKey] === 'down' ? 'giảm' : 'ngang';
      reasons.push(`Xu hướng lớn ${biasVN} (${tfKey.toUpperCase()} ${tf})`);
    } else {
      reasons.push(`Xu hướng lớn ${biasVN}`);
    }
  }

  // V2: Sweep/trap details
  const setupType = setup?.setupType || setup?.type;
  if (setupType && setupType.includes('sweep')) {
    if (setup.lowerWickRatio) {
      const wickPct = Math.round(setup.lowerWickRatio * 100);
      reasons.push(`Quét thanh khoản dưới pivot + wick dài ${wickPct}%`);
    } else if (setup.upperWickRatio) {
      const wickPct = Math.round(setup.upperWickRatio * 100);
      reasons.push(`Quét thanh khoản trên pivot + wick dài ${wickPct}%`);
    }
    if (setup.hasVolume) {
      reasons.push(`✓ Volume xác nhận quét (${formatNumber(setup.volumeRatio, 1)}x)`);
    }
  }

  if (setupType && setupType.includes('trap')) {
    if (setup.wickRatio) {
      const wickPct = Math.round(setup.wickRatio * 100);
      reasons.push(`Bẫy với wick rejection ${wickPct}%`);
    }
  }

  // V2: Retest + confirmation details
  if (setupType === 'breakout_retest') {
    if (setup.retest && setup.confirmation) {
      const barsAgo = setup.retest.barsSinceBreakout || 0;
      const confirmType = setup.confirmation.type || 'pattern';
      reasons.push(`Breakout → Retest (${barsAgo} nến) → Xác nhận (${confirmType})`);
    }
  }

  // Pattern
  if (setup && setup.pattern) {
    const patternVN = translatePattern(setup.pattern.name || 'Unknown', setup.pattern.type);
    const strength = Math.round((setup.pattern.strength || 0) * 100);
    reasons.push(`Mô hình nến ${patternVN} (độ mạnh ${strength}%)`);
  }

  // Setup/zone context (original)
  if (setup && setup.type) {
    const t = String(setup.type).toLowerCase();

    if (t === 'reversal') {
      const zoneType = setup.zone?.type === 'support' ? 'hỗ trợ' : 'kháng cự';
      reasons.push(`Đảo chiều tại vùng ${zoneType}`);
    } else if (t === 'breakout' || t === 'breakdown') {
      if (!setupType || !setupType.includes('retest')) {
        reasons.push(setup.isTrue ? 'Breakout thật (có xác nhận)' : 'Breakout yếu (nguy cơ trap)');
      }
    } else if (t === 'retest' && setupType !== 'breakout_retest') {
      reasons.push('Retest vùng đã vỡ (kèo theo xu hướng)');
    } else if (t === 'false_breakout' || t === 'false_breakdown') {
      if (!setupType || !setupType.includes('trap')) {
        reasons.push('Bẫy breakout (quét wick rồi quay lại vùng)');
      }
    }
  }

  // Volume (always show if significant)
  if (typeof volumeRatio === 'number') {
    if (volumeRatio >= 2.0) reasons.push(`Volume cực mạnh (${formatNumber(volumeRatio, 1)}x TB)`);
    else if (volumeRatio >= 1.5) reasons.push(`Volume tăng (${formatNumber(volumeRatio, 1)}x TB)`);
    else if (volumeRatio < 0.8) reasons.push(`Volume yếu (${formatNumber(volumeRatio, 1)}x TB)`);
  }

  // RSI divergence (optional bonus)
  if (divergence && (divergence.bullish || divergence.bearish)) {
    reasons.push(divergence.bullish ? 'Phân kỳ tăng (bonus)' : 'Phân kỳ giảm (bonus)');
  }

  // V2: Cooldown bypass reason
  if (cooldownBypassed && bypassReason) {
    reasons.push(`⏱️ Bỏ qua cooldown: ${bypassReason}`);
  }

  return reasons;
}

function formatTime(timestamp) {
  const date = new Date(timestamp || Date.now());
  const timezone = process.env.TELEGRAM_TIMEZONE || 'Asia/Ho_Chi_Minh';

  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour12: false
  });

  const parts = fmt.formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value || '';
  return `${get('hour')}:${get('minute')} ${get('day')}/${get('month')}/${get('year')}`;
}

function formatSignalMessage(signal) {
  if (!signal) return '';

  const stage = String(signal.stage || 'ENTRY').toUpperCase();

  // ENTRY-only: if something still sends SETUP, make it short and safe
  if (stage !== 'ENTRY') {
    const sideEmoji = signal.side === 'LONG' ? '🟢' : '🔴';
    const setupName = getSetupNameVN(signal.setup);
    return (
      `${sideEmoji} <b>SETUP | ${escapeHtml(signal.symbol)} | ${escapeHtml(
        String(signal.timeframe || '').toUpperCase()
      )}</b>\n` +
      `<b>${escapeHtml(setupName)}</b>\n` +
      `🕐 ${escapeHtml(formatTime(signal.timestamp))}\n` +
      `⚠️ Chỉ là cảnh báo sớm (SETUP).`
    );
  }

  const { symbol, timeframe, side, score, levels, setup } = signal;

  const sideText = side === 'LONG' ? 'LONG' : 'SHORT';
  const sideEmoji = side === 'LONG' ? '🟢' : '🔴';
  const setupName = getSetupNameVN(setup);
  const sourceText = process.env.SIGNAL_SOURCE_TEXT || 'Nguồn Posiya Tú zalo 0763888872';

  if (!levels || typeof levels.entry !== 'number' || typeof levels.stopLoss !== 'number') {
    // Fail-safe formatting
    return (
      `${sideEmoji} <b>${escapeHtml(sideText)} | ${escapeHtml(symbol)} | ${escapeHtml(
        String(timeframe || '').toUpperCase()
      )}</b>\n` +
      `<b>${escapeHtml(setupName)}</b>\n` +
      `Điểm tín hiệu: <b>${escapeHtml(score ?? '--')}</b>/100\n` +
      `🕐 ${escapeHtml(formatTime(signal.timestamp))}\n` +
      `📱 ${escapeHtml(sourceText)}`
    );
  }

  const entry = levels.entry;
  const sl = levels.stopLoss;
  const slPercent = calculatePercent(entry, sl);

  const tp1 = levels.takeProfit1;
  const tp2 = levels.takeProfit2;
  const tp3 = levels.takeProfit3; // Add TP3 support

  const tp1Percent = typeof tp1 === 'number' ? calculatePercent(entry, tp1) : null;
  const tp2Percent = typeof tp2 === 'number' ? calculatePercent(entry, tp2) : null;
  const tp3Percent = typeof tp3 === 'number' ? calculatePercent(entry, tp3) : null;

  const rr1 = levels.riskReward1;
  const rr2 = levels.riskReward2;
  const rr3 = levels.riskReward3; // Add RR3 support

  let msg = '';
  msg += `${sideEmoji} <b>${escapeHtml(sideText)} | ${escapeHtml(symbol)} | ${escapeHtml(
    String(timeframe || '').toUpperCase()
  )}</b>\n`;
  msg += `<b>${escapeHtml(setupName)}</b>\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  msg += `<b>📋 KẾ HOẠCH GIAO DỊCH</b>\n`;
  msg += `<b>Entry:</b> <code>${formatNumber(entry, 8)}</code>\n`;

  msg += `<b>SL:</b> <code>${formatNumber(sl, 8)}</code>`;
  if (slPercent !== null) msg += ` (${formatNumber(Math.abs(slPercent), 2)}%)`;
  msg += `\n`;

  if (typeof tp1 === 'number') {
    msg += `<b>TP1:</b> <code>${formatNumber(tp1, 8)}</code>`;
    if (tp1Percent !== null) msg += ` (+${formatNumber(Math.abs(tp1Percent), 2)}%)`;
    if (typeof rr1 === 'number') msg += ` <b>[${formatNumber(rr1, 1)}R]</b>`;
    msg += `\n`;
  }

  if (typeof tp2 === 'number') {
    msg += `<b>TP2:</b> <code>${formatNumber(tp2, 8)}</code>`;
    if (tp2Percent !== null) msg += ` (+${formatNumber(Math.abs(tp2Percent), 2)}%)`;
    if (typeof rr2 === 'number') msg += ` <b>[${formatNumber(rr2, 1)}R]</b>`;
    msg += `\n`;
  }

  if (typeof tp3 === 'number') {
    msg += `<b>TP3:</b> <code>${formatNumber(tp3, 8)}</code>`;
    if (tp3Percent !== null) msg += ` (+${formatNumber(Math.abs(tp3Percent), 2)}%)`;
    if (typeof rr3 === 'number') msg += ` <b>[${formatNumber(rr3, 1)}R]</b>`;
    msg += `\n`;
  }

  msg += `\n`;

  // Add RR/WR/EV line (WR and EV are heuristics/proxy for now)
  // TODO: Replace with actual performance metrics from database when available
  if (typeof rr1 === 'number') {
    const winRate = 60; // Heuristic win rate for display (should be calculated from historical data)
    const ev = (rr1 * (winRate / 100)) - ((100 - winRate) / 100);
    msg += `<b>RR:</b> ${formatNumber(rr1, 2)}R | <b>WR:</b> ~${winRate}% | <b>EV:</b> ${formatNumber(ev, 2)}R\n\n`;
  }

  msg += `<b>Điểm tín hiệu:</b> ${escapeHtml(score)}/100\n\n`;

  msg += `<b>💡 LÝ DO VÀO KÈO</b>\n`;
  const reasons = generateTradeReasons(signal);
  if (reasons.length) {
    for (const r of reasons) msg += `✅ ${escapeHtml(r)}\n`;
  } else {
    msg += `✅ Price Action + Volume (tổng hợp)\n`;
  }
  msg += `\n`;

  // Add trailing stop note for Vietnamese
  msg += `<i>💡 Lưu ý: Trailing stop sau khi chạm TP1</i>\n\n`;

  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🕐 ${escapeHtml(formatTime(signal.timestamp))}\n`;
  msg += `📱 Nguồn ${escapeHtml(sourceText)}`;

  return msg;
}

function formatSimpleMessage(signal) {
  const entry = signal?.levels?.entry;
  return `[SIGNAL] ${signal?.symbol} ${signal?.timeframe} ${signal?.side} @ ${entry} | Score: ${signal?.score}`;
}

module.exports = {
  escapeHtml,
  formatNumber,
  calculatePercent,
  translatePattern,
  getSetupNameVN,
  generateTradeReasons,
  formatSignalMessage,
  formatSimpleMessage
};
