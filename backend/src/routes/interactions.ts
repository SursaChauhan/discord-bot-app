import { Hono } from 'hono';
import { supabase } from '../services/supabase.js';
import { followUpInteraction, postToChannel } from '../services/discord.js';
import { sendToSlack } from '../services/mirror.js';
import { summarizeReport } from '../services/gemini.js';
import { DiscordInteraction, Variables } from '../types.js';

const interactions = new Hono<{ Variables: Variables }>();

// POST /interactions — Discord sends every slash command here
interactions.post('/', async (c) => {
    // Body was already verified by verifyDiscord middleware
    // and stored in context (stream can't be re-read)
    const rawBody = c.get('rawBody') as string;
    const body = JSON.parse(rawBody) as DiscordInteraction;

    // ── PING (type 1) ──────────────────────────────────────────
    // Discord sends this when you register the interactions URL.
    // Must respond with { type: 1 } within 3 seconds or registration fails.
    if (body.type === 1) {
        return c.json({ type: 1 });
    }

    // ── SLASH COMMAND (type 2) ─────────────────────────────────
    if (body.type === 2) {
        const guildId = body.guild_id ?? 'unknown';
        const userId = body.member?.user.id ?? 'unknown';
        const username = body.member?.user.username ?? 'unknown';
        const commandName = body.data?.name ?? 'unknown';
        const commandText = body.data?.options?.[0]?.value ?? null;

        // Step 1: Idempotency — attempt DB insert
        // If interaction_id already exists (Discord retry), catch error 23505
        const { error: insertError } = await supabase
            .from('interactions')
            .insert({
                interaction_id: body.id,
                guild_id: guildId,
                user_id: userId,
                username,
                command_name: commandName,
                command_text: commandText,
                status: 'received',
            });

        if (insertError) {
            if (insertError.code === '23505') {
                // Duplicate interaction — already processed, return silently
                console.log(`[interactions] Duplicate ${body.id}, skipping`);
                return c.json({ type: 1 });
            }
            console.error('[interactions] DB insert error:', insertError);
            // Still return deferred — don't let DB errors cause Discord errors
        }

        // Step 2: Return deferred response IMMEDIATELY
        // This tells Discord "I got it, processing..." (shows loading state)
        // We have 15 minutes after this to follow up via PATCH
        const appId = process.env.DISCORD_APP_ID!;

        // Step 3: Fire-and-forget — do NOT await this
        // processCommand runs async after we've already returned { type: 5 }
        processCommand(body.id, body.token, appId, guildId, commandName, commandText).catch(
            (err) => console.error('[interactions] processCommand error:', err)
        );

        return c.json({ type: 5 }); // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
    }

    // Unknown interaction type
    return c.json({ error: 'Unknown interaction type' }, 400);
});

// ── Async command processor ────────────────────────────────────────────────
// Runs AFTER we've returned { type: 5 } to Discord
// Has up to 15 minutes to follow up via Discord webhook
async function processCommand(
    interactionId: string,
    token: string,
    appId: string,
    guildId: string,
    commandName: string,
    commandText: string | null
): Promise<void> {
    let responseContent = '';
    let aiSummary: string | null = null;
    let responseSent = false;
    let mirrored = false;

    try {
        // Fetch server config (channel_id, webhook URL, AI toggle)
        const { data: server } = await supabase
            .from('servers')
            .select('*')
            .eq('guild_id', guildId)
            .single();

        const aiEnabled = server?.config?.ai_enabled ?? false;

        // ── /report command ──────────────────────────────────────
        if (commandName === 'report' && commandText) {
            let aiPart = '';

            // Call Gemini only if AI is enabled AND text exists
            if (aiEnabled) {
                const result = await summarizeReport(commandText);
                if (result) {
                    aiSummary = JSON.stringify(result);
                    aiPart = `\n📊 **AI Summary:** ${result.summary}\n🏷️ **Tags:** ${result.tags.join(', ')}`;
                }
            }

            responseContent = `✅ **Report received!**\n📝 "${commandText}"${aiPart}`;

            // Mirror to Slack
            mirrored = await sendToSlack(
                server?.mirror_webhook_url,
                `📢 New report from ${guildId}\nUser: <@${interactionId}>\nText: ${commandText}${aiSummary ? `\nAI: ${JSON.parse(aiSummary).summary}` : ''}`
            );
        }

        // ── /status command ──────────────────────────────────────
        else if (commandName === 'status') {
            const customResponse = server?.config?.custom_responses?.status;
            responseContent = customResponse ?? '✅ Bot is online and operational!';

            mirrored = await sendToSlack(
                server?.mirror_webhook_url,
                `📡 Status check from guild: ${guildId}`
            );
        }

        // ── Unknown command ──────────────────────────────────────
        else {
            responseContent = `Unknown command: ${commandName}`;
        }

        // Follow up with Discord — updates the "thinking..." deferred message
        await followUpInteraction(appId, token, responseContent);
        responseSent = true;

        // Also post to configured channel if set
        if (server?.channel_id) {
            await postToChannel(server.channel_id, responseContent);
        }

    } catch (err) {
        console.error('[processCommand] Error:', err);
        // Try to send an error message to Discord so user isn't left hanging
        try {
            await followUpInteraction(appId, token, '❌ Something went wrong processing your command.');
        } catch { /* ignore */ }
    } finally {
        // Always update the DB record — even on failure
        await supabase
            .from('interactions')
            .update({
                status: responseSent ? 'processed' : 'failed',
                ai_summary: aiSummary,
                response_sent: responseSent,
                mirrored,
            })
            .eq('interaction_id', interactionId);
    }
}

export default interactions;
