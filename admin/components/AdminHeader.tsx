import React from 'react';
import {
  ShieldCheck,
  Users,
  Inbox,
  BookOpen,
  Database,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';

interface AdminHeaderProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onExitAdmin?: () => void;
  openTicketsCount?: number;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  activeTab,
  onSelectTab,
  onExitAdmin,
  openTicketsCount = 0,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30 shadow-md">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-600/20">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-100 leading-tight">
              Google Review Autopilot
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700 font-mono font-bold">
              PLATFORM_ADMIN
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Customer Management, Revenue Intelligence & Support Desk
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <nav className="flex items-center gap-1.5 text-xs font-semibold bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => onSelectTab('tenants')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'tenants'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Customers</span>
          </button>

          <button
            onClick={() => onSelectTab('inbox')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 relative ${
              activeTab === 'inbox'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Support Inbox</span>
            {openTicketsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {openTicketsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('kb')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'kb'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Knowledge Base</span>
          </button>

          <button
            onClick={() => onSelectTab('system')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'system'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>System</span>
          </button>

          <button
            onClick={() => onSelectTab('risks')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'risks'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Risk Telemetry</span>
          </button>
        </nav>

        {onExitAdmin && (
          <button
            onClick={onExitAdmin}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to App</span>
          </button>
        )}
      </div>
    </header>
  );
};
