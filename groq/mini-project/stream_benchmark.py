#!/usr/bin/env python3
# Measures the two numbers that actually matter for a real-time AI feature
# (a live chat UI, a voice agent, an autocomplete-style tool): time-to-
# first-token (how long a user stares at nothing before text appears) and
# sustained tokens/sec once generation is underway. Prints tokens to the
# terminal as they arrive, the same UX pattern a streaming chat UI relies
# on, so you can literally watch the speed instead of just reading a number.

import os
import sys
import time

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

PROMPT = "Explain, in about 150 words, why low-latency LLM inference matters for real-time voice agents."


def main():
    if not os.environ.get("GROQ_API_KEY"):
        raise SystemExit("Missing GROQ_API_KEY - copy .env.example to .env and fill it in.")

    client = Groq(api_key=os.environ["GROQ_API_KEY"])

    print(f'Prompt: "{PROMPT}"\n')
    print("Streaming response (watch it arrive token by token):\n")

    start = time.perf_counter()
    first_token_at = None
    token_count = 0

    stream = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": PROMPT}],
        stream=True,
    )

    for chunk in stream:
        token = chunk.choices[0].delta.content or ""
        if token:
            if first_token_at is None:
                first_token_at = time.perf_counter()
            token_count += 1
            sys.stdout.write(token)
            sys.stdout.flush()

    end = time.perf_counter()
    time_to_first_token_ms = round((first_token_at - start) * 1000)
    total_ms = round((end - start) * 1000)
    generation_ms = (end - first_token_at) * 1000
    tokens_per_second = round((token_count / generation_ms) * 1000) if generation_ms else 0

    print("\n\n--- Benchmark ---")
    print(f"Time to first token: {time_to_first_token_ms}ms")
    print(f"Total response time: {total_ms}ms")
    print(f"Approx tokens streamed: {token_count}")
    print(f"Approx generation speed: {tokens_per_second} tokens/sec")
    print(
        "\nCompare this time-to-first-token against a typical GPU-hosted API - "
        "this gap is the entire reason Groq gets chosen for latency-sensitive, real-time AI features."
    )


if __name__ == "__main__":
    main()
