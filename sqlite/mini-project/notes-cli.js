// A real local-first notes app - the entire "database" is one file
// (notes.db) sitting next to this script, with zero server, zero
// connection string, zero setup. This demonstrates the two features that
// actually distinguish SQLite from "just a simple key-value file":
//
// 1. FTS5 full-text search - a real, fast, ranked search index, built into
//    SQLite itself, no separate search service (Elasticsearch, etc.) needed
//    for an app at this scale.
// 2. WAL (Write-Ahead Logging) mode - lets reads happen concurrently with a
//    write instead of blocking, which is the real fix for SQLite's biggest
//    historical weakness (a writer locking out all readers).
//
// Usage:
//   node notes-cli.js add "Title" "Body text..."
//   node notes-cli.js search "some words"
//   node notes-cli.js list
//   node notes-cli.js delete <id>

import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, "notes.db"));

// WAL mode: without this, SQLite's default journal mode blocks concurrent
// readers while a write is in progress. In WAL mode, readers keep working
// against the last-committed state while a write happens - the standard
// setting for any real SQLite app with more than one connection.
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- An FTS5 virtual table, kept in sync with the real "notes" table via
  -- triggers below. This is the standard real-world pattern: FTS5 indexes
  -- text for fast ranked search, but the actual row data still lives in a
  -- normal table - "external content" mode, avoiding storing the text twice.
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
`);

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case "add": {
    const [title, body] = args;
    if (!title || !body) {
      console.error('Usage: node notes-cli.js add "Title" "Body text"');
      process.exit(1);
    }
    const info = db.prepare("INSERT INTO notes (title, body) VALUES (?, ?)").run(title, body);
    console.log(`Added note #${info.lastInsertRowid}: "${title}"`);
    break;
  }

  case "list": {
    const notes = db.prepare("SELECT id, title, created_at FROM notes ORDER BY id DESC").all();
    if (notes.length === 0) return console.log("No notes yet. Try: node notes-cli.js add \"Title\" \"Body\"");
    notes.forEach((n) => console.log(`#${n.id} [${n.created_at}] ${n.title}`));
    break;
  }

  case "search": {
    const query = args.join(" ");
    if (!query) {
      console.error('Usage: node notes-cli.js search "some words"');
      process.exit(1);
    }
    // bm25() ranks results by relevance - a real, built-in ranking
    // function, not something hand-rolled with LIKE '%...%'.
    const results = db
      .prepare(
        `SELECT notes.id, notes.title, notes.body, bm25(notes_fts) AS rank
         FROM notes_fts
         JOIN notes ON notes.id = notes_fts.rowid
         WHERE notes_fts MATCH ?
         ORDER BY rank`
      )
      .all(query);
    if (results.length === 0) return console.log(`No matches for "${query}"`);
    console.log(`${results.length} result(s) for "${query}":\n`);
    results.forEach((r) => console.log(`#${r.id} ${r.title}\n  ${r.body.slice(0, 100)}\n`));
    break;
  }

  case "delete": {
    const id = Number(args[0]);
    const info = db.prepare("DELETE FROM notes WHERE id = ?").run(id);
    console.log(info.changes ? `Deleted note #${id}` : `No note with id ${id}`);
    break;
  }

  default:
    console.log("Usage: node notes-cli.js <add|list|search|delete> ...");
}
