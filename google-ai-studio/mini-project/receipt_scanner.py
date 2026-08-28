#!/usr/bin/env python3
# This is the real "export" of a prompt prototyped visually in Google AI
# Studio: upload an image there, describe what you want back, click "Get
# code," and this is the shape of what it hands you - a real API call
# using the same model and the same response schema you tested in the
# browser. Multimodal input (an image, here) plus a strict JSON schema for
# the output is the actual reason to prototype in AI Studio first: seeing
# the model's real output against a real image, before writing a single
# line of code.
#
# Usage: python receipt_scanner.py path/to/receipt.jpg

import json
import mimetypes
import os
import sys

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# The exact JSON shape this mini project's output must match - the model
# is constrained to fill this in, not just asked nicely to follow a format
# described in the prompt (contrast with plain "please respond in JSON").
RECEIPT_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "merchantName": {"type": "STRING"},
        "date": {"type": "STRING", "description": "ISO 8601 date, e.g. 2024-03-14"},
        "total": {"type": "NUMBER"},
        "currency": {"type": "STRING", "description": "3-letter currency code, e.g. USD"},
        "lineItems": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "description": {"type": "STRING"},
                    "amount": {"type": "NUMBER"},
                },
                "required": ["description", "amount"],
            },
        },
    },
    "required": ["merchantName", "total", "lineItems"],
}


def main():
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python receipt_scanner.py path/to/receipt.jpg")
    image_path = sys.argv[1]

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise SystemExit("Missing GEMINI_API_KEY - copy .env.example to .env and fill it in.")

    client = genai.Client(api_key=api_key)

    with open(image_path, "rb") as f:
        image_bytes = f.read()
    mime_type = mimetypes.guess_type(image_path)[0] or "image/jpeg"

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=[
            "Extract the structured data from this receipt image.",
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=RECEIPT_SCHEMA,
        ),
    )

    extracted = json.loads(response.text)

    print("Extracted receipt data:\n")
    print(json.dumps(extracted, indent=2))

    computed_total = sum(item["amount"] for item in extracted["lineItems"])
    print(f"\nLine items sum to: {computed_total:.2f}")
    print(f"Model reported total: {extracted['total']:.2f}")
    if abs(computed_total - extracted["total"]) > 0.01:
        print("Mismatch - the model's total doesn't match its own line items. Worth flagging for manual review.")
    else:
        print("Line items reconcile with the reported total.")


if __name__ == "__main__":
    main()
