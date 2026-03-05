import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/game.db');
const dataDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    points INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    trip_count INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    has_lost BOOLEAN DEFAULT 0,
    longest_trip_km REAL DEFAULT 0,
    total_distance_km REAL DEFAULT 0,
    max_crossings_in_trip INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    is_admin BOOLEAN DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS game_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    score INTEGER NOT NULL,
    distance_km REAL NOT NULL,
    crossings INTEGER NOT NULL,
    ended_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

export { db };
