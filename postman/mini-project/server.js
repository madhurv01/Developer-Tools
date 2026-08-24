// A small API with real token-based auth - deliberately shaped to require
// the exact multi-request workflow (log in, capture a token, use it on
// later requests) that Postman's collection variables and pre-request/test
// scripts exist to automate. Without that chaining mechanism, testing an
// auth-protected API by hand means copy-pasting a token between requests
// every single time.

import express from "express";

const app = express();
app.use(express.json());

const VALID_USER = { username: "alice", password: "hunter2" };
const activeTokens = new Set();

let orders = [
  { id: 1, item: "Mechanical keyboard", quantity: 1 },
  { id: 2, item: "USB-C hub", quantity: 2 },
];
let nextId = 3;

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token || !activeTokens.has(token)) {
    return res.status(401).json({ message: "Missing or invalid token" });
  }
  next();
}

app.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username !== VALID_USER.username || password !== VALID_USER.password) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = `tok_${Math.random().toString(36).slice(2)}${Date.now()}`;
  activeTokens.add(token);
  res.json({ token, expiresInSeconds: 3600 });
});

app.get("/orders", requireAuth, (req, res) => {
  res.json(orders);
});

app.post("/orders", requireAuth, (req, res) => {
  const { item, quantity } = req.body || {};
  if (!item || typeof quantity !== "number" || quantity <= 0) {
    return res.status(400).json({ message: "item and a positive quantity are required" });
  }
  const order = { id: nextId++, item, quantity };
  orders.push(order);
  res.status(201).json(order);
});

app.get("/orders/:id", requireAuth, (req, res) => {
  const order = orders.find((o) => o.id === Number(req.params.id));
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json(order);
});

const PORT = 4002;
app.listen(PORT, () => {
  console.log(`Orders API running at http://localhost:${PORT}`);
  console.log(`Login with POST /login { "username": "alice", "password": "hunter2" }`);
});
