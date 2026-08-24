-- Created via: supabase migration new add_bio_to_profiles
-- A second, later migration - demonstrates the real workflow of evolving a
-- schema over time through an ordered sequence of small, reviewable files,
-- instead of one giant schema.sql that gets hand-edited in place.

alter table public.profiles
  add column if not exists bio text;
