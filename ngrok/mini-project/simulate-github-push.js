// Simulates a real GitHub "push" webhook payload and sends it to your local
// server with a correctly-signed HMAC header, exactly like GitHub would.
// Useful for testing the signature-verification logic before wiring up a real
// GitHub repo webhook.
//
// Run: node simulate-github-push.js
// (webhook-server.js must already be running)

const http = require("http");
const crypto = require("crypto");

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "my-local-dev-secret";

const payload = JSON.stringify({
  ref: "refs/heads/main",
  pusher: { name: "madhurvwork" },
  commits: [
    { id: "abc123", message: "Fix login bug" },
    { id: "def456", message: "Update README" },
  ],
});

const signature =
  "sha256=" + crypto.createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex");

const req = http.request(
  {
    hostname: "localhost",
    port: 3000,
    path: "/webhook",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
      "X-GitHub-Event": "push",
      "X-Hub-Signature-256": signature,
    },
  },
  (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
      console.log(`Response ${res.statusCode}:`, data);
    });
  }
);

req.on("error", (err) => console.error("Request failed:", err.message));
req.write(payload);
req.end();
