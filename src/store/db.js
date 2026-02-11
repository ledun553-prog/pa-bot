const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './data/signals.db';

let db = null;

/**
 * Initialize SQLite database
 */
function initDatabase() {
  // Ensure data directory exists
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log(`[DB] Initializing database at ${DB_PATH}`);
  
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Create tables
  createTables();

  console.log('[DB] Database initialized successfully');
  
  return db;
}

/**
 * Create database tables
 */
function createTables() {
  // Signals table
  db.exec(`
    CREATE TABLE IF NOT EXISTS signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      side TEXT NOT NULL,
      setup_type TEXT NOT NULL,
      setup_name TEXT,
      score INTEGER NOT NULL,
      entry REAL NOT NULL,
      stop_loss REAL NOT NULL,
      take_profit1 REAL NOT NULL,
      take_profit2 REAL NOT NULL,
      risk_reward REAL,
      zone_key TEXT,
      timestamp INTEGER NOT NULL,
      sent_at INTEGER NOT NULL,
      message TEXT
    )
  `);

  // Cooldown table
  db.exec(`
    CREATE TABLE IF NOT EXISTS cooldowns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cooldown_key TEXT UNIQUE NOT NULL,
      symbol TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      side TEXT NOT NULL,
      zone_key TEXT,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  // Create indices
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_signals_symbol_tf ON signals(symbol, timeframe);
    CREATE INDEX IF NOT EXISTS idx_signals_timestamp ON signals(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_cooldowns_key ON cooldowns(cooldown_key);
    CREATE INDEX IF NOT EXISTS idx_cooldowns_expires ON cooldowns(expires_at);
  `);
}

/**
 * Get database instance
 */
function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Close database connection
 */
function closeDatabase() {
  if (db) {
    console.log('[DB] Closing database connection');
    db.close();
    db = null;
  }
}

/**
 * Clean up expired cooldowns (optional maintenance)
 */
function cleanupExpiredCooldowns() {
  const now = Date.now();
  const result = db.prepare('DELETE FROM cooldowns WHERE expires_at < ?').run(now);
  if (result.changes > 0) {
    console.log(`[DB] Cleaned up ${result.changes} expired cooldowns`);
  }
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase,
  cleanupExpiredCooldowns
};
