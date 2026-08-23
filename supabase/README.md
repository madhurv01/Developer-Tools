# Supabase

## What it is

Supabase is an open-source backend-as-a-service built on top of plain PostgreSQL. Instead of hiding the database behind a proprietary API (the way Firebase does), Supabase gives you a real Postgres database plus a set of tightly integrated services on top of it: authentication, auto-generated REST and realtime APIs, file storage, and edge functions. You can use as much or as little of it as you want, and because it's just Postgres underneath, you're never locked into a vendor-specific data model.

- Website: https://supabase.com
- Docs: https://supabase.com/docs
- GitHub (the whole stack is open source, self-hostable): https://github.com/supabase/supabase

## Why this tool exists / the problem it solves

Building a real backend from scratch — auth, a database, an API layer, permission checks, live updates — used to mean either writing a lot of boilerplate yourself, or committing to a proprietary NoSQL platform like Firebase that trades away SQL, relational modeling, and portability for convenience. Supabase's core idea is: give developers that same "just works" convenience, but built on Postgres — one of the most trusted, capable, and portable databases in existence — so you get instant APIs and auth without giving up joins, transactions, foreign keys, or the ability to eventually self-host or migrate away.

The single most important idea Supabase is built around is **Row Level Security (RLS)** — instead of writing permission checks in application code (`WHERE user_id = currentUser.id` sprinkled through every query, one missed spot away from a data leak), you write the permission rule **once, in the database itself**, as a Postgres policy. From then on, it is physically impossible for a client to read or write a row it isn't allowed to touch, no matter what the client-side code does — because the enforcement happens inside Postgres, not in code that could have a bug.

## Why it matters in the AI era

Supabase has become one of the default backends for AI-assisted app building — because AI coding tools can generate a working frontend in minutes, but a *secure* backend is where AI-generated code is most likely to have subtle, dangerous bugs (a forgotten permission check, a leaked service-role key, an unauthenticated endpoint). Supabase's RLS model moves that security boundary out of application code — which an AI (or a human) might get wrong — and into the database itself, where it's enforced unconditionally. It also ships a first-class Vector/embeddings extension (`pgvector`), making it a common choice for RAG (retrieval-augmented generation) backends alongside its role as a general app backend.

## Install

Supabase itself is a hosted cloud platform (with a generous free tier) — there's nothing to "install" to use it, only a project to create and a client library to add to your app.

1. Create a free account and project: https://supabase.com/dashboard/sign-up
2. In your new project, go to **Project Settings → API** and copy two values you'll need shortly:
   - **Project URL**
   - **anon public key** (safe to use in client-side/browser code — it has no power on its own without RLS policies granting access)
3. Install the JS client in your own project:
   ```powershell
   npm install @supabase/supabase-js
   ```

### Optional: self-hosting

Because the whole stack is open source, you can self-host the entire platform (Postgres + Auth + Realtime + Storage) via Docker Compose instead of using Supabase's cloud — see https://supabase.com/docs/guides/self-hosting for when data residency or cost at scale makes that worthwhile. The mini project below uses the hosted free tier, which is the realistic starting point for almost everyone.

## Configure

- **Environment variables**: never hardcode your project URL/keys in source — this project uses a `.env` file (see [mini-project/.env.example](mini-project/.env.example)) loaded via `dotenv`, the standard pattern for any real app.
- **anon key vs. service_role key**: the dashboard also shows a `service_role` key with **full admin access that bypasses RLS entirely**. It must only ever be used in trusted server-side code (never a browser, never a mobile app, never committed to git) — this mini project deliberately uses only the `anon` key to demonstrate that RLS alone is enough to keep users' data separated, which is the real-world pattern for any client-facing app.
- **Email confirmation**: by default, new Supabase projects require email confirmation before a user can sign in. For faster local testing, you can disable this under **Authentication → Providers → Email → Confirm email** (toggle off) — just remember it's a real security setting you'd normally keep on in production.

## Core use cases

- A full backend (Postgres + Auth + instant REST/GraphQL API) for a web or mobile app without writing a backend service yourself.
- Enforcing per-user or per-tenant data isolation at the database level via RLS, instead of trusting application code to get every query right.
- Realtime features — live dashboards, collaborative editors, chat, presence — via Postgres change subscriptions, no custom WebSocket server needed.
- Vector search / RAG backends using the built-in `pgvector` extension alongside your regular relational data.
- File storage with the same RLS permission model applied to buckets and objects.

## Real-life scenario: a multi-user app secured by Row Level Security, synced in real time

This mirrors the actual foundation of most real Supabase apps: **more than one user shares the same table, and the database itself — not your application code — guarantees nobody can see or touch anyone else's data.** On top of that, we add a live Realtime subscription, the same mechanism a shared dashboard or collaborative app uses to push updates instantly.

**What the mini project does:**
- [mini-project/schema.sql](mini-project/schema.sql) creates a `tasks` table with Row Level Security enabled and four policies — a user can only select/insert/update/delete rows where `user_id` matches their own authenticated id.
- [mini-project/run-as-user.js](mini-project/run-as-user.js) signs in as one of two test users, inserts a task, then reads back the table — proving each user only ever sees their own rows.
- [mini-project/realtime-listener.js](mini-project/realtime-listener.js) subscribes to live changes on the table and prints them the instant either user inserts something.

### Step 1 — Set up your project credentials

```powershell
cd mini-project
npm install
copy .env.example .env
```

Edit `.env` and paste in your Project URL and anon key from the dashboard.

### Step 2 — Create the table and RLS policies

In the Supabase Dashboard, open **SQL Editor → New query**, paste the contents of [mini-project/schema.sql](mini-project/schema.sql), and run it. Read the comments in that file as you go — they explain exactly what each policy does and why RLS is off by default until you explicitly grant access.

### Step 3 — Prove isolation between two users

```powershell
node run-as-user.js userA
```

This creates (or signs into) a test account, inserts a task, and lists every task that account can see. Now run:

```powershell
node run-as-user.js userB
```

`userB` sees **only their own task**, never `userA`'s — even though both requests hit the exact same table through the exact same public `anon` key. This is Postgres itself enforcing the boundary, not application logic you wrote.

### Step 4 — Try to break it (optional, very instructive)

Temporarily comment out the `create policy "Users can view their own tasks"` block in `schema.sql`, re-run just that change in the SQL Editor, and re-run `node run-as-user.js userA` — now the account can insert but reads back **zero rows**, because RLS is on but no policy grants select access. This demonstrates the fail-safe default: with RLS enabled and no matching policy, access is denied, not allowed.

### Step 5 — Watch it update live

In one terminal:

```powershell
npm run listen
```

In a second terminal:

```powershell
npm run user-a
```

The listener terminal prints the new row the instant it's inserted — no polling, no refresh, no custom server. This is the exact mechanism behind live dashboards, collaborative tools, and chat apps built on Supabase.

## Common pitfalls

- **Forgetting to enable RLS**: a table with RLS *disabled* is fully readable/writable by anyone holding the anon key — always enable it before adding real data, even during prototyping.
- **Enabling RLS but adding no policies**: this makes the table completely inaccessible (fails closed, not open) — a common "why is my data not showing up" moment the first time you hit it, and the correct, safe default behavior.
- **Using the service_role key on the client**: this key bypasses RLS entirely — it must never ship in frontend code or a mobile app bundle.
- **Forgetting to add the table to the realtime publication**: without the `alter publication supabase_realtime add table ...` line in the schema, subscriptions silently receive nothing.

## Resources

- Docs: https://supabase.com/docs
- Row Level Security guide: https://supabase.com/docs/guides/database/postgres/row-level-security
- Realtime docs: https://supabase.com/docs/guides/realtime
- JS client library reference: https://supabase.com/docs/reference/javascript/introduction
