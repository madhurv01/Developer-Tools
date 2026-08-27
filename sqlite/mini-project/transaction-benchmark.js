// The single most common real-world SQLite performance mistake, measured
// directly: every INSERT you run outside an explicit transaction is its
// own implicit transaction, meaning SQLite fsyncs to disk after EACH ONE.
// Wrapping many writes in a single transaction batches that fsync into
// one, at the end - often a 50-100x speedup for bulk inserts, with zero
// change to the actual SQL being run.

import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "benchmark.db");
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.exec("CREATE TABLE events (id INTEGER PRIMARY KEY, payload TEXT)");

const ROW_COUNT = 5000;
const insert = db.prepare("INSERT INTO events (payload) VALUES (?)");

console.log(`Inserting ${ROW_COUNT} rows WITHOUT a transaction (one implicit transaction per row)...`);
const startNoTx = performance.now();
for (let i = 0; i < ROW_COUNT; i++) {
  insert.run(`event-${i}`);
}
const noTxMs = performance.now() - startNoTx;
console.log(`Done in ${noTxMs.toFixed(0)}ms\n`);

db.exec("DELETE FROM events");

console.log(`Inserting ${ROW_COUNT} rows WRAPPED in a single transaction...`);
const insertMany = db.transaction((count) => {
  for (let i = 0; i < count; i++) {
    insert.run(`event-${i}`);
  }
});
const startTx = performance.now();
insertMany(ROW_COUNT);
const txMs = performance.now() - startTx;
console.log(`Done in ${txMs.toFixed(0)}ms\n`);

console.log("--- Result ---");
console.log(`Without transaction: ${noTxMs.toFixed(0)}ms`);
console.log(`With transaction:    ${txMs.toFixed(0)}ms`);
console.log(`Speedup: ${(noTxMs / txMs).toFixed(1)}x`);
