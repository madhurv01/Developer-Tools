-- Real-world pattern: a multi-user "tasks" table where every user can only
-- ever see and modify their OWN rows, enforced by the database itself (Row
-- Level Security), not by application code. This is the actual mechanism
-- Supabase apps rely on instead of writing "WHERE user_id = ?" everywhere
-- and hoping every code path remembers to.
--
-- Run this in the Supabase Dashboard -> SQL Editor (see README Step 2).

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  title text not null,
  is_complete boolean not null default false,
  created_at timestamptz not null default now()
);

-- RLS is OFF by default on a new table - meaning anyone with the anon key
-- could read every row. Turning it on and adding zero policies means NO ONE
-- can read/write until you explicitly grant access below.
alter table public.tasks enable row level security;

-- Each policy below is a real, enforced rule - not a suggestion. Even if
-- application code has a bug and forgets a WHERE clause, Postgres itself
-- will not return or accept rows that violate these.

create policy "Users can view their own tasks"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "Users can insert their own tasks"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own tasks"
  on public.tasks for update
  using (auth.uid() = user_id);

create policy "Users can delete their own tasks"
  on public.tasks for delete
  using (auth.uid() = user_id);

-- Required for the mini project's Realtime demo (Step 5) - tells Supabase
-- to broadcast INSERT/UPDATE/DELETE events on this table to subscribed
-- clients.
alter publication supabase_realtime add table public.tasks;
