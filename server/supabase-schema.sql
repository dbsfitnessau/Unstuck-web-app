-- ===========================================================================
-- UNSTUCK multi-user schema for Supabase
-- Paste this whole file into Supabase -> SQL Editor -> New query -> Run.
-- Safe to re-run (everything is "if not exists" / "or replace").
--
-- What it creates:
--   profiles  - one row per signed-up user (who they are + what they can see)
--   progress  - each user's app data (worksheet log, test results, ...) as JSON
--   user_overview - a ready-made "who are my users, how far are they" query
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. PROFILES: one row per user, created automatically at signup.
--    `entitlement` is the content gate: 'none' until they redeem a beta code
--    or Gumroad license key, then 'beta' or 'paid'. Only the SERVER (using
--    the service-role key) can change entitlement - users can't promote
--    themselves.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  entitlement text not null default 'none'
    check (entitlement in ('none', 'beta', 'paid')),
  entitlement_source text,       -- 'beta-code' | 'gumroad'
  redeemed_code text,            -- which code/key they used (audit trail)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create the profile row the moment someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. PROGRESS: the user's app data, one row per storage key - the same keys
--    the app already uses in the browser (worksheet-log, test-results,
--    test-milestones, tier, plus a small 'summary' the app maintains so the
--    overview below can show days-done without recomputing it in SQL).
-- ---------------------------------------------------------------------------
create table if not exists public.progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- ---------------------------------------------------------------------------
-- 3. ROW-LEVEL SECURITY: the iron rule that makes multi-user safe.
--    Every query runs as the signed-in user, and these policies mean a user
--    can only ever see/write their OWN rows - even if the app had a bug.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.progress enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);
-- (no insert/update policies on profiles: rows are created by the trigger,
--  entitlement is changed only by the server's service-role key, which
--  bypasses RLS by design)

drop policy if exists "read own progress" on public.progress;
create policy "read own progress" on public.progress
  for select using (auth.uid() = user_id);

drop policy if exists "insert own progress" on public.progress;
create policy "insert own progress" on public.progress
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own progress" on public.progress;
create policy "update own progress" on public.progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- with check stops a user from re-assigning a row to someone else's user_id.

drop policy if exists "delete own progress" on public.progress;
create policy "delete own progress" on public.progress
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. USER OVERVIEW: your queryable user record. Open Supabase -> Table Editor
--    -> user_overview (or SQL: select * from user_overview order by signed_up)
--    to see every user, their entitlement, days done, and last activity.
--    Locked away from the public API - dashboard/server only.
-- ---------------------------------------------------------------------------
create or replace view public.user_overview as
select
  pr.email,
  pr.entitlement,
  pr.entitlement_source,
  pr.created_at as signed_up,
  coalesce(
    (select (s.data ->> 'daysDone')::int
       from public.progress s
      where s.user_id = pr.id and s.key = 'summary'),
    0
  ) as days_done,
  (select max(g.updated_at) from public.progress g where g.user_id = pr.id)
    as last_active
from public.profiles pr;

revoke all on public.user_overview from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. STORAGE: user-uploaded test-result photos (Assessment page).
--    One PRIVATE bucket. Files are stored at "<uid>/<testId>/<day>.jpg", and
--    the policies below let each signed-in user read/write/delete only files
--    under a folder named after their OWN user id - the same iron rule as the
--    progress table. Safe to re-run.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('test-photos', 'test-photos', false)
on conflict (id) do nothing;

drop policy if exists "read own test photos" on storage.objects;
create policy "read own test photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'test-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "insert own test photos" on storage.objects;
create policy "insert own test photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'test-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "update own test photos" on storage.objects;
create policy "update own test photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'test-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'test-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "delete own test photos" on storage.objects;
create policy "delete own test photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'test-photos' and (storage.foldername(name))[1] = auth.uid()::text);
