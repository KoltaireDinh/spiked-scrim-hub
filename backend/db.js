const Database = require("better-sqlite3");
const db = new Database("spiked.db");

// Create tables if not exist
db.prepare(
  `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id TEXT UNIQUE,
    username TEXT,
    avatar_url TEXT
  )
`
).run();

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    captain_id INTEGER,
    status TEXT DEFAULT 'IDLE'
  )
`
).run();

module.exports = db;
