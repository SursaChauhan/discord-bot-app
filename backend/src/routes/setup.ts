import { Hono } from 'hono';
import { supabase } from '../services/supabase.js';

const setup = new Hono();

// POST /api/setup
// Saves or updates the Discord server configuration
// Uses upsert on guild_id — safe to call multiple times
setup.post('/', async (c) => {
    const { guild_id, guild_name, channel_id, mirror_webhook_url } =
        await c.req.json();

    if (!guild_id || !channel_id) {
        return c.json({ error: 'guild_id and channel_id are required' }, 400);
    }

    const { data, error } = await supabase
        .from('servers')
        .upsert(
            { guild_id, guild_name, channel_id, mirror_webhook_url },
            { onConflict: 'guild_id' }  // if guild_id exists → update, else insert
        )
        .select()
        .single();

    if (error) {
        console.error('[setup] DB error:', error);
        return c.json({ error: 'Failed to save server config' }, 500);
    }

    return c.json({ message: 'Server configured successfully', server: data });
});

// GET /api/setup — retrieve current server config
setup.get('/', async (c) => {
    const { data, error } = await supabase
        .from('servers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error || !data) {
        return c.json({ configured: false });
    }

    return c.json({ configured: true, server: data });
});

export default setup;
