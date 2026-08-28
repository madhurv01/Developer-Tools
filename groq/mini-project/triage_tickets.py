#!/usr/bin/env python3
# Real-world pattern: a support inbox generates a stream of unstructured
# text, and something needs to turn each message into structured data
# (category, urgency, sentiment) fast enough to route it in real time -
# not batch-processed overnight. This is exactly the class of workload
# Groq is chosen for in production: its LPU inference hardware returns far
# more tokens/second than typical GPU-served inference, which matters a lot
# once you're running this per-message, live, at volume.

import json
import os
import time

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

TICKETS = [
    "URGENT!! I've been charged twice for my subscription and nobody is responding to my emails. This is the third time this has happened!!",
    "Hey, just wondering if there's a dark mode planned for the dashboard? Not a big deal, just curious :)",
    "The export button on the reports page does nothing when I click it. Chrome, latest version. Happened after today's update.",
    "Cancelling my account. The product stopped working for our team and support hasn't replied in 4 days.",
]

SYSTEM_PROMPT = """You are a support ticket triage system. Given a raw customer message,
respond with ONLY a JSON object matching this exact shape:
{
  "category": "billing" | "bug" | "feature_request" | "account" | "other",
  "urgency": "low" | "medium" | "high",
  "sentiment": "positive" | "neutral" | "negative",
  "summary": "one sentence summary"
}"""


def triage_one(client, ticket_text):
    start = time.perf_counter()

    completion = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": ticket_text},
        ],
        # JSON mode - the model is constrained to return valid JSON matching
        # what the system prompt describes, so this can be safely parsed
        # downstream (e.g. to actually route the ticket) without regex or a
        # fragile "hope it followed instructions" parse.
        response_format={"type": "json_object"},
        temperature=0.2,
    )

    elapsed_ms = (time.perf_counter() - start) * 1000
    usage = completion.usage
    tokens_per_second = round((usage.completion_tokens / elapsed_ms) * 1000) if usage else None

    return json.loads(completion.choices[0].message.content), round(elapsed_ms), tokens_per_second


def main():
    if not os.environ.get("GROQ_API_KEY"):
        raise SystemExit("Missing GROQ_API_KEY - copy .env.example to .env and fill it in.")

    client = Groq(api_key=os.environ["GROQ_API_KEY"])
    print(f"Triaging {len(TICKETS)} tickets...\n")

    for i, ticket in enumerate(TICKETS, start=1):
        result, elapsed_ms, tokens_per_second = triage_one(client, ticket)
        print(f"--- Ticket {i} ---")
        preview = ticket[:70] + ("..." if len(ticket) > 70 else "")
        print(f'Text: "{preview}"')
        print(f"Category: {result['category']} | Urgency: {result['urgency']} | Sentiment: {result['sentiment']}")
        print(f"Summary: {result['summary']}")
        print(f"Latency: {elapsed_ms}ms ({tokens_per_second} tokens/sec)\n")


if __name__ == "__main__":
    main()
