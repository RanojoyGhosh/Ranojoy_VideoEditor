# CommentGuard

Keeps network-marketing spam out of my Instagram comments (@ranojoyghosh_) while I'm in college,
without ever touching genuine leads.

- **Official API only.** Instagram API with Instagram Login. No passwords, no scraping, no browser automation.
- **My posts only.** It only reads (and later moderates) comments on my own posts and reels.
- **Free to run.** Next.js on Vercel (Hobby) + Supabase Postgres + Supabase `pg_cron` as the 1-minute clock.

## Build status

| Step | What | Status |
| --- | --- | --- |
| 1 | Connect & read: token, posts, all comments **and replies**, basic panel | ✅ this version |
| 2 | Detection: rules + behaviour + AI score, Rules & Lists page, test box | next |
| 3 | Actions: delayed hide/delete queue, caps, Auto/Manual, Delete All, History, kill switch | |
| 4 | Webhooks, schedule, Telegram alerts, polish, deploy guide | |

**Step 1 is read-only.** It never hides or deletes anything on Instagram.

---

## How it works (Step 1)

```
pg_cron (every minute) ──POST /api/cron/tick──▶  runTick()
                                                   ├─ connect from IG_ACCESS_TOKEN (first run only)
                                                   ├─ refresh the token if due (weekly)
                                                   └─ runIngestion()
                                                        ├─ list my media every 10 min → posts table
                                                        └─ scan the posts that are due, newest first
                                                             (comments + replies → comments table)
```

- **Backfill:** a post that was never scanned is due right away, so the first few ticks walk through every post.
  Each tick stops after ~45 s and the next tick carries on.
- **Polling tiers** (Settings → Scanning): newest 5 posts every 2 min, newest 30 every 10 min, older ones once a day.
- **Replies:** fetched in the same request as their comment (`replies{...}` field), with extra pages when a comment has many.
- **De-duplication:** by Instagram comment ID. A rescan updates text/hidden state but never touches a decision.
- **Own comments:** anything from my account is marked `kept` immediately and is never scored or touched.
- **Deleted elsewhere:** comments that disappear from Instagram are marked "Gone".
- **Rate limits:** a rate-limit error pauses all scanning for 15 minutes. A rejected token shows a "Reconnect" warning.
- **Overlap safety:** a lease row in `settings` stops two ticks running at once.

### Folder structure

```
src/
  app/
    (panel)/           Dashboard, Comments, Posts, Settings (login required)
    login/             Admin login
    api/cron/tick/     The 1-minute clock endpoint (needs CRON_SECRET)
  components/          UI pieces (shadcn-style), comment card, bottom nav
  lib/
    instagram/         Graph API client, error kinds, mock Instagram for tests/demo
    ingestion/         syncMedia, scanPost, scheduler (polling tiers + backfill)
    auth/              scrypt password check, signed session cookie
    db/                Drizzle schema + connection
    account.ts         connect / decrypt / refresh the token
    tick.ts            one bot tick (later steps plug detection, actions, notify in here)
    crypto.ts          AES-256-GCM for the token at rest
    settings.ts        typed settings with defaults
drizzle/               SQL migrations
supabase/cron.sql      pg_cron job that calls the tick every minute
tests/                 Vitest: client, ingestion (real Postgres), crypto, password
```

---

## Local setup

Needs Node 20+ and a Postgres database (a free Supabase project, or Postgres on your laptop).

```bash
cd commentguard
npm install
cp .env.example .env
npm run gen-key                                        # paste the 3 lines into .env
npm run hash-password -- 'your long admin password'    # paste ADMIN_PASSWORD_HASH into .env
```

Fill in `DATABASE_URL` and `ADMIN_EMAIL`, then:

```bash
npm run db:migrate
npm run dev
```

Open http://localhost:3000 and log in.

**Try it before Meta setup:** set `IG_MOCK=true`, then in Settings paste the token `mock-token`.
You get 3 fake posts with the spec's test comments (spam replies under leads, Bengali digits, your own CTA reply).

### Tests

```bash
npm test                     # unit tests (no database needed)
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/commentguard_test npm test
```

The second command also runs the ingestion tests against a real Postgres.
**They wipe that database**, so use an empty one, never your real data.

Other useful commands: `npm run typecheck`, `npm run build`, `npm run tick` (runs one tick in the terminal).

---

## Meta / Instagram setup (beginner guide)

> Meta renames menus often. These steps match Meta's docs as of late 2026.
> If a button has a slightly different name, look for the closest match.

### 1. Make sure your Instagram account is Professional

Instagram app → your profile → ☰ menu → **Settings and activity** → **Account type and tools**.

- If you see **Switch to personal account**, you are already Professional (Creator or Business). Good.
- If you see **Switch to professional account**, tap it and choose **Creator**.

You do **not** need a Facebook Page for this API.

### 2. Create a Meta app with the Instagram product

1. Go to https://developers.facebook.com and log in with Facebook.
   The first time, register as a developer (verify phone/email).
2. **My Apps** → **Create app**.
3. App name: `CommentGuard`. Contact email: yours. → **Next**.
4. Use case: **Manage messaging & content on Instagram** → **Next**.
5. Business portfolio: choose **I don't want to connect a business portfolio yet** → **Next** → **Create app**.
6. In the app dashboard: **Use cases** → **Manage messaging & content on Instagram** → **Customize**.
   Open **API setup with Instagram login**. Choose this one, not "Facebook login".

### 3. Permissions

Under the use case's **Permissions and features**, make sure these two are added:

- `instagram_business_basic`
- `instagram_business_manage_comments`

These are the current names for Instagram Login. The old `business_manage_comments` name was replaced.

### 4. Add yourself as a tester (no App Review needed)

1. **App roles** → **Roles** → **Add people** → **Instagram Tester** → type `ranojoyghosh_`.
2. Accept the invite on Instagram. On the web, go to instagram.com → **Settings** → **Website permissions**
   → **Apps and websites** → **Tester invites** → **Accept**.
3. Leave the app in **Development** mode.

Reading, hiding and deleting comments on accounts you own needs only **Standard Access**, so there is no App Review.

### 5. Webhooks (Step 4; skip for now)

Meta's docs say comment **webhooks** only reach apps in **Live** mode with **Advanced Access** for the comments permission.
Advanced Access needs App Review. CommentGuard therefore works fully on **polling** (new comments show up within about 2 minutes on the newest posts).
Webhooks will be added on top in Step 4, if you decide to go Live.

### 6. Get a long-lived access token

1. **API setup with Instagram login** → **Generate access tokens** → **Add account** → log in to Instagram → allow.
2. Click **Generate token** next to your account and copy it (starts with `IGAA…`).
   This token lasts about **60 days**.
3. Paste it into CommentGuard → **Settings** → **Instagram** → **Connect**, or put it in `.env` as `IG_ACCESS_TOKEN`.

Treat this token like a password. Don't share it or put it in screenshots.

### 7. How token refresh works

- CommentGuard refreshes the token automatically once a week, which gives a new 60-day token each time.
  Instagram only allows a refresh once the token is at least 24 hours old, so the first refresh happens a day after connecting.
  Until then, Settings shows the expiry as "estimated".
- **If it ever breaks** (you changed your Instagram password, removed the app, or the app was idle for 60+ days):
  the Home page shows a red "Instagram problem" card.
  Repeat step 6 and paste the new token in **Settings → Reconnect**. Your data stays.

---

## Deploy for free (Supabase + Vercel)

1. **Supabase** (https://supabase.com) → New project → region **Mumbai (ap-south-1)** → set a database password.
2. Supabase → **Connect** → copy the **Transaction pooler** string (port 6543) and put your password in it.
   Use this as `DATABASE_URL`.
3. On your computer, run `DATABASE_URL='…' npm run db:migrate` to create the tables.
   The migrations also turn on row-level security, so Supabase's public API can't read them.
4. **Vercel** (https://vercel.com) → Add New → Project → import this GitHub repo.
   - **Root Directory:** `commentguard`
   - Environment Variables: everything from `.env.example`, with `IG_MOCK=false`.
   - Deploy.
5. Supabase → **SQL Editor** → paste [`supabase/cron.sql`](supabase/cron.sql), put in your Vercel URL and `CRON_SECRET`, and run it.
   The bot now ticks every minute. Vercel's own free cron only runs once a day, so Supabase does the scheduling.
6. Open your Vercel URL on your phone, log in, connect Instagram, and tap **Scan now** once.

Notes on the free plans:

- A Supabase free project pauses after a week **without activity**. The every-minute cron counts as activity.
- Vercel Hobby is meant for personal, non-commercial use.

---

## Using the panel (simple guide)

- **Home:** shows whether the bot is **Watching** (cron ran in the last 3 minutes) and what the last scan did.
  It also has today's numbers and the newest comments. **Scan now** runs a scan immediately.
  - "Idle · cron not running" means the pg_cron job isn't calling the app. Check step 5 of Deploy.
- **Comments:** every comment and reply, newest first. Search by text or username.
  Filter **Replies** (where spammers usually hide), **Mine**, or **Gone** (deleted on Instagram).
  - A reply shows the comment it answers, so you can see when someone hijacks a lead.
- **Posts:** your posts and reels, how many comments are stored, and when each was last and will next be scanned.
  Tap a post to see its comments as threads.
- **Settings:** connect or reconnect Instagram, see when the token expires, change how often posts are scanned, and log out.
  - Five wrong passwords lock the login for 15 minutes.
