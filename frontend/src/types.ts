export interface Interaction {
  id: string;
  interaction_id: string;
  guild_id: string;
  user_id: string;
  username: string;
  command_name: string;
  command_text: string | null;
  status: 'received' | 'processed' | 'failed';
  ai_summary: string | null; // stored as JSON string on backend
  response_sent: boolean;
  mirrored: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServerConfig {
  id: string;
  guild_id: string;
  guild_name: string | null;
  channel_id: string;
  mirror_webhook_url: string | null;
  config: {
    ai_enabled?: boolean;
    custom_responses?: Record<string, string>;
  };
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  email: string;
}
