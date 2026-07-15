const DISCORD_API = 'https://discord.com/api/v10';

// Called AFTER we return { type: 5 } (deferred response)
// Updates the "thinking..." message with the actual content or embed payload
export async function followUpInteraction(
    appId: string,
    token: string,
    content: string | object
): Promise<void> {
    const bodyPayload = typeof content === 'string' ? { content } : content;

    const res = await fetch(
        `${DISCORD_API}/webhooks/${appId}/${token}/messages/@original`,
        {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyPayload),
        }
    );

    if (!res.ok) {
        const err = await res.text();
        console.error('[discord] followUpInteraction failed:', err);
    }
}

// Posts a message or embed to a specific channel
export async function postToChannel(
    channelId: string,
    content: string | object
): Promise<void> {
    const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;
    const bodyPayload = typeof content === 'string' ? { content } : content;

    const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bot ${BOT_TOKEN}`,
        },
        body: JSON.stringify(bodyPayload),
    });

    if (!res.ok) {
        const err = await res.text();
        console.error('[discord] postToChannel failed:', err);
    }
}
