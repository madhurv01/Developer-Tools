# n8n

## What it is

n8n ("nodemation") is an open-source workflow automation platform — think of it as a self-hostable alternative to Zapier or Make. You build workflows visually on a canvas: a **trigger** node (a schedule, a webhook, a form submission, a new database row) starts the flow, and it passes data through a chain of **action** nodes (call an API, transform data, send a message, write to a database), with full support for conditional branching, loops, and custom JavaScript/Python code when the built-in nodes aren't enough.

- Website: https://n8n.io
- Docs: https://docs.n8n.io
- GitHub: https://github.com/n8n-io/n8n

## Why this tool exists / the problem it solves

Most real automation needs — "when X happens, do Y, unless Z, then notify someone" — historically meant writing and hosting a small backend service just to glue two APIs together, or paying for a SaaS automation tool (Zapier) that gets expensive fast at volume and requires sending your data through a third party's servers. n8n gives you the visual, no-backend-required workflow builder of Zapier, but:

- **Self-hosted**: your data and API keys never leave your own infrastructure.
- **Open source**: free to run at any scale, fully inspectable.
- **Code-when-you-need-it**: drop into a JavaScript/Python "Code" node for logic that's awkward to express visually, instead of being boxed in by the no-code paradigm.

## Why it matters in the AI era

n8n has first-class AI nodes — OpenAI, Anthropic, embeddings, vector store nodes (Pinecone, Qdrant, Supabase), and an "AI Agent" node that lets you build a genuine tool-using agent visually, wiring in the exact tools/APIs you want it to call. It's one of the fastest ways to prototype "trigger → LLM reasoning → action" pipelines (e.g. "read incoming support emails, classify with an LLM, auto-draft a reply, only send if confidence is high") without writing a backend from scratch — genuinely useful both for quick internal automations and as a way to demo an agent concept before committing to custom code.

## Install

The realistic way to run n8n is via Docker (see [../docker/README.md](../docker/README.md) if you need Docker itself first) — it needs a persistent volume for its own database, which the compose file below handles for you.

```powershell
cd mini-project
docker compose up
```

Alternative — npm, no Docker (slower first run, installs a lot of dependencies):

```powershell
npx n8n
```

Either way, open **http://localhost:5678**. On first visit you'll be asked to create a local owner account (email/password) — this is just for securing your own n8n instance, it doesn't send anything anywhere.

## Configure

- **Persisting data**: the compose file mounts a named volume (`n8n_data`) to `/home/node/.n8n`, which is where n8n stores your workflows, credentials, and execution history — without this volume, everything is lost when the container is removed.
- **Credentials**: real-world workflows need API keys (Slack, OpenAI, a database). Add these under **Settings → Credentials** inside the n8n UI — they're encrypted at rest in n8n's own database, not stored in the workflow JSON itself, which is why the exported workflow file in this project has no secrets in it.
- **Timezone**: workflows using Schedule Trigger run in the timezone n8n is configured with (default UTC). Set `GENERIC_TIMEZONE` and `TZ` environment variables in `docker-compose.yml` if you need local-time scheduling.

## Core use cases

- Scheduled monitoring/alerting (price checks, uptime checks, report generation).
- Connecting SaaS tools together (new Typeform submission → row in Airtable → Slack message).
- AI-powered pipelines (classify incoming data with an LLM, then branch on the result).
- Internal tooling glue code that would otherwise be a disposable script nobody maintains.

## Real-life scenario: a price-monitoring alert pipeline

This is a realistic shape for a huge category of automations: **poll something on a schedule, evaluate a condition, alert only when it matters.** The exact same pattern applies to uptime monitors, inventory alerts, competitor price trackers, or SLA breach detection — only the data source and condition change.

**What the mini project does:** an n8n workflow ([mini-project/price-monitor-workflow.json](mini-project/price-monitor-workflow.json)) that, every minute:
1. Calls the public CoinGecko API (no API key required) for the current Bitcoin price.
2. Checks an `IF` condition (price above a threshold).
3. If true, sends a POST request to an "alert" endpoint — in a real deployment this would be a Slack incoming webhook URL; here it's a local Flask server ([mini-project/alert_server.py](mini-project/alert_server.py)) that logs the alert, so you can see the entire pipeline fire end-to-end with zero external accounts needed.

### Step 1 — Start the alert receiver

```powershell
pip install -r mini-project/requirements.txt
python mini-project/alert_server.py
```

This simulates the Slack/Discord webhook n8n would normally call.

### Step 2 — Start n8n

```powershell
cd mini-project
docker compose up
```

Open http://localhost:5678 and complete the first-run setup.

### Step 3 — Import the workflow

Click **Add workflow** → menu (⋯) → **Import from File** → select `price-monitor-workflow.json`.

Note the "Send Alert" node's URL: `http://host.docker.internal:5001/alert`. Since n8n runs *inside a Docker container*, it can't reach your host machine via `localhost` — `host.docker.internal` is Docker's special DNS name for "the machine running Docker," which is exactly why this matters as a real-world Docker networking detail, not just an n8n quirk. (On Linux you may need `--add-host=host.docker.internal:host-gateway` in the compose file instead — see Docker's docs if `host.docker.internal` doesn't resolve.)

### Step 4 — Set a threshold you'll actually see fire

Open the "Price Above Threshold?" node and change the comparison value from `1` to something close to BTC's real current price (so it triggers immediately for testing) — e.g. if BTC is around $60,000, set the threshold to `50000`.

### Step 5 — Activate and watch it run

Click **Execute workflow** to run it once immediately, or toggle **Active** (top right) to let the Schedule Trigger run it automatically every minute. Watch the `alert_server.py` terminal — you should see `=== ALERT RECEIVED ===` with the live BTC price whenever the condition is met.

### Step 6 — Inspect a real execution

Click on any node after a run to see its actual input/output data — this is how you debug why a workflow branched the way it did, exactly like inspecting variables in a code debugger.

## Common pitfalls

- **`host.docker.internal` not resolving on Linux**: add `extra_hosts: ["host.docker.internal:host-gateway"]` under the `n8n` service in `docker-compose.yml`.
- **Workflow not firing**: a workflow must be toggled **Active** for its Schedule Trigger to run in the background — "Execute workflow" alone only runs it once, manually.
- **Rate limits**: CoinGecko's free public API has a rate limit; if you set the schedule to run every few seconds instead of every minute during testing, you may start getting errors.

## Resources

- Docs: https://docs.n8n.io
- Workflow templates library: https://n8n.io/workflows/
- AI nodes docs: https://docs.n8n.io/advanced-ai/
- Schedule Trigger docs: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.scheduletrigger/
