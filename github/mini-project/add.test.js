// Uses Node's BUILT-IN test runner (node:test, Node 18+) - zero npm
// dependencies needed, which keeps this mini project's CI workflow simple:
// no package.json install step, no lockfile, just `node --test`.
const test = require("node:test");
const assert = require("node:assert");
const { add } = require("./add");

test("add(2, 3) equals 5", () => {
  assert.strictEqual(add(2, 3), 5);
});

test("add(-1, 1) equals 0", () => {
  assert.strictEqual(add(-1, 1), 0);
});

test("add(0, 0) equals 0", () => {
  assert.strictEqual(add(0, 0), 0);
});
