// Real-world pattern: an API service backed by a separate Redis container
// for shared, persistent state (visit counts, rate limits, sessions, caches
// — the same shape used in production systems).
//
// This ONLY works because Docker Compose puts both containers on the same
// virtual network and lets them address each other by service name ("redis")
// instead of an IP address you'd have to hunt down manually.

const http = require("http");
const { createClient } = require("redis");

const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";
const PORT = process.env.PORT || 4000;

const redisClient = createClient({ url: REDIS_URL });
redisClient.on("error", (err) => console.error("Redis error:", err.message));

async function main() {
  await redisClient.connect();
  console.log(`Connected to Redis at ${REDIS_URL}`);

  const server = http.createServer(async (req, res) => {
    if (req.url === "/" && req.method === "GET") {
      const total = await redisClient.incr("total_visits");
      const path = "/";
      await redisClient.hIncrBy("visits_by_path", path, 1);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          message: "Visit recorded in Redis",
          totalVisitsAcrossAllRestarts: total,
          note: "Stop and restart the containers - this number will NOT reset, because Redis data lives in a named volume.",
        })
      );
      return;
    }

    if (req.url === "/stats" && req.method === "GET") {
      const total = (await redisClient.get("total_visits")) || 0;
      const byPath = await redisClient.hGetAll("visits_by_path");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ totalVisits: Number(total), byPath }, null, 2));
      return;
    }

    if (req.url === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  });

  server.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
