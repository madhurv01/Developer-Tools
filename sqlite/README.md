# SQLite

## What it is

SQLite is a self-contained, serverless, transactional SQL database engine that stores an entire database as a single ordinary file on disk. There's no separate database server process to install, configure, or keep running — any application links against the SQLite library directly and reads/writes that one file. It's the most widely deployed database engine in the world by installation count, embedded inside every major browser, every Android and iOS device, and a huge share of desktop applications, precisely because "just a file" is such a simple, dependency-free way to get a real relational database.

- Website: https://www.sqlite.org
- Docs: https://www.sqlite.org/docs.html
- FTS5 (full-text search) docs: https://www.sqlite.org/fts5.html

## Why this tool exists / the problem it solves

For a huge share of real applications — a desktop app's local data, a mobile app's offline storage, a CLI tool that needs to remember state, a low-to-medium-traffic web app — running a full client/server database (Postgres, MySQL) means standing up and operating a separate service for data that, realistically, one process on one machine needs to read and write. SQLite exists to make that case trivial: the "database" is a file that ships with your app, backs up like any other file, and needs no network connection, no credentials, no separate process to keep alive.

The other real misconception SQLite fixes over time: it's often dismissed as "just for prototyping," but modern SQLite (with WAL mode for concurrent reads during writes, and extensions like FTS5 for full-text search) is genuinely used in production at serious scale — it powers most of the data on your phone, and companies increasingly build real, multi-user production services on top of it (e.g. via Litestream for replication, or hosted edge-SQLite platforms like Turso and Cloudflare D1).

## Why it matters in the AI era

SQLite is a common choice for the local, embedded state an AI agent needs — conversation history, a local cache of tool call results, a lightweight local vector store (via extensions like `sqlite-vec`) for a desktop or CLI-based AI agent that shouldn't require provisioning a hosted database just to remember things between runs. It's also genuinely useful as a fast, zero-setup place to load and query a dataset an LLM-based pipeline needs to reason over, without spinning up a full database server for what might be a short-lived task.

## Install

### As a CLI tool (for exploring a database file directly)

```powershell
winget install SQLite.SQLite
```

Verify:

```powershell
sqlite3 --version
```

### For this mini project (Python)

Nothing to install — this mini project deliberately uses only Python's standard library. `sqlite3` ships built into every standard Python install, which is itself a real reason Python and SQLite are such a common pairing for CLI tools and small scripts: a real relational database with zero extra dependencies.

```powershell
python --version
```

Any Python 3.x install already has everything this mini project needs.

## Configure

- **Journal mode / WAL** (used in this mini project): SQLite's default journal mode blocks concurrent readers while a write is in progress. `db.pragma("journal_mode = WAL")` switches to Write-Ahead Logging, where readers keep working against the last-committed data while a write happens — the standard setting for any real app with more than one connection or concurrent access pattern.
- **Transactions for bulk writes**: covered directly in this mini project's benchmark — wrapping many writes in one transaction avoids an implicit fsync-per-statement, often a 50-100x speedup with no SQL changes.
- **File location**: the entire database is the `.db` file itself — back it up by copying that file (while not actively writing to it, or using SQLite's own backup API for a live database), version it, move it, inspect it with any SQLite browser. There's no separate "export" step the way there is for a server-based database.

## Core use cases

- Local, embedded application state — desktop apps, mobile apps, CLI tools, browser extensions.
- Full-text search over a moderate dataset without standing up a separate search service.
- A lightweight, file-based database for a low-to-medium-traffic web app or internal tool.
- Local caching, local vector stores, or agent memory for AI/ML tooling that runs on one machine.
- Anywhere "a real relational database, with zero operational overhead" beats "a proper client/server database" on cost/complexity grounds.

## Real-life scenario: a local-first notes app with real full-text search

This demonstrates the two things that actually distinguish SQLite from "a simple file-based key-value store": a real, ranked full-text search index (FTS5), and the transaction-batching behavior that matters the moment you're doing more than a handful of writes.

**What the mini project does:**
- [mini-project/notes_cli.py](mini-project/notes_cli.py) — a notes CLI backed entirely by one `notes.db` file, with an FTS5 virtual table kept in sync via triggers, so searching is fast and ranked by relevance (`bm25()`), not a slow `LIKE '%...%'` scan.
- [mini-project/transaction_benchmark.py](mini-project/transaction_benchmark.py) — inserts 5,000 rows twice, once committing after every row and once wrapped in a single transaction, and prints the real measured speedup.

### Step 1 — Add some notes

```powershell
cd mini-project
python notes_cli.py add "Groceries" "Buy milk, eggs, bread, and coffee beans"
python notes_cli.py add "Project idea" "Build a local-first notes app with full-text search using SQLite FTS5"
python notes_cli.py add "Meeting notes" "Discussed Q3 roadmap, database migration timeline, and hiring plan"
python notes_cli.py list
```

### Step 2 — Search it for real

```powershell
python notes_cli.py search "database"
```

Notice this matches "Project idea" (mentions "SQLite") only if the word "database" actually appears — try:

```powershell
python notes_cli.py search "roadmap hiring"
```

This returns the meeting notes, ranked by relevance via FTS5's built-in `bm25()` scoring — a real, fast, ranked search index, entirely inside the same file as your data, no separate search service involved.

### Step 3 — Prove the FTS index stays in sync automatically

```powershell
python notes_cli.py delete 1
python notes_cli.py search "milk"
```

Zero results — the delete trigger removed it from the search index too, automatically, because the triggers defined in `notes_cli.py` keep `notes_fts` in sync with the real `notes` table on every insert/update/delete.

### Step 4 — Run the transaction benchmark

```powershell
python transaction_benchmark.py
```

You'll see two real, measured timings — inserting 5,000 rows one statement at a time versus the exact same 5,000 inserts wrapped in a single transaction — with the speedup multiplier printed at the end. This is a real, common mistake in production code: bulk-loading data (a CSV import, a migration, a seed script) without wrapping it in a transaction, and being surprised it's dramatically slower than expected.

### Step 5 — Inspect the actual file (optional)

```powershell
sqlite3 notes.db ".tables"
sqlite3 notes.db "SELECT * FROM notes;"
```

This is the entire "database" — one file, inspectable with the plain `sqlite3` CLI, copyable like any other file for a full, instant backup.

## Common pitfalls

- **Bulk writes with no transaction**: demonstrated directly in Step 4 — always wrap multi-row writes in a transaction unless you have a specific reason not to.
- **Forgetting WAL mode for concurrent access**: without it, a long-running write can block readers unnecessarily — set `journal_mode = WAL` for any app with more than trivial concurrent access.
- **Using `LIKE '%word%'` instead of FTS5 for search**: works for tiny datasets but doesn't scale and has no relevance ranking — FTS5 is built in and not meaningfully harder to set up, as shown in this project.
- **Assuming SQLite can't handle "real" production traffic**: true for very high write-concurrency, multi-server workloads, but a large share of real apps overestimate their actual concurrency needs — measure before reaching for a heavier database by default.

## Resources

- Docs: https://www.sqlite.org/docs.html
- FTS5 (full-text search): https://www.sqlite.org/fts5.html
- WAL mode: https://www.sqlite.org/wal.html
- Python `sqlite3` module docs: https://docs.python.org/3/library/sqlite3.html
