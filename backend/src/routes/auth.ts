import { Hono } from 'hono';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../services/supabase.js';

const auth = new Hono();

// POST /auth/login
auth.post('/login', async (c) => {
    const { email, password } = await c.req.json();

    if (!email || !password) {
        return c.json({ error: 'Email and password required' }, 400);
    }

    // Create a local, temporary client for login to avoid mutating the global singleton's auth headers
    const localClient = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        }
    );

    const { data, error } = await localClient.auth.signInWithPassword({
        email,
        password,
    });

    if (error || !data.user) {
        return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Verify user is in the admin allowlist
    const { data: adminRow, error: adminError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', data.user.email!.trim())
        .single();

    if (adminError || !adminRow) {
        return c.json({ error: 'Access denied: not an admin' }, 403);
    }

    // Sign our own JWT with the user's email embedded
    const token = jwt.sign(
        { email: data.user.email, sub: data.user.id },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
    );

    return c.json({ token, email: data.user.email });
});

// POST /auth/logout — client just discards token (stateless JWT)
// This endpoint exists for UX completeness and any future token blocklist
auth.post('/logout', async (c) => {
    return c.json({ message: 'Logged out' });
});

// GET /auth/me — verify token and return current user info
auth.get('/me', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return c.json({ error: 'Not authenticated' }, 401);
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        return c.json({ email: decoded.email });
    } catch {
        return c.json({ error: 'Invalid token' }, 401);
    }
});

export default auth;
