#!/usr/bin/env python3
# Real-world scenario: a GitHub webhook receiver.
# GitHub sends a POST request every time someone pushes to a repo.
# This server verifies the request really came from GitHub (HMAC signature
# check, exactly what GitHub itself recommends) and then reacts to the
# push - here, by writing a line to deploy.log, the same place a real
# "auto-deploy on push" script would hook in.
#
# Run: python webhook_server.py
# Then: ngrok http 3000
# Then: point a GitHub webhook at the ngrok URL + /webhook (see README)

import hashlib
import hmac
import os
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, request

app = Flask(__name__)

PORT = 3000
# In a real project this comes from an environment variable / secret
# manager, and must match exactly what you type into GitHub's webhook
# "Secret" field.
WEBHOOK_SECRET = os.environ.get("WEBHOOK_SECRET", "my-local-dev-secret")
LOG_FILE = Path(__file__).parent / "deploy.log"


def verify_signature(payload_raw, signature_header):
    if not signature_header:
        return False
    digest = "sha256=" + hmac.new(WEBHOOK_SECRET.encode(), payload_raw, hashlib.sha256).hexdigest()
    return hmac.compare_digest(digest, signature_header)


def append_log(line):
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now(timezone.utc).isoformat()}] {line}\n")


@app.route("/", methods=["GET"])
def index():
    return "Webhook receiver is up. POST GitHub events to /webhook"


@app.route("/webhook", methods=["POST"])
def webhook():
    signature = request.headers.get("X-Hub-Signature-256")
    event = request.headers.get("X-GitHub-Event")

    if not verify_signature(request.get_data(), signature):
        print("Rejected webhook: invalid or missing signature")
        append_log("REJECTED - invalid signature")
        return {"error": "invalid signature"}, 401

    payload = request.get_json(silent=True)
    if payload is None:
        return {"error": "invalid JSON"}, 400

    print(f"Verified GitHub event: {event}")

    if event == "push":
        branch = (payload.get("ref") or "").replace("refs/heads/", "")
        pusher = (payload.get("pusher") or {}).get("name")
        commits = len(payload.get("commits") or [])
        line = f"PUSH by {pusher} to {branch} ({commits} commit(s)) -> triggering deploy"
        print(line)
        append_log(line)
        # This is the exact point where a real system would run a deploy
        # script, e.g. subprocess.run(["./deploy.sh"]) or trigger a CI job.
    elif event == "ping":
        append_log("PING received - webhook configured correctly")
    else:
        append_log(f"Received unhandled event type: {event}")

    return {"received": True, "event": event}, 200


if __name__ == "__main__":
    print(f"Webhook receiver listening on http://localhost:{PORT}")
    print(f"Webhook endpoint: http://localhost:{PORT}/webhook")
    print(f'Using secret: "{WEBHOOK_SECRET}" (set WEBHOOK_SECRET env var to override)')
    print(f"Next: run \"ngrok http {PORT}\" in another terminal")
    app.run(port=PORT)
