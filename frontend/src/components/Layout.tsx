import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { 
  LayoutDashboard, 
  Settings, 
  Server, 
  LogOut, 
  Terminal,
  User
} from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/config', label: 'Configuration', icon: Settings },
    { path: '/setup', label: 'Connect Server', icon: Server },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-slate-900/60 border-r border-slate-800/80 backdrop-blur-md">
        {/* Brand */}
        <div className="p-6 flex items-center gap-3 border-b border-slate-800/50">
          <div className="bg-violet-600/20 p-2 rounded-lg border border-violet-500/30 text-violet-400 animate-pulse">
            <Terminal size={22} />
          </div>
          <div>
            <h1 className="font-semibold text-lg bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Command Bot
            </h1>
            <p className="text-xs text-slate-500">Admin Control Panel</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30 shadow-[0_0_15px_-3px_rgba(124,58,237,0.2)]'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Icon size={18} className={`transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-violet-400' : 'text-slate-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User profile / Logout */}
        <div className="p-4 border-t border-slate-800/50 bg-slate-950/40">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="bg-slate-800 p-1.5 rounded-full flex-shrink-0">
                <User size={16} className="text-slate-400" />
              </div>
              <span className="text-xs font-medium truncate text-slate-400" title={user || ''}>
                {user}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-500 hover:text-red-400 transition-colors p-1.5 hover:bg-slate-800/50 rounded-lg"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 flex items-center justify-between px-8 bg-slate-900/30 border-b border-slate-800/40 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            System Status: 
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium normal-case">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Operational
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-slate-950 px-8 py-8">
          <div className="max-w-6xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
