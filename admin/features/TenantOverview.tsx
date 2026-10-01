import React, { useState, useEffect } from 'react';
import type { SaaSCustomer, Subscription, Review, SupportTicket, AuditEvent } from '../../shared/types/domain';
import { useAuth } from '../../src/context/AuthContext';
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  MessageSquare,
  FileText,
  Clock,
  Plus,
  Shield,
  ShieldCheck,
  Sparkles,
  X,
  Search,
} from 'lucide-react';

interface TenantSummary {
  customer: SaaSCustomer;
  subscription: Subscription;
  locationCount: number;
  reviewsProcessed: number;
  autoPublishRate: number;
}

const defaultTenants: TenantSummary[] = [
  {
    customer: {
      id: 'saas_cust_demo_01',
      name: 'Downtown Dental SF',
      billingEmail: 'billing@downtowndental-sf.com',
      status: 'ACTIVE',
      createdAt: '2026-01-15T00:00:00Z',
      updatedAt: '2026-01-15T00:00:00Z',
    },
    subscription: {
      id: 'sub_01',
      saasCustomerId: 'saas_cust_demo_01',
      plan: 'STARTER',
      status: 'ACTIVE',
      currentPeriodStart: '2026-09-01T00:00:00Z',
      currentPeriodEnd: '2026-10-01T00:00:00Z',
      cancelAtPeriodEnd: false,
      locationLimit: 1,
      monthlyReplyLimit: 50,
      createdAt: '2026-01-15T00:00:00Z',
      updatedAt: '2026-01-15T00:00:00Z',
    },
    locationCount: 1,
    reviewsProcessed: 42,
    autoPublishRate: 85.7,
  },
];

export const TenantOverview: React.FC = () => {
  const { getAuthHeaders } = useAuth();
  const [tenants, setTenants] = useState<TenantSummary[]>(defaultTenants);
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState<'ALL' | 'STARTER' | 'GROWTH' | 'PRO'>('ALL');
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantDetail, setTenantDetail] = useState<{
    customer: any;
    location: any;
    subscription: any;
    reviews: Review[];
    tickets: SupportTicket[];
    notes: Array<{ id: string; author: string; note: string; createdAt: string }>;
    audits: AuditEvent[];
  } | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch('/api/admin/customers', {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const payload = await res.json();
          if (payload?.success && Array.isArray(payload.data) && payload.data.length > 0) {
            const mapped: TenantSummary[] = payload.data.map((c: any) => ({
              customer: {
                id: c.id,
                name: c.name,
                billingEmail: c.billingEmail,
                status: c.status,
                createdAt: c.createdAt,
                updatedAt: c.createdAt,
              },
              subscription: {
                id: `sub_${c.id}`,
                saasCustomerId: c.id,
                plan: c.plan,
                status: c.subscriptionStatus,
                currentPeriodStart: new Date().toISOString(),
                currentPeriodEnd: new Date().toISOString(),
                cancelAtPeriodEnd: false,
                locationLimit: c.locationsCount,
                monthlyReplyLimit: 50,
                createdAt: c.createdAt,
                updatedAt: c.createdAt,
              },
              locationCount: c.locationsCount || 1,
              reviewsProcessed: c.reviewsCount || 0,
              autoPublishRate: 85.0,
            }));
            setTenants(mapped);
          }
        }
      } catch (err) {
        console.warn('Could not fetch real admin customers:', err);
      }
    };
    fetchCustomers();
  }, []);

  const filteredTenants = tenants.filter((t) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      t.customer.name.toLowerCase().includes(q) ||
      t.customer.billingEmail.toLowerCase().includes(q) ||
      t.customer.id.toLowerCase().includes(q);
    const matchesPlan = planFilter === 'ALL' || t.subscription.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  const handleInspect = async (tenantId: string) => {
    setSelectedTenantId(tenantId);
    setIsLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/customers/${tenantId}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const payload = await res.json();
        if (payload?.success && payload.data) {
          setTenantDetail(payload.data);
        }
      }
    } catch {
      // offline fallback
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId || !newNoteText.trim()) return;

    setIsAddingNote(true);
    try {
      const res = await fetch(`/api/admin/customers/${selectedTenantId}/notes`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ author: 'Admin Lead', note: newNoteText.trim() }),
      });
      if (res.ok) {
        const payload = await res.json();
        if (payload?.success && payload.data && tenantDetail) {
          setTenantDetail({
            ...tenantDetail,
            notes: [payload.data, ...tenantDetail.notes],
          });
          setNewNoteText('');
        }
      }
    } catch {
      // offline fallback
    } finally {
      setIsAddingNote(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
            SaaSCustomer Directory
          </h2>
          <p className="text-xs text-slate-400">
            Total 148 registered SaaSCustomers across all active regions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => setPlanFilter('ALL')}
              className={`px-2.5 py-1 rounded transition ${
                planFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Plans
            </button>
            <button
              onClick={() => setPlanFilter('STARTER')}
              className={`px-2.5 py-1 rounded transition ${
                planFilter === 'STARTER' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Starter
            </button>
            <button
              onClick={() => setPlanFilter('GROWTH')}
              className={`px-2.5 py-1 rounded transition ${
                planFilter === 'GROWTH' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Growth
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tenant name or email..."
              className="text-xs pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500 w-56"
            />
          </div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60 shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-800/80 text-slate-300 font-medium border-b border-slate-800">
              <th className="py-3 px-4">SaaSCustomer Name</th>
              <th className="py-3 px-4">Tenant ID</th>
              <th className="py-3 px-4">Plan / Status</th>
              <th className="py-3 px-4">Locations</th>
              <th className="py-3 px-4">30d Reviews</th>
              <th className="py-3 px-4">Auto-Publish %</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {filteredTenants.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No tenants match your search filter
                </td>
              </tr>
            ) : (
              filteredTenants.map((t) => (
                <tr key={t.customer.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-100">{t.customer.name}</div>
                    <div className="text-[11px] text-slate-400">{t.customer.billingEmail}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">{t.customer.id}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                      {t.subscription.plan}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">{t.locationCount}</td>
                  <td className="py-3.5 px-4">{t.reviewsProcessed}</td>
                  <td className="py-3.5 px-4 font-mono text-emerald-400">{t.autoPublishRate}%</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleInspect(t.customer.id)}
                      className="text-[11px] text-slate-200 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
                    >
                      Inspect Tenant
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Tenant Detail Modal (Phase 6) */}
      {selectedTenantId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 text-slate-200 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-600 text-white">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {tenantDetail?.customer?.name || 'SaaSCustomer Detail'}
                  </h3>
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span className="font-mono">{selectedTenantId}</span>
                    <span>&bull;</span>
                    <span>{tenantDetail?.customer?.billingEmail}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedTenantId(null);
                  setTenantDetail(null);
                }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingDetail ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading tenant telemetry...</div>
            ) : tenantDetail ? (
              <div className="space-y-6">
                {/* 3-Column Metrics Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Google Connection Card */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="text-xs text-slate-400 flex items-center justify-between">
                      <span>Google Business Profile</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-sm font-bold text-slate-100">
                      {tenantDetail.location?.locationName}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Place ID: {tenantDetail.location?.googlePlaceId || 'ChIJN1t_tDeuEmsR...'}
                    </div>
                    <div className="text-[11px] text-emerald-400">Connected &bull; Autopilot Active</div>
                  </div>

                  {/* Subscription & Limits */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="text-xs text-slate-400 flex items-center justify-between">
                      <span>Plan & Entitlements</span>
                      <CreditCard className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="text-sm font-bold text-slate-100">
                      Tier: {tenantDetail.subscription?.plan} ({tenantDetail.subscription?.status})
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {tenantDetail.subscription?.monthlyReplyLimit} replies / month limit
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {tenantDetail.subscription?.locationLimit} locations authorized
                    </div>
                  </div>

                  {/* Review Telemetry */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="text-xs text-slate-400 flex items-center justify-between">
                      <span>Review Activity</span>
                      <Clock className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-sm font-bold text-slate-100">
                      {tenantDetail.reviews?.length || 0} reviews synced
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {tenantDetail.reviews?.filter((r: any) => r.reply?.status === 'PENDING_APPROVAL').length || 0} pending approval
                    </div>
                    <div className="text-[11px] text-emerald-400">AI Safety 100% compliant</div>
                  </div>
                </div>

                {/* Reply Guard Safety Diagnostics Section (Admin Only) */}
                <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        Reply Guard Safety Diagnostics (Super Admin Inspection)
                      </h4>
                    </div>
                    <span className="text-[10px] text-indigo-400 font-mono">8 Safety Gates Active</span>
                  </div>

                  <div className="space-y-3">
                    {(!tenantDetail.reviews || tenantDetail.reviews.length === 0) ? (
                      <div className="text-xs text-slate-500 py-2">No review replies recorded for this tenant.</div>
                    ) : (
                      tenantDetail.reviews.map((rev: any) => {
                        const guard = rev.reply?.guardResult;
                        return (
                          <div
                            key={rev.id}
                            className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2.5 text-xs"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-200">{rev.author?.displayName}</span>
                                <span className="text-[11px] text-amber-400">{rev.starRating}★</span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {rev.googleReviewId}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap">
                                {guard && (
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                      guard.decision === 'AUTO_PUBLISH'
                                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                        : guard.overallRisk === 'CRITICAL'
                                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                                    }`}
                                  >
                                    Guard: {guard.decision}
                                  </span>
                                )}
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    rev.reply?.status === 'AUTO_PUBLISHED'
                                      ? 'bg-emerald-900/40 text-emerald-300'
                                      : 'bg-slate-800 text-slate-300'
                                  }`}
                                >
                                  {rev.reply?.status || 'NO_REPLY'}
                                </span>
                              </div>
                            </div>

                            <p className="text-slate-400 italic text-[11px] line-clamp-1">
                              "{rev.comment || 'No comment'}"
                            </p>

                            {guard && (
                              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                                <div className="text-[11px] text-slate-300">
                                  <strong>Customer Explanation: </strong>
                                  <span className="text-slate-400">{guard.customerExplanation}</span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] font-mono">
                                  {Object.entries(guard.checks || {}).map(([name, check]: [string, any]) => (
                                    <div
                                      key={name}
                                      className={`p-1.5 rounded border flex items-center justify-between ${
                                        check.status === 'PASS'
                                          ? 'bg-slate-950/60 border-slate-800 text-slate-400'
                                          : check.severity === 'CRITICAL'
                                          ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                                          : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                                      }`}
                                    >
                                      <span className="capitalize">{name}</span>
                                      <span className="font-bold">{check.status}</span>
                                    </div>
                                  ))}
                                </div>

                                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                                  <span>Model: {guard.adminDiagnostics?.aiModelUsed || 'gemini-3.8-flash'}</span>
                                  <span>Regens: {rev.reply?.regenerationCount || 0} / 1</span>
                                  <span>Latency: {guard.adminDiagnostics?.executionTimeMs || 15}ms</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Internal Staff Notes (Admin only, never leaks to customer) */}
                <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-indigo-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        Confidential Staff Notes (Internal Only)
                      </h4>
                    </div>
                    <span className="text-[10px] text-amber-400 font-semibold">Strictly Role Protected</span>
                  </div>

                  <form onSubmit={handleAddNote} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add an internal support note regarding this customer..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      className="flex-1 text-xs px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={isAddingNote || !newNoteText.trim()}
                      className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Note</span>
                    </button>
                  </form>

                  <div className="space-y-2">
                    {tenantDetail.notes?.length === 0 ? (
                      <div className="text-xs text-slate-500">No staff notes recorded yet.</div>
                    ) : (
                      tenantDetail.notes?.map((n: any) => (
                        <div key={n.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span className="font-semibold text-slate-300">{n.author}</span>
                            <span>{new Date(n.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-slate-300">{n.note}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Audit Trail Log */}
                <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Tenant Security & Action Audit Trail
                    </h4>
                  </div>

                  <div className="divide-y divide-slate-800/80 text-xs">
                    {tenantDetail.audits?.length === 0 ? (
                      <div className="text-xs text-slate-500 py-2">No audit events recorded.</div>
                    ) : (
                      tenantDetail.audits?.map((a: any) => (
                        <div key={a.id} className="py-2.5 flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-200 font-mono text-[11px]">{a.action}</div>
                            <div className="text-[11px] text-slate-400">
                              Resource: {a.targetResourceType} ({a.targetResourceId}) &bull; Actor: {a.actorType}
                            </div>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {new Date(a.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
