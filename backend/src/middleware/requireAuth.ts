import { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import { supabase } from '../services/supabase.js';
import { Variables } from '../types.js';

export async function requireAuth(c: Context<{ Variables: Variables }>, next: Next) {
    const authHeader = c.req.header('Authorization');

    // Expect: "Bearer <token>"
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Missing or invalid Authorization header' }, 401);
    }

    const token = authHeader.split(' ')[1];
    const JWT_SECRET = process.env.JWT_SECRET!;

    let decoded: any;
    try {
        // Layer 1: verify signature — proves token wasn't tampered with
        decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return c.json({ error: 'Invalid or expired token' }, 401);
    }

    const email = decoded.email as string;
    if (!email) {
        return c.json({ error: 'Token missing email claim' }, 401);
    }

    // Verify email is in our admin_users allowlist
    const { data, error } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', email.trim())
        .single();

    if (error || !data) {
        return c.json({ error: 'Not authorized' }, 403);
    }

    // Pass email to route handlers via context
    c.set('userEmail', email);

    await next();
}
