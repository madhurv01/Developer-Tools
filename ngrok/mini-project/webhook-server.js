// Real-world scenario: a GitHub webhook receiver.
// GitHub sends a POST request every time someone pushes to a repo.
// This server verifies the request really came from GitHub (HMAC signature check,
// exactly what GitHub itself recommends) and then reacts to the push — here, by
// writing a line to deploy.log, the same place a real "auto-deploy on push" script
// would hook in.
//
// Run: node webhook-server.js
// Then: ngrok http 3000
// Then: point a GitHub webhook at the ngrok URL + /webhook (see README for exact steps)

const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
// In a real project this comes from an environment variable / secret manager,
// and must match exactly what you type into GitHub's webhook "Secret" field.
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "my-local-dev-secret";
const LOG_FILE = path.join(__dirname, "deploy.log");

function verifySignature(payloadRaw, signatureHeader) {
  if (!signatureHeader) return false;
  const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
  const digest = "sha256=" + hmac.update(payloadRaw).digest("hex");
  const a = Buffer.from(digest);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function appendLog(line) {
  fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${line}\n`);
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Webhook receiver is up. POST GitHub events to /webhook");
    return;
  }

  if (req.method === "POST" && req.url === "/webhook") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const signature = req.headers["x-hub-signature-256"];
      const event = req.headers["x-github-event"];

      if (!verifySignature(body, signature)) {
        console.warn("Rejected webhook: invalid or missing signature");
        appendLog("REJECTED - invalid signature");
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid signature" }));
        return;
      }

      let payload;
      try {
        payload = JSON.parse(body);
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid JSON" }));
        return;
      }

      console.log(`Verified GitHub event: ${event}`);

      if (event === "push") {
        const branch = payload.ref?.replace("refs/heads/", "");
        const pusher = payload.pusher?.name;
        const commits = payload.commits?.length ?? 0;
        const line = `PUSH by ${pusher} to ${branch} (${commits} commit(s)) -> triggering deploy`;
        console.log(line);
        appendLog(line);

        // This is the exact point where a real system would run a deploy script,
        // e.g. execSync("./deploy.sh") or trigger a CI job.
      } else if (event === "ping") {
        appendLog("PING received - webhook configured correctly");
      } else {
        appendLog(`Received unhandled event type: ${event}`);
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ received: true, event }));
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
});

server.listen(PORT, () => {
  console.log(`Webhook receiver listening on http://localhost:${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`Using secret: "${WEBHOOK_SECRET}" (set WEBHOOK_SECRET env var to override)`);
  console.log(`Next: run "ngrok http ${PORT}" in another terminal`);
});
