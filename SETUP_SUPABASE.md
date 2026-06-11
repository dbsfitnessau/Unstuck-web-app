# Supabase setup — your 10-minute checklist

This creates the accounts + database layer for the multi-user app. You do the
account creation (it has to be yours), then hand back two values and the
build continues from there.

## 1. Create the project (~3 min)

1. Go to **supabase.com** → Sign up (use your DBS/work email).
2. **New project** →
   - Name: `unstuck`
   - Database password: let it generate one, **save it in your password manager**
     (you'll rarely need it, but losing it is a pain).
   - Region: **Sydney (ap-southeast-2)** — closest to your users.
3. Wait ~1 minute while it provisions.

## 2. Create the tables (~2 min)

1. In the left sidebar: **SQL Editor** → **New query**.
2. Open `server/supabase-schema.sql` from this project, copy ALL of it,
   paste, press **Run**.
3. You should see "Success. No rows returned". That's the whole database
   built: user profiles, progress storage, security rules, and your
   `user_overview` report.

## 3. Point sign-in links at your site (~2 min)

1. Sidebar: **Authentication** → **URL Configuration**.
2. **Site URL**: `https://unstuck-app.onrender.com`
3. **Redirect URLs** → add: `http://localhost:4175` (so local previews can
   sign in too).

Magic-link email sign-in is on by default — nothing else to enable.

## 4. Collect the three keys (~1 min)

Sidebar: **Project Settings** → **API**. You'll see:

| Value | Where it goes | Secret? |
| :-- | :-- | :-- |
| **Project URL** (`https://xxxx.supabase.co`) | tell Claude + Render | No |
| **anon / public key** | tell Claude + Render | No — it's designed to ship in the app |
| **service_role key** | Render server env var ONLY | **YES — never in the client, never in git** |

## 5. Add them to Render (~4 min)

"Environment variables" are just named settings a service can read — like a
sticky note ("SUPABASE_URL = https://...") pinned to the server, kept out of
the code so secrets never land in git.

**First service — the server:**

1. Go to **dashboard.render.com** and sign in. You'll see your two services.
   Names may differ, so identify by type: the **Web Service** is the coach
   server (URL like `unstuck-coach.onrender.com`); the **Static Site** is the
   app itself (`unstuck-app.onrender.com`).
2. Click the **Web Service** (the server).
3. In the **left sidebar**, click **Environment**.
4. You'll see existing entries (`ANTHROPIC_API_KEY`, `CORS_ORIGIN`, ...).
   Leave them alone. Click **+ New variable** (sometimes labelled **Edit** →
   then add a row).
5. Add row 1 — Key: `SUPABASE_URL` · Value: your Project URL
   (looks like `https://xxxx.supabase.co`).
6. Add row 2 — Key: `SUPABASE_SERVICE_ROLE_KEY` · Value: the **service_role**
   key (the long secret one starting `eyJ...`).
7. Click **Save, rebuild, and deploy**. Render restarts the service
   automatically — that's expected and harmless; today's code simply ignores
   the new settings until the next build uses them.

**Second service — the client:**

8. Back to the dashboard → click the **Static Site**.
9. Left sidebar → **Environment** → **+ New variable**, add:
   - Key: `VITE_SUPABASE_URL` · Value: the same Project URL
   - Key: `VITE_SUPABASE_ANON_KEY` · Value: the **anon / public** key
10. Save. A rebuild kicks off automatically — also harmless.

**Sanity check before moving on:** server shows 2 new `SUPABASE_*` rows,
client shows 2 new `VITE_SUPABASE_*` rows, and the service_role key appears
ONLY on the server. If you accidentally put the service_role key on the
static site, delete that row — it must never ship to browsers.

## 6. Tell Claude

Paste the **Project URL** and **anon key** into the chat (they're public-safe).
Confirm the service_role key is in Render. The build then continues:

- **Phase 1 — Accounts & cloud progress:** magic-link sign-in screen replaces
  the access-code gate; worksheet/assessment progress syncs to Supabase and
  follows the user across devices (existing browser progress is migrated up
  on first sign-in, so nobody loses anything).
- **Phase 2 — True content gating:** the programme content moves out of the
  app bundle; the server serves it only to signed-in users whose profile says
  `beta` or `paid`. Redeeming a beta code or Gumroad license key (once, in
  the app) is what flips that switch.

## Your user record, after launch

Supabase dashboard → **Table Editor** → `user_overview`:
every user's email, entitlement, days done (of 28), sign-up date and last
activity. For ad-hoc questions, SQL Editor, e.g.:

```sql
-- who's stalled? (signed up, started, no activity in 7 days)
select * from user_overview
where days_done between 1 and 27
  and last_active < now() - interval '7 days'
order by last_active;
```
