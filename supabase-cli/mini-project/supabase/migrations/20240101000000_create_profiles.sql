-- Created via: supabase migration new create_profiles
-- This file is the real, version-controlled source of truth for the schema
-- - not something clicked together in a dashboard and forgotten. Every
-- teammate, every environment (local, staging, production) ends up with
-- the exact same schema by running this same file, in order, via the CLI.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);
