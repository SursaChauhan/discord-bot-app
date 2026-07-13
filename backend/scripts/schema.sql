-- ============================================================
-- Command Bot — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================


-- ── 1. servers ────────────────────────────────────────────────────────────
-- One row per Discord server that has been set up via /api/setup
-- guild_id is the Discord server ID (unique)
CREATE TABLE IF NOT EXISTS servers (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id           TEXT NOT NULL UNIQUE,
    guild_name         TEXT,
    channel_id         TEXT NOT NULL,          -- channel to echo commands into
    mirror_webhook_url TEXT,                   -- optional Slack webhook URL
    config             JSONB NOT NULL DEFAULT '{
        "ai_enabled": false,
        "custom_responses": {}
    }'::jsonb,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER servers_updated_at
    BEFORE UPDATE ON servers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── 2. interactions ───────────────────────────────────────────────────────
-- One row per Discord slash command received
-- interaction_id is Discord's own unique ID (used for idempotency)
CREATE TABLE IF NOT EXISTS interactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interaction_id  TEXT NOT NULL UNIQUE,      -- Discord's ID — our idempotency key
    guild_id        TEXT NOT NULL,
    user_id         TEXT NOT NULL,             -- Discord user ID
    username        TEXT NOT NULL,
    command_name    TEXT NOT NULL,             -- 'report' | 'status'
    command_text    TEXT,                      -- the text the user typed (nullable for /status)
    status          TEXT NOT NULL DEFAULT 'received'
                        CHECK (status IN ('received', 'processed', 'failed')),
    ai_summary      TEXT,                      -- JSON string from Gemini (nullable)
    response_sent   BOOLEAN NOT NULL DEFAULT FALSE,
    mirrored        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER interactions_updated_at
    BEFORE UPDATE ON interactions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Index for dashboard queries (filter by guild, status, command)
CREATE INDEX IF NOT EXISTS idx_interactions_guild_id     ON interactions(guild_id);
CREATE INDEX IF NOT EXISTS idx_interactions_status       ON interactions(status);
CREATE INDEX IF NOT EXISTS idx_interactions_command_name ON interactions(command_name);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at   ON interactions(created_at DESC);


-- ── 3. admin_users ────────────────────────────────────────────────────────
-- Allowlist of emails that can log into the dashboard
-- requireAuth middleware checks this table on every /api/* request
CREATE TABLE IF NOT EXISTS admin_users (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email      TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── Seed: add yourself as the first admin ─────────────────────────────────
-- Replace with your actual email before running
INSERT INTO admin_users (email)
VALUES ('your-email@example.com')
ON CONFLICT (email) DO NOTHING;
