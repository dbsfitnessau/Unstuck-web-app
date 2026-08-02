-- Pre-beta security fixes — 2 August 2026
--
-- HOW TO RUN: Supabase dashboard -> SQL Editor -> New query -> paste this whole file
-- -> Run. It is safe to run more than once.
--
-- What it does:
--   1. Stops users deleting the coach's replies (they could before).
--   2. Prints a check of who has admin access, so you can confirm it is only you.

-- ---------------------------------------------------------------------------
-- 1. Tighten the message delete policy
-- ---------------------------------------------------------------------------
-- A coach reply sits in the user's own thread, so the row carries THEIR user_id.
-- The old policy allowed deleting any row with your user_id, which included the
-- coach's replies to you. Adding `sender = 'user'` limits deletion to messages
-- the user actually wrote, and preserves your record of the advice you gave.

drop policy if exists "delete own messages" on public.coach_messages;
create policy "delete own messages" on public.coach_messages
  for delete using (auth.uid() = user_id and sender = 'user');

-- ---------------------------------------------------------------------------
-- 2. Confirm the policy is live
-- ---------------------------------------------------------------------------
-- Expect ONE row, and its `qual` column should mention both auth.uid() and
-- sender = 'user'.

select policyname, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename = 'coach_messages'
  and cmd = 'DELETE';

-- ---------------------------------------------------------------------------
-- 3. Confirm there is exactly one admin
-- ---------------------------------------------------------------------------
-- Expect ONE row: your own email. If you see anyone else, or zero rows, fix it
-- in Table Editor -> profiles -> is_admin before you invite testers.

select id, email, is_admin, entitlement
from public.profiles
where is_admin is true;
