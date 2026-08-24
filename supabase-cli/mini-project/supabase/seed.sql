-- Run automatically by `supabase db reset` after all migrations apply.
-- Real projects use this to get a local database into a known, useful
-- state instantly - no manually clicking through a UI to create test data
-- every time you wipe your local database.

insert into auth.users (id, email)
values ('11111111-1111-1111-1111-111111111111', 'test-user@example.com')
on conflict (id) do nothing;

insert into public.profiles (id, username, bio)
values ('11111111-1111-1111-1111-111111111111', 'testuser', 'Seeded via supabase/seed.sql')
on conflict (id) do nothing;
