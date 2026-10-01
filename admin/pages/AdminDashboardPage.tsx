import React, { useState, useEffect } from 'react';
import { AdminHeader } from '../components/AdminHeader';
import { TenantOverview } from '../features/TenantOverview';
import { AdminSupportDesk } from '../features/AdminSupportDesk';
import { Activity, ShieldAlert, Cpu, CheckCircle } from 'lucide-react';
import { useAuth } from '../../src/context/AuthContext';

export const AdminDashboardPage: React.FC = () => {
  const { getAuthHeaders } = useAuth();
  const [activeTab, setActiveTab] = useState('tenants');
  const [metrics, setMetrics] = useState<{
    totalSaaSCustomers: number;
    activeSubscribers: number;
    totalLocationsManaged: number;
    reviewsProcessedLast30Days: number;
    autoPublishedPercentage: number;
    approvalQueueCount: number;
    criticalRisksDetected: number;
  }>({
    totalSaaSCustomers: 1,
    activeSubscribers: 1,
    totalLocationsManaged: 1,
    reviewsProcessedLast30Days: 0,
    autoPublishedPercentage: 100,
    approvalQueueCount: 0,
    criticalRisksDetected: 0,
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/admin/metrics', {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const payload = await res.json();
          if (payload?.success && payload.data) {
            setMetrics(payload.data);
          }
        }
      } catch (err) {
        console.warn('Could not fetch admin metrics:', err);
      }
    };
    fetchMetrics();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <AdminHeader activeTab={activeTab} onSelectTab={setActiveTab} />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Top metrics bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Active SaaSCustomers</span>
              <Activity className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-100">{metrics.totalSaaSCustomers}</div>
            <div className="mt-1 text-[11px] text-emerald-400">{metrics.activeSubscribers} Active Subscribers</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Managed Locations</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-100">{metrics.totalLocationsManaged}</div>
            <div className="mt-1 text-[11px] text-slate-400">Google Business Profiles</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Auto-Publish Rate</span>
              <Cpu className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-100">{metrics.autoPublishedPercentage}%</div>
            <div className="mt-1 text-[11px] text-slate-400">{metrics.reviewsProcessedLast30Days} reviews processed</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Critical Risk Reviews</span>
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-100">{metrics.criticalRisksDetected}</div>
            <div className="mt-1 text-[11px] text-amber-400">{metrics.approvalQueueCount} in approval queue</div>
          </div>
        </div>

        {activeTab === 'tenants' && <TenantOverview />}

        {activeTab === 'support' && <AdminSupportDesk />}

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
