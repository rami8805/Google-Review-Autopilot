import React, { useState, useEffect } from 'react';
import { AdminHeader } from '../components/AdminHeader';
import { TenantOverview } from '../features/TenantOverview';
import { AdminSupportInbox } from '../features/AdminSupportInbox';
import { AdminKnowledgeBase } from '../features/AdminKnowledgeBase';
import type { PlatformMetrics } from '../../shared/types/domain';
import {
  Users,
  DollarSign,
  UserCheck,
  Clock,
  UserX,
  AlertCircle,
  Inbox,
  Flame,
  Unplug,
  Sparkles,
  Database,
  ShieldAlert,
} from 'lucide-react';

interface AdminDashboardPageProps {
  onExitAdmin?: () => void;
  onViewAsCustomer?: (customerId: string) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  onExitAdmin,
  onViewAsCustomer,
}) => {
  const [activeTab, setActiveTab] = useState('tenants');
  const [metrics, setMetrics] = useState<PlatformMetrics>({
    totalCustomers: 6,
    activeCustomers: 4,
    trialCustomers: 1,
    cancelledCustomers: 1,
    pastDueCustomers: 1,
    mrr: 396,
    newCustomers30d: 2,
    openSupportTickets: 2,
    highRiskSupportTickets: 1,
    googleConnectionFailures: 1,
  });
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const fetchMetrics = async () => {
    try {
      setLoadingMetrics(true);
      const res = await fetch('/api/admin/metrics', {
        headers: { 'x-user-role': 'PLATFORM_ADMIN' },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setMetrics(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch platform metrics:', err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [activeTab]);

  const handleViewAsCustomer = (customerId: string) => {
    if (onViewAsCustomer) {
      onViewAsCustomer(customerId);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AdminHeader
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onExitAdmin={onExitAdmin}
        openTicketsCount={metrics.openSupportTickets}
      />

      <main className="max-w-7xl w-full mx-auto px-6 py-8 space-y-8 flex-1">
        {/* Top 10 Admin Metrics Grid */}
        <section className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-slate-300">
              Platform & Customer Vital Signs
            </span>
            <span>Real-time aggregation across all active SaaSCustomers</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
            {/* 1. Total Customers */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Total Customers</span>
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-slate-100">{metrics.totalCustomers}</div>
              <div className="text-[10px] text-slate-500 mt-1">Paying commercial tenants</div>
            </div>

            {/* 2. Active Customers */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Active Customers</span>
                <UserCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-emerald-400">{metrics.activeCustomers}</div>
              <div className="text-[10px] text-emerald-500/80 mt-1">Active subscriptions</div>
            </div>

            {/* 3. Trial Customers */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Trial Customers</span>
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-blue-400">{metrics.trialCustomers}</div>
              <div className="text-[10px] text-slate-500 mt-1">14-day free trial</div>
            </div>

            {/* 4. Cancelled Customers */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Cancelled</span>
                <UserX className="w-4 h-4 text-slate-500" />
              </div>
              <div className="mt-2 text-2xl font-black text-slate-400">{metrics.cancelledCustomers}</div>
              <div className="text-[10px] text-slate-500 mt-1">Churned accounts</div>
            </div>

            {/* 5. Past Due Customers */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Past Due</span>
                <AlertCircle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-amber-400">{metrics.pastDueCustomers}</div>
              <div className="text-[10px] text-amber-400/80 mt-1">Payment retry in progress</div>
            </div>

            {/* 6. MRR */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Current MRR</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-emerald-400">${metrics.mrr}</div>
              <div className="text-[10px] text-emerald-400/80 mt-1">Monthly Recurring Rev</div>
            </div>

            {/* 7. New Customers (30d) */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>New Customers</span>
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-purple-400">+{metrics.newCustomers30d}</div>
              <div className="text-[10px] text-purple-400/80 mt-1">Acquired last 30 days</div>
            </div>

            {/* 8. Open Support Tickets */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Open Tickets</span>
                <Inbox className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-indigo-400">{metrics.openSupportTickets}</div>
              <div className="text-[10px] text-slate-500 mt-1">Customer inquiries</div>
            </div>

            {/* 9. High-Risk Support Tickets */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>High-Risk Tickets</span>
                <Flame className="w-4 h-4 text-rose-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-rose-400">{metrics.highRiskSupportTickets}</div>
              <div className="text-[10px] text-rose-400/80 mt-1">Urgent SLA escalations</div>
            </div>

            {/* 10. Google Connection Failures */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Google Failures</span>
                <Unplug className="w-4 h-4 text-rose-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-rose-400">{metrics.googleConnectionFailures}</div>
              <div className="text-[10px] text-rose-400/80 mt-1">Token expired or revoked</div>
            </div>
          </div>
        </section>

        {/* Tab Views */}
        {activeTab === 'tenants' && <TenantOverview onViewAsCustomer={handleViewAsCustomer} />}

        {activeTab === 'inbox' && <AdminSupportInbox />}

        {activeTab === 'kb' && <AdminKnowledgeBase />}

        {activeTab === 'system' && (
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-100">Scheduled Workers & Health Monitors</h3>
            </div>
            <p className="text-xs text-slate-400">
              The Google Review Ingestion Worker executes every 10 minutes. Auto-publish grace period evaluation worker runs every 1 minute.
            </p>
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-1.5">
              <div className="text-emerald-400">[CRON] 08:00:00 - Google Review Ingestion Worker: 6 locations scanned; 0 API rate limits hit.</div>
              <div className="text-slate-400">[CRON] 08:01:00 - Grace Period Scheduler: 1 reply auto-published for Downtown Dental (loc_001).</div>
              <div className="text-amber-400">[WARN] 08:02:15 - North Bay Veterinary (loc_004): Google OAuth refresh token invalid. Flagged in admin metrics.</div>
            </div>
          </div>
        )}

        {activeTab === 'risks' && (
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-slate-100">Cross-Tenant AI Risk Intercept Telemetry</h3>
            </div>
            <p className="text-xs text-slate-400">
              Deterministic pre-generation guards and Gemini risk classification monitor public reviews for legal threats, safety issues, compensation demands, and prompt injections.
            </p>
            <div className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-xl text-xs text-amber-200 space-y-2">
              <div className="font-semibold text-amber-300">Active Enforcement Protocol:</div>
              <p>
                All reviews classified with HIGH or CRITICAL risk are permanently barred from auto-publishing and queued for manual inspection by the SaaSCustomer.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
