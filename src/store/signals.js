const { getDatabase } = require('./db');

/**
 * Store and retrieve sent signals
 */

/**
 * Save a sent signal to the database
 * @param {Object} signal - Signal object with all details
 * @returns {number} Inserted signal ID
 */
function saveSignal(signal) {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT INTO signals (
      symbol, timeframe, side, setup_type, setup_name, score,
      entry, stop_loss, take_profit1, take_profit2, risk_reward,
      zone_key, timestamp, sent_at, message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    signal.symbol,
    signal.timeframe,
    signal.side,
    signal.setup_type,
    signal.setup_name || null,
    signal.score,
    signal.entry,
    signal.stop_loss,
    signal.take_profit1,
    signal.take_profit2,
    signal.risk_reward || null,
    signal.zone_key || null,
    signal.timestamp,
    Date.now(),
    signal.message || null
  );

  console.log(`[Signals] Saved signal ID ${result.lastInsertRowid} for ${signal.symbol} ${signal.timeframe}`);

  return result.lastInsertRowid;
}

/**
 * Get recent signals
 * @param {number} limit - Number of signals to retrieve
 * @returns {Array} Array of signal objects
 */
function getRecentSignals(limit = 50) {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM signals
    ORDER BY sent_at DESC
    LIMIT ?
  `);

  return stmt.all(limit);
}

/**
 * Get signals for a specific symbol
 * @param {string} symbol
 * @param {number} limit
 * @returns {Array}
 */
function getSignalsBySymbol(symbol, limit = 20) {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM signals
    WHERE symbol = ?
    ORDER BY sent_at DESC
    LIMIT ?
  `);

  return stmt.all(symbol, limit);
}

/**
 * Get signals within a time range
 * @param {number} startTime - Start timestamp in milliseconds
 * @param {number} endTime - End timestamp in milliseconds
 * @returns {Array}
 */
function getSignalsByTimeRange(startTime, endTime) {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM signals
    WHERE sent_at >= ? AND sent_at <= ?
    ORDER BY sent_at DESC
  `);

  return stmt.all(startTime, endTime);
}

/**
 * Count total signals
 * @returns {number}
 */
function countSignals() {
  const db = getDatabase();
  const stmt = db.prepare('SELECT COUNT(*) as count FROM signals');
  const result = stmt.get();
  return result.count;
}

/**
 * Get signal statistics
 * @returns {Object} Statistics object
 */
function getSignalStats() {
  const db = getDatabase();

  const totalStmt = db.prepare('SELECT COUNT(*) as count FROM signals');
  const total = totalStmt.get().count;

  const bySymbolStmt = db.prepare(`
    SELECT symbol, COUNT(*) as count 
    FROM signals 
    GROUP BY symbol 
    ORDER BY count DESC
  `);
  const bySymbol = bySymbolStmt.all();

  const bySideStmt = db.prepare(`
    SELECT side, COUNT(*) as count 
    FROM signals 
    GROUP BY side
  `);
  const bySide = bySideStmt.all();

  const avgScoreStmt = db.prepare('SELECT AVG(score) as avg_score FROM signals');
  const avgScore = avgScoreStmt.get().avg_score;

  return {
    total,
    bySymbol,
    bySide,
    avgScore: avgScore ? avgScore.toFixed(2) : 0
  };
}

module.exports = {
  saveSignal,
  getRecentSignals,
  getSignalsBySymbol,
  getSignalsByTimeRange,
  countSignals,
  getSignalStats
};
