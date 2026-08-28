#!/usr/bin/env python3
# Sends a realistically-shaped fake Jotform webhook payload to your local
# receiver, so you can test the parsing and triage logic before ever
# connecting a real Jotform account. Real Jotform webhook payloads are
# multipart/form-data with a "rawRequest" field containing a JSON string
# of auto-generated question keys - this mirrors that exactly.
#
# Run: python simulate_jotform_submission.py
# (webhook_server.py must already be running)

import json

import requests

raw_request = {
    "q3_name": {"first": "Jordan", "last": "Lee"},
    "q4_email": "jordan.lee@example.com",
    "q5_severity": "High",
    "q6_description": "The export button on the reports page throws a 500 error every time.",
}

response = requests.post(
    "http://localhost:3300/webhook",
    data={
        "formID": "123456789012345",
        "submissionID": "5555555555555555555",
        "formTitle": "Bug Report Intake",
        "rawRequest": json.dumps(raw_request),
    },
)

print(f"Response: {response.status_code} {response.text}")
