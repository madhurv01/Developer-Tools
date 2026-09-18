# Jira

## What it is

Jira is Atlassian's issue tracker — the place teams file bugs, plan work as tickets, and track status across a board or sprint. Its real power for developers isn't the UI, though: Jira exposes a full REST API (and, more recently, an official remote **MCP server**) that lets any system — a CI pipeline, a monitoring tool, a form backend, an AI agent — create, update, or query tickets programmatically. A huge share of real engineering automation ends with "…and file a Jira ticket," and this is how that actually gets wired up.

- Website: https://www.atlassian.com/software/jira
- REST API docs: https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/
- Jira MCP server (Atlassian's official remote MCP): https://www.atlassian.com/platform/remote-mcp-server

## Why this tool exists / the problem it solves

Work that isn't tracked tends to get lost — a bug someone mentions in Slack, a CI failure nobody follows up on, a customer complaint that lives only in someone's inbox. Jira exists to give that work a permanent, assignable, status-tracked home. But manually creating a ticket for every failure, every intake form submission, every alert doesn't scale — someone has to notice, open Jira, and type it up, and in practice that step gets skipped constantly.

The real fix is automation: wire the *source* of the problem (a failed CI run, a webhook, a monitoring alert) directly to Jira's API so a ticket gets created the moment something actually needs tracking, with no human in the loop for the "notice and file it" step. This is one of the single most common integration points in real engineering organizations — arguably more Jira API calls happen from CI systems, bots, and internal tools than from anyone manually clicking "Create."

## Why it matters in the AI era

Automatically filing a well-formed ticket is exactly the kind of task an AI agent is good at — reading an unstructured error, log, or report, and turning it into a properly-categorized, correctly-prioritized, non-duplicate ticket. This is also where Atlassian's official **remote MCP server** for Jira comes in directly: it exposes Jira's actions (search, create, update, transition issues) as MCP tools an AI agent like Claude can call using natural language, instead of you writing REST API glue code for every workflow — the same automation this mini project builds by hand, but callable conversationally. Both approaches matter: the REST API is what any automation (including an MCP server itself) is built on; MCP is the layer that makes it usable directly from an AI agent without writing code at all.

## Install

There's nothing to install for Jira itself — it's a hosted platform (Jira Cloud). For this mini project:

```powershell
cd mini-project
pip install -r requirements.txt
```

### Get an API token

1. Sign up for a free Jira Cloud site if you don't have one: https://www.atlassian.com/software/jira/free
2. Create an API token: https://id.atlassian.com/manage-profile/security/api-tokens
3. Note your site URL (`https://your-domain.atlassian.net`), the email on your Atlassian account, and a project key (visible in the project's URL/settings, e.g. `DEV`).

## Configure

- **Auth**: the REST API uses HTTP Basic Auth with your **email + API token** — never your actual account password, and the token can be revoked independently at any time. This mini project reads all three from a `.env` file (see [mini-project/.env.example](mini-project/.env.example)), the same pattern used throughout this repo.
- **ADF (Atlassian Document Format)**: rich-text fields like `description` aren't plain strings in the v3 API — they're a structured JSON document format. [mini-project/jira_client.py](mini-project/jira_client.py)'s `adf_paragraph()` helper shows the minimal shape needed for a simple paragraph.
- **JQL (Jira Query Language)**: the same query language used in Jira's own search bar is callable directly via the API's `/search` endpoint — used in this mini project both for the duplicate-ticket check and for a standalone report script.

## Core use cases

- Auto-filing tickets from CI/CD failures, monitoring alerts, or error trackers — this mini project's focus.
- Turning form/webhook intake (support requests, bug reports — see this repo's Jotform entry) into tracked Jira issues instead of a spreadsheet or inbox.
- Querying and reporting on ticket data programmatically via JQL for dashboards or status reports.
- Bulk operations — transitioning, labeling, or updating many issues at once from a script instead of clicking through each one.
- AI-agent-driven ticket triage and creation via the official Jira MCP server (see "Going further" below).

## Real-life scenario: auto-filing a Jira ticket from a failed CI run, without creating duplicates

This is a genuinely common real automation — and it pairs directly with this repo's [git](../git/README.md) and [github](../github/README.md) entries: a CI failure is exactly the kind of event that should become a tracked ticket automatically, and the naive version of this automation has a real, common bug (filing a duplicate ticket on every repeated failure) that this mini project explicitly avoids.

**What the mini project does:**
- [mini-project/ci_failure_payload.json](mini-project/ci_failure_payload.json) — a realistically-shaped GitHub Actions `workflow_run` failure payload (the same event this repo's GitHub entry's CI workflow would produce on a failed run).
- [mini-project/jira_client.py](mini-project/jira_client.py) — a thin wrapper around the real Jira REST API v3: creating issues, and searching via JQL to check for an existing open ticket before creating a new one.
- [mini-project/create_ticket_from_ci_failure.py](mini-project/create_ticket_from_ci_failure.py) — reads the CI failure payload, checks for a duplicate, and files a properly prioritized, labeled Bug ticket if none exists.
- [mini-project/search_tickets.py](mini-project/search_tickets.py) — a standalone JQL report of every ticket this automation has filed.

### Step 1 — Set up your credentials

```powershell
cd mini-project
pip install -r requirements.txt
copy .env.example .env
```

Fill in `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, and `JIRA_PROJECT_KEY` in `.env`.

### Step 2 — File a ticket from the simulated CI failure

```powershell
python create_ticket_from_ci_failure.py
```

You'll see it search for an existing matching ticket (finding none), then create a real Bug ticket in your Jira project — priority `High` because the payload's branch is `main`, labeled `ci-failure` and `branch-main`. The script prints the real ticket key and a direct link — open it in Jira and confirm the description, priority, and labels all landed correctly.

### Step 3 — Run it again and watch the duplicate-prevention kick in

```powershell
python create_ticket_from_ci_failure.py
```

Same payload, same summary — this time it finds the ticket from Step 2 and prints "Already tracked," creating nothing new. This is the real, practical lesson: without this check, a flaky CI job failing five times in a row files five identical tickets — a genuinely common mistake in naive webhook-to-Jira automations.

### Step 4 — Change the payload and see the triage logic adapt

Edit `ci_failure_payload.json` — change `head_branch` to `feature/new-checkout` — and rerun `create_ticket_from_ci_failure.py`. A new, separate ticket gets created (different summary → not a duplicate of Step 2's), this time with `Medium` priority instead of `High`, because the triage logic in the script treats a failure on a feature branch as less urgent than one on `main`.

### Step 5 — Run the report

```powershell
python search_tickets.py
```

Lists every `ci-failure`-labeled ticket this automation has created, with status and priority — the same JQL-powered querying you'd use to build a real dashboard on top of this data.

## Going further: the Jira MCP server for AI agents

Everything above is REST API calls written by hand — the standard way to build automation. Atlassian also runs an official **remote MCP server** for Jira and Confluence (https://mcp.atlassian.com), which exposes the same underlying actions (search issues, create issues, transition status, add comments) as MCP tools an AI agent can call directly from natural language, with no code written for that specific workflow.

Concretely, connecting an MCP-capable AI client (like Claude) to Atlassian's remote MCP server means you could ask, in plain language, "check if there's already an open ticket for this failing build, and if not, file one as High priority" — and the agent calls the same kind of search-then-create sequence this mini project's `create_ticket_from_ci_failure.py` does explicitly, except driven by conversation instead of a fixed script. This matters most when the automation's *logic* (what counts as a duplicate, how to prioritize, what to include) benefits from judgment rather than a fixed rule — exactly the gap between what a hardcoded script and an AI agent are each good at. The REST API knowledge from this mini project is what makes the MCP layer's behavior legible: you understand exactly what tool calls are happening underneath the natural-language request.

## Common pitfalls

- **No duplicate check**: demonstrated directly in Step 3 — always check for an existing matching ticket before creating one in any repeated-trigger automation (webhooks, CI failures, recurring alerts).
- **Sending plain-text `description`**: the v3 API expects ADF, not a raw string — sending a plain string will fail or silently produce a malformed ticket, depending on the field.
- **Using your account password instead of an API token**: Jira Cloud's API requires a token, not your login password — and unlike a password, a token can be scoped and revoked independently.
- **Overly broad JQL**: a query without `resolution = Unresolved` (or similar) will match closed/resolved tickets too — a common cause of "why did it think this was a duplicate" confusion.

## Resources

- REST API v3 reference: https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/
- JQL reference: https://support.atlassian.com/jira-software-cloud/docs/jql-fields/
- Atlassian Document Format (ADF): https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/
- Jira remote MCP server: https://www.atlassian.com/platform/remote-mcp-server
