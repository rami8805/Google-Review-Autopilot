import React from 'react';
import { ShieldCheck, Database, Users, AlertTriangle, LifeBuoy, Building2 } from 'lucide-react';

export const AdminHeader: React.FC<{ activeTab: string; onSelectTab: (tab: string) => void }> = ({
  activeTab,
  onSelectTab,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-600 rounded-lg text-white">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-semibold leading-tight flex items-center gap-2">
            Google Review Autopilot <span className="text-xs px-2 py-0.5 rounded bg-indigo-900 text-indigo-300 font-mono">SUPER_ADMIN</span>
          </h1>
          <p className="text-xs text-slate-400">Platform Management, Multi-Tenant Oversight &amp; GBP Operations</p>
        </div>
      </div>

      <nav className="flex items-center gap-2 text-xs font-medium">
        <button
          onClick={() => onSelectTab('tenants')}
          className={`px-3 py-1.5 rounded transition ${
            activeTab === 'tenants' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Tenants</span>
        </button>
        <button
          onClick={() => onSelectTab('google')}
          className={`px-3 py-1.5 rounded transition ${
            activeTab === 'google' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-blue-400" /> Google Integration</span>
        </button>
        <button
          onClick={() => onSelectTab('support')}
          className={`px-3 py-1.5 rounded transition ${
            activeTab === 'support' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-1.5"><LifeBuoy className="w-3.5 h-3.5" /> Support Desk</span>
        </button>
        <button
          onClick={() => onSelectTab('system')}
          className={`px-3 py-1.5 rounded transition ${
            activeTab === 'system' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5" /> System Health</span>
        </button>
        <button
          onClick={() => onSelectTab('risks')}
          className={`px-3 py-1.5 rounded transition ${
            activeTab === 'risks' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Risk Telemetry</span>
        </button>
      </nav>
    </header>
  );
};
