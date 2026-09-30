import React, { useState } from 'react';
import { AdminHeader } from '../components/AdminHeader';
import { TenantOverview } from '../features/TenantOverview';
import { Activity, ShieldAlert, Cpu, CheckCircle } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('tenants');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <AdminHeader activeTab={activeTab} onSelectTab={setActiveTab} />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Top metrics bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Active SaaSCustomers</span>
              <Activity className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-100">142</div>
            <div className="mt-1 text-[11px] text-emerald-400">+12% this month</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Google API Sync Status</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-100">Healthy</div>
            <div className="mt-1 text-[11px] text-slate-400">99.98% webhook delivery</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Gemini AI Safety Rate</span>
              <Cpu className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-100">100%</div>
            <div className="mt-1 text-[11px] text-slate-400">0 unauthorized commitments</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Critical Risk Reviews</span>
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-100">12</div>
            <div className="mt-1 text-[11px] text-amber-400">All locked to manual approval</div>
          </div>
        </div>

        {activeTab === 'tenants' && <TenantOverview />}

        {activeTab === 'system' && (
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">Worker Jobs & Scheduled Syncs</h3>
            <p className="text-xs text-slate-400">
              The Google Review Ingestion Worker runs every 10 minutes. Auto-publish grace period evaluation worker runs every 1 minute.
            </p>
            <div className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-xs text-slate-300">
              [CRON] 07:38:00 - Evaluated 24 pending replies; auto-published 3; staged 21 for manual approval.
            </div>
          </div>
        )}

        {activeTab === 'risks' && (
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">Risk Assessment Telemetry</h3>
            <p className="text-xs text-slate-400">
              Cross-tenant detection of legal threats, safety emergencies, or prompt injection attacks in public reviews.
            </p>
            <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded text-xs text-rose-200">
              Risk Rule Enforcement is active. All reviews flagged HIGH or CRITICAL are strictly intercepted and barred from auto-publishing.
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
