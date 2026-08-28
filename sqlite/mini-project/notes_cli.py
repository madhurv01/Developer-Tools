#!/usr/bin/env python3
# A local-first notes app using Python's BUILT-IN sqlite3 module - no pip
# install needed at all, which is itself a real reason Python + SQLite is
# such a common pairing for CLI tools and small scripts. Demonstrates FTS5
# full-text search (kept in sync via triggers) and WAL mode.
#
# Usage:
#   python notes_cli.py add "Title" "Body text..."
#   python notes_cli.py search "some words"
#   python notes_cli.py list
#   python notes_cli.py delete <id>

import sqlite3
import sys
from pathlib import Path

DB_PATH = Path(__file__).parent / "notes.db"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    # WAL mode: SQLite's default journal mode blocks concurrent readers
    # while a write is in progress. WAL lets readers keep working against
    # the last-committed data while a write happens - the standard setting
    # for any real app with more than one connection.
    conn.execute("PRAGMA journal_mode = WAL")
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- FTS5 in "external content" mode: the real text stays in `notes`,
        -- this virtual table is just a fast, ranked search index over it,
        -- kept in sync by the triggers below.
        CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
            title, body, content='notes', content_rowid='id'
        );

        CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
            INSERT INTO notes_fts(rowid, title, body) VALUES (new.id, new.title, new.body);
        END;

        CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
            INSERT INTO notes_fts(notes_fts, rowid, title, body) VALUES ('delete', old.id, old.title, old.body);
        END;

        CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
            INSERT INTO notes_fts(notes_fts, rowid, title, body) VALUES ('delete', old.id, old.title, old.body);
            INSERT INTO notes_fts(rowid, title, body) VALUES (new.id, new.title, new.body);
        END;
        """
    )
    return conn


def add(conn, title, body):
    cur = conn.execute("INSERT INTO notes (title, body) VALUES (?, ?)", (title, body))
    conn.commit()
    print(f'Added note #{cur.lastrowid}: "{title}"')


def list_notes(conn):
    rows = conn.execute("SELECT id, title, created_at FROM notes ORDER BY id DESC").fetchall()
    if not rows:
        print('No notes yet. Try: python notes_cli.py add "Title" "Body"')
        return
    for row_id, title, created_at in rows:
        print(f"#{row_id} [{created_at}] {title}")


def search(conn, query):
    # bm25() ranks results by relevance - a real, built-in ranking function,
    # not something hand-rolled with LIKE '%...%'.
    rows = conn.execute(
        """
        SELECT notes.id, notes.title, notes.body, bm25(notes_fts) AS rank
        FROM notes_fts
        JOIN notes ON notes.id = notes_fts.rowid
        WHERE notes_fts MATCH ?
        ORDER BY rank
        """,
        (query,),
    ).fetchall()
    if not rows:
        print(f'No matches for "{query}"')
        return
    print(f'{len(rows)} result(s) for "{query}":\n')
    for note_id, title, body, _rank in rows:
        print(f"#{note_id} {title}\n  {body[:100]}\n")


def delete(conn, note_id):
    cur = conn.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    conn.commit()
    print(f"Deleted note #{note_id}" if cur.rowcount else f"No note with id {note_id}")


def main():
    args = sys.argv[1:]
    if not args:
        print("Usage: python notes_cli.py <add|list|search|delete> ...")
        return

    conn = get_connection()
    command, rest = args[0], args[1:]

    if command == "add":
        if len(rest) < 2:
            sys.exit('Usage: python notes_cli.py add "Title" "Body text"')
        add(conn, rest[0], rest[1])
    elif command == "list":
        list_notes(conn)
    elif command == "search":
        if not rest:
            sys.exit('Usage: python notes_cli.py search "some words"')
        search(conn, " ".join(rest))
    elif command == "delete":
        if not rest:
            sys.exit("Usage: python notes_cli.py delete <id>")
        delete(conn, int(rest[0]))
    else:
        print("Usage: python notes_cli.py <add|list|search|delete> ...")

    conn.close()


if __name__ == "__main__":
    main()
