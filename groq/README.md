# Groq

## What it is

Groq is an AI inference platform built around custom hardware — the **LPU** (Language Processing Unit), purpose-built for running language models, as opposed to GPUs, which were designed for graphics rendering and adapted for AI workloads afterward. Groq runs popular open-source models (Llama, Mixtral, Gemma, Whisper, and others) on this hardware and exposes them through an API that is deliberately **OpenAI-compatible** — meaning existing OpenAI SDK code often works against Groq with only the base URL and API key changed. Its entire pitch is one number: dramatically higher tokens-per-second than typical GPU-hosted inference, at a fraction of the cost, for the same open-source models.

- Website: https://groq.com
- Console (get an API key): https://console.groq.com
- Docs: https://console.groq.com/docs
- Model list & pricing: https://console.groq.com/docs/models

## Why this tool exists / the problem it solves

For most AI applications, model *quality* gets all the attention, but a huge and growing category of real products is bottlenecked by **latency**, not quality: a voice assistant that needs to respond before an awkward silence, an autocomplete-style tool that has to feel instant, a multi-step AI agent that calls a model many times in a row to decide its next action, where each hop's delay stacks on top of the last. Standard GPU-hosted inference is often fast enough for a chat window where a user is willing to wait a couple of seconds, but it is often not fast enough for these latency-sensitive use cases.

Groq exists specifically to solve that problem: purpose-built inference hardware that generates tokens dramatically faster than typical GPU serving, for the same open-source models you'd otherwise run yourself or rent GPU time for. It doesn't change what the model can do — it changes how fast it does it, which turns out to be the deciding factor for an entire class of real products.

## Why it matters in the AI era

Speed compounds. A single slow LLM call is an inconvenience; an **agent** that makes five or ten sequential LLM calls to plan and execute a task turns that same latency into a multi-second (or multi-minute) wait, which is often the actual reason an AI agent feels unusable in practice even when its reasoning is sound. Groq is one of the default choices when a team hits exactly this wall — voice agents, real-time chat, and multi-step tool-calling agents are the three most common reasons a team specifically reaches for Groq instead of (or alongside) a standard hosted model API.

## Install

There's nothing to install to use Groq itself — it's a hosted API. You install a client SDK in your own project.

1. Create a free account and get an API key: https://console.groq.com/keys
2. Install the SDK for this mini project:
   ```powershell
   cd mini-project
   pip install -r requirements.txt
   ```

Groq also publishes an SDK for Node/JS, and — because the API is OpenAI-compatible — you can often use the standard `openai` SDK directly, just pointed at `https://api.groq.com/openai/v1` instead of OpenAI's endpoint, which is a genuinely common way teams migrate an existing OpenAI-based project to try Groq with minimal code changes.

## Configure

- **API key as an environment variable**: this project uses a `.env` file (see [mini-project/.env.example](mini-project/.env.example)), the same pattern used throughout this repo — never hardcode it in source.
- **Model choice**: Groq hosts several open-source models at different size/speed/quality trade-offs (e.g. `llama-3.1-8b-instant` for maximum speed, larger Llama variants for more capability at somewhat lower throughput) — check https://console.groq.com/docs/models for the current lineup, since available models change over time as new open-source releases come out.
- **Rate limits**: the free tier has real, fairly generous rate limits per model, shown live in the Console — worth checking before assuming a script failure is a bug rather than a limit.

## Core use cases

- Real-time voice agents, where every millisecond of model latency is perceived directly by someone mid-conversation.
- Multi-step AI agents / tool-calling pipelines, where several sequential LLM calls make cumulative latency the dominant cost.
- High-throughput structured data extraction — classifying, tagging, or extracting fields from large volumes of text fast enough to run inline rather than as an overnight batch job.
- Cost-sensitive workloads using capable open-source models without paying for proprietary-model pricing or managing your own GPU infrastructure.
- Drop-in speed upgrades for existing OpenAI-SDK-based projects, thanks to API compatibility.

## Real-life scenario: real-time support ticket triage + a live latency benchmark

This is the actual shape of problem Groq gets reached for: turning unstructured, real-time text into structured, actionable data fast enough to act on immediately — plus a direct, visible benchmark of the low-latency streaming experience Groq is chosen for in voice and chat products.

**What the mini project does:**
- [mini-project/triage_tickets.py](mini-project/triage_tickets.py) sends four realistic, messy support messages through Groq's **JSON mode**, which constrains the model to return valid structured JSON (category, urgency, sentiment, summary) that can be parsed and routed automatically — no fragile regex-parsing of free text. It prints the latency and tokens/sec for each one.
- [mini-project/stream_benchmark.py](mini-project/stream_benchmark.py) streams a response token-by-token to your terminal in real time, and reports **time-to-first-token** and **sustained tokens/sec** — the two numbers that actually determine whether a real-time AI feature feels instant or sluggish.

### Step 1 — Set up your API key

```powershell
cd mini-project
pip install -r requirements.txt
copy .env.example .env
```

Edit `.env` and paste in your key from https://console.groq.com/keys.

### Step 2 — Run the ticket triage pipeline

```powershell
python triage_tickets.py
```

Watch each of the four unstructured messages get turned into clean structured JSON — category, urgency, sentiment, and a one-sentence summary — with real latency and tokens/sec numbers printed for each. Notice the angry billing complaint gets classified `category: billing`, `urgency: high`, `sentiment: negative` correctly, purely from the raw, informally-written text — this is the actual, realistic input shape a support inbox produces.

### Step 3 — Run the streaming latency benchmark

```powershell
python stream_benchmark.py
```

Watch the response print token by token in real time, then read the benchmark numbers at the end — time-to-first-token in particular. This is the exact UX and the exact metric behind "why does this AI feature feel instant" in a well-built product versus one that makes users stare at a loading spinner.

### Step 4 — Compare models (optional, very instructive)

In either script, change `model="llama-3.1-8b-instant"` to a larger model from https://console.groq.com/docs/models and re-run. You'll see the quality/speed trade-off directly: a larger model may reason slightly better but streams measurably slower — the real decision every team building on Groq has to make for their specific use case.

### Step 5 — Break the JSON mode contract (optional, instructive)

In `triage_tickets.py`, temporarily change the system prompt to remove the explicit JSON shape instructions while keeping `response_format={"type": "json_object"}`. Re-run — you'll likely still get valid JSON (the mode enforces valid JSON syntax), but the *fields* may no longer match what your downstream code expects, since only the prompt — not the API — defines the actual shape. This is the real lesson behind JSON mode: it guarantees parseable output, not a specific schema, so the schema still has to be specified clearly in your prompt (or enforced with a stricter tool-calling / function-schema approach for critical pipelines).

## Common pitfalls

- **Assuming JSON mode enforces your exact schema**: as shown in Step 5, it only guarantees valid JSON syntax — you still need clear prompt instructions (or structured tool/function calling) to pin down the exact fields.
- **Not handling rate limits gracefully**: a real triage pipeline processing many tickets in a loop should handle `429` responses with backoff — this mini project's small batch of four won't hit limits, but a production version at scale needs to.
- **Comparing latency unfairly**: always compare time-to-first-token and tokens/sec against the *same* model size elsewhere — a small fast model will naturally look faster than a large model on a different platform, which isn't a fair speed comparison on its own.
- **Committing the API key**: treat it exactly like any other credential in this repo — `.env`, never source, never git.

## Resources

- Docs: https://console.groq.com/docs
- Model list & pricing: https://console.groq.com/docs/models
- JSON mode / structured outputs guide: https://console.groq.com/docs/text-chat#json-mode
- OpenAI SDK compatibility guide: https://console.groq.com/docs/openai
