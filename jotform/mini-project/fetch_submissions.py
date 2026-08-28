#!/usr/bin/env python3
# The other real integration pattern besides webhooks: pulling submissions
# directly from the Jotform REST API. Useful for a nightly export, a
# backfill, or any case where you don't want to (or can't) register a live
# webhook - e.g. building a report of everything submitted this week.

import os

import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.environ.get("JOTFORM_API_KEY")
FORM_ID = os.environ.get("JOTFORM_FORM_ID")


def main():
    if not API_KEY or not FORM_ID:
        raise SystemExit("Missing JOTFORM_API_KEY or JOTFORM_FORM_ID - copy .env.example to .env and fill it in.")

    url = f"https://api.jotform.com/form/{FORM_ID}/submissions"
    response = requests.get(
        url, params={"apiKey": API_KEY, "limit": 20, "orderby": "created_at"}
    )
    data = response.json()

    if data.get("responseCode") != 200:
        raise SystemExit(f"Jotform API error: {data.get('message')}")

    submissions = data["content"]
    print(f"Fetched {len(submissions)} submission(s) for form {FORM_ID}:\n")

    for sub in submissions:
        answers = " | ".join(
            f"{a['text']}: {a['answer']}" for a in sub.get("answers", {}).values()
        )
        print(f"#{sub['id']} ({sub['created_at']}) - {answers}")


if __name__ == "__main__":
    main()
