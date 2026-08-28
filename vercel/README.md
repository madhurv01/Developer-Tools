# Vercel

## What it is

Vercel is a cloud platform for deploying frontend applications and serverless functions, built by the creators of Next.js. Push code (or run one CLI command), and Vercel builds and deploys it to a global CDN in seconds, automatically provisioning a serverless function for any API route in your project — no server to provision, patch, or scale yourself. It's the default deployment target for most Next.js and static-site projects, and one of the most common places small teams and solo developers actually ship real, production-facing projects.

- Website: https://vercel.com
- Docs: https://vercel.com/docs
- CLI reference: https://vercel.com/docs/cli

## Why this tool exists / the problem it solves

Deploying a web app used to mean provisioning a server, configuring a web server (nginx/Apache), setting up SSL certificates, handling scaling, and maintaining all of it over time — real infrastructure work that has nothing to do with the actual product. Vercel removes essentially all of it for the extremely common case of a frontend app with some backend logic: you write code, Vercel figures out how to build and serve it, scales it automatically under load, and gives every single git push its own live preview URL — a genuinely different and faster feedback loop than "deploy to staging and hope."

The other core idea is **serverless functions**: instead of running one long-lived server process, any file under an `/api` folder becomes its own independently-deployed function, scaled to zero when unused and scaled out automatically under load — you're billed for actual usage, not for a server sitting idle.

## Why it matters in the AI era

Vercel is one of the fastest ways to actually ship an AI-powered feature for real users to try — a serverless API route can call an LLM API, a static frontend can present the result, and the whole thing deploys in under a minute with zero infrastructure decisions. It's also built by the team behind the AI SDK (`ai` npm package), which is specifically designed to pair with Vercel's serverless/edge functions for streaming AI responses — making "prototype an AI feature, then have real people using it that same day" a realistic timeline instead of an aspiration.

## Install

The Vercel CLI is what makes this mini project actually deployable from your terminal.

```powershell
npm install -g vercel
```

Verify:

```powershell
vercel --version
```

The CLI itself is distributed via npm regardless of what language your functions are written in — this mini project's actual serverless functions are Python, which Vercel's runtime auto-detects from the `.py` files under `api/`. You'll need Python installed locally for `vercel dev` to run them (no `pip install` needed for this mini project — it uses only the standard library).

You'll also want a free account: https://vercel.com/signup (GitHub sign-in is the common choice, since it enables the git-push-to-deploy workflow covered in "Going further" below).

## Configure

- **`vercel login`**: authenticates the CLI with your account — required before your first deploy.
- **Environment variables**: set via the dashboard (**Project → Settings → Environment Variables**) or the CLI (`vercel env add`) — never hardcoded in source. This mini project's [mini-project/api/health.py](mini-project/api/health.py) reads a project-defined `CUSTOM_GREETING` variable to demonstrate this directly.
- **`vercel.json`** (included in this mini project): project-level configuration — this one sets a `Cache-Control` header on all `/api/*` responses so you always see live data instead of a cached response while testing.
- **Zero-config framework detection**: Vercel auto-detects the framework (Next.js, plain static + `/api`, etc.) from your project structure — this mini project deliberately uses the simplest possible shape (`public/` for static files, `api/` for serverless functions) so nothing needs explicit configuration to deploy.

## Core use cases

- Deploying frontend apps (Next.js, static sites, React/Vue/Svelte SPAs) with zero server management.
- Serverless API endpoints/backends that scale to zero and scale out automatically.
- Instant, shareable preview deployments for every branch or pull request.
- Edge/serverless functions for AI features (streaming LLM responses close to the user).
- Fast iteration for side projects and MVPs where "deployed and usable by real people" needs to happen in minutes, not days.

## Real-life scenario: a static site backed by a real serverless API, deployed for real

This is the actual shape of a huge number of real Vercel projects: a static frontend, a couple of serverless API functions doing real work, and zero traditional server infrastructure anywhere — genuinely deployed to a live public URL, not just run locally.

**What the mini project does:**
- [mini-project/public/index.html](mini-project/public/index.html) — a waitlist signup form.
- [mini-project/api/subscribe.py](mini-project/api/subscribe.py) — a real serverless function (Vercel's Python runtime) handling the POST, with input validation and a deliberately-flawed in-memory rate limiter (see Step 5 — this is a genuine, common mistake, left in on purpose).
- [mini-project/api/health.py](mini-project/api/health.py) — demonstrates reading both Vercel's built-in environment variables and a variable you configure yourself.

### Step 1 — Run it locally first

```powershell
cd mini-project
vercel dev
```

This runs the exact same static-file-serving + serverless-function routing locally that production uses — open the printed `localhost` URL, submit the waitlist form, and watch it work.

### Step 2 — Deploy it for real

```powershell
vercel
```

Answer the prompts (link to your account, accept the defaults). Within seconds you get a **real, live, public URL** — this is an actual deployment, not a simulation. Open it and submit the form again — you're now hitting a serverless function running on Vercel's infrastructure.

### Step 3 — Deploy to production

```powershell
vercel --prod
```

The first `vercel` command deploys a **preview** (a unique URL per deploy); `--prod` promotes a deployment to your project's main production URL. This preview/production split is the actual Vercel workflow — you can share and test a preview URL before anything touches production.

### Step 4 — Set a real environment variable and see it take effect

```powershell
vercel env add CUSTOM_GREETING
```

Type any value when prompted, choose Production (and Preview, if asked). Redeploy:

```powershell
vercel --prod
```

Visit `https://<your-deployment-url>/api/health` — your custom value now appears in the response, alongside Vercel's own built-in deployment metadata (region, environment, git commit) that required zero configuration on your part.

### Step 5 — Find the deliberate bug (the actual, common serverless mistake)

Open two different browser tabs (or use `curl` from two different terminals) and submit the waitlist form rapidly, several times in a row, from what should be the same "IP." Because Vercel may route your requests to **different serverless function instances**, each with its own separate, empty `recent_submissions` dict, the rate limiter in `api/subscribe.py` doesn't reliably block rapid duplicate submissions — a real, common mistake teams make the first time they move logic that depended on a long-lived server's memory into a stateless serverless function.

## Going further: fixing the rate limiter properly

The real fix is to move that state somewhere shared across every function instance — **Vercel KV** (a managed Redis) or a third-party option like Upstash Redis are the standard choices. This mini project deliberately stops short of that (it requires provisioning a real data store) so you can see the actual failure mode first — understanding *why* the naive version breaks is the real lesson serverless developers learn the hard way otherwise.

## Common pitfalls

- **Assuming in-memory state persists between requests**: demonstrated directly in Step 5 — any state that needs to survive across requests needs an external store, not a module-level variable.
- **Forgetting `--prod`**: running `vercel` alone always creates a new preview deployment; production only updates when you explicitly promote with `--prod` (or push to your configured production branch via git integration).
- **Committing real secrets to `vercel.json` or source**: environment variables belong in the dashboard/CLI, never in a committed file.
- **Cold starts**: a serverless function that hasn't been called recently may take slightly longer on its first request ("cold start") — usually not noticeable for this mini project's scale, but relevant for latency-sensitive production APIs.

## Resources

- Docs: https://vercel.com/docs
- CLI reference: https://vercel.com/docs/cli
- Serverless Functions guide: https://vercel.com/docs/functions
- Environment variables guide: https://vercel.com/docs/projects/environment-variables
