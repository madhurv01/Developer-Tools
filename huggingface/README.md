# Hugging Face

## What it is

Hugging Face is the central hub for open-source machine learning: a place to find, download, and run hundreds of thousands of pretrained models (for text, images, audio, and more), plus the `transformers` Python library that makes running most of them a matter of a few lines of code. It also hosts open datasets and offers free hosting for demos (Spaces), but its core, defining contribution to the industry is making state-of-the-art open-source models something any developer can load and run themselves, without training anything from scratch.

- Website: https://huggingface.co
- Hub (browse models/datasets): https://huggingface.co/models
- `transformers` docs: https://huggingface.co/docs/transformers

## Why this tool exists / the problem it solves

Before Hugging Face, using a real, capable machine learning model meant either training one yourself (requiring data, compute, and ML expertise most teams don't have) or depending entirely on a closed, hosted API where you never see the model, can't run it offline, and pay per request indefinitely. Hugging Face's `transformers` library solves this by standardizing how models are loaded and run — `pipeline("sentiment-analysis")` works the same way regardless of which of thousands of underlying models you point it at — while the Hub itself is where the actual open-source model weights live, trained by research labs, companies, and individuals, and freely downloadable by anyone.

This matters concretely: once a model is downloaded, it's yours to run forever, on your own hardware, with your own data never leaving your machine — a fundamentally different trust and cost model than a pay-per-call hosted API.

## Why it matters in the AI era

Hugging Face is where the open-source side of the current AI wave actually lives — most open-weight LLMs (Llama, Mistral, Gemma, Qwen, and the models this repo's Ollama entry pulls from) are distributed through the Hub, and it's usually the first place a new open-source model appears the day it's released. For developers, it's the difference between "an AI feature means calling a company's paid API forever" and "an AI feature can run a real, capable, open-source model you fully control" — a distinction that matters for cost, privacy, offline capability, and simply not being dependent on a single vendor's pricing or availability.

## Install

```powershell
cd mini-project
pip install -r requirements.txt
```

This installs `transformers` and PyTorch (the underlying deep learning framework the models in this mini project run on) — expect a real download, PyTorch alone is a few hundred MB.

No account or API key is needed for this mini project — public models on the Hub can be downloaded and run anonymously. A free Hugging Face account (https://huggingface.co/join) is only needed for uploading your own models/datasets or accessing certain gated models, neither of which this mini project requires.

## Configure

- **Model cache location**: downloaded models are cached under `~/.cache/huggingface` by default (override with the `HF_HOME` environment variable) — delete this folder to force a fresh re-download, or to reclaim disk space from models you're no longer using.
- **Swapping models**: because `pipeline()` takes a model name as a plain string, trying a different model from the Hub is a one-line change — no code restructuring needed, which is the real, practical benefit of the standardized `pipeline()` interface.
- **CPU vs. GPU**: `transformers` automatically uses a GPU if PyTorch detects one (via CUDA); this mini project runs fine on CPU alone, just somewhat slower — nothing to configure either way for the models used here.

## Core use cases

- Running real, pretrained models for common tasks (classification, translation, summarization, embeddings) without training anything yourself.
- Prototyping an ML feature using an open-source model before deciding whether a hosted API or a custom-trained model is worth the investment.
- Fully offline, fully private inference — no data leaves your machine once a model is downloaded.
- Exploring and comparing many different open-source models for the same task via the Hub's model listings and leaderboards.
- Fine-tuning an existing open-source model on your own data instead of training from scratch.

## Real-life scenario: classifying support tickets with real open-source models, entirely offline

This is a genuine, common real use case — and it demonstrates something meaningfully different from this repo's Groq entry: instead of calling a hosted LLM API to reason about text, this downloads and runs actual trained, open-source classifier models yourself, with no API key and no per-request cost.

**What the mini project does:** [mini-project/ticket_classifier.py](mini-project/ticket_classifier.py) runs four realistic support messages through two real Hugging Face models:
- A sentiment classifier (`distilbert-base-uncased-finetuned-sst-2-english`) fine-tuned specifically for positive/negative sentiment.
- A zero-shot classifier (`facebook/bart-large-mnli`) that categorizes each ticket into labels **you define at runtime** (billing, bug report, feature request, praise) — without ever training or fine-tuning anything for these specific categories.

### Step 1 — Install and run it

```powershell
cd mini-project
pip install -r requirements.txt
python ticket_classifier.py
```

The first run downloads both models — expect it to take a minute or two and use a few hundred MB of disk. Every run after this is fully offline.

### Step 2 — Read the real output

You'll see each ticket correctly classified by sentiment and category — the angry refund complaint comes back `NEGATIVE` sentiment and `billing` category; the crash report comes back `bug report`; all from real trained models, not from an LLM prompt you wrote yourself.

### Step 3 — Prove it's fully offline

Disconnect from the internet (turn off Wi-Fi, or disable your network adapter) and run it again:

```powershell
python ticket_classifier.py
```

It still works, identically — because both models are already cached locally from Step 1. This is the concrete, practical difference from a hosted API: once downloaded, there is no dependency on any external service at all.

### Step 4 — Swap in a different open-source model (very instructive)

Browse https://huggingface.co/models?pipeline_tag=text-classification for another sentiment or classification model, copy its model id, and change the `model=` argument in `ticket_classifier.py` to that id. Re-run — the exact same `pipeline()` code now runs a completely different model, downloaded fresh from the Hub. This is the real, practical value of the standardized pipeline interface: swapping the underlying model doesn't require rewriting how you call it.

### Step 5 — Add your own zero-shot categories

Change `CANDIDATE_LABELS` to categories relevant to a domain you care about (e.g. `["urgent", "can wait", "spam"]`) and re-run — zero-shot classification adapts immediately, since it was never trained on your specific labels in the first place; it reasons about label *text* directly.

## Common pitfalls

- **Expecting an instant first run**: the first execution downloads real model weights (hundreds of MB) — this is normal, not a hang; watch for the download progress bars.
- **Running out of disk space with many models**: each distinct model you try gets cached separately — periodically clean `~/.cache/huggingface` if you've experimented with many models.
- **Confusing zero-shot with training**: zero-shot classification is genuinely powerful but generally less accurate than a model actually fine-tuned for your exact task — reach for a purpose-trained model (like the sentiment one here) when high accuracy on a well-defined task matters more than flexibility.
- **Assuming every model on the Hub is free to use commercially**: check each model's license on its Hub page — most are permissively licensed, but not universally, and this matters before shipping a model in a commercial product.

## Resources

- Hub (browse models): https://huggingface.co/models
- `transformers` docs: https://huggingface.co/docs/transformers
- `pipeline()` task reference: https://huggingface.co/docs/transformers/main_classes/pipelines
- Model licensing info: appears on each model's own Hub page under "Files and versions"
