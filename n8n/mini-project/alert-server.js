// Stands in for a real alerting endpoint (Slack incoming webhook, Discord
// webhook, PagerDuty, email service, etc). n8n will POST alerts here exactly
// the way it would POST to a real Slack webhook URL - the workflow logic
// doesn't change, only the URL you point it at.
//
// Run: node alert-server.js

const http = require("http");

const PORT = 5001;

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/alert") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        console.log("\n=== ALERT RECEIVED ===");
        console.log(`Time:    ${new Date().toISOString()}`);
        console.log(`Message: ${data.text || JSON.stringify(data)}`);
        console.log("=======================\n");
      } catch {
        console.log("Received non-JSON alert body:", body);
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`Alert receiver listening on http://localhost:${PORT}/alert`);
  console.log("Point n8n's HTTP Request node here to simulate a Slack/Discord webhook.");
});
