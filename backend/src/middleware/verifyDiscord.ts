import { sign } from 'tweetnacl';
import { Context, Next } from 'hono';
import { Variables } from '../types.js';

export async function verifyDiscord(c: Context<{ Variables: Variables }>, next: Next) {
    const signature = c.req.header('x-signature-ed25519');
    const timestamp = c.req.header('x-signature-timestamp');

    // If either header is missing — not from Discord
    if (!signature || !timestamp) {
        return c.json({ error: 'Missing signature headers' }, 401);
    }

    // Read raw body as text — MUST happen before any JSON parsing
    const rawBody = await c.req.text();

    const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY!;

    let isValid = false;
    try {
        isValid = sign.detached.verify(
            Buffer.from(timestamp + rawBody),        // message Discord signed
            Buffer.from(signature, 'hex'),           // the signature they sent
            Buffer.from(PUBLIC_KEY, 'hex')           // your public key
        );
    } catch {
        // Malformed signature bytes — treat as invalid
        return c.json({ error: 'Invalid signature format' }, 401);
    }

    if (!isValid) {
        return c.json({ error: 'Invalid signature' }, 401);
    }

    // Store rawBody in context so the route handler can parse it
    // (we already consumed the stream — can't read it again)
    c.set('rawBody', rawBody);

    await next();
}
