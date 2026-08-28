# Google AI Studio

## What it is

Google AI Studio is a free, browser-based tool for prototyping with Google's Gemini models — you write a prompt, attach text, images, video, or audio, adjust model settings (temperature, safety settings, system instructions, structured output schemas), and see the model's real response instantly, with no code and no API key setup required to start. Once a prompt behaves the way you want, a single **"Get code"** button exports it as a working code snippet (Python, JavaScript, or a `curl` command) using the exact same model, settings, and prompt — the actual bridge from experimenting to shipping.

- Website: https://aistudio.google.com
- Docs: https://ai.google.dev/gemini-api/docs
- Get an API key: https://aistudio.google.com/apikey

## Why this tool exists / the problem it solves

Iterating on a prompt by writing and re-running code for every small change — a different phrasing, a different image, a different output format — is slow, and makes it hard to separate "is my prompt wrong" from "is my code wrong." AI Studio removes that friction entirely for the exploration phase: change the prompt, hit run, see the result, in a browser tab, with zero code involved. It's also one of the few places to easily test Gemini's **multimodal** input (dropping in an image or a short video alongside your prompt) and its **structured output** feature (constraining the response to match an exact JSON schema) interactively, before committing either to actual application code.

The "Get code" export is the part that makes this genuinely useful beyond a toy playground: it removes the error-prone step of manually translating "a prompt and settings that worked in the UI" into "the equivalent API call," which is where subtle mismatches (a forgotten setting, a slightly different schema) commonly creep in.

## Why it matters in the AI era

AI Studio is often the fastest path from "I have an idea for what an LLM could do with this data" to a real, working integration — because you can validate the *hard part* (does the model actually extract/generate what I need, from this kind of input) visually and interactively, before writing any application code around it. For multimodal use cases specifically — extracting data from a photo, summarizing a video, transcribing and analyzing audio — being able to drag a real file into a browser and immediately see what the model does with it is a substantially faster feedback loop than writing a script for every experiment.

## Install

There's nothing to install to use AI Studio itself — it's entirely browser-based.

1. Go to https://aistudio.google.com and sign in with a Google account.
2. Get a free API key: https://aistudio.google.com/apikey (needed once you move from the UI to real code, as this mini project does).
3. Install the SDK for this mini project:
   ```powershell
   cd mini-project
   npm install
   ```

## Configure

- **API key as an environment variable**: this project uses a `.env` file (see [mini-project/.env.example](mini-project/.env.example)), the same pattern used throughout this repo — never hardcode it in source.
- **`responseSchema`** (used in this mini project's `receipt-scanner.js`): the real mechanism behind reliable structured output — unlike asking a model to "please respond in JSON" in plain prompt text, a schema *constrains* the response to match exactly, which is what makes `JSON.parse()` on the result safe to rely on in real code.
- **Model choice**: AI Studio lets you switch models (different Gemini variants trade off speed, cost, and capability) and see the difference immediately in the UI before picking one for your exported code — this mini project uses `gemini-2.0-flash`, a fast, low-cost default good for structured extraction tasks like this one.

## Core use cases

- Rapid prompt iteration and testing before writing any application code.
- Multimodal experimentation — images, video, audio input — directly in a browser, no upload pipeline to build first.
- Designing and testing structured JSON output schemas interactively before relying on them in real code.
- Exporting a validated prompt + settings combination directly as working code, avoiding manual re-implementation drift.
- Quick evaluation of which Gemini model variant fits a given task's speed/cost/quality trade-off.

## Real-life scenario: prototype a receipt scanner in AI Studio, then ship it as real code

This is the actual, intended AI Studio workflow: validate that a multimodal prompt works the way you need against a real image, directly in the browser, then export and run the equivalent as a genuine standalone script — the exact same model call, now callable from your own application.

**What the mini project does:** [mini-project/receipt-scanner.js](mini-project/receipt-scanner.js) takes a photo of a receipt and extracts structured data from it — merchant name, date, total, currency, and a line-item breakdown — using Gemini's multimodal input and a strict `responseSchema`, then cross-checks the extracted line items against the extracted total as a basic sanity check on the model's own output.

### Step 1 — Prototype the prompt in AI Studio first

Go to https://aistudio.google.com/prompts/new_chat, upload any receipt photo (a real one from your phone, or search for a sample receipt image online), and type a prompt like: *"Extract the merchant name, date, total, currency, and line items from this receipt."* Under the response settings, switch **Output format** to **Structured output (JSON)** and define a schema matching the shape in this project's `receiptSchema` (merchantName, date, total, currency, lineItems). Run it, and look at the real output against your real image — this is the exact validation step that makes exporting the code afterward trustworthy instead of a guess.

### Step 2 — Export it and compare

Click **Get code** (top right of the AI Studio interface) and select JavaScript. Compare what it generates to [mini-project/receipt-scanner.js](mini-project/receipt-scanner.js) — you'll see the same core shape: a model name, a `contents` array with your text and image, and a `responseSchema` in the generation config. This mini project takes that exact pattern and wraps it in a small reusable script with file-loading and a sanity check added on top.

### Step 3 — Set up your API key and run it for real

```powershell
cd mini-project
npm install
copy .env.example .env
```

Paste your key from https://aistudio.google.com/apikey into `.env`. Get a receipt image (a photo you take, or any sample receipt image saved locally) and save it as, e.g., `receipt.jpg` in `mini-project/`.

### Step 4 — Scan a real receipt

```powershell
node receipt-scanner.js receipt.jpg
```

You'll get back real structured JSON — merchant, date, total, currency, and a line-item array — extracted from an actual image, with the schema guaranteeing the shape matches what your code expects, no fragile text-parsing involved.

### Step 5 — Watch the sanity check catch a real mismatch

Try a receipt with a tip or a fee that isn't broken out as its own line item — the script sums the extracted line items and compares that to the extracted total, printing a mismatch warning if they don't reconcile. This is a genuinely useful real pattern for any AI-based data extraction: never fully trust a single field the model returns in isolation — cross-check it against other fields in the same response where possible, exactly as this script does.

### Step 6 — Try a different model in AI Studio, then swap it in code

Back in AI Studio, switch the model dropdown to a different Gemini variant and re-run your same prompt against the same image — compare accuracy and speed. Once you've picked one, change the `model:` string in `receipt-scanner.js` to match, and rerun Step 4 — the same "validate visually first" workflow, now applied to a model choice instead of just the prompt.

## Common pitfalls

- **Trusting unstructured JSON parsing**: asking a model to "respond in JSON" in plain text is much less reliable than an actual `responseSchema` — always prefer the schema approach for anything your code will parse and act on.
- **Not cross-validating extracted fields**: demonstrated in Step 5 — a model can return internally inconsistent data (a total that doesn't match its own line items); a real pipeline should check for this rather than trusting every field blindly.
- **Skipping the AI Studio validation step**: writing the API call directly without first confirming the prompt works well against real, varied examples in the UI makes it much harder to tell whether a bad result is a prompt problem or a code problem.
- **Committing the API key**: treat it like any other credential in this repo — `.env`, never source, never git.

## Resources

- AI Studio: https://aistudio.google.com
- Gemini API docs: https://ai.google.dev/gemini-api/docs
- Structured output guide: https://ai.google.dev/gemini-api/docs/structured-output
- Image understanding guide: https://ai.google.dev/gemini-api/docs/image-understanding
