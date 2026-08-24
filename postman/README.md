# Postman

## What it is

Postman is the industry-standard tool for manually and automatically testing HTTP APIs. At its simplest it's a GUI for sending requests and inspecting responses, but its real value in professional teams comes from **collections**: saved, organized sets of requests with variables, pre-request scripts, and test assertions attached — turning "click a button to send one request" into a repeatable, chainable, automatable test suite that can run in a CI pipeline via its command-line runner, **Newman**.

- Website: https://www.postman.com
- Docs: https://learning.postman.com/docs/getting-started/introduction/
- Newman (CLI runner): https://github.com/postmanlabs/newman

## Why this tool exists / the problem it solves

Testing an API by hand with `curl` works for a single request, but real APIs require multi-step workflows — log in, take the token you got back, use it on the next five requests, check each response actually matches what's expected — and doing that by hand means constantly copy-pasting values between terminal commands, which is slow and doesn't scale to a team or a CI pipeline. It also gives you no repeatable record of "did this API actually behave correctly" beyond whatever you happened to type that one time.

Postman solves this with **collection variables** (a value captured from one response, automatically available to every later request) and **test scripts** (JavaScript assertions run against each response, with pass/fail results). A collection built this way becomes a real, repeatable, shareable regression test suite for an API — the same suite a developer runs by hand while building a feature can be run headlessly via Newman on every pull request, which is exactly the industry-standard workflow this mini project sets up.

## Why it matters in the AI era

As more software becomes "an AI agent calling APIs," verifying those APIs actually behave as documented — and keep behaving that way as the code changes — matters more, not less. A Postman collection with real assertions is a fast, language-agnostic way to pin down an API's actual contract in an executable form, which is useful both as a regression suite for APIs an AI agent depends on, and as a way to validate that an AI-generated backend implementation actually does what it claims before anything else is built on top of it.

## Install

### Desktop app (most common)

Download from https://www.postman.com/downloads/ — available for Windows, macOS, and Linux. Free tier covers everything in this mini project.

### Newman (CLI runner — required for the "real CI" part of this mini project)

```powershell
npm install -g newman
```

Verify:

```powershell
newman --version
```

## Configure

- **Collections vs. Environments**: a **collection** is the set of requests and their logic (scripts, assertions); an **environment** is a swappable set of variables (like `baseUrl`) — the same collection can run against `localhost`, staging, and production just by switching environments, without touching a single request.
- **Collection variables vs. environment variables**: this project uses **collection variables** (`authToken`, `lastOrderId`) for values captured *during* a run (like a login token) — they're scoped to the collection and get overwritten on each run, unlike environment variables which you set once and expect to stay put (like `baseUrl`).
- **Importing into the desktop app**: **File → Import** → select both JSON files in `mini-project/` — this loads the full collection with its scripts, and the environment with its variables, exactly as they're defined in this repo.
- **Secrets**: real projects mark sensitive environment variable values (API keys, passwords) as type "secret" in Postman so they're masked in the UI and excluded from anything shared — worth knowing even though this mini project's test credentials are intentionally not sensitive.

## Core use cases

- Manually exploring and debugging an API during development.
- Building a regression test suite for an API's actual behavior, runnable by both humans (desktop app) and CI (Newman).
- Automating multi-step, stateful workflows (auth, then use the token, then act on what came back) without manual copy-pasting.
- Sharing a documented, runnable "here's how our API actually behaves" artifact with other teams or external partners.
- Mocking an API from a collection before the real backend exists, so frontend work can start in parallel.

## Real-life scenario: an end-to-end, CI-runnable test suite for an authenticated API

This is the actual industry pattern: log in once, automatically capture the token, and reuse it across a full sequence of requests — including **negative tests** that prove the API correctly *rejects* bad input, which is just as important as proving it accepts good input, and is something a lot of hand-testing skips entirely.

**What the mini project does:** a small "Orders" API ([mini-project/server.js](mini-project/server.js)) with real token-based auth, tested end-to-end by a Postman collection ([mini-project/Orders-API.postman_collection.json](mini-project/Orders-API.postman_collection.json)) with six requests that chain together:
1. **Login** — captures the returned token into a collection variable via a test script.
2. **List Orders** — uses that token, asserts a 200 and an array response.
3. **Create Order** — uses the token, asserts the response shape, captures the new order's id.
4. **Get Order By Id** — uses the captured id from step 3, proving the chain works end to end.
5. **Reject Missing Auth** *(negative test)* — asserts the endpoint correctly returns 401 without a token.
6. **Reject Invalid Order Body** *(negative test)* — asserts the endpoint correctly returns 400 on bad input.

### Step 1 — Run the API

```powershell
cd mini-project
npm install
node server.js
```

### Step 2 — Run the collection in the Postman desktop app

Open Postman → **File → Import** → select both `Orders-API.postman_collection.json` and `Orders-API.postman_environment.json`. Select the "Orders API - Local" environment (top-right dropdown), open the collection, and click **Run** (or run each request individually, top to bottom, watching the **Test Results** tab after each one).

Watch request 1 (Login) run — then open the collection's variables (the eye icon, top right) and you'll see `authToken` has been populated automatically from the response, with no manual copy-paste. Every subsequent request already has it available.

### Step 3 — Run the exact same suite headlessly via Newman (the real CI pattern)

```powershell
npx newman run Orders-API.postman_collection.json -e Orders-API.postman_environment.json
```

Newman prints a full pass/fail report for every assertion in every request, with a non-zero exit code if anything failed — this is precisely the command a real CI pipeline (GitHub Actions, Jenkins, GitLab CI) would run on every pull request to catch an API regression automatically, before it ever reaches production.

### Step 4 — Prove the negative tests actually catch a real regression

In `mini-project/server.js`, comment out the `requireAuth` middleware on the `GET /orders` route (remove it from that one line), save, restart the server, and re-run Newman. Request 5 ("Reject Missing Auth") now **fails** — because the endpoint is no longer actually protected. This is the exact mechanism that would catch someone accidentally weakening your API's security in a future code change, before it ships.

### Step 5 — Add your own negative test (optional)

Duplicate request 6, change the body to send a negative `quantity` (e.g. `-5`), and add the same `pm.test('Status is 400', ...)` assertion — confirms the API's validation logic holds for more than just the one case already covered.

## Common pitfalls

- **Hardcoding values instead of using variables**: makes a collection break the moment you run it against a different environment (staging vs. local) — always reference `{{baseUrl}}` and captured variables, never a literal URL or token.
- **Forgetting the run order matters**: this collection's requests are numbered because later ones depend on earlier ones (the auth token, the created order's id) — running them out of order, or only running one in isolation, will fail for reasons that have nothing to do with the API itself.
- **Only writing "happy path" tests**: a suite with no negative tests (like step 5 and 6 above) can pass 100% while the API has a real security or validation hole — always test what should be rejected, not just what should succeed.
- **Newman not finding files**: run the `newman run` command from inside `mini-project/`, or pass full paths — relative paths are resolved from your current working directory, not the collection's location.

## Resources

- Postman docs: https://learning.postman.com/docs/getting-started/introduction/
- Writing test scripts: https://learning.postman.com/docs/tests-and-scripts/write-scripts/test-scripts/
- Newman CLI reference: https://github.com/postmanlabs/newman
- Postman + CI integration guide: https://learning.postman.com/docs/collections/using-newman-cli/integration-with-newman/
