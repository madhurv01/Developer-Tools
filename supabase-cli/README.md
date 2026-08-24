# Supabase CLI

## What it is

The Supabase CLI is the command-line tool that runs an entire local copy of the Supabase stack — Postgres, Auth, Storage, Realtime, Edge Functions, and the Studio dashboard — on your own machine via Docker, and manages the version-controlled migration files that define your schema. It's the tool that turns Supabase from "a cloud dashboard you click around in" into a proper local-first development workflow with a real, reviewable history of every schema change.

- Docs: https://supabase.com/docs/guides/cli
- GitHub: https://github.com/supabase/cli
- CLI command reference: https://supabase.com/docs/reference/cli

## Why this tool exists / the problem it solves

Making every schema change by hand in a cloud dashboard's UI has the same fundamental problem as any point-and-click configuration: it's not reviewable, not repeatable, and not something you can run the exact same way against a second environment. Two developers on a team can drift into subtly different local schemas with no record of why; a change made directly in production has no corresponding entry anywhere explaining what it was or letting you roll it back.

The Supabase CLI solves this the same way any serious backend team solves schema management: **migrations as version-controlled files**, applied in a defined order, checked into git alongside the application code that depends on them. `supabase migration new` creates the next numbered file; `supabase db reset` tears down your local database and rebuilds it from scratch by replaying every migration in order — meaning your local schema is only ever a byproduct of files sitting in git, never manually assembled state that only exists in your head or in a dashboard.

On top of migrations, the CLI runs the *entire* backend stack locally — not just the database — including Edge Functions (Supabase's serverless functions runtime), so you can build and test a complete feature end to end before it ever touches a shared or production environment.

## Why it matters in the AI era

AI coding tools are extremely good at generating SQL migrations and Edge Function code quickly — but that generated code needs to be run and verified against a real, disposable environment, not trusted blindly or tested for the first time against production. The Supabase CLI gives you exactly that: spin up a full local stack in seconds, apply an AI-generated migration, watch it either work or fail loudly against real Postgres, and reset back to a clean state instantly if it's wrong. It's the safety net that makes iterating quickly on AI-generated backend code viable instead of risky.

## Install

### Windows (via winget or Scoop)

```powershell
winget install Supabase.CLI
```

or

```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### macOS

```bash
brew install supabase/tap/supabase
```

### Verify

```powershell
supabase --version
```

### Prerequisite: Docker

The local stack runs as a set of Docker containers — you need Docker Desktop installed and running first (see [../docker/README.md](../docker/README.md) if you need it).

## Configure

- **`supabase login`**: authenticates the CLI with your Supabase account — needed only when you want to link to and push against a real hosted project (Steps beyond this mini project's local-only walkthrough).
- **`supabase init`**: creates the `supabase/` folder structure (`config.toml`, `migrations/`, `functions/`, `seed.sql`) — this mini project already has that structure pre-built so you can jump straight to running it.
- **`supabase link --project-ref <ref>`**: connects a local project folder to a specific hosted Supabase project, required before `supabase db push` can send local migrations to a real remote database.
- **`.env` for Edge Functions**: local secrets for functions go in `supabase/.env` (or are passed via `--env-file`), never committed — the mini project's function reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, both injected automatically by the CLI when running locally.

## Core use cases

- Running a fully local Supabase stack for development, with zero risk to any shared or production data.
- Managing schema changes as reviewable, ordered migration files instead of manual dashboard clicks.
- Generating fully-typed TypeScript types directly from your real schema, so your application code and database can never silently drift apart.
- Writing and testing Edge Functions locally before deploying them.
- Diffing a locally-modified schema against your migration history to catch drift (`supabase db diff`).

## Real-life scenario: a full local backend, from migration to a working Edge Function

This is the real, complete workflow a Supabase project actually uses day to day: apply version-controlled migrations to a local database, seed it with test data, generate types from the real schema, and serve an Edge Function that queries that data — all running entirely on your machine.

**What the mini project includes:**
- [mini-project/supabase/migrations/](mini-project/supabase/migrations/) — two ordered migrations: create a `profiles` table with RLS, then add a `bio` column in a later migration, demonstrating real schema evolution over time.
- [mini-project/supabase/seed.sql](mini-project/supabase/seed.sql) — inserts one test user and profile automatically every time the local database resets.
- [mini-project/supabase/functions/hello-profile/index.ts](mini-project/supabase/functions/hello-profile/index.ts) — a real Edge Function that looks up a profile by username against the local database.

### Step 1 — Start the local stack

```powershell
cd mini-project
supabase start
```

Docker pulls and starts Postgres, Auth, Realtime, Storage, and Studio. When it finishes, it prints your local `API URL`, `anon key`, and `service_role key` — copy these, you'll need them shortly.

### Step 2 — Apply the migrations and seed data

```powershell
supabase db reset
```

This runs every file in `supabase/migrations/` in order, then `seed.sql` — you now have a real Postgres database, built entirely from version-controlled files, with one seeded test profile in it.

### Step 3 — Confirm it in Studio

Open the local Studio URL printed in Step 1 (typically http://localhost:54323), go to the **Table Editor**, and find the `profiles` table with your seeded row — proof the migrations and seed ran correctly.

### Step 4 — Generate TypeScript types from the real schema

```powershell
supabase gen types typescript --local > database.types.ts
```

Open `database.types.ts` — every table, column, and type from your actual local schema is now available as real TypeScript types you can import into application code. Change a migration and regenerate: your types update automatically, so the compiler catches it immediately if your app code falls out of sync with the schema.

### Step 5 — Serve the Edge Function locally

```powershell
supabase functions serve hello-profile
```

In another terminal:

```powershell
curl "http://localhost:54321/functions/v1/hello-profile?username=testuser"
```

You get back the seeded profile's data — a real serverless function, running locally, querying a real local Postgres database through Row Level Security, all without touching any hosted infrastructure.

### Step 6 — Make a schema change and diff it (optional, very instructive)

Using Studio's Table Editor, manually add a column to `profiles` (simulating an ad-hoc change someone made without writing a migration), then run:

```powershell
supabase db diff -f detected_manual_change
```

The CLI detects the drift between your migration history and the database's actual current state, and generates a new migration file capturing exactly that difference — this is the real mechanism for catching and properly recording changes that didn't go through the migration process the right way.

### Step 7 — Push to a real hosted project (only if you have one; optional)

```powershell
supabase link --project-ref <your-project-ref>
supabase db push
```

This applies your local migration history to your actual hosted Supabase project, in the same order, the same way — this is the real deploy step a team uses to promote schema changes from local to production.

## Common pitfalls

- **Editing the database directly in Studio without writing a migration**: creates exactly the kind of undocumented drift migrations exist to prevent — use `supabase db diff` (Step 6) to recover a proper migration file from it after the fact.
- **Forgetting `supabase db reset` replays seed.sql too**: if seed data looks duplicated or wrong, check `seed.sql` for `on conflict do nothing` guards, as used in this project's seed file.
- **Docker not running**: `supabase start` fails immediately if Docker Desktop isn't running — this is the single most common first-run error.
- **Committing `supabase/.env`**: Edge Function secrets belong in an ignored `.env` file, never in git, exactly like any other credential in this repo.

## Resources

- CLI docs: https://supabase.com/docs/guides/cli
- Local development guide: https://supabase.com/docs/guides/local-development
- Managing migrations: https://supabase.com/docs/guides/deployment/database-migrations
- Edge Functions guide: https://supabase.com/docs/guides/functions
