# Command Bot

A full-stack Discord slash-command bot with an admin dashboard. Users run slash commands in a Discord server; the bot processes them, replies with an AI-generated summary, mirrors notifications to Slack, and logs everything to a live admin dashboard.

---

## What It Does

| Layer | Description |
|---|---|
| **Discord Bot** | Two registered slash commands: `/report <text>` and `/status`. Responds with rich embed cards. |
| **Interactions Endpoint** | Verifies Ed25519 signatures on every Discord request. Defers responses within 3 s and processes in background. Deduplicates on interaction ID. |
| **AI Summarisation** | Optionally runs `/report` text through Google Gemini to extract a summary and tags, shown in the Discord reply and dashboard. |
| **Slack Mirroring** | Forwards every command event to a configured Slack Incoming Webhook. |
| **Admin Dashboard** | React SPA behind JWT login. Shows live interaction logs with filters and a detail drawer. Lets admins toggle AI, update the Slack webhook, and customise the `/status` reply. |

---

## Local Setup

### Prerequisites

- Node.js ≥ 18
- A [Supabase](https://supabase.com) project (free tier)
- A [Discord Application](https://discord.com/developers/applications) with a bot
- A [Slack Incoming Webhook](https://api.slack.com/messaging/webhooks) (optional)
- A [Google AI Studio](https://aistudio.google.com) API key (optional, for AI summaries)

### 1. Clone and install

```bash
git clone <repo-url>
cd Command_Bot

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure environment variables

```bash
cp backend/.env.example backend/.env
# Fill in all values — see .env.example for descriptions
```

### 3. Set up the database

Run the schema script against your Supabase project:

```bash
# Copy the SQL from backend/scripts/schema.sql and run it in the
# Supabase Dashboard → SQL Editor
```

### 4. Register Discord slash commands

```bash
cd backend
npm run register-commands
```

### 5. Set your Discord Interactions Endpoint URL

In the [Discord Developer Portal](https://discord.com/developers/applications):

1. Select your application → **General Information**
2. Set **Interactions Endpoint URL** to your public backend URL + `/interactions`
   - For local testing: use [serveo.net](https://serveo.net) to tunnel `localhost:3000`
   - Command: `ssh -R 80:127.0.0.1:3000 serveo.net`

### 6. Run locally

```bash
# Terminal 1 — backend (http://localhost:3000)
cd backend && npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend && npm run dev
```

Open `http://localhost:5173` — you will be redirected to the login page.

---

## Admin Login

A throwaway demo account is available for reviewers:

| Field | Value |
|---|---|
| Email | `demo@commandbot.dev` |
| Password | `Demo@1234!` |

> ⚠️ Please do not change the password. This account has full dashboard access.

To add your own admin account: insert a row into the `admin_users` table in Supabase with your email, then create a matching user in **Supabase → Authentication → Users**.

---

## Testing the Bot

1. Use the invite link to add the bot to your Discord server (or ask for an invite to the test server).
2. Run `/report text: your message here` — the bot responds with an embed, mirrors to Slack, and the event appears in the dashboard.
3. Run `/status` — the bot replies with the custom status message configured in the dashboard.
4. Log in to the dashboard, open the **Configuration** tab, and toggle **Gemini AI Summarisation** to see AI-enriched `/report` replies.

---

## Environment Variables

See [`backend/.env.example`](./backend/.env.example) for the full list with descriptions.

| Variable | Required | Description |
|---|---|---|
| `DISCORD_APP_ID` | ✅ | Your Discord Application ID |
| `DISCORD_PUBLIC_KEY` | ✅ | Ed25519 public key for signature verification |
| `DISCORD_BOT_TOKEN` | ✅ | Bot token for sending follow-up messages |
| `DISCORD_GUILD_ID` | ✅ | Your Discord server (guild) ID |
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (kept server-side only) |
| `JWT_SECRET` | ✅ | Secret for signing admin session JWTs |
| `GEMINI_API_KEY` | Optional | Google Gemini API key for AI summaries |
| `SLACK_WEBHOOK_URL` | Optional | Default Slack webhook (overridable per-server in UI) |
| `PORT` | Optional | Server port (default: 3000) |
| `FRONTEND_URL` | Optional | Frontend origin for CORS headers |

---

## Deployment

The app is deployed on **[Render](https://render.com)** (free tier, no credit card required).

- **Backend**: Render Web Service running `npm start` in the `backend/` directory.
- **Frontend**: Render Static Site serving the `frontend/dist/` build output.
- **Database**: Supabase hosted Postgres (free tier).

> 🔗 **Live URL**: _To be updated after deployment_

### Deploy steps (Render)

1. Push this repository to GitHub.
2. In Render, create a **Web Service** pointed at the `backend/` root with build command `npm install && npm run build` and start command `node dist/index.js`.
3. Add all environment variables from `.env.example` to the Render service settings.
4. Create a **Static Site** pointed at `frontend/` with build command `npm install && npm run build` and publish directory `dist`.
5. Update `VITE_API_URL` (if needed) and set the Discord Interactions Endpoint URL to your Render backend URL.

---

## Project Structure

```
Command_Bot/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Hono server entrypoint
│   │   ├── middleware/
│   │   │   ├── verifyDiscord.ts  # Ed25519 signature verification
│   │   │   └── requireAuth.ts    # JWT auth middleware
│   │   ├── routes/
│   │   │   ├── interactions.ts   # Discord interactions endpoint
│   │   │   ├── auth.ts           # Login / logout / me
│   │   │   ├── dashboard.ts      # Interaction logs + config API
│   │   │   └── setup.ts          # Server setup API
│   │   └── services/
│   │       ├── supabase.ts       # Supabase client
│   │       ├── discord.ts        # Discord API helpers
│   │       ├── gemini.ts         # Gemini AI summarisation
│   │       └── mirror.ts         # Slack webhook sender
│   └── scripts/
│       ├── schema.sql            # Database schema
│       └── register_commands.ts  # Discord command registration
└── frontend/
    └── src/
        ├── pages/
        │   ├── Login.tsx
        │   ├── Dashboard.tsx
        │   ├── Config.tsx
        │   └── Setup.tsx
        └── components/
            ├── AuthContext.tsx
            └── Layout.tsx
```
