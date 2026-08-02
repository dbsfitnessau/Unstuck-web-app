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

-- One Gumroad license = one account, forever. This unique index is the hard
-- guarantee behind the "you can't give it away" promise: once a key is stamped
-- onto a profile, NO other profile can ever claim the same key. The server's
-- redeem step checks first so it can show a friendly message, but even if that
-- check lost a race, this index makes the second write fail at the database.
-- It's a PARTIAL index (`where redeemed_code is not null`) so the many accounts
-- that haven't redeemed yet — all with redeemed_code = null — don't collide.
create unique index if not exists profiles_redeemed_code_key
  on public.profiles (redeemed_code)
  where redeemed_code is not null;

-- PAID EMAILS: when someone buys on Gumroad, Gumroad pings the server, which
-- records the buyer's email here (see entitlement.ts -> grantByEmail). This is
-- how we know an email has paid BEFORE that person has ever signed in. The table
-- is server-only: no RLS policies + revoked from public roles, so only the
-- service-role key can read or write it. Emails are stored lowercased.
create table if not exists public.entitled_emails (
  email text primary key,
  source text default 'gumroad',
  created_at timestamptz not null default now()
);
alter table public.entitled_emails enable row level security;
revoke all on public.entitled_emails from anon, authenticated;

-- Auto-create the profile row the moment someone signs up — and if their email
-- is already a known paid buyer (bought first, then signed in), unlock them on
-- the spot. Otherwise they start at 'none' and unlock when their Gumroad ping
-- arrives (grantByEmail also updates any existing profile).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  is_paid boolean;
begin
  select exists(
    select 1 from public.entitled_emails e
     where lower(e.email) = lower(new.email)
  ) into is_paid;

  insert into public.profiles (id, email, entitlement, entitlement_source)
  values (
    new.id,
    new.email,
    case when is_paid then 'paid' else 'none' end,
    case when is_paid then 'gumroad' else null end
  )
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

-- ---------------------------------------------------------------------------
-- 6. COACH MESSAGES: a human-answered message thread (NO AI, NO API tokens).
--    Each signed-in user has one thread. They send messages tagged 'user';
--    the coach (an admin) replies with rows tagged 'coach'. Same iron rule as
--    everything else - a user only ever reads/writes their OWN messages.
-- ---------------------------------------------------------------------------

-- Flag for who the coach/admin is. After running this file once, set your own
-- account to admin: Table Editor -> profiles -> your row -> is_admin = true.
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Helper: "is the caller an admin?" Runs as SECURITY DEFINER so its read of
-- profiles BYPASSES row-level security - which is what lets us reference it
-- inside a profiles policy below WITHOUT causing infinite policy recursion.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

-- The coach/admin can read EVERY user's profile, so the in-app inbox can show
-- who each thread is from. Uses the helper above so it can't recurse.
drop policy if exists "admin reads all profiles" on public.profiles;
create policy "admin reads all profiles" on public.profiles
  for select using (public.is_admin());

create table if not exists public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sender text not null check (sender in ('user', 'coach')),
  body text not null,
  created_at timestamptz not null default now()
);

-- Fast lookup of one user's thread, in order.
create index if not exists coach_messages_user_time
  on public.coach_messages (user_id, created_at);

-- Cap message length at the DATABASE (the client's maxlength is bypassable - a user
-- could POST a huge body straight to the REST API). 1..4000 chars. Idempotent.
alter table public.coach_messages drop constraint if exists coach_messages_body_len;
alter table public.coach_messages add constraint coach_messages_body_len
  check (char_length(body) between 1 and 4000);

alter table public.coach_messages enable row level security;

-- A user reads only their own thread...
drop policy if exists "read own messages" on public.coach_messages;
create policy "read own messages" on public.coach_messages
  for select using (auth.uid() = user_id);

-- ...and can only send messages as themselves, tagged 'user' (never 'coach').
drop policy if exists "send own messages" on public.coach_messages;
create policy "send own messages" on public.coach_messages
  for insert with check (auth.uid() = user_id and sender = 'user');

-- ...and may delete (unsend) messages THEY sent. The `sender = 'user'` half matters:
-- a coach reply lives in the user's own thread and so carries THEIR user_id, so without
-- it a user could delete your replies and destroy the record of what advice was given.
-- No update policy on purpose: messages stay immutable once sent, so a user can't edit
-- a message you've already replied to.
drop policy if exists "delete own messages" on public.coach_messages;
create policy "delete own messages" on public.coach_messages
  for delete using (auth.uid() = user_id and sender = 'user');

-- The coach/admin can read EVERY thread (to answer them)...
drop policy if exists "admin reads all messages" on public.coach_messages;
create policy "admin reads all messages" on public.coach_messages
  for select using (public.is_admin());

-- ...and can post replies tagged 'coach' to anyone's thread.
drop policy if exists "admin sends replies" on public.coach_messages;
create policy "admin sends replies" on public.coach_messages
  for insert with check (sender = 'coach' and public.is_admin());

-- ---------------------------------------------------------------------------
-- 7. ONE-TIME MIGRATION — grandfather existing testers (DO NOT auto-run).
--    Once the app starts REQUIRING an entitlement to enter (Plan A), every
--    account currently at 'none' would be locked out and asked for a license
--    key. Before you deploy that, run ONE of the lines below ONCE to grant
--    access to the people who are already in. This is commented out on purpose
--    so re-running this whole file never re-grants access to new signups.
--
--    Grant to EVERY existing account (simplest — good for a private beta):
--      update public.profiles set entitlement = 'beta',
--             entitlement_source = 'grandfathered'
--       where entitlement = 'none';
--
--    …or grant to a specific list of emails only (safer for a public launch):
--      update public.profiles set entitlement = 'beta',
--             entitlement_source = 'grandfathered'
--       where email in ('tester1@example.com', 'tester2@example.com');
-- ---------------------------------------------------------------------------
