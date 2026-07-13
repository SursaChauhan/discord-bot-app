const DISCORD_API = 'https://discord.com/api/v10';

// Called AFTER we return { type: 5 } (deferred response)
// Updates the "thinking..." message with the actual content
export async function followUpInteraction(
    appId: string,
    token: string,
    content: string
): Promise<void> {
    const res = await fetch(
        `${DISCORD_API}/webhooks/${appId}/${token}/messages/@original`,
        {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
        }
    );

    if (!res.ok) {
        const err = await res.text();
        console.error('[discord] followUpInteraction failed:', err);
    }
}

// Posts a message to a specific channel
// Used to echo the command into the configured server channel
export async function postToChannel(
    channelId: string,
    content: string
): Promise<void> {
    const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

    const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bot ${BOT_TOKEN}`,
        },
        body: JSON.stringify({ content }),
    });

    if (!res.ok) {
        const err = await res.text();
        console.error('[discord] postToChannel failed:', err);
    }
}
