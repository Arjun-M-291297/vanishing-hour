# Setup

This app needs a Supabase project (auth + Postgres + realtime) and, optionally, Google OAuth
credentials. Nothing here can be done for you automatically — these all require your own
accounts/dashboards.

## 1. Create a Supabase project

1. Go to https://supabase.com, create a project (any region close to your players is fine).
2. In **Project Settings → API**, copy the **Project URL** and the **anon / public** key.
3. Copy `.env.example` to `.env` and fill those two values in:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
   Never put the **service_role** key here or anywhere in this app — it must only ever be used
   server-side (e.g. inside a Supabase Edge Function), never shipped in a client bundle.

## 2. Run the database migration

**Brand-new Supabase project (never run a migration here before):**
1. Open your Supabase project's **SQL Editor**.
2. Paste the entire contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) and run it.
   This creates `profiles`, `rooms`, `room_players`, `player_progress`, `shared_case_state`, and
   `room_events`, all with Row Level Security policies, plus a trigger that creates a `profiles`
   row whenever someone signs up.
3. (If you have the Supabase CLI installed and linked instead: `supabase db push` does the same thing.)

**Already ran `0001_init.sql` once (e.g. you set this project up before 2026-08-12):** don't re-run
it — it starts with `drop table ... cascade`, which would wipe any real rooms/players you already
have. Instead run [`supabase/migrations/0002_close_room_leaks.sql`](supabase/migrations/0002_close_room_leaks.sql)
on top of what you have. It closes three RLS gaps in the original policies (one of them a confirmed
live leak — see the file's header comment) without touching any existing data.

## 3. Enable Anonymous sign-in (for "Continue as Guest")

In **Authentication → Sign In / Providers**, turn on **Anonymous Sign-Ins**. This is what backs
the guest button on the auth screen — it still gets a real `auth.uid()`, so RLS policies apply to
guests exactly like signed-in users.

## 4. (Optional) Google sign-in

The Google button on the auth screen is a placeholder until you configure OAuth client IDs:

1. In the [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create OAuth
   client IDs (Web application type is enough to start — Android/iOS-specific client IDs are only
   needed for a native store build later).
2. In Supabase, go to **Authentication → Sign In / Providers → Google** and enable it, pasting in
   your Google client ID and secret.
3. In this project's `app.json`, fill in `expo.extra.googleAuth`:
   ```json
   "googleAuth": {
     "webClientId": "your-client-id.apps.googleusercontent.com"
   }
   ```
4. Until this is filled in, the Google button stays disabled and "Continue as Guest" is the only
   way in — that's expected, not a bug.

## 5. Run the app

```bash
npm install
npm run web    # or: npx expo start, then press a/i for Android/iOS
```

## What's deliberately not done yet

- **Puzzle-answer validation is client-side only.** A player's `player_progress` row can currently
  only be written by that player (enforced by RLS), which stops them from editing their partner's
  progress — but nothing stops a modified client from writing a "solved" state for a puzzle it
  never actually solved. Closing that gap means moving puzzle checks into a Supabase Edge Function
  once real case/puzzle content exists for this duo mode.
- **No case/puzzle content yet.** `src/data/characters.ts` defines the two-role split
  (`inspector` / `associate`) structurally, but the actual parallel scene tracks, hotspots, and
  puzzles haven't been ported over from the single-player prototype.
- **Google sign-in needs your own OAuth credentials** (step 4) — there's no way around that; it's
  tied to your Google Cloud project.
