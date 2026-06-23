# Saturday Football App — Setup Guide

## 1. Supabase Project Setup

### Create project
1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New project**, name it `saturday-football`, choose a region close to you, set a database password
3. Wait ~2 minutes for provisioning

### Run the schema
1. In the Supabase dashboard, go to **SQL Editor**
2. Open `supabase/schema.sql` from this repo
3. Paste the entire contents and click **Run**
4. Verify in **Table Editor** that you see: `profiles`, `games`, `registrations`, `attendance`

### Get your credentials
1. Go to **Settings > API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role / secret key** → `SUPABASE_SERVICE_ROLE_KEY`

### Disable email confirmation (recommended for dev)
1. Go to **Authentication > Providers > Email**
2. Toggle off **Confirm email** so users can sign in immediately after signup

---

## 2. Configure .env.local

Edit `.env.local` in the project root and fill in your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

> The `SUPABASE_SERVICE_ROLE_KEY` is not currently used in API routes (they use the anon key with RLS), but is included for future admin operations.

---

## 3. Twilio WhatsApp Setup

WhatsApp notifications are sent when a player is promoted from the waiting list to the main list.

### Use the Twilio Sandbox (free, for testing)
1. Sign up at [twilio.com](https://twilio.com)
2. Go to **Messaging > Try it out > Send a WhatsApp message**
3. Follow the sandbox instructions: send a WhatsApp message from your phone to `+14155238886` with the join code (e.g. `join <word>-<word>`)
4. Your phone is now connected to the sandbox
5. The `TWILIO_WHATSAPP_FROM` is already set to the sandbox number: `whatsapp:+14155238886`
6. Copy your **Account SID** and **Auth Token** from the [Twilio Console](https://console.twilio.com)

### For production
1. Apply for a WhatsApp-approved Twilio number (requires business approval)
2. Update `TWILIO_WHATSAPP_FROM` to your approved number

> If Twilio is not configured (env vars missing), the app will still work — notifications are silently skipped with a console log.

---

## 4. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- Sign up for an account with your name and optional WhatsApp number
- The app auto-creates a game for the upcoming Saturday on first load
- Register/deregister from the home page

---

## 5. Deploy to Vercel

### One-click via Vercel CLI
```bash
npm i -g vercel
vercel
```

### Or via GitHub
1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) > **New Project** > Import your repo
3. Add all environment variables from `.env.local` under **Environment Variables**
4. Click **Deploy**

### After deploy
- Your app is live at `https://your-project.vercel.app`
- The middleware handles auth redirects automatically
- All API routes work serverlessly on Vercel

---

## 6. How to Use the App

### Players
- **Sign up** at `/signup` — enter your name, optional WhatsApp number, email and password
- **Home page** (`/`) — shows this Saturday's game; click "I'm In!" to register
- If the main list (24 players) is full, you go on the **waiting list** automatically
- **Deregister** if you can't make it — the first waiting list person is auto-promoted and notified via WhatsApp
- **Check in** on game day using the "Check In — I Arrived!" button (visible on Saturdays and completed games)
- **All Games** (`/games`) — view history of all past and upcoming games
- **Dashboard** (`/dashboard`) — see attendance stats for all players, and who's registered for next week

### Admin: Marking a game as completed
There is no admin UI yet. After each Saturday, mark the game complete via the API:

```bash
curl -X POST https://your-app.vercel.app/api/admin/complete-game \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{"gameId": "<game-uuid>"}'
```

Or do it directly in the Supabase **Table Editor**:
1. Go to **Table Editor > games**
2. Find the row for last Saturday
3. Set `status` to `completed`

Once a game is `completed`:
- The home page shows the next upcoming Saturday instead
- Attendance (check-in) section becomes visible on the game card
- Dashboard attendance stats update to include that game

### Getting game IDs
In Supabase **Table Editor > games**, the `id` column shows UUID for each game.

---

## 7. Database Schema Overview

| Table | Purpose |
|-------|---------|
| `profiles` | Player accounts (extends Supabase auth) |
| `games` | One row per Saturday |
| `registrations` | Who is registered for each game (main or waiting list) |
| `attendance` | Who actually checked in after each game |

### Key logic
- **Max players**: set via `games.max_players` (default 24)
- **Waiting list**: FIFO — position column determines order
- **Auto-promotion**: when a main list player deregisters, the `deregister` API promotes the first waiting list player and sends a WhatsApp
- **Check-in**: only available on game day or after game is completed; only for main list players
