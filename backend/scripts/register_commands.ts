

import 'dotenv/config';

/**
 * Register Discord slash commands for the bot.
 * Run with: `npm run register-commands`
 *
 * Requires environment variables:
 *   DISCORD_APP_ID  – Your Discord Application (Bot) ID
 *   DISCORD_BOT_TOKEN – Bot token (starts with `Bot ` when used in headers)
 */

const APP_ID = process.env.DISCORD_APP_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!APP_ID || !BOT_TOKEN) {
  console.error('❌ Missing DISCORD_APP_ID or DISCORD_BOT_TOKEN environment variables.');
  process.exit(1);
}

const COMMANDS = [
  {
    name: 'report',
    description: 'Submit a report that can be mirrored to Slack and optionally summarised by Gemini AI',
    options: [
      {
        type: 3, // STRING
        name: 'text',
        description: 'The report text',
        required: true,
      },
    ],
  },
  {
    name: 'status',
    description: 'Check whether the bot is online and view any custom status message',
  },
];

const url = `https://discord.com/api/v10/applications/${APP_ID}/commands`;

(async () => {
  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(COMMANDS),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('❌ Failed to register commands:', res.status, errText);
      process.exit(1);
    }

    const data = await res.json();
    console.log('✅ Commands registered successfully.');
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('❌ Unexpected error:', e);
    process.exit(1);
  }
})();
