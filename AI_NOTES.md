# AI Notes

## Tools and Models Used

- **Primary tool**: Google Deepmind Antigravity (Gemini 2.5 Flash / Claude Sonnet 4.6 Thinking)
- **Usage split**: AI assisted with boilerplate scaffolding, debugging specific error messages, and drafting code structure. All key architectural decisions — data model, auth design, service separation, deployment target — were made by me. I reviewed, tested, and iterated on every piece of AI output before committing.

---

## Key Decisions I Made Myself

### 1. Hono over Express for the backend
I chose Hono specifically because it is edge-runtime-compatible and has a tiny footprint. This matters for the Discord interaction endpoint — every millisecond counts when you have a 3-second response window. Express would have worked, but Hono's built-in middleware chaining and typed context made the `verifyDiscord` → `interactions` pipeline cleaner.

### 2. Stateless JWT instead of Supabase session tokens for the dashboard
The dashboard is a single-admin tool. I didn't want to deal with Supabase session refresh cycles or store tokens in Supabase's auth schema. Instead, after verifying credentials with Supabase Auth, the backend signs its own short-lived JWT. The middleware only does a fast `jwt.verify()` — no DB round-trip on every request. The admin allowlist check happens exactly once, at login.

### 3. Deferring Discord processing entirely to a background function
Discord's 3-second window is unforgiving. Even a single slow Supabase insert can blow it. I made the handler return `{ type: 5 }` (deferred acknowledgment) immediately and delegated all processing — DB insert, Gemini call, Slack mirror, Discord follow-up — to a fire-and-forget async function. The `finally` block guarantees the DB row status is always updated, even if something in the middle throws.

---

## Hardest Bug / Wrong Turn

**The Supabase client session pollution bug.**

When I first wired up the `/auth/login` route, I used the global `supabase` singleton (imported from `services/supabase.ts`) to call `supabase.auth.signInWithPassword()`. This worked fine for login itself — the user got a JWT and the dashboard loaded.

The bug appeared about 20 minutes later: every `/api/*` route started returning 403, but only *after* someone had logged in. Before the first login, the API worked. After a login, it broke for all subsequent calls.

The cause: `supabase.auth.signInWithPassword()` internally mutates the client's in-memory auth headers to store the signed-in user's session token. So the global `supabase` client — which I also used in `verifyDiscord`, `interactions.ts`, and `dashboard.ts` — was now making all DB calls with the *user's* JWT instead of the service role key. Supabase's Row-Level Security (RLS) policies blocked everything that expected the service role.

The fix was to create a **local, isolated Supabase client** in the login route with `persistSession: false`. This client signs in and is immediately discarded — the global client's headers are never touched.

This was subtle because it only manifested after a login event, looked like an auth/permissions problem, and the error message ("403 Forbidden") pointed at the wrong layer entirely.

---

## What I'd Improve With More Time

1. **Multi-server UI**: The database already supports multiple guilds with isolated configs, but the dashboard always shows data for all servers. Adding a server selector dropdown would make multi-tenant usage real.
2. **Interactive Discord components**: Buttons and modals (interaction types 3 and 5) — the spec lists these as stretch goals. The verification middleware is already in place; adding handler branches for these types would be straightforward.
3. **Retry queue**: If the Slack mirror or Gemini call fails, it's logged as `mirrored: false` but never retried. A simple job queue (or a Supabase Edge Function cron) would pick up failed rows and retry them.
4. **Structured logging**: Console logs work for development but aren't queryable. Replacing them with a structured logger (e.g. Pino) and shipping logs to Render's log drain or a free Logtail tier would make production debugging much faster.

---

## AI Context Files

The AI context file used throughout this project is `.agents/AGENTS.md` at the root of the repository. It defines the tech stack constraints, the role of the AI assistant, and privacy/security rules (no secrets in responses, no credentials in code).
