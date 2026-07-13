import { Hono } from 'hono';
import jwt from 'jsonwebtoken';
import { supabase } from '../services/supabase.js';

const auth = new Hono();

// We create a separate Supabase client here using the anon key pattern
// for signInWithPassword — service_role doesn't do auth flows
// Actually: signInWithPassword works fine with service_role client too
// POST /auth/login

auth.post('/login', async (c) => {
    const { email, password } = await c.req.json();

    if (!email || !password) {
        return c.json({ error: 'Email and password required' }, 400);
    }

    // Supabase validates credentials against auth.users table
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error || !data.user) {
        return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Sign our own JWT with the user's email embedded
    // This is what the frontend stores and sends as Bearer token
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
