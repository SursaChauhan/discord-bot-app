import { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
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

    // JWT signature is valid → user is an admin (enforced at login time)
    c.set('userEmail', email);

    await next();
}
