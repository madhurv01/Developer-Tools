#!/usr/bin/env python3
# Simulates a real GitHub "push" webhook payload and sends it to your local
# server with a correctly-signed HMAC header, exactly like GitHub would.
# Useful for testing the signature-verification logic before wiring up a
# real GitHub repo webhook.
#
# Run: python simulate_github_push.py
# (webhook_server.py must already be running)

import hashlib
import hmac
import json
import os

import requests

WEBHOOK_SECRET = os.environ.get("WEBHOOK_SECRET", "my-local-dev-secret")

payload = json.dumps(
    {
        "ref": "refs/heads/main",
        "pusher": {"name": "madhurvwork"},
        "commits": [
            {"id": "abc123", "message": "Fix login bug"},
            {"id": "def456", "message": "Update README"},
        ],
    }
)

signature = "sha256=" + hmac.new(
    WEBHOOK_SECRET.encode(), payload.encode(), hashlib.sha256
).hexdigest()

response = requests.post(
    "http://localhost:3000/webhook",
    data=payload,
    headers={
        "Content-Type": "application/json",
        "X-GitHub-Event": "push",
        "X-Hub-Signature-256": signature,
    },
)

print(f"Response {response.status_code}: {response.text}")
