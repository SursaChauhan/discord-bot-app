import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Variables } from './types.js';

import { verifyDiscord } from './middleware/verifyDiscord.js';
import { requireAuth } from './middleware/requireAuth.js';

import interactions from './routes/interactions.js';
import auth from './routes/auth.js';
import dashboard from './routes/dashboard.js';
import setup from './routes/setup.js';

const app = new Hono<{ Variables: Variables }>();

// Enable CORS for /api/* and /auth/* endpoints
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use('/api/*', cors({ origin: allowedOrigin, credentials: true }));
app.use('/auth/*', cors({ origin: allowedOrigin, credentials: true }));

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'command-bot-backend' }));

// Discord webhook endpoint
app.use('/interactions/*', verifyDiscord);
app.route('/interactions', interactions);

// Authentication routes
app.route('/auth', auth);

// Protected dashboard API routes
app.use('/api/*', requireAuth);
app.route('/api', dashboard);
app.route('/api/setup', setup);

// Start HTTP server
const PORT = parseInt(process.env.PORT ?? '3000');

serve({ fetch: app.fetch, port: PORT }, (info) => {
    console.log(`[server] Listening on http://localhost:${info.port}`);
});
