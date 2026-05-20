-- IdeaForge schema — run once in Supabase SQL editor or via `supabase db push`
-- Safe to re-run (all statements use IF NOT EXISTS / OR REPLACE).

-- ── Extensions ────────────────────────────────────────────────────────────────
-- Uncomment when you want semantic search on reports:
-- create extension if not exists vector;

-- ── Profiles ──────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid        primary key references auth.users on delete cascade,
  email        text,
  display_name text,
  updated_at   timestamptz not null default now()
);

-- ── Threads (idea sessions) ────────────────────────────────────────────────────
create table if not exists public.threads (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users (id) on delete cascade,
  title           text        not null default 'Untitled session',
  topic           text        not null default '',
  founder_profile text        not null default '',
  pasted_signals  text        not null default '',
  favorite        boolean     not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Idea reports ──────────────────────────────────────────────────────────────
-- One active report per thread. Re-running analysis replaces the previous row.
create table if not exists public.idea_reports (
  id         uuid        primary key default gen_random_uuid(),
  thread_id  uuid        not null unique references public.threads (id) on delete cascade,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  payload    jsonb       not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Chat messages ─────────────────────────────────────────────────────────────
-- One row per thread. The full conversation is stored as a jsonb array so we
-- never pay per-message row overhead. The app caps the array at 60 messages.
drop table if exists public.thread_messages cascade;
create table public.thread_messages (
  thread_id  uuid        primary key references public.threads (id) on delete cascade,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  messages   jsonb       not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists threads_user_updated_idx
  on public.threads (user_id, updated_at desc);

create index if not exists idea_reports_thread_idx
  on public.idea_reports (thread_id);

-- thread_messages has no extra index — thread_id is the primary key.

-- ── Auto-update updated_at ────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger threads_updated_at
  before update on public.threads
  for each row execute procedure public.touch_updated_at();

create or replace trigger idea_reports_updated_at
  before update on public.idea_reports
  for each row execute procedure public.touch_updated_at();

create or replace trigger thread_messages_updated_at
  before update on public.thread_messages
  for each row execute procedure public.touch_updated_at();

-- ── Profile auto-creation on sign-up ─────────────────────────────────────────
-- Runs as definer (postgres) so it can write to public.profiles from auth.users
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill profiles for accounts that existed before the trigger was added.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- ── Role grants ──────────────────────────────────────────────────────────────
-- "Automatically expose new tables" is OFF, so grants must be explicit.
grant select, insert, update, delete
  on public.threads, public.idea_reports, public.thread_messages, public.profiles
  to authenticated;

-- ── Row-level security ────────────────────────────────────────────────────────
alter table public.profiles        enable row level security;
alter table public.threads         enable row level security;
alter table public.idea_reports    enable row level security;
alter table public.thread_messages enable row level security;

-- Drop policies before re-creating so this script is safe to re-run.

-- Profiles
drop policy if exists "profiles: own read"   on public.profiles;
drop policy if exists "profiles: own insert" on public.profiles;
drop policy if exists "profiles: own update" on public.profiles;

create policy "profiles: own read"
  on public.profiles for select using (auth.uid() = id);
create policy "profiles: own insert"
  on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: own update"
  on public.profiles for update using (auth.uid() = id);

-- Threads
drop policy if exists "threads: own read"   on public.threads;
drop policy if exists "threads: own insert" on public.threads;
drop policy if exists "threads: own update" on public.threads;
drop policy if exists "threads: own delete" on public.threads;

create policy "threads: own read"
  on public.threads for select using (auth.uid() = user_id);
create policy "threads: own insert"
  on public.threads for insert with check (auth.uid() = user_id);
create policy "threads: own update"
  on public.threads for update using (auth.uid() = user_id);
create policy "threads: own delete"
  on public.threads for delete using (auth.uid() = user_id);

-- Idea reports (user_id column avoids subquery on every RLS check)
drop policy if exists "reports: own read"   on public.idea_reports;
drop policy if exists "reports: own insert" on public.idea_reports;
drop policy if exists "reports: own update" on public.idea_reports;
drop policy if exists "reports: own delete" on public.idea_reports;

create policy "reports: own read"
  on public.idea_reports for select using (auth.uid() = user_id);
create policy "reports: own insert"
  on public.idea_reports for insert with check (auth.uid() = user_id);
create policy "reports: own update"
  on public.idea_reports for update using (auth.uid() = user_id);
create policy "reports: own delete"
  on public.idea_reports for delete using (auth.uid() = user_id);

-- Chat messages (one row per thread, upserted on every save)
drop policy if exists "messages: own read"   on public.thread_messages;
drop policy if exists "messages: own insert" on public.thread_messages;
drop policy if exists "messages: own update" on public.thread_messages;
drop policy if exists "messages: own delete" on public.thread_messages;

create policy "messages: own read"
  on public.thread_messages for select using (auth.uid() = user_id);
create policy "messages: own insert"
  on public.thread_messages for insert with check (auth.uid() = user_id);
create policy "messages: own update"
  on public.thread_messages for update using (auth.uid() = user_id);
