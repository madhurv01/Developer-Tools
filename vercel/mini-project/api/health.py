# Demonstrates two real, commonly-used pieces of the Vercel platform in one
# tiny endpoint: Vercel's own built-in environment variables (automatically
# injected on every deployment, no configuration needed) and a
# project-defined one (set via the dashboard or CLI, see README "Configure").

import json
import os
from http.server import BaseHTTPRequestHandler


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = {
            "status": "ok",
            # Automatically provided by Vercel on every deployment - useful
            # for debugging exactly which deployment/region/environment
            # served a request.
            "deployment": {
                "region": os.environ.get("VERCEL_REGION", "local (not deployed)"),
                "environment": os.environ.get("VERCEL_ENV", "development"),
                "gitCommit": os.environ.get("VERCEL_GIT_COMMIT_SHA", "n/a (local)"),
            },
            # A project-defined variable - only present once you've set it
            # yourself, proving the difference between platform-provided
            # and user-configured environment variables.
            "customMessage": os.environ.get(
                "CUSTOM_GREETING", "(CUSTOM_GREETING not set - see README Step 4)"
            ),
        }
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())
