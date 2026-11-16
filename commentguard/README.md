# CommentGuard

Keeps network-marketing spam out of my Instagram comments (@ranojoyghosh_) while I'm in college,
without ever touching genuine leads.

- **Official API only.** Meta's Instagram API (Unified login, or Instagram Login on older apps). No passwords, no scraping, no browser automation.
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
                                                   ├─ refresh the token if due (Instagram Login tokens only; Unified login tokens never expire)
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
    account.ts         connect (Unified login or Instagram Login token) / decrypt / refresh
    meta-login.ts      "Connect with Meta" redirect helpers (routes in app/api/auth/meta)
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

**Try it before Meta setup:** set `IG_MOCK=true`, then in Settings tap **Connect with Meta** (a fake login).
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

> **Do "Deploy for free" (below) first, parts A–C.** Meta needs your app's public web address as a redirect URL.
>
> New Meta apps (2026) only offer **API setup with Unified login**. The older "API setup with Instagram login" is gone for new apps.
> Unified login gives a **system-user token that never expires**, so there is nothing to refresh.
> Meta renames menus often; if a button has a slightly different name, look for the closest match.

### 1. Make sure your Instagram account is Professional

Instagram app → your profile → ☰ menu → **Settings and activity** → **Account type and tools**.

- If you see **Switch to personal account**, you are already Professional (Creator or Business). Good.
- If you see **Switch to professional account**, tap it and choose **Creator**.

### 2. Create the Meta app

1. Go to https://developers.facebook.com and log in with Facebook. Register as a developer if asked.
2. **My Apps** → **Create app** → name `CommentGuard` → use case **Manage messaging & content on Instagram** → create.
3. Open **Use cases** → **Manage messaging & content on Instagram** → **Customize** → **API setup with Unified login**.

### 3. Create the login configuration

On **API setup with Unified login** → **1. Configure your app** → **Create new configuration**:

| Setting | Choose |
| --- | --- |
| Name | `CommentGuard` |
| Login variation | General |
| Access token | **System-user access token** |
| Token expiration | **Never** |
| Assets | **Instagram account** (ad account not needed) |
| Permissions | **`instagram_basic`** and **`instagram_manage_comments`** |

CommentGuard doesn't need the other permissions in the default list (`ads_management`, `ads_read`, `instagram_manage_messages`, `instagram_content_publish`).
Untick them if Meta lets you; fewer permissions is safer. Save, then copy the **Configuration ID** into `META_CONFIG_ID`.

### 4. Add `business_management` to the configuration

Developers report that without this permission, system-user tokens can't read the Instagram account's posts (error 100/33).
The Unified login editor doesn't offer it, so add it through Facebook Login for Business:

1. Left menu → **Add product** (or **Add more to this use case**) → **Facebook Login for Business** → **Set up**.
2. **Facebook Login for Business** → **Configurations** → open **CommentGuard** → **Edit** → **Permissions** → add **`business_management`** → save.

If you skip this and connecting later says *"This token can't see any Instagram account"*, come back to this step.

### 5. Register the redirect URL

1. Still on **API setup with Unified login**, under **Redirect URL** → **Register a new redirect URL**, paste
   `https://YOUR-APP.vercel.app/api/auth/meta/callback` → **Save**.
2. **Facebook Login for Business** → **Settings** → **Valid OAuth Redirect URIs**: add the same URL → **Save changes**.

### 6. App ID and secret → environment variables

**App settings** → **Basic** → copy **App ID** and **App secret** (click **Show**).
In Vercel → Project → Settings → Environment Variables, set:

- `META_APP_ID`
- `META_APP_SECRET`
- `META_CONFIG_ID`
- `APP_URL` = `https://YOUR-APP.vercel.app`

Then redeploy (Deployments → ⋯ → Redeploy).

Keep the app in **Development** mode. You are the app's admin and you manage your own Instagram account, so **no App Review** is needed.

### 7. Connect

Open CommentGuard → **Settings** → **Connect with Meta**:

1. Log in with Facebook.
2. Pick (or create) a **business portfolio**. It's free and only needs a name.
3. Choose your Instagram account **@ranojoyghosh_**. If asked, log in to Instagram to link it.
4. Allow the permissions.

You land back in Settings, which should show:

- **Login type:** Unified login
- **Token expires:** Never
- the permissions list, including `instagram_manage_comments`

Now go to Home → **Scan now**.

**If it breaks:** for example, you removed the Instagram account from the business portfolio or reset the app secret.
Home shows a red "Instagram problem" card. Tap **Reconnect with Meta** in Settings. Your data stays.

### Webhooks (Step 4)

Developers report that in Development mode, comment webhooks only fire for people who have a role on the app, not for random commenters.
Spammers don't have a role, so CommentGuard relies on **polling**: new comments show up within about 2 minutes on your newest posts.
Webhooks would need the app to go Live and pass App Review, which is optional for later.

### Older apps: Instagram Login tokens

If you have an older app that still shows **API setup with Instagram login**, you can paste its `IGAA…` token in Settings instead.
CommentGuard detects the token type and refreshes these 60-day tokens weekly by itself.

---

## Deploy for free (Supabase + Vercel), no commands needed

Why Vercel and not GitHub Pages? GitHub Pages only serves static files (fine for the portfolio).
CommentGuard needs a server for the login, the database, the every-minute tick and Meta's login callback.
Vercel is still connected to GitHub: every push redeploys automatically.

You need four secret values. Make each one with a password generator (e.g. your browser's "suggest strong password", Bitwarden or 1Password):
**long random text, at least 32 characters, letters and numbers only**. Keep them in a safe note.

| Name | What |
| --- | --- |
| `ADMIN_PASSWORD` | Your login password for the panel (at least 12 characters, one you can type on your phone) |
| `TOKEN_ENCRYPTION_KEY` | Random text, 32+ characters. **Never change it later**, or you'll have to reconnect Instagram. |
| `SESSION_SECRET` | Random text, 32+ characters |
| `CRON_SECRET` | Random text, 32+ characters |

### A. Supabase (database)

1. https://supabase.com → sign in with GitHub → **New project**.
2. Name `commentguard`, choose a **database password** (save it), region **South Asia (Mumbai)** → **Create**.
3. When it's ready: click **Connect** (top bar) → **Connection string** → **Transaction pooler** → copy it.
   It looks like `postgresql://postgres.abcd:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`.
4. Replace `[YOUR-PASSWORD]` with your database password. This is your `DATABASE_URL`.
   Use the **pooler** string (port 6543), not "Direct connection"; Vercel can't reach the direct one.

### B. Vercel (the app)

1. https://vercel.com → sign up with **GitHub** → **Add New…** → **Project** → import **Ranojoy_VideoEditor**.
2. **Root Directory** → **Edit** → choose `commentguard`. The framework shows "Next.js".
3. Open **Environment Variables** and add:

   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | from Supabase step 4 |
   | `ADMIN_EMAIL` | your email |
   | `ADMIN_PASSWORD` | your panel password |
   | `TOKEN_ENCRYPTION_KEY` | random text |
   | `SESSION_SECRET` | random text |
   | `CRON_SECRET` | random text |
   | `IG_MOCK` | `true` for now, so you can try the panel with fake data |

4. **Deploy**. The build also creates the database tables automatically; this happens on every deploy, so you never run migrations by hand.
5. Open the address Vercel gives you (e.g. `https://commentguard-xxxx.vercel.app`), log in, and try **Settings → Connect with Meta**.
   In mock mode this is a fake login, then tap **Scan now** on Home.

### C. The every-minute clock

Vercel's free plan only runs its own cron once a day, so Supabase calls the app instead:

1. Supabase → **SQL Editor** → **New query**.
2. Paste [`supabase/cron.sql`](supabase/cron.sql). Replace `https://YOUR-APP.vercel.app` with your address and `YOUR_CRON_SECRET` with your `CRON_SECRET`.
3. Click **Run**.

Within 2 minutes, Home shows **Watching**.

### D. Switch to your real Instagram

1. Do the **Meta / Instagram setup** above. It needs your Vercel address for the redirect URL.
2. In Vercel → Project → **Settings** → **Environment Variables**:
   - add `META_APP_ID`, `META_APP_SECRET`, `META_CONFIG_ID`
   - add `APP_URL` = your Vercel address
   - change `IG_MOCK` to `false`
3. Vercel → **Deployments** → latest → **⋯** → **Redeploy**.
4. Panel → **Settings** → **Connect with Meta** → then **Scan now** on Home.

Mock data stays in the database until you switch. To start clean, run this in the Supabase SQL Editor:
`truncate comments, posts, accounts, audit_log cascade;`

Notes on the free plans:

- A Supabase free project pauses after a week **without activity**. The every-minute cron counts as activity.
- Vercel Hobby is meant for personal, non-commercial use.
- If you'd rather use a hashed password, run `npm run hash-password -- '…'` locally and set `ADMIN_PASSWORD_HASH` instead of `ADMIN_PASSWORD`.

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
- **Settings:** connect or reconnect Instagram (**Connect with Meta**), see the token's permissions and expiry, change how often posts are scanned, and log out.
  - Five wrong passwords lock the login for 15 minutes.
