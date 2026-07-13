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

    // Layer 2: check email is in our admin_users allowlist
    console.log('[requireAuth] Decoded email from token:', email);
    const { data, error } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', email)
        .single();

    if (error || !data) {
        console.error('[requireAuth] Auth check failed in DB for email:', email, 'Error:', error);
        return c.json({ error: 'Not authorized' }, 403);
    }
    console.log('[requireAuth] Auth verification successful for:', email);

    // Pass email to route handlers via context
    c.set('userEmail', email);

    await next();
}
