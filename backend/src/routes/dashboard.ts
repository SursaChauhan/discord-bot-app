import { Hono } from 'hono';
import { supabase } from '../services/supabase.js';

const dashboard = new Hono();

// GET /api/interactions
// Returns paginated list of all interactions, newest first
// Query params: ?page=1&limit=20&command=report&status=processed
dashboard.get('/interactions', async (c) => {
    const page = parseInt(c.req.query('page') ?? '1');
    const limit = parseInt(c.req.query('limit') ?? '20');
    const command = c.req.query('command');
    const status = c.req.query('status');
    const offset = (page - 1) * limit;

    let query = supabase
        .from('interactions')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    // Optional filters
    if (command) query = query.eq('command_name', command);
    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;

    if (error) {
        console.error('[dashboard] fetch interactions error:', error);
        return c.json({ error: 'Failed to fetch interactions' }, 500);
    }

    return c.json({
        interactions: data,
        total: count,
        page,
        limit,
    });
});

// GET /api/interactions/:id — single interaction detail
dashboard.get('/interactions/:id', async (c) => {
    const id = c.req.param('id');

    const { data, error } = await supabase
        .from('interactions')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
        return c.json({ error: 'Interaction not found' }, 404);
    }

    return c.json(data);
});

// GET /api/config — get server config (for config panel in dashboard)
dashboard.get('/config', async (c) => {
    const { data, error } = await supabase
        .from('servers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error || !data) {
        return c.json({ configured: false, config: {} });
    }

    return c.json({ configured: true, server: data });
});

// PATCH /api/config — update config toggles AND mirror webhook url in one call
dashboard.patch('/config', async (c) => {
    const { guild_id, config, mirror_webhook_url } = await c.req.json();

    if (!guild_id) {
        return c.json({ error: 'guild_id required' }, 400);
    }

    const updatePayload: Record<string, any> = { config };
    // Only include mirror_webhook_url if caller sent it (empty string clears it)
    if (mirror_webhook_url !== undefined) {
        updatePayload.mirror_webhook_url = mirror_webhook_url || null;
    }

    const { data, error } = await supabase
        .from('servers')
        .update(updatePayload)
        .eq('guild_id', guild_id)
        .select()
        .single();

    if (error) {
        console.error('[dashboard] config update error:', error);
        return c.json({ error: 'Failed to update config' }, 500);
    }

    return c.json({ message: 'Config updated', server: data });
});

// POST /api/config/test-webhook — test Slack webhook server-side (real result, no CORS tricks)
dashboard.post('/config/test-webhook', async (c) => {
    const { webhook_url } = await c.req.json();

    if (!webhook_url) {
        return c.json({ error: 'webhook_url required' }, 400);
    }

    try {
        const res = await fetch(webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: '📡 *Slack webhook test* from the Command Bot Admin Panel. Connection confirmed! 🚀'
            }),
        });

        if (!res.ok) {
            const body = await res.text();
            console.error('[test-webhook] Slack error:', res.status, body);
            return c.json({ success: false, error: `Slack rejected the message (${res.status})` }, 400);
        }

        return c.json({ success: true });
    } catch (err: any) {
        console.error('[test-webhook] Network error:', err.message);
        return c.json({ success: false, error: 'Could not reach Slack — check the webhook URL' }, 502);
    }
});

export default dashboard;

