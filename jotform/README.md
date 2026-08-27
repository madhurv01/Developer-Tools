# Jotform

## What it is

Jotform is a drag-and-drop online form builder — surveys, intake forms, order forms, applications — that also exposes a real REST API and a webhook system, so a form isn't just a way to collect responses into a spreadsheet, it can be wired directly into your own backend. Non-technical teammates build the form visually; developers hook the resulting submissions into whatever needs to happen next — a database, a Slack alert, a ticketing system.

- Website: https://www.jotform.com
- API docs: https://api.jotform.com/docs/
- Webhook docs: https://www.jotform.com/help/webhooks/

## Why this tool exists / the problem it solves

Collecting structured input from people — customers, job applicants, bug reporters — usually means either building a custom form and backend from scratch (real engineering time for something that's mostly UI), or using a form tool that just dumps responses into a spreadsheet nobody automatically acts on. Jotform's real value is bridging both: a non-developer can build and edit the form itself in a visual builder, while a developer wires its output into a real system via the API or a webhook, without either side blocking on the other. A support team can change a dropdown's options at 5pm without filing a ticket; the backend that processes submissions doesn't need to change at all.

## Why it matters in the AI era

A form is one of the most common "collect real-world input" points in front of an AI pipeline — an intake form whose answers get summarized or classified by an LLM, a feedback form whose sentiment gets analyzed automatically and routed, a lead-qualification form scored by an AI model before a human ever sees it. Jotform's webhook is what makes that real-time instead of batch: the moment someone submits, your backend (and whatever AI logic it calls) can react immediately, rather than someone manually exporting a spreadsheet at the end of the week.

## Install

There's nothing to install for Jotform itself — it's a hosted platform. You need a free account and, for this mini project, Node for the receiver/API scripts.

1. Create a free account: https://www.jotform.com/signup
2. Get an API key: **Settings → API → Create New Key** (https://www.jotform.com/myaccount/api)
3. Install this mini project's dependencies:
   ```powershell
   cd mini-project
   npm install
   ```

## Configure

- **API key as an environment variable**: this project uses a `.env` file (see [mini-project/.env.example](mini-project/.env.example)) — the same pattern as every other tool in this repo. Treat it like a password; it grants full access to your forms and submissions.
- **Webhooks vs. the REST API — two real, different integration patterns**: a **webhook** pushes each submission to your server the instant it happens (real-time, used in this mini project's `webhook-server.js`); the **REST API** is pulled on your own schedule (used in `fetch-submissions.js`, good for exports, backfills, or reports). Real projects often use both — a webhook for immediate reaction, the API for periodic reconciliation in case a webhook delivery was ever missed.
- **Registering a webhook**: in the Jotform form builder, **Settings → Integrations → Webhooks**, paste in your endpoint's public URL. Since Jotform needs to reach your server over the internet, this is a genuine, realistic use of [ngrok](../ngrok/README.md) during development — see Step 4 below.

## Core use cases

- Turning form submissions into an immediate action (create a ticket, alert a team, kick off a workflow) instead of a spreadsheet nobody checks.
- Intake forms (bug reports, support requests, job applications) that need triage or routing logic based on the answers.
- Exporting or syncing form data into your own database or reporting pipeline via the REST API.
- Feeding form responses into an AI pipeline for classification, summarization, or scoring.
- Letting non-technical teammates own the form's questions and design while developers own what happens with the data.

## Real-life scenario: a bug-report intake form with real-time triage

This is a genuinely common real pattern: a form anyone (customers, teammates, testers) can fill out, wired to a webhook that automatically triages incoming reports by severity — the same shape as a real support/bug-tracking intake pipeline, without needing a full ticketing system to get started.

**What the mini project does:**
- [mini-project/webhook-server.js](mini-project/webhook-server.js) — a real webhook receiver that parses Jotform's actual payload shape (`rawRequest`, a JSON string of auto-generated question keys), matches answers by question text rather than brittle exact key names, logs every submission, and separately flags anything marked High/Critical severity into its own urgent log.
- [mini-project/simulate-jotform-submission.js](mini-project/simulate-jotform-submission.js) — sends a realistically-shaped fake submission so you can test the receiver before connecting a real Jotform account.
- [mini-project/fetch-submissions.js](mini-project/fetch-submissions.js) — pulls recent submissions directly from the Jotform REST API, the alternate "pull" integration pattern.

### Step 1 — Build a real form in Jotform

In the Jotform builder, create a short form with at least: a Name field, an Email field, a Severity dropdown (Low/Medium/High/Critical), and a Description textarea. Note its **Form ID** from the URL or the builder's Settings tab.

### Step 2 — Run the webhook receiver and test it locally first

```powershell
cd mini-project
npm install
node webhook-server.js
```

In another terminal:

```powershell
node simulate-jotform-submission.js
```

Check the first terminal — you'll see the submission logged, and because the simulated severity is "High," you'll also see it flagged in `URGENT SUBMISSION DETECTED`. Open `mini-project/submissions.log` and `mini-project/urgent-issues.log` to see both written to disk.

### Step 3 — Prove the resilient field-matching works

Open `simulate-jotform-submission.js` and rename `q5_severity` to `q9_severity` (simulating what happens when someone edits the real form and Jotform regenerates its question keys), rerun the simulation — the receiver still correctly finds and triages it, because `findAnswer()` matches on the word "severity" inside the key, not an exact key name. This is the real, practical reason to match by question text fragment instead of hardcoding Jotform's auto-generated keys.

### Step 4 — Connect a real Jotform webhook using ngrok

```powershell
ngrok http 3300
```

In your form's **Settings → Integrations → Webhooks**, paste in `https://<your-ngrok-url>/webhook`. Now submit the real form you built in Step 1 from a browser — watch it arrive at your local receiver in real time, logged and triaged exactly like the simulated one. (See [../ngrok/README.md](../ngrok/README.md) if you need ngrok itself set up first.)

### Step 5 — Pull the same data via the REST API

```powershell
copy .env.example .env
```

Fill in your `JOTFORM_API_KEY` and the `JOTFORM_FORM_ID` from Step 1, then:

```powershell
npm run fetch
```

You get the same submissions back, this time pulled on-demand from the API rather than pushed via webhook — useful for a nightly reconciliation job that catches anything a webhook delivery might have missed.

## Common pitfalls

- **Hardcoding exact Jotform field keys**: as shown in Step 3, Jotform's auto-generated keys (`q4_severity`) shift when a form is edited — match on question text fragments instead, the way this project's `findAnswer()` does.
- **Returning a non-200 from your webhook**: Jotform interprets anything other than a 200 as a failed delivery and will retry — make sure your endpoint always returns 200 once you've received the payload, even if downstream processing fails (log the failure separately instead).
- **Forgetting webhooks need a public URL**: `localhost` alone can never receive Jotform's webhook POST — ngrok (development) or a real deployed endpoint (production) is required.
- **Committing the API key**: treat it like any other credential in this repo — `.env`, never source, never git.

## Resources

- API docs: https://api.jotform.com/docs/
- Webhook guide: https://www.jotform.com/help/webhooks/
- API key setup: https://www.jotform.com/myaccount/api
