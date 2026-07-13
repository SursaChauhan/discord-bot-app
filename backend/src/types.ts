// Hono context variables — shared between middleware and route handlers
// This types c.get() and c.set() so TypeScript knows which keys are valid
export type Variables = {
    rawBody: string;
    userEmail: string;
};

// The raw body Discord sends us on every interaction
export interface DiscordInteraction {
    id: string;           // Discord's unique interaction ID (our idempotency key)
    type: number;         // 1=PING, 2=APPLICATION_COMMAND
    token: string;        // Token for following up (PATCH the deferred response)
    application_id: string;
    guild_id?: string;    // Which server (optional — DMs won't have this)
    data?: {
        name: string;       // Command name: 'report' | 'status'
        options?: Array<{
            name: string;     // Option name: 'text'
            value: string;    // The actual text the user typed
        }>;
    };
    member?: {
        user: {
            id: string;       // Discord user ID
            username: string;
        };
    };
}

// What we store in Supabase interactions table
export interface InteractionRecord {
    interaction_id: string;
    guild_id: string;
    user_id: string;
    username: string;
    command_name: string;
    command_text?: string;
    status: 'received' | 'processed' | 'failed';
    ai_summary?: string;
    response_sent: boolean;
    mirrored: boolean;
}

// Server config from servers table
export interface ServerConfig {
    id: string;
    guild_id: string;
    guild_name?: string;
    channel_id: string;
    mirror_webhook_url?: string;
    config: {
        ai_enabled?: boolean;
        custom_responses?: Record<string, string>;
    };
}
