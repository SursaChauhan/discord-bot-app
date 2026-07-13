// Sends a notification to the configured Slack incoming webhook
// webhookUrl is stored per-server in servers.mirror_webhook_url
// If not configured, silently skip (not every server needs mirroring)

export async function sendToSlack(
    webhookUrl: string | null | undefined,
    text: string
): Promise<boolean> {
    if (!webhookUrl) {
        console.log('[mirror] No webhook URL configured, skipping');
        return false;
    }

    try {
        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });

        if (!res.ok) {
            console.error('[mirror] Slack webhook failed:', res.status);
            return false;
        }

        return true;
    } catch (err) {
        // Network error — log and continue, don't crash command processing
        console.error('[mirror] Slack webhook error:', err);
        return false;
    }
}
