import { useState, useEffect } from 'react';
import { API_BASE } from '../config';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  MessageSquare,
  Save, 
  Loader2, 
  AlertCircle,
  HelpCircle,
  Play
} from 'lucide-react';
import type { ServerConfig } from '../types';

const SlackIcon = ({ size = 20, className = '' }: { size?: number; className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className} 
    style={{ width: size, height: size }} 
    fill="currentColor"
  >
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52-2.523 2.528 2.528 0 0 1-2.522-2.523 2.528 2.528 0 0 1 2.522-2.52h2.52v2.52zm1.261 0a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v5.042a2.528 2.528 0 0 1-2.522 2.52H8.824a2.528 2.528 0 0 1-2.52-2.52v-5.042zM8.824 5.043a2.528 2.528 0 0 1-2.52-2.52A2.528 2.528 0 0 1 8.824 0a2.528 2.528 0 0 1 2.522 2.522v2.521h-2.522zm0 1.261a2.528 2.528 0 0 1 2.522 2.52v5.043a2.528 2.528 0 0 1-2.522 2.522H3.782a2.528 2.528 0 0 1-2.52-2.522V8.824a2.528 2.528 0 0 1 2.52-2.52h5.042zm10.134 3.782a2.528 2.528 0 0 1 2.52-2.522 2.528 2.528 0 0 1 2.522 2.522 2.528 2.528 0 0 1-2.522 2.52h-2.52v-2.52zm-1.262 0a2.528 2.528 0 0 1-2.52 2.52h-5.043a2.528 2.528 0 0 1-2.522-2.52V5.043a2.528 2.528 0 0 1 2.522-2.52h5.043a2.528 2.528 0 0 1 2.52 2.52v5.042zm-3.782 10.134a2.528 2.528 0 0 1 2.52 2.52 2.528 2.528 0 0 1-2.52-2.522 2.528 2.528 0 0 1-2.522-2.522v-2.52h2.522zm0-1.262a2.528 2.528 0 0 1-2.522-2.52v-5.043a2.528 2.528 0 0 1 2.522-2.522h5.043a2.528 2.528 0 0 1 2.52 2.522v5.043a2.528 2.528 0 0 1-2.52 2.52h-5.043z" />
  </svg>
);

export default function Config() {
  const [configData, setConfigData] = useState<ServerConfig | null>(null);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  
  // Form fields
  const [webhookUrl, setWebhookUrl] = useState('');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [customStatusResponse, setCustomStatusResponse] = useState('');
  
  // Feedback states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [webhookTestResult, setWebhookTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  const token = localStorage.getItem('token');

  const fetchConfig = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/config`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setConfigured(data.configured);
        if (data.configured && data.server) {
          setConfigData(data.server);
          setWebhookUrl(data.server.mirror_webhook_url || '');
          setAiEnabled(data.server.config?.ai_enabled || false);
          setCustomStatusResponse(data.server.config?.custom_responses?.status || '');
        }
      } else {
        setErrorMsg('Failed to load server configuration.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to establish server connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configData) return;
    
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`${API_BASE}/api/config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          guild_id: configData.guild_id,
          mirror_webhook_url: webhookUrl,
          config: {
            ai_enabled: aiEnabled,
            custom_responses: {
              status: customStatusResponse
            }
          }
        })
      });

      if (res.ok) {
        setSuccessMsg('Configuration settings saved successfully.');
        fetchConfig();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to save configuration settings.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to contact database backend.');
    } finally {
      setSaving(false);
    }
  };

  const testSlackWebhook = async () => {
    if (!webhookUrl) return;
    setTestingWebhook(true);
    setWebhookTestResult(null);
    try {
      // Call backend — Slack requires server-side request (CORS blocks direct browser calls)
      const res = await fetch(`${API_BASE}/api/config/test-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ webhook_url: webhookUrl })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setWebhookTestResult({
          success: true,
          msg: 'Slack message sent successfully — check your channel!'
        });
      } else {
        setWebhookTestResult({
          success: false,
          msg: data.error || 'Slack rejected the test message. Verify the webhook URL.'
        });
      }
    } catch (err) {
      console.error(err);
      setWebhookTestResult({
        success: false,
        msg: 'Could not reach backend. Is the server running?'
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 font-sans">
        <Loader2 className="animate-spin mr-2" size={20} />
        Retrieving current configuration...
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-2xl max-w-2xl mx-auto text-center font-sans space-y-6">
        <div className="inline-flex p-3 rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-400">
          <HelpCircle size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-200">No Server Connected</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            You need to link a Discord server to the database before configuring custom status messages or AI triggers.
          </p>
        </div>
        <div>
          <Link 
            to="/setup" 
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-all shadow-lg shadow-violet-600/20 cursor-pointer"
          >
            Connect Server Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-200">Bot Configuration</h2>
          <p className="text-sm text-slate-500">Connected: <span className="font-semibold text-slate-400">{configData?.guild_name || 'Discord Server'}</span> (ID: {configData?.guild_id})</p>
        </div>
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

      <form onSubmit={handleSave} className="space-y-6">
        {/* Toggle 1: Gemini AI */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              <div className="bg-violet-500/10 text-violet-400 p-3 rounded-xl border border-violet-500/20 self-start">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-200">Gemini AI Summarization</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-xl">
                  Automatically parse and summarize user reports sent via the <code className="text-xs bg-slate-950 px-1 py-0.5 rounded border border-slate-800 text-violet-400">/report</code> command. AI extracts key highlights and assigns relevant support tags.
                </p>
              </div>
            </div>
            
            {/* Toggle Switch */}
            <button
              type="button"
              onClick={() => setAiEnabled(!aiEnabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                aiEnabled ? 'bg-violet-600' : 'bg-slate-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  aiEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Setting 2: Slack Webhook */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-4">
          <div className="flex gap-4">
            <div className="bg-pink-500/10 text-pink-400 p-3 rounded-xl border border-pink-500/20 self-start">
              <SlackIcon size={20} />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-200">Slack Webhook Mirroring</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Forward active slash commands and summaries directly into your team's Slack channel.
                </p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 py-3 px-4 text-sm text-slate-200 placeholder-slate-700 outline-none transition-all focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                  />
                </div>

                {webhookUrl && (
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      disabled={testingWebhook}
                      onClick={testSlackWebhook}
                      className="inline-flex items-center gap-1.5 text-xs text-pink-400 hover:text-pink-300 font-semibold border border-pink-500/20 bg-pink-500/5 hover:bg-pink-500/10 rounded-lg px-3 py-1.5 transition-all cursor-pointer"
                    >
                      {testingWebhook ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Sending test...
                        </>
                      ) : (
                        <>
                          <Play size={12} />
                          Dispatch Slack Test Message
                        </>
                      )}
                    </button>

                    {webhookTestResult && (
                      <span className={`text-xs font-medium ${webhookTestResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                        {webhookTestResult.msg}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Setting 3: Custom Command Responses */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-4">
          <div className="flex gap-4">
            <div className="bg-sky-500/10 text-sky-400 p-3 rounded-xl border border-sky-500/20 self-start">
              <MessageSquare size={20} />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-200">Custom Status Response</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Customize the message returned by the bot in Discord when users trigger the <code className="text-xs bg-slate-950 px-1 py-0.5 rounded border border-slate-800 text-sky-400">/status</code> command.
                </p>
              </div>

              <div>
                <textarea
                  value={customStatusResponse}
                  onChange={(e) => setCustomStatusResponse(e.target.value)}
                  placeholder="✅ Bot is online and operational!"
                  rows={3}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 py-3 px-4 text-sm text-slate-200 placeholder-slate-700 outline-none transition-all focus:border-violet-500 focus:ring-1 focus:ring-violet-500 resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-500 active:scale-[0.98] disabled:bg-violet-600/50 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving settings...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
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
