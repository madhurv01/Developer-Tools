# Render

## What it is

Render is a cloud platform for deploying real, **persistent** backend services — long-running web servers, background workers, cron jobs, and managed databases — from a git repository, without managing the underlying servers yourself. Where Vercel's core model is stateless serverless functions that scale to zero, Render's core model is closer to traditional always-on servers: your process starts once and keeps running, which matters for a large category of real backends that a purely serverless model doesn't fit well.

- Website: https://render.com
- Docs: https://render.com/docs
- Blueprint (`render.yaml`) reference: https://render.com/docs/blueprint-spec

## Why this tool exists / the problem it solves

Not every backend fits the serverless, stateless, request-scoped model — a WebSocket server needs a persistent connection; a job queue worker needs to keep polling; a service that benefits from in-process caching loses that benefit if it's torn down between every request. Historically, running this kind of always-on service meant provisioning a VM (EC2, a DigitalOcean droplet) and taking on real operational responsibility: OS patching, process supervision, restart-on-crash, TLS certificates, log management.

Render's core idea is to keep the "just push code, get a running service" simplicity that made platforms like Heroku popular, while directly supporting the always-on, long-running service model that a genuinely large share of real backends need — plus first-class support for background workers and scheduled cron jobs as their own distinct, independently-deployed service types, not something bolted onto a web server.

## Why it matters in the AI era

A lot of real AI infrastructure is exactly the kind of long-running process Render is built for: a worker continuously processing a queue of embedding jobs, a WebSocket server streaming tokens to connected clients over a persistent connection, a scheduled job that periodically re-indexes a vector store. These don't fit cleanly into a stateless-serverless model the way a simple API route does — Render is a common choice specifically for the "AI backend that needs to stay running and keep state in memory or in a live connection" half of a project, often paired with a Vercel-hosted frontend for the other half.

## Install

There's no CLI required to deploy this mini project — Render deploys directly from a git repository via its dashboard, reading a `render.yaml` Blueprint file (Infrastructure as Code) to know what to create.

The optional Render CLI (for viewing logs, managing services from the terminal) can be installed if you want it:

```powershell
winget install render.render
```

Verify:

```powershell
render --version
```

## Configure

- **`render.yaml` (a "Blueprint")**: this mini project's [mini-project/render.yaml](mini-project/render.yaml) defines two services in one file — a web service and a cron job — the real Infrastructure-as-Code pattern Render is built around, instead of manually clicking "New Service" twice in a dashboard.
- **`healthCheckPath`**: Render pings this URL before routing live traffic to a new deploy — this mini project's `/healthz` endpoint exists specifically for that; a service without a working health check path can get stuck "Deploying" indefinitely.
- **Free plan behavior**: Render's free web services **spin down after a period of inactivity** and take a few seconds to spin back up on the next request — worth knowing before assuming a slow first response is a bug (see "Common pitfalls").
- **Environment variables**: set via the dashboard (**Service → Environment**) or directly in `render.yaml` under `envVars` for non-secret values — secrets should be set in the dashboard, not committed in the Blueprint file.

## Core use cases

- Always-on backend APIs and web servers that benefit from persistent in-process state or connections.
- Background workers processing a queue continuously, independent of any web request.
- Scheduled cron jobs (reports, cleanup tasks, data syncs) as their own first-class, independently-monitored service.
- Managed Postgres/Redis alongside your services, provisioned from the same Blueprint.
- Deploying multiple related services (a web API + a worker + a cron job) as one reviewable, version-controlled unit.

## Real-life scenario: a persistent web service + a scheduled job, deployed together as a Blueprint

This is the actual, common Render pattern: more than one related service, defined together in version-controlled code, deployed as a single unit — and it deliberately demonstrates the opposite trade-off from this repo's Vercel mini project, where in-memory state was unreliable across serverless instances.

**What the mini project does:**
- [mini-project/server.js](mini-project/server.js) — a persistent Express web service with a visit counter kept in ordinary process memory. Because Render keeps this **one process running continuously** (not spun up fresh per-request the way a serverless function is), the counter behaves correctly and predictably across every request — the direct contrast to the Vercel mini project's deliberately-broken in-memory rate limiter.
- [mini-project/worker.js](mini-project/worker.js) — a script representing a scheduled task, run independently on its own schedule.
- [mini-project/render.yaml](mini-project/render.yaml) — the Blueprint defining both as one deployable unit.

### Step 1 — Run it locally first

```powershell
cd mini-project
npm install
npm start
```

Visit http://localhost:3000 a few times and refresh — `visitsSinceDeploy` increases correctly every time, because it's the same running process handling every request.

### Step 2 — Push this project to your own GitHub repo

Render deploys from a real git repository — create a new GitHub repo, push the `mini-project/` folder's contents to it (or point Render at a subfolder of an existing repo, which it also supports).

### Step 3 — Deploy the Blueprint

In the Render dashboard: **New → Blueprint**, connect the repository you just pushed. Render reads `render.yaml`, shows you exactly what it's about to create (both the web service and the cron job), and deploys both together after you confirm.

### Step 4 — Watch it running for real

Once deployed, open your service's live `.onrender.com` URL and refresh several times — watch `visitsSinceDeploy` climb, exactly as it did locally, because it's genuinely the same persistent process serving every request, not a fresh instance each time.

### Step 5 — Check the cron job ran

In the Render dashboard, open the `daily-report-job` service and look at its **Logs** and **Events** tab — you'll see it listed with its next scheduled run time. You can also trigger a manual run from the dashboard to see `worker.js`'s output immediately rather than waiting for the schedule.

### Step 6 — Prove it survives a redeploy (the real value of persistent process state, correctly used)

Push a trivial change (e.g. edit the message text in `server.js`) and let Render auto-redeploy. Visit the live URL again — `visitsSinceDeploy` resets to 0, because a redeploy starts a **new** process (this is expected and correct: in-memory state is fine within one running instance's lifetime, but still doesn't survive an intentional restart — for state that must survive deploys, you'd add a real database, the same lesson as the Vercel mini project's "Going further" section).

## Common pitfalls

- **Mistaking a free-tier cold start for a bug**: an inactive free web service spins down and takes a few seconds to respond to the next request — this is expected free-tier behavior, not an error.
- **Assuming in-memory state survives a redeploy or a crash-restart**: demonstrated in Step 6 — it survives *within* one running instance, not across restarts. Anything that must persist across deploys needs a real database.
- **Forgetting `healthCheckPath`**: without it (or if it doesn't return 200), Render may never consider a new deploy healthy enough to receive traffic.
- **Putting secrets directly in `render.yaml`**: only non-sensitive config belongs in the committed Blueprint file — real secrets go in the dashboard's environment variable settings.

## Resources

- Docs: https://render.com/docs
- Blueprint (`render.yaml`) spec: https://render.com/docs/blueprint-spec
- Background workers guide: https://render.com/docs/background-workers
- Cron jobs guide: https://render.com/docs/cronjobs
