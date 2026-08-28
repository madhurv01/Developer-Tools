#!/usr/bin/env python3
# A real Jotform webhook receiver, for a bug-report intake form. Jotform
# POSTs a submission here the instant someone submits the form - as
# multipart/form-data, with the actual answers packed into a JSON string
# in the "rawRequest" field. This is exactly the real payload shape you
# have to parse when integrating Jotform with your own backend, and it's
# the same "expose a local receiver publicly" pattern as the ngrok mini
# project in this repo - see this README's Step 4 for wiring the two together.

import json
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, request

app = Flask(__name__)

SUBMISSIONS_LOG = Path(__file__).parent / "submissions.log"
URGENT_LOG = Path(__file__).parent / "urgent-issues.log"


def append_log(path, line):
    with open(path, "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now(timezone.utc).isoformat()}] {line}\n")


# Finds an answer by matching part of the QUESTION TEXT, since Jotform's
# rawRequest keys are auto-generated ("q4_severity", "q7_stepsTo_reproduce")
# and shift whenever a form is edited - matching on the human-readable
# question text embedded in the key is the realistic, resilient way to do
# this instead of hardcoding exact key names that break the moment someone
# edits the form in the Jotform builder.
def find_answer(raw_request, question_fragment):
    for key, value in raw_request.items():
        if question_fragment.lower() in key.lower():
            return value
    return None


@app.route("/", methods=["GET"])
def index():
    return "Jotform webhook receiver is up. POST submissions to /webhook"


@app.route("/webhook", methods=["POST"])
def webhook():
    form_id = request.form.get("formID")
    submission_id = request.form.get("submissionID")
    form_title = request.form.get("formTitle")

    try:
        raw_request = json.loads(request.form.get("rawRequest", "{}"))
    except json.JSONDecodeError:
        print("Could not parse rawRequest - responding 200 anyway so Jotform doesn't retry forever")
        return "OK", 200

    severity = str(find_answer(raw_request, "severity") or "unknown")
    description = find_answer(raw_request, "description") or "(no description field found)"
    reporter_email = find_answer(raw_request, "email") or "(no email field found)"

    summary = f'Form "{form_title}" | Submission {submission_id} | Severity: {severity} | From: {reporter_email}'
    print(summary)
    append_log(SUBMISSIONS_LOG, summary)

    # Real triage logic: route high-severity bug reports somewhere that
    # actually gets noticed immediately, instead of sitting in a shared
    # inbox with everything else - the entire point of wiring a form to a
    # webhook instead of just emailing form results to a mailbox.
    if severity.lower() in ("high", "critical", "urgent"):
        urgent_line = f"{summary} | Description: {description}"
        print(f"URGENT SUBMISSION DETECTED: {urgent_line}")
        append_log(URGENT_LOG, urgent_line)

    # Jotform expects a 200 response to consider the webhook delivered - if
    # your endpoint returns an error, Jotform will retry the delivery.
    return "OK", 200


if __name__ == "__main__":
    PORT = 3300
    print(f"Jotform webhook receiver listening on http://localhost:{PORT}")
    print(f"Webhook endpoint: http://localhost:{PORT}/webhook")
    print(f"Next: run \"ngrok http {PORT}\" to get a public URL for a real Jotform webhook.")
    app.run(port=PORT)
