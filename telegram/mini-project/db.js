// A small SQLite-backed store, keyed by Telegram chat id - so this same bot,
// deployed once, correctly tracks separate expense histories for every user
// who talks to it. This is the real pattern behind any Telegram bot that
// remembers per-user state (a to-do bot, a habit tracker, a reminder bot).

import Database from "better-sqlite3";

const db = new Database("expenses.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export function addExpense(chatId, amount, category) {
  const stmt = db.prepare(
    "INSERT INTO expenses (chat_id, amount, category) VALUES (?, ?, ?)"
  );
  return stmt.run(chatId, amount, category);
}

export function listExpenses(chatId, limit = 10) {
  const stmt = db.prepare(
    "SELECT * FROM expenses WHERE chat_id = ? ORDER BY id DESC LIMIT ?"
  );
  return stmt.all(chatId, limit);
}

export function summarizeByCategory(chatId) {
  const stmt = db.prepare(`
    SELECT category, SUM(amount) as total, COUNT(*) as count
    FROM expenses
    WHERE chat_id = ?
    GROUP BY category
    ORDER BY total DESC
  `);
  return stmt.all(chatId);
}

export function deleteLast(chatId) {
  const row = db
    .prepare("SELECT id FROM expenses WHERE chat_id = ? ORDER BY id DESC LIMIT 1")
    .get(chatId);
  if (!row) return null;
  db.prepare("DELETE FROM expenses WHERE id = ?").run(row.id);
  return row;
}
