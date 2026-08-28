#!/usr/bin/env python3
# Stands in for a real alerting endpoint (Slack incoming webhook, Discord
# webhook, PagerDuty, email service, etc). n8n will POST alerts here exactly
# the way it would POST to a real Slack webhook URL - the workflow logic
# doesn't change, only the URL you point it at.
#
# Run: python alert_server.py

from datetime import datetime

from flask import Flask, request

app = Flask(__name__)

PORT = 5001


@app.route("/alert", methods=["POST"])
def alert():
    data = request.get_json(silent=True) or request.form.to_dict()
    message = data.get("text", str(data))
    print("\n=== ALERT RECEIVED ===")
    print(f"Time:    {datetime.now().isoformat()}")
    print(f"Message: {message}")
    print("=======================\n")
    return {"ok": True}, 200


if __name__ == "__main__":
    print(f"Alert receiver listening on http://localhost:{PORT}/alert")
    print("Point n8n's HTTP Request node here to simulate a Slack/Discord webhook.")
    app.run(port=PORT)
