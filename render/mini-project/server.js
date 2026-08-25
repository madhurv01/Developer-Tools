// A real, PERSISTENT web service - deliberately the opposite of the Vercel
// mini project in this repo. This process stays running continuously on
// Render, so ordinary in-memory state (this counter) works correctly and
// reliably across every request, with no external store needed - the exact
// trade-off that makes Render the right choice over serverless for
// long-running processes, WebSocket servers, or anything that needs
// durable in-process state or a persistent connection.

import express from "express";

const app = express();
let visitCount = 0;
const startedAt = new Date();

app.get("/", (req, res) => {
  visitCount++;
  res.json({
    message: "Hello from a persistent Render web service",
    visitsSinceDeploy: visitCount,
    processUptimeSeconds: Math.round((Date.now() - startedAt.getTime()) / 1000),
    region: process.env.RENDER_REGION || "local (not deployed)",
  });
});

app.get("/healthz", (req, res) => {
  // Render's health check pings this before routing real traffic to a new
  // deploy, and periodically afterward - a real deploy stalls in "Deploying"
  // forever if this never returns 200.
  res.status(200).send("ok");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Web service listening on port ${PORT}`);
});
