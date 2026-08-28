#!/usr/bin/env python3
# The single most common real-world SQLite performance mistake, measured
# directly: every INSERT run outside an explicit transaction is its own
# implicit transaction, so SQLite fsyncs to disk after EACH ONE. Wrapping
# many writes in one transaction batches that fsync into one, at the end -
# often a 50-100x speedup for bulk inserts, no SQL logic change needed.

import sqlite3
import time
from pathlib import Path

DB_PATH = Path(__file__).parent / "benchmark.db"
DB_PATH.unlink(missing_ok=True)

ROW_COUNT = 5000

conn = sqlite3.connect(DB_PATH)
conn.execute("PRAGMA journal_mode = WAL")
conn.execute("CREATE TABLE events (id INTEGER PRIMARY KEY, payload TEXT)")

print(f"Inserting {ROW_COUNT} rows WITHOUT an explicit transaction (Python's sqlite3 "
      "auto-commits each statement by default in this mode)...")
start_no_tx = time.perf_counter()
for i in range(ROW_COUNT):
    conn.execute("INSERT INTO events (payload) VALUES (?)", (f"event-{i}",))
    conn.commit()  # simulates the common mistake: committing after every single row
no_tx_ms = (time.perf_counter() - start_no_tx) * 1000
print(f"Done in {no_tx_ms:.0f}ms\n")

conn.execute("DELETE FROM events")
conn.commit()

print(f"Inserting {ROW_COUNT} rows WRAPPED in a single transaction...")
start_tx = time.perf_counter()
conn.execute("BEGIN")
for i in range(ROW_COUNT):
    conn.execute("INSERT INTO events (payload) VALUES (?)", (f"event-{i}",))
conn.commit()
tx_ms = (time.perf_counter() - start_tx) * 1000
print(f"Done in {tx_ms:.0f}ms\n")

print("--- Result ---")
print(f"Without transaction: {no_tx_ms:.0f}ms")
print(f"With transaction:    {tx_ms:.0f}ms")
print(f"Speedup: {no_tx_ms / tx_ms:.1f}x")

conn.close()
