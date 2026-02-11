/**
 * Format trading signals for Telegram messages
 * Uses Markdown with monospace tables
 */

/**
 * Escape special Markdown characters for Telegram
 * MarkdownV2 requires escaping: _ * [ ] ( ) ~ ` > # + - = | { } . !
 */
function escapeMarkdown(text) {
  if (typeof text !== 'string') {
    text = String(text);
  }
  // Escape special characters for MarkdownV2
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

/**
 * Format a number for display
 */
function formatNumber(num, decimals = 2) {
  return num.toFixed(decimals);
}

/**
 * Generate reason bullets for the signal
 */
function generateReasons(signal, setup, htfBias, divergence, volumeRatio) {
  const reasons = [];

  // HTF bias
  if (htfBias && htfBias.bias !== 'neutral') {
    const structures = htfBias.structures || {};
    reasons.push(`HTF Bias: ${htfBias.bias.toUpperCase()} (1D: ${structures['1d'] || 'N/A'}, 4H: ${structures['4h'] || 'N/A'})`);
  }

  // Setup type
  reasons.push(`Setup: ${setup.name || setup.type}`);

  // Pattern
  if (setup.pattern) {
    reasons.push(`Pattern: ${setup.pattern.name} (strength: ${formatNumber(setup.pattern.strength * 100, 0)}%)`);
  }

  // Volume
  if (volumeRatio) {
    reasons.push(`Volume: ${formatNumber(volumeRatio, 2)}x average${setup.volumeSpike ? ' (SPIKE)' : ''}`);
  }

  // RSI Divergence
  if (divergence && (divergence.bullish || divergence.bearish)) {
    reasons.push(`RSI Divergence: ${divergence.description}`);
  }

  // Zone info
  if (setup.zone) {
    reasons.push(`Zone: ${setup.zone.type} @ ${formatNumber(setup.zone.center, 2)}`);
  }

  return reasons;
}

/**
 * Format signal as Telegram message
 * @param {Object} signal - Complete signal object
 * @returns {string} Formatted Markdown message
 */
function formatSignalMessage(signal) {
  const {
    symbol,
    timeframe,
    side,
    score,
    levels,
    setup,
    htfBias,
    divergence,
    volumeRatio,
    timestamp
  } = signal;

  const sourceName = process.env.SOURCE_NAME || 'PA-Bot';
  const tagline = process.env.TAGLINE || 'Price Action + Volume Analysis';

  // Build the message
  let message = '';

  // Header
  message += `🚨 *${escapeMarkdown(side)} SIGNAL* 🚨\n\n`;

  // Main info table (monospace)
  message += '```\n';
  message += `Symbol:    ${symbol}\n`;
  message += `Timeframe: ${timeframe}\n`;
  message += `Side:      ${side}\n`;
  message += `Score:     ${score}/100\n`;
  message += '```\n\n';

  // HTF Bias
  if (htfBias && htfBias.bias !== 'neutral') {
    const alignment = htfBias.alignment ? '✅' : '⚠️';
    message += `${alignment} *HTF Bias:* ${escapeMarkdown(htfBias.bias.toUpperCase())}\n`;
    const structures = htfBias.structures || {};
    message += `  \\- 1D: ${escapeMarkdown(structures['1d'] || 'N/A')}, 4H: ${escapeMarkdown(structures['4h'] || 'N/A')}\n\n`;
  }

  // Zone and Setup
  message += `📍 *Setup:* ${escapeMarkdown(setup.name || setup.type)}\n`;
  if (setup.zone) {
    message += `  \\- Zone: ${escapeMarkdown(setup.zone.type)} @ ${formatNumber(setup.zone.center, 2)}\n`;
  }
  message += '\n';

  // Levels table (monospace)
  message += '```\n';
  message += `Entry:  ${formatNumber(levels.entry, 8)}\n`;
  message += `SL:     ${formatNumber(levels.stopLoss, 8)}`;
  
  // Add SL zone info if available
  if (levels.slZone) {
    message += ` (${levels.slZone.type})`;
  }
  message += '\n';
  
  // TP1
  message += `TP1:    ${formatNumber(levels.takeProfit1, 8)} (${formatNumber(levels.riskReward1, 1)}R)`;
  if (levels.tpZones && levels.tpZones[0]) {
    message += ` [${levels.tpZones[0].type}]`;
  }
  message += '\n';
  
  // TP2 (if available)
  if (levels.takeProfit2) {
    message += `TP2:    ${formatNumber(levels.takeProfit2, 8)} (${formatNumber(levels.riskReward2, 1)}R)`;
    if (levels.tpZones && levels.tpZones[1]) {
      message += ` [${levels.tpZones[1].type}]`;
    }
    message += '\n';
  }
  
  message += '```\n\n';

  // Volume
  if (volumeRatio) {
    const volumeEmoji = volumeRatio > 1.5 ? '📊' : '📉';
    message += `${volumeEmoji} *Volume:* ${formatNumber(volumeRatio, 2)}x avg`;
    if (setup.volumeSpike) {
      message += ' ⚡ SPIKE';
    }
    message += '\n\n';
  }

  // RSI Divergence
  if (divergence && (divergence.bullish || divergence.bearish)) {
    message += `📈 *RSI Divergence:* ${escapeMarkdown(divergence.type || 'detected')}\n`;
    if (divergence.description) {
      message += `  \\- ${escapeMarkdown(divergence.description)}\n`;
    }
    message += '\n';
  }

  // Reasons
  const reasons = generateReasons(signal, setup, htfBias, divergence, volumeRatio);
  if (reasons.length > 0) {
    message += `*Key Points:*\n`;
    for (const reason of reasons) {
      message += `  • ${escapeMarkdown(reason)}\n`;
    }
    message += '\n';
  }

  // Timestamp
  const date = new Date(timestamp);
  message += `🕐 ${escapeMarkdown(date.toISOString())}\n\n`;

  // Footer
  message += `\\-\\-\\-\\-\\-\\-\\-\\-\\-\\-\\-\\-\\-\\-\\-\\-\\-\\-\\-\\-\n`;
  message += `_${escapeMarkdown(sourceName)}_ \\| ${escapeMarkdown(tagline)}\n`;

  return message;
}

/**
 * Format a simple text message for console/logging
 */
function formatSimpleMessage(signal) {
  return `[SIGNAL] ${signal.symbol} ${signal.timeframe} ${signal.side} @ ${signal.levels.entry} | Score: ${signal.score}`;
}

module.exports = {
  formatSignalMessage,
  formatSimpleMessage,
  escapeMarkdown,
  generateReasons
};
