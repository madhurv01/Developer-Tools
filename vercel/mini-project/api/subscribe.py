# A real Vercel Serverless Function using the Python runtime - zero server
# to provision or manage. Vercel auto-detects any .py file under /api as
# its own deployed endpoint: this file becomes POST/GET
# https://<your-app>/api/subscribe with no routing config needed. Vercel's
# Python runtime uses this exact BaseHTTPRequestHandler convention.

import json
import re
import time
from http.server import BaseHTTPRequestHandler

EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

# IMPORTANT, REAL LESSON: this dict only persists for the lifetime of ONE
# serverless function instance. Vercel can (and does) spin up multiple
# instances of this function under load, each with its OWN empty dict - so
# this "rate limiting" is NOT reliable across requests in production. It's
# left in deliberately, exactly as a real mistake teams make when they
# first move from a long-running server (where in-memory state persists)
# to serverless (where it doesn't). See the README's "Common pitfalls" and
# "Going further" sections for the real fix (Vercel KV / Upstash Redis).
recent_submissions = {}


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length) or b"{}")
        email = body.get("email", "")

        if not email or not EMAIL_REGEX.match(email):
            self._send(400, {"message": "A valid email is required"})
            return

        ip = self.headers.get("x-forwarded-for", "unknown")
        now = time.time()
        last = recent_submissions.get(ip)
        if last and now - last < 5:
            self._send(429, {"message": "Please wait a few seconds before trying again"})
            return
        recent_submissions[ip] = now

        # A real implementation would persist this (see README "Going further").
        print(f"New waitlist signup: {email} (from {ip})")

        self._send(200, {"message": f"{email} added to the waitlist"})

    def _send(self, status, body):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())
