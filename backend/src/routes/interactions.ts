import { Hono } from 'hono';
import { supabase } from '../services/supabase.js';
import { followUpInteraction, postToChannel } from '../services/discord.js';
import { sendToSlack } from '../services/mirror.js';
import { summarizeReport } from '../services/gemini.js';
import { DiscordInteraction, Variables } from '../types.js';

const interactions = new Hono<{ Variables: Variables }>();

// POST /interactions — Endpoint for Discord slash commands
interactions.post('/', async (c) => {
    // Body is verified by verifyDiscord middleware
    const rawBody = c.get('rawBody') as string;
    const body = JSON.parse(rawBody) as DiscordInteraction;

    // Handle PING type from Discord setup
    if (body.type === 1) {
        return c.json({ type: 1 });
    }

    // Handle Slash commands
    if (body.type === 2) {
        const guildId = body.guild_id ?? 'unknown';
        const userId = body.member?.user.id ?? 'unknown';
        const username = body.member?.user.username ?? 'unknown';
        const commandName = body.data?.name ?? 'unknown';
        const commandText = body.data?.options?.[0]?.value ?? null;

        // Idempotency: skip processing if we already inserted this interaction
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
                console.log(`[interactions] Duplicate interaction ${body.id}, skipping`);
                return c.json({ type: 1 });
            }
            console.error('[interactions] Database insert failed:', insertError);
        }

        const appId = process.env.DISCORD_APP_ID!;

        // Process the command asynchronously to respond to Discord within 3s limit
        processCommand(body.id, body.token, appId, guildId, userId, username, commandName, commandText).catch(
            (err) => console.error('[interactions] Background command processing failed:', err)
        );

        return c.json({ type: 5 }); // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
    }

    return c.json({ error: 'Unknown interaction type' }, 400);
});

// Process command execution in the background
async function processCommand(
    interactionId: string,
    token: string,
    appId: string,
    guildId: string,
    userId: string,
    username: string,
    commandName: string,
    commandText: string | null
): Promise<void> {
    let responseContent = '';
    let aiSummary: string | null = null;
    let responseSent = false;
    let mirrored = false;

    try {
        const { data: server } = await supabase
            .from('servers')
            .select('*')
            .eq('guild_id', guildId)
            .single();

        const aiEnabled = server?.config?.ai_enabled ?? false;
        const serverName = server?.guild_name ?? guildId;

        // Handle /report command
        if (commandName === 'report' && commandText) {
            let aiSummaryData: any = null;

            if (aiEnabled) {
                const result = await summarizeReport(commandText);
                if (result) {
                    aiSummaryData = result;
                    aiSummary = JSON.stringify(result);
                }
            }

            // Construct Discord Rich Embed
            const fields = [];
            if (aiSummaryData) {
                fields.push({
                    name: '📊 AI Summary',
                    value: aiSummaryData.summary,
                });
                fields.push({
                    name: '🏷️ Tags',
                    value: aiSummaryData.tags.map((t: string) => `\`${t}\``).join(', '),
                });
            }

            responseContent = {
                embeds: [
                    {
                        title: '✅ Report Received',
                        description: `"${commandText}"`,
                        color: 8351679, // violet/purple
                        fields,
                        footer: {
                            text: `Server: ${serverName} | Submitter: ${username}`,
                        },
                        timestamp: new Date().toISOString(),
                    }
                ]
            } as any;

            // Send mirror notification to Slack (using readable server name)
            mirrored = await sendToSlack(
                server?.mirror_webhook_url,
                `📢 New report from *${serverName}*\nUser: ${username} (ID: ${userId})\nText: ${commandText}${aiSummaryData ? `\nAI: ${aiSummaryData.summary}` : ''}`
            );
        }

        // Handle /status command
        else if (commandName === 'status') {
            const customResponse = server?.config?.custom_responses?.status ?? 'Bot is online and operational!';
            
            responseContent = {
                embeds: [
                    {
                        title: '📡 System Status',
                        description: `✅ ${customResponse}`,
                        color: 1673830, // emerald green
                        footer: {
                            text: `Server: ${serverName}`,
                        },
                        timestamp: new Date().toISOString(),
                    }
                ]
            } as any;

            mirrored = await sendToSlack(
                server?.mirror_webhook_url,
                `📡 Status check from server: *${serverName}*`
            );
        }

        // Handle fallback for unknown commands
        else {
            responseContent = `Unknown command: ${commandName}`;
        }

        // Update the deferred channel message on Discord
        await followUpInteraction(appId, token, responseContent);
        responseSent = true;

        // Post confirmation to the channel if configured
        if (server?.channel_id) {
            await postToChannel(server.channel_id, responseContent);
        }

    } catch (err) {
        console.error('[processCommand] Error handling command execution:', err);
        try {
            await followUpInteraction(appId, token, '❌ Something went wrong processing your command.');
        } catch { /* ignore */ }
    } finally {
        // Track the completion status in the database
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
