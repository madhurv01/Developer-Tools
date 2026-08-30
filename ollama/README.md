# Ollama

## What it is

Ollama is a tool for running open-weight large language models (Llama, Mistral, Gemma, Qwen, and many others) directly on your own machine — download a model with one command, and it's immediately available through a local REST API on `http://localhost:11434`, with no cloud account, no API key, and no internet connection required after the initial download. It handles the genuinely fiddly parts of local LLM inference (quantization, hardware acceleration, model format conversion) so running a real, capable open-source model locally is a one-line command instead of a research project.

- Website: https://ollama.com
- Model library: https://ollama.com/library
- API docs: https://github.com/ollama/ollama/blob/main/docs/api.md

## Why this tool exists / the problem it solves

Running an open-weight LLM locally used to mean wrestling with Python environments, CUDA versions, model file formats (GGUF, safetensors, and others), and quantization settings just to get a model to load at all — real friction that kept "run an LLM on my own machine" out of reach for most developers, even though the open-weight models themselves were freely available. Ollama removes essentially all of that: `ollama pull llama3.2` downloads and prepares a model correctly for your hardware, and `ollama run` or its local API serves it immediately, using GPU acceleration automatically when available and falling back to CPU otherwise.

The other real problem it solves is trust and cost: once a model is running locally, your prompts and data never leave your machine, and there's no per-token bill — a genuinely different proposition from any hosted API, and the right tool when privacy, offline capability, or zero marginal cost matters more than having the single most capable model available.

## Why it matters in the AI era

Ollama is the most common way developers actually experiment with and build on open-weight models day to day — it's how you try a newly-released open model within minutes of its Hugging Face release, prototype an AI feature entirely offline before committing to a hosted API's cost or data-sharing terms, or build something that must never send user data to a third party (a tool processing internal logs, private documents, or regulated data). It's also the natural complement to this repo's Hugging Face entry: Hugging Face is where the open-weight models are published; Ollama is one of the easiest ways to actually run one.

## Install

### Windows / macOS / Linux

Download the installer: https://ollama.com/download — it installs the `ollama` CLI and sets up the background service that serves the local API.

Verify:

```powershell
ollama --version
```

Pull the base model this mini project builds on:

```powershell
ollama pull llama3.2
```

This downloads a few GB, depending on the model size — a real, capable open-weight model, now stored on your machine permanently.

## Configure

- **Modelfiles** (used in this mini project): a Modelfile lets you create a **customized, reusable model variant** — baking in a system prompt and parameters (like temperature) — on top of an existing base model, with zero fine-tuning or training involved. Once created with `ollama create`, it behaves like any other model you can `ollama run` or call via the API.
- **The local API**: Ollama exposes an HTTP API at `http://localhost:11434` by default — `/api/generate` for single-turn completion (used in this mini project) and `/api/chat` for multi-turn conversations, plus an OpenAI-compatible endpoint at `/v1` for dropping into code already written against the OpenAI SDK.
- **Hardware acceleration**: Ollama automatically uses an available GPU (NVIDIA/AMD/Apple Silicon) if present, falling back to CPU otherwise — nothing to configure manually, but larger models are meaningfully slower on CPU-only hardware.

## Core use cases

- Fully private, offline LLM inference for sensitive data that shouldn't reach a third-party API.
- Zero-marginal-cost experimentation — no per-token billing, ever, once a model is downloaded.
- Rapid local testing of newly-released open-weight models the same day they're published.
- Building a customized "assistant persona" (via a Modelfile) tailored to one specific, repeated task.
- Offline-capable AI features for desktop apps, CLI tools, or environments without reliable internet access.

## Real-life scenario: a private log-triage assistant that never leaves your machine

This is a genuinely realistic use case for local inference specifically: server logs can contain internal hostnames, stack traces, and occasionally accidental secrets — data you may not want (or be allowed) to send to any third-party API at all. This demonstrates a **custom Modelfile persona** solving a real, narrow, repeated task entirely offline.

**What the mini project does:**
- [mini-project/Modelfile](mini-project/Modelfile) defines a custom `log-triage` model on top of `llama3.2` — a low-temperature, tightly-scoped system prompt that only summarizes ERROR/CRITICAL lines from raw log input.
- [mini-project/sample.log](mini-project/sample.log) — a realistic server log with a mix of INFO/WARN/ERROR/CRITICAL lines, including a repeated connection failure and an out-of-memory crash.
- [mini-project/log-triage.js](mini-project/log-triage.js) sends the log file to the local model via Ollama's REST API and prints the summary.

### Step 1 — Make sure Ollama is running

```powershell
ollama serve
```

(On Windows/macOS, the installer usually runs this as a background service automatically — this command is only needed if it isn't already running.)

### Step 2 — Create the custom model from the Modelfile

```powershell
cd mini-project
ollama create log-triage -f Modelfile
```

This bakes the system prompt and temperature setting from `Modelfile` into a new, named model called `log-triage`, built on top of `llama3.2`.

### Step 3 — Run the triage script

```powershell
node log-triage.js
```

You'll get back a short summary identifying the repeated database connection failures, the email timeout errors, and the out-of-memory crash — extracted from raw, unstructured log text by a real local model, with the response format constrained by the Modelfile's system prompt rather than something you had to re-specify in the script itself.

### Step 4 — Prove it's genuinely private

Disconnect from the internet and re-run:

```powershell
node log-triage.js
```

It still works, identically — because the entire request goes to `http://localhost:11434` on your own machine. Open your OS's network monitor / Task Manager networking tab while it runs if you want to confirm no outbound connection is made at all.

### Step 5 — Compare against the base model directly

```powershell
ollama run llama3.2 "$(Get-Content sample.log -Raw)"
```

Notice the response is far less consistent and often ignores the "only ERROR/CRITICAL, under 150 words" constraint — because the base model has no persona baked in. This is the real, practical value of a Modelfile: turning a general-purpose model into a narrow, reliable tool for one repeated task.

### Step 6 — Try a different base model (optional)

Change `FROM llama3.2` in the Modelfile to another model from https://ollama.com/library (e.g. `mistral` or `gemma2`), re-run `ollama pull <model>` and `ollama create log-triage -f Modelfile` again, and compare output quality and speed — the same trade-off explored in this repo's Groq and Hugging Face entries, now for a fully local model.

## Common pitfalls

- **Forgetting to run `ollama create` after editing the Modelfile**: changes to `Modelfile` don't take effect until you re-run `ollama create log-triage -f Modelfile` — the model is a snapshot, not a live reference to the file.
- **Expecting instant responses on CPU-only hardware**: larger models are meaningfully slower without a GPU — this is a real hardware trade-off, not a bug.
- **Confusing this with fine-tuning**: a Modelfile only adds a system prompt and parameters on top of a model's existing behavior — it cannot teach the model new facts or capabilities the base model doesn't already have.
- **Running out of disk space**: each pulled model is several GB — check `ollama list` and `ollama rm <model>` to reclaim space from models you're no longer using.

## Resources

- Model library: https://ollama.com/library
- API docs: https://github.com/ollama/ollama/blob/main/docs/api.md
- Modelfile reference: https://github.com/ollama/ollama/blob/main/docs/modelfile.md
- OpenAI-compatible endpoint guide: https://github.com/ollama/ollama/blob/main/docs/openai.md
