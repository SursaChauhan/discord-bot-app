import { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MessageSquare,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Database
} from 'lucide-react';
import type { Interaction } from '../types';

const SlackIcon = ({ size = 20, className = '' }: { size?: number; className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className} 
    style={{ width: size, height: size }} 
    fill="currentColor"
  >
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52-2.523 2.528 2.528 0 0 1-2.522-2.523 2.528 2.528 0 0 1 2.522-2.52h2.52v2.52zm1.261 0a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v5.042a2.528 2.528 0 0 1-2.522 2.52H8.824a2.528 2.528 0 0 1-2.52-2.52v-5.042zM8.824 5.043a2.528 2.528 0 0 1-2.52-2.52A2.528 2.528 0 0 1 8.824 0a2.528 2.528 0 0 1 2.522 2.522v2.521h-2.522zm0 1.261a2.528 2.528 0 0 1 2.522 2.52v5.043a2.528 2.528 0 0 1-2.522 2.522H3.782a2.528 2.528 0 0 1-2.52-2.522V8.824a2.528 2.528 0 0 1 2.52-2.52h5.042zm10.134 3.782a2.528 2.528 0 0 1 2.52-2.522 2.528 2.528 0 0 1 2.522 2.522 2.528 2.528 0 0 1-2.522 2.52h-2.52v-2.52zm-1.262 0a2.528 2.528 0 0 1-2.52 2.52h-5.043a2.528 2.528 0 0 1-2.522-2.52V5.043a2.528 2.528 0 0 1 2.522-2.52h5.043a2.528 2.528 0 0 1 2.52 2.52v5.042zm-3.782 10.134a2.528 2.528 0 0 1 2.52 2.52 2.528 2.528 0 0 1-2.52 2.522 2.528 2.528 0 0 1-2.522-2.522v-2.52h2.522zm0-1.262a2.528 2.528 0 0 1-2.522-2.52v-5.043a2.528 2.528 0 0 1 2.522-2.522h5.043a2.528 2.528 0 0 1 2.52 2.522v5.043a2.528 2.528 0 0 1-2.52 2.52h-5.043z" />
  </svg>
);

export default function Dashboard() {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(15);
  
  // Filters
  const [commandFilter, setCommandFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Selected interaction for detailed view
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    processed: 0,
    failed: 0,
    mirrored: 0,
    aiSummarized: 0
  });

  const token = localStorage.getItem('token');

  const fetchStats = async () => {
    try {
      const statsRes = await fetch('/api/interactions?limit=1000', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        const list = (statsData.interactions || []) as Interaction[];
        const totalCount = statsData.total || 0;
        const processedCount = list.filter(i => i.status === 'processed').length;
        const failedCount = list.filter(i => i.status === 'failed').length;
        const mirroredCount = list.filter(i => i.mirrored).length;
        const aiCount = list.filter(i => i.ai_summary).length;

        setStats({
          total: totalCount,
          processed: processedCount,
          failed: failedCount,
          mirrored: mirroredCount,
          aiSummarized: aiCount
        });
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  };

  const fetchInteractions = async () => {
    setLoading(true);
    try {
      let url = `/api/interactions?page=${page}&limit=${limit}`;
      if (commandFilter) url += `&command=${commandFilter}`;
      if (statusFilter) url += `&status=${statusFilter}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setInteractions(data.interactions || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchInteractions();
    fetchStats();
  };

  // Fetch interactions when page or filters change (without re-fetching overall stats)
  useEffect(() => {
    fetchInteractions();
  }, [page, commandFilter, statusFilter]);

  // Fetch overall server stats once on mount
  useEffect(() => {
    fetchStats();
  }, []);

  const totalPages = Math.ceil(total / limit) || 1;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Helper to parse Gemini summary JSON
  const renderAISummary = (summaryStr: string | null) => {
    if (!summaryStr) return null;
    try {
      const parsed = JSON.parse(summaryStr);
      return (
        <div className="mt-3 bg-violet-950/20 border border-violet-500/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-violet-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles size={14} className="animate-pulse" />
            Gemini AI Insights
          </div>
          <p className="text-sm text-slate-300 italic">"{parsed.summary}"</p>
          {parsed.tags && parsed.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {parsed.tags.map((tag: string) => (
                <span key={tag} className="text-2xs px-2 py-0.5 rounded-full bg-violet-600/20 border border-violet-500/20 text-violet-300 font-medium">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    } catch {
      return <p className="text-sm text-slate-400 mt-2">{summaryStr}</p>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Total */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Commands</span>
            <h2 className="text-3xl font-bold mt-1 text-slate-100">{stats.total}</h2>
          </div>
          <div className="bg-slate-800/50 text-slate-400 p-3 rounded-xl border border-slate-700/50">
            <Database size={20} />
          </div>
        </div>

        {/* Card 2: Processed */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Success rate</span>
            <h2 className="text-3xl font-bold mt-1 text-emerald-400">
              {stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0}%
            </h2>
          </div>
          <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-xl border border-emerald-500/20">
            <CheckCircle2 size={20} />
          </div>
        </div>

        {/* Card 3: Slack Mirrored */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Slack Mirrored</span>
            <h2 className="text-3xl font-bold mt-1 text-pink-400">{stats.mirrored}</h2>
          </div>
          <div className="bg-pink-500/10 text-pink-400 p-3 rounded-xl border border-pink-500/20">
            <SlackIcon size={20} />
          </div>
        </div>

        {/* Card 4: AI Summarized */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Summaries</span>
            <h2 className="text-3xl font-bold mt-1 text-violet-400">{stats.aiSummarized}</h2>
          </div>
          <div className="bg-violet-500/10 text-violet-400 p-3 rounded-xl border border-violet-500/20">
            <Sparkles size={20} />
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
        {/* Table Header Controls */}
        <div className="p-6 border-b border-slate-800/60 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/20">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <h2 className="font-semibold text-lg text-slate-200">Interactions Log</h2>
            <button 
              onClick={handleRefresh}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800/50 border border-slate-800 transition-all cursor-pointer"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
            {/* Filter by Command */}
            <select
              value={commandFilter}
              onChange={(e) => { setCommandFilter(e.target.value); setPage(1); }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 outline-none focus:border-violet-500"
            >
              <option value="">All Commands</option>
              <option value="report">/report</option>
              <option value="status">/status</option>
            </select>

            {/* Filter by Status */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 outline-none focus:border-violet-500"
            >
              <option value="">All Statuses</option>
              <option value="processed">Processed</option>
              <option value="received">Received</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300 border-collapse">
            <thead className="bg-slate-950/50 text-slate-400 font-semibold text-xs border-b border-slate-800/60 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Command</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Integrations</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {loading && interactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="animate-spin" size={16} />
                      Loading interactions...
                    </div>
                  </td>
                </tr>
              ) : interactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    No interactions logged.
                  </td>
                </tr>
              ) : (
                interactions.map((interaction) => (
                  <tr 
                    key={interaction.id} 
                    className="hover:bg-slate-800/20 transition-colors group cursor-pointer"
                    onClick={() => setSelectedInteraction(interaction)}
                  >
                    <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                      {formatDate(interaction.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-200">{interaction.username}</div>
                      <div className="text-xs text-slate-500">ID: {interaction.user_id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs bg-slate-950 border border-slate-800 px-2 py-1 rounded-md text-violet-400">
                        /{interaction.command_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {interaction.status === 'processed' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 size={12} />
                          Processed
                        </span>
                      ) : interaction.status === 'failed' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          <XCircle size={12} />
                          Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock size={12} />
                          Received
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 text-slate-500">
                        <span 
                          className={interaction.mirrored ? 'text-pink-400' : 'opacity-25'}
                          title={interaction.mirrored ? 'Mirrored to Slack' : 'Not mirrored'}
                        >
                          <SlackIcon size={16} />
                        </span>
                        <span 
                          className={interaction.ai_summary ? 'text-violet-400' : 'opacity-25'}
                          title={interaction.ai_summary ? 'AI Summarized' : 'No AI Summary'}
                        >
                          <Sparkles size={16} />
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button className="inline-flex items-center gap-1 text-xs text-violet-400 group-hover:text-violet-300 font-semibold group-hover:underline transition-all bg-transparent border-none cursor-pointer">
                        View details
                        <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-900/20 border-t border-slate-800/60 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} records
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400 cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-medium px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-300">
                {page} / {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400 cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-over Inspection Panel */}
      {selectedInteraction && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans">
          {/* Backdrop blur */}
          <div 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setSelectedInteraction(null)}
          />
          <div className="absolute inset-y-0 right-0 max-w-full pl-10 flex">
            <div className="h-full w-screen max-w-md bg-slate-900 border-l border-slate-800/80 shadow-2xl p-6 flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-800/80 flex-shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-slate-200">Inspect Interaction</h3>
                  <p className="text-xs text-slate-500 font-mono mt-1">ID: {selectedInteraction.interaction_id}</p>
                </div>
                <button 
                  onClick={() => setSelectedInteraction(null)}
                  className="text-slate-500 hover:text-slate-200 p-1 rounded-md hover:bg-slate-800/50 cursor-pointer"
                >
                  <XCircle size={20} />
                </button>
              </div>

              {/* Body Details */}
              <div className="flex-1 min-h-0 overflow-y-auto py-6 space-y-5">
                {/* Status Badge & Timestamp */}
                <div className="flex justify-between items-center bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/50">
                  <div>
                    <div className="text-2xs text-slate-500 uppercase tracking-wider font-semibold">Processed Date</div>
                    <div className="text-xs text-slate-300 font-medium mt-0.5">{formatDate(selectedInteraction.created_at)}</div>
                  </div>
                  {selectedInteraction.status === 'processed' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Processed
                    </span>
                  ) : selectedInteraction.status === 'failed' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                      Failed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Received
                    </span>
                  )}
                </div>

                {/* Metadata (User & Server) */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Discord Metadata</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/40">
                      <span className="text-2xs text-slate-500 uppercase">Username</span>
                      <p className="text-sm font-semibold text-slate-300 mt-0.5 truncate">{selectedInteraction.username}</p>
                    </div>
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/40">
                      <span className="text-2xs text-slate-500 uppercase">User ID</span>
                      <p className="text-sm font-semibold text-slate-300 mt-0.5 truncate">{selectedInteraction.user_id}</p>
                    </div>
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/40 col-span-2">
                      <span className="text-2xs text-slate-500 uppercase">Discord Server ID (Guild)</span>
                      <p className="text-sm font-semibold text-slate-300 mt-0.5 font-mono truncate">{selectedInteraction.guild_id}</p>
                    </div>
                  </div>
                </div>

                {/* Command Input Details */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trigger command</h4>
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/40 font-mono">
                    <span className="text-violet-400 text-sm">/{selectedInteraction.command_name}</span>
                    {selectedInteraction.command_text && (
                      <p className="text-slate-300 text-sm mt-2 whitespace-pre-wrap break-all">
                        {selectedInteraction.command_text}
                      </p>
                    )}
                  </div>
                </div>

                {/* Gemini Summary (if applicable) */}
                {selectedInteraction.ai_summary && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Insights</h4>
                    {renderAISummary(selectedInteraction.ai_summary)}
                  </div>
                )}

                {/* Integrations checklist */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pipeline Output</h4>
                  <div className="divide-y divide-slate-800/40 bg-slate-950/40 rounded-xl border border-slate-800/40 px-4 py-1">
                    <div className="flex justify-between items-center py-2.5">
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <MessageSquare size={16} className="text-slate-500" />
                        <span>Discord Response Followup</span>
                      </div>
                      {selectedInteraction.response_sent ? (
                        <span className="text-xs text-emerald-400 font-semibold">Sent</span>
                      ) : (
                        <span className="text-xs text-slate-500">Not Sent</span>
                      )}
                    </div>

                    <div className="flex justify-between items-center py-2.5">
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <SlackIcon size={16} className="text-slate-500" />
                        <span>Slack Mirror</span>
                      </div>
                      {selectedInteraction.mirrored ? (
                        <span className="text-xs text-pink-400 font-semibold">Mirrored</span>
                      ) : (
                        <span className="text-xs text-slate-500">Skipped / No Webhook</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-800/80 flex-shrink-0 mt-auto">
                <button 
                  onClick={() => setSelectedInteraction(null)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-3 text-sm font-semibold transition-all cursor-pointer"
                >
                  Close panel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
