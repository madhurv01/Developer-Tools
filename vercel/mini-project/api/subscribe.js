// A real Vercel Serverless Function - Node.js runtime, zero server to
// provision or manage. Vercel auto-detects any file under /api as its own
// deployed endpoint: this file becomes POST/GET https://<your-app>/api/subscribe
// with no routing config needed.

// IMPORTANT, REAL LESSON: this Map only persists for the lifetime of ONE
// serverless function instance. Vercel can (and does) spin up multiple
// instances of this function under load, each with its OWN empty Map - so
// this "rate limiting" is NOT reliable across requests in production. It's
// left in deliberately, exactly as a real mistake teams make when they
// first move from a long-running server (where in-memory state persists)
// to serverless (where it doesn't). See the README's "Common pitfalls" and
// "Going further" sections for the real fix (Vercel KV / Upstash Redis).
const recentSubmissions = new Map();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Use POST" });
  }

  const { email } = req.body || {};

  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ message: "A valid email is required" });
  }

  const ip = req.headers["x-forwarded-for"] || "unknown";
  const now = Date.now();
  const last = recentSubmissions.get(ip);
  if (last && now - last < 5000) {
    return res.status(429).json({ message: "Please wait a few seconds before trying again" });
  }
  recentSubmissions.set(ip, now);

  // A real implementation would persist this (see README "Going further").
  console.log(`New waitlist signup: ${email} (from ${ip})`);

  return res.status(200).json({ message: `${email} added to the waitlist` });
}
