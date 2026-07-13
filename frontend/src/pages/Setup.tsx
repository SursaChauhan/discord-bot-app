import React, { useState, useEffect } from 'react';
import { 
  Server, 
  HelpCircle, 
  ArrowRight, 
  Loader2, 
  AlertCircle,
  Hash,
  Link2
} from 'lucide-react';

export default function Setup() {
  const [guildId, setGuildId] = useState('');
  const [guildName, setGuildName] = useState('');
  const [channelId, setChannelId] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const token = localStorage.getItem('token');

  // Fetch current setup details (if already configured)
  const fetchCurrentSetup = async () => {
    setFetching(true);
    try {
      const res = await fetch('/api/setup', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.configured && data.server) {
          setGuildId(data.server.guild_id || '');
          setGuildName(data.server.guild_name || '');
          setChannelId(data.server.channel_id || '');
          setWebhookUrl(data.server.mirror_webhook_url || '');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchCurrentSetup();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    if (!guildId || !channelId) {
      setErrorMsg('Guild ID and Channel ID are required.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          guild_id: guildId,
          guild_name: guildName || null,
          channel_id: channelId,
          mirror_webhook_url: webhookUrl || null
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg(data.message || 'Server setup successfully!');
      } else {
        setErrorMsg(data.error || 'Failed to save server details.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Connection to backend database failed.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 font-sans">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading configuration details...
      </div>
    );
  }

  const steps = [
    {
      title: 'Invite Bot to Server',
      desc: 'Use your Discord OAuth2 URL to invite your Bot Application into your Discord Server with Slash Commands permission enabled.'
    },
    {
      title: 'Enable Developer Mode',
      desc: 'In Discord, navigate to User Settings -> Advanced -> toggle "Developer Mode" to ON. This enables copying unique Discord Snowflake IDs.'
    },
    {
      title: 'Copy Guild & Channel IDs',
      desc: 'Right-click your Server Logo and select "Copy Server ID". Then, right-click the Text Channel where reports should echo and select "Copy Channel ID".'
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      {/* Left panel: Setup Instructions */}
      <div className="lg:col-span-1 bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
            <HelpCircle size={18} className="text-violet-400" />
            Connection Guide
          </h2>
          <p className="text-xs text-slate-500 mt-1">Follow these steps to link your server configuration to the database.</p>
        </div>

        <div className="space-y-6">
          {steps.map((step, idx) => (
            <div key={idx} className="flex gap-4 relative">
              {idx < steps.length - 1 && (
                <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-slate-800" />
              )}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 border border-slate-700/50 flex items-center justify-center text-xs font-semibold text-slate-300">
                {idx + 1}
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-300">{step.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel: Form */}
      <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
            <Server size={18} className="text-violet-400" />
            Server Configuration
          </h2>
          <p className="text-xs text-slate-500 mt-1">Define IDs to connect and authorize slash commands from your server.</p>
        </div>

        {successMsg && (
          <div className="flex items-center gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-emerald-400 text-sm">
            <CheckIcon size={18} className="flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-3 rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-red-400 text-sm">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Guild ID */}
            <div>
              <label className="block text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Discord Server ID (Guild ID) *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <Server size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={guildId}
                  onChange={(e) => setGuildId(e.target.value)}
                  placeholder="854392019385930219"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-700 outline-none transition-all focus:border-violet-500 focus:ring-1 focus:ring-violet-500 font-mono"
                />
              </div>
            </div>

            {/* Guild Name */}
            <div>
              <label className="block text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Server Name (Friendly Identifier)
              </label>
              <input
                type="text"
                value={guildName}
                onChange={(e) => setGuildName(e.target.value)}
                placeholder="My Awesome Guild"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 py-2.5 px-4 text-sm text-slate-200 placeholder-slate-700 outline-none transition-all focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* Echo Channel ID */}
          <div>
            <label className="block text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Alert Post Channel ID *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <Hash size={16} />
              </span>
              <input
                type="text"
                required
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="950293028395028192"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-700 outline-none transition-all focus:border-violet-500 focus:ring-1 focus:ring-violet-500 font-mono"
              />
            </div>
            <p className="text-2xs text-slate-500 mt-1">Discord text channel where the bot will post confirmations of slash commands.</p>
          </div>

          {/* Slack Webhook URL */}
          <div>
            <label className="block text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Slack Webhook URL (Optional mirror)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <Link2 size={16} />
              </span>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full rounded-xl bg-slate-950 border border-slate-800 py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-700 outline-none transition-all focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800/40">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-500 active:scale-[0.98] disabled:bg-violet-600/50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving Server Config...
                </>
              ) : (
                <>
                  Connect Server
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CheckIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={2} 
      stroke="currentColor" 
      className={className} 
      style={{ width: size, height: size }}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}
