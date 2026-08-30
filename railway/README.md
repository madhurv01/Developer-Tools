# Railway

## What it is

Railway is a cloud platform for deploying apps and provisioning databases together, in one project, with almost none of the manual wiring that normally connects the two. Push a repo, and Railway detects the language/framework, builds it, and deploys it; add a database with one click, and Railway automatically injects a real connection string into your app's environment over a private network — no copying a host, port, username, and password between a database dashboard and your app's config by hand.

- Website: https://railway.com
- Docs: https://docs.railway.com
- CLI reference: https://docs.railway.com/guides/cli

## Why this tool exists / the problem it solves

Deploying an app is one problem; provisioning and wiring up the database, cache, or queue it needs is a second, separate problem — and historically, connecting the two meant creating a database somewhere, copying its credentials into environment variables by hand, keeping those in sync across local/staging/production, and hoping nobody let one drift. Railway's core idea is that an app and the infrastructure it depends on belong in the *same project*, wired together automatically: attach a Postgres/Redis/MySQL service, and every other service in that project can reach it immediately via an auto-injected connection string, with real private networking between services that never touches the public internet.

The other genuinely distinctive piece is the `railway run` CLI command: it pulls your project's real cloud environment variables down and injects them into a command running on your own machine. That means you can run your app **locally**, against the **real** cloud database (or any other attached service), without ever hand-copying a connection string into a local `.env` file — a real, practical solve for the "works on my machine but the local database is a fake stand-in" gap.

## Why it matters in the AI era

AI-assisted development moves fast enough that provisioning infrastructure shouldn't be the bottleneck between "the code works" and "a real person can use it." Railway collapses app + database + environment wiring into one project you can stand up in minutes, which matters a lot when you're iterating quickly on an AI-generated backend and want to test it against a real database immediately, not after a separate infrastructure-provisioning detour. It's also a common home for the always-on backend half of an AI project (a worker, a webhook receiver, an agent's persistent memory store) when a purely serverless platform doesn't fit.

## Install

The Railway CLI is what makes this mini project's local-to-cloud workflow possible.

```powershell
npm install -g @railway/cli
```

Verify:

```powershell
railway --version
```

You'll also want a free account: https://railway.com/login (GitHub sign-in is the common choice, since deploys are git-based).

## Configure

- **`railway login`**: authenticates the CLI with your account.
- **`railway link`**: connects your local project folder to a specific Railway project — required before `railway run` or `railway up` know which cloud project to talk to.
- **`railway.json`** (included in this mini project): config-as-code for the build/deploy settings — this one sets the start command and a health check path, the same Infrastructure-as-Code idea as this repo's Render Blueprint, in Railway's own format.
- **Auto-injected variables**: once a Postgres service is attached to a project, every other service in that project gets `DATABASE_URL` (and related `PG*` variables) injected automatically — you never set these yourself, which is the entire point.

## Core use cases

- Deploying an app and its database together, wired automatically, without hand-managing connection strings.
- Running your app locally against real cloud services via `railway run`, instead of maintaining a separate local stand-in database.
- Per-branch preview **Environments** — a full, isolated duplicate of your services and databases for a pull request, not just a static frontend preview.
- Background workers, cron-style services, and always-on processes, similar in spirit to this repo's Render entry but with tighter built-in database provisioning.
- Quick infrastructure for side projects and small teams who want a real Postgres/Redis instance without managing it themselves.

## Real-life scenario: an app and its database, wired automatically, runnable locally against the real cloud database

This is Railway's actual differentiator, demonstrated directly: attach a Postgres database to a project, deploy an app that reads `DATABASE_URL` with zero manual configuration, then run that same app **on your own machine** against that **same real cloud database** using `railway run` — proving there's no local/cloud connection-string drift to manage at all.

**What the mini project does:** [mini-project/app.rb](mini-project/app.rb) is a small Sinatra (Ruby) task list backed by Postgres — deliberately in Ruby, since Rails/Sinatra + Postgres is one of the classic real-world Railway use cases, and it adds a genuinely different stack to this repo. It never hardcodes a database host, port, username, or password anywhere in the code.

### Step 1 — Create a Railway project with a Postgres database

In the Railway dashboard: **New Project → Provision PostgreSQL**. This creates a database service with no configuration needed on your part.

### Step 2 — Deploy the app into the same project

Push `mini-project/`'s contents to a GitHub repo, then in the same Railway project: **New → GitHub Repo**, select it. Railway detects the Ruby app (via Nixpacks) and deploys it using the `startCommand` from [mini-project/railway.json](mini-project/railway.json).

### Step 3 — Confirm the database connection required zero manual wiring

Open your deployed app's public URL — you'll see the (empty) task list render successfully, meaning `app.rb`'s `PG.connect(ENV.fetch("DATABASE_URL"))` worked on the first deploy. Open the app service's **Variables** tab in the Railway dashboard — `DATABASE_URL` is already there, injected automatically the moment both services existed in the same project. Add a task through the form; refresh — it persists, proving it's a real, working Postgres connection.

### Step 4 — Run the exact same app locally against the real cloud database

```powershell
cd mini-project
railway login
railway link
bundle install
railway run bundle exec ruby app.rb
```

Open http://localhost:4567 — this is the **same app**, running on **your machine**, reading `DATABASE_URL` from your **real cloud Postgres instance**, injected live by `railway run`. Add a task here, then refresh your deployed app's public URL — the new task appears there too, because both are hitting the exact same database. No local `.env` file, no copied connection string, no separate local database to keep in sync.

### Step 5 — Create a full preview environment (optional, very instructive)

In the Railway dashboard, use **Environments → New Environment** (or create one from a PR, if you've connected a GitHub repo with environment-per-PR enabled). This provisions a **complete duplicate** of your services — including a fresh, separate Postgres database — isolated from production. Add a task in this new environment's app and confirm your production environment's task list is unaffected — proving the isolation is real, not just a different URL pointing at the same data.

### Step 6 — Break the "no local config" assumption on purpose (instructive)

Try running `bundle exec ruby app.rb` **without** the `railway run` prefix. It fails immediately with a missing `DATABASE_URL` error — proof the app genuinely has zero local configuration of its own; every connection detail comes from Railway, every time.

## Common pitfalls

- **Running the app without `railway run`**: as shown in Step 6, there's no local fallback config — this is intentional, but confusing the first time you hit it.
- **Assuming one project's variables apply everywhere**: each Environment (Step 5) gets its own isolated variables and its own database — a variable set in production is not automatically available in a preview environment.
- **Forgetting `railway link`**: the CLI needs to know which cloud project a local folder corresponds to before `railway run` or `railway up` will do anything.
- **Treating `railway.json`'s health check as optional**: like Render's `healthCheckPath`, a missing or failing health check can leave a deploy stuck without traffic being routed to it.

## Resources

- Docs: https://docs.railway.com
- CLI guide: https://docs.railway.com/guides/cli
- Environments guide: https://docs.railway.com/guides/environments
- Variables & reference variables: https://docs.railway.com/guides/variables
