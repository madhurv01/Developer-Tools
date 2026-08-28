# A small SQLite-backed store, keyed by Telegram chat id - so this same bot,
# deployed once, correctly tracks separate expense histories for every user
# who talks to it. Uses Python's built-in sqlite3 module - no extra
# dependency needed just to remember data between messages.

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "expenses.db"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
        """
    )
    return conn


def add_expense(chat_id, amount, category):
    conn = get_connection()
    conn.execute(
        "INSERT INTO expenses (chat_id, amount, category) VALUES (?, ?, ?)",
        (chat_id, amount, category),
    )
    conn.commit()
    conn.close()


def list_expenses(chat_id, limit=10):
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM expenses WHERE chat_id = ? ORDER BY id DESC LIMIT ?",
        (chat_id, limit),
    ).fetchall()
    conn.close()
    return rows


def summarize_by_category(chat_id):
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT category, SUM(amount) as total, COUNT(*) as count
        FROM expenses
        WHERE chat_id = ?
        GROUP BY category
        ORDER BY total DESC
        """,
        (chat_id,),
    ).fetchall()
    conn.close()
    return rows


def delete_last(chat_id):
    conn = get_connection()
    row = conn.execute(
        "SELECT id FROM expenses WHERE chat_id = ? ORDER BY id DESC LIMIT 1", (chat_id,)
    ).fetchone()
    if row is None:
        conn.close()
        return None
    conn.execute("DELETE FROM expenses WHERE id = ?", (row[0],))
    conn.commit()
    conn.close()
    return row
