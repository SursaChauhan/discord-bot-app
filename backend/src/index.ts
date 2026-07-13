import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { Variables } from './types.js';

import { verifyDiscord } from './middleware/verifyDiscord.js';
import { requireAuth } from './middleware/requireAuth.js';

import interactions from './routes/interactions.js';
import auth from './routes/auth.js';
import dashboard from './routes/dashboard.js';
import setup from './routes/setup.js';

const app = new Hono<{ Variables: Variables }>();

// ── Health check ───────────────────────────────────────────────────────────
app.get('/', (c) => c.json({ status: 'ok', service: 'command-bot-backend' }));

// ── Discord interactions ───────────────────────────────────────────────────
// verifyDiscord MUST be registered before the route so it runs first.
// It reads the raw body, verifies Ed25519, then stores rawBody in context
// so the route can parse it without re-reading the consumed stream.
app.use('/interactions/*', verifyDiscord);
app.route('/interactions', interactions);

// ── Auth routes ────────────────────────────────────────────────────────────
// POST /auth/login  → returns a JWT
// POST /auth/logout → stateless, client discards token
// GET  /auth/me     → validates token and returns user info
app.route('/auth', auth);

// ── Protected API routes ───────────────────────────────────────────────────
// All /api/* routes require a valid JWT (checked by requireAuth)
app.use('/api/*', requireAuth);
app.route('/api', dashboard);
app.route('/api/setup', setup);

// ── Start server ───────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? '3000');

serve({ fetch: app.fetch, port: PORT }, (info) => {
    console.log(`[server] Listening on http://localhost:${info.port}`);
});
