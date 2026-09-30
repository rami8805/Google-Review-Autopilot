import React, { useState, useEffect } from 'react';
import type { CustomerOverviewDetail } from '../../shared/types/domain';
import {
  X,
  Building,
  MapPin,
  CreditCard,
  BarChart2,
  MessageSquare,
  History,
  FileText,
  AlertTriangle,
  CheckCircle,
  Eye,
  Trash2,
  Plus,
  Shield,
  ExternalLink,
} from 'lucide-react';

interface CustomerDetailModalProps {
  customerId: string;
  onClose: () => void;
  onViewAsCustomer: (customerId: string) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customerId,
  onClose,
  onViewAsCustomer,
}) => {
  const [detail, setDetail] = useState<CustomerOverviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [newNoteText, setNewNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<
    'overview' | 'locations' | 'subscription' | 'usage' | 'reviews' | 'support' | 'audit' | 'notes'
  >('overview');

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        headers: { 'x-user-role': 'PLATFORM_ADMIN' },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setDetail(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch customer detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [customerId]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    try {
      setAddingNote(true);
      const res = await fetch(`/api/admin/customers/${customerId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'PLATFORM_ADMIN',
          'x-user-name': 'Platform Admin',
          'x-user-id': 'admin_usr_01',
        },
        body: JSON.stringify({ note: newNoteText.trim() }),
      });

      if (res.ok) {
        setNewNoteText('');
        fetchDetail();
      }
    } catch (err) {
      console.error('Failed to add customer note:', err);
    } finally {
      setAddingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this internal customer note?')) return;
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': 'PLATFORM_ADMIN',
          'x-user-id': 'admin_usr_01',
        },
      });
      if (res.ok) {
        fetchDetail();
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center text-slate-300">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sm">Loading tenant telemetry & customer data...</p>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full text-center text-slate-300">
          <p className="text-sm text-rose-400">Customer record not found.</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg text-white"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const { customer, business, locations, subscription, mrr, usage, recentReviews, supportTickets, auditEvents, notes, stats } = detail;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">{customer.name}</h3>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  {customer.id}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    customer.status === 'ACTIVE'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                  }`}
                >
                  {customer.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">{customer.billingEmail} &bull; Joined {new Date(customer.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onViewAsCustomer(customer.id)}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition"
              title="Audit-logged read-only tenant view"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View as Customer (Read-Only)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-tabs bar */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 gap-2 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`py-2.5 px-3 border-b-2 transition whitespace-nowrap ${
              activeSubTab === 'overview'
                ? 'border-indigo-500 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Customer & Biz
          </button>
          <button
            onClick={() => setActiveSubTab('locations')}
            className={`py-2.5 px-3 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === 'locations'
                ? 'border-indigo-500 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            3. Google Locations ({locations.length})
            {stats.hasConnectionFailure && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('subscription')}
            className={`py-2.5 px-3 border-b-2 transition whitespace-nowrap ${
              activeSubTab === 'subscription'
                ? 'border-indigo-500 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            4. Subscription (${mrr}/mo)
          </button>
          <button
            onClick={() => setActiveSubTab('usage')}
            className={`py-2.5 px-3 border-b-2 transition whitespace-nowrap ${
              activeSubTab === 'usage'
                ? 'border-indigo-500 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            5. Usage & Quotas
          </button>
          <button
            onClick={() => setActiveSubTab('reviews')}
            className={`py-2.5 px-3 border-b-2 transition whitespace-nowrap ${
              activeSubTab === 'reviews'
                ? 'border-indigo-500 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            6. Review Activity
          </button>
          <button
            onClick={() => setActiveSubTab('support')}
            className={`py-2.5 px-3 border-b-2 transition whitespace-nowrap ${
              activeSubTab === 'support'
                ? 'border-indigo-500 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            7. Support History ({supportTickets.length})
          </button>
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`py-2.5 px-3 border-b-2 transition whitespace-nowrap ${
              activeSubTab === 'audit'
                ? 'border-indigo-500 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            8. Audit Events ({auditEvents.length})
          </button>
          <button
            onClick={() => setActiveSubTab('notes')}
            className={`py-2.5 px-3 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === 'notes'
                ? 'border-indigo-500 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            9. Private Notes ({notes.length})
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 font-semibold">
              Admin Only
            </span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* SubTab 1: Overview (Customer & Business) */}
          {activeSubTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="font-semibold text-slate-100 flex items-center gap-2 text-sm">
                  <Building className="w-4 h-4 text-indigo-400" />
                  SaaSCustomer Account
                </h4>
                <div className="space-y-2 text-slate-300">
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Account ID:</span>
                    <span className="font-mono text-slate-200">{customer.id}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Commercial Name:</span>
                    <span className="font-medium text-slate-100">{customer.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Billing Email:</span>
                    <span>{customer.billingEmail}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Status:</span>
                    <span className="text-emerald-400 font-bold">{customer.status}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Account Created:</span>
                    <span>{new Date(customer.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="font-semibold text-slate-100 flex items-center gap-2 text-sm">
                  <Building className="w-4 h-4 text-indigo-400" />
                  Operating Brand / Business
                </h4>
                {business ? (
                  <div className="space-y-2 text-slate-300">
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Business Name:</span>
                      <span className="font-medium text-slate-100">{business.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Industry:</span>
                      <span>{business.industryCategory || 'General Commercial'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Website:</span>
                      {business.websiteUrl ? (
                        <a
                          href={business.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          {business.websiteUrl} <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-500">None specified</span>
                      )}
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Locations Connected:</span>
                      <span className="font-bold text-slate-100">{locations.length} Location(s)</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400">No commercial business profile linked yet.</p>
                )}
              </div>
            </div>
          )}

          {/* SubTab 3: Google Locations */}
          {activeSubTab === 'locations' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-slate-100 text-sm">Google Business Profile Locations</h4>
                <span className="text-slate-400">{locations.length} location(s) provisioned</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {locations.map((loc) => (
                  <div
                    key={loc.id}
                    className={`p-4 rounded-xl border ${
                      loc.isConnected
                        ? 'bg-slate-950/60 border-slate-800'
                        : 'bg-rose-950/20 border-rose-800/60'
                    } space-y-2`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-slate-100">{loc.locationName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{loc.googleLocationId}</div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          loc.isConnected
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {loc.isConnected ? 'Connected' : 'Token Expired / Disconnected'}
                      </span>
                    </div>

                    <div className="flex items-start gap-1.5 text-slate-400 text-[11px] mt-2">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-500 mt-0.5" />
                      <span>
                        {loc.address.addressLines.join(', ')}, {loc.address.locality},{' '}
                        {loc.address.administrativeArea} {loc.address.postalCode}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex justify-between text-[11px] text-slate-400">
                      <span>Google Place ID:</span>
                      <span className="font-mono text-slate-300">{loc.googlePlaceId || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Automation Status:</span>
                      <span className={loc.automationEnabled ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                        {loc.automationEnabled ? 'Auto-Publish Active' : 'Manual Approval Only'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SubTab 4: Subscription & Revenue */}
          {activeSubTab === 'subscription' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="font-semibold text-slate-100 flex items-center gap-2 text-sm">
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                  Subscription Plan & Status
                </h4>
                {subscription ? (
                  <div className="space-y-2 text-slate-300">
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Current Plan:</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                        {subscription.plan}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Subscription Status:</span>
                      <span className="font-semibold text-emerald-400">{subscription.status}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Billing Period:</span>
                      <span>
                        {new Date(subscription.currentPeriodStart).toLocaleDateString()} &rarr;{' '}
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Next Renewal Date:</span>
                      <span className="font-medium text-slate-100">
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Auto-Renewing:</span>
                      <span className={subscription.cancelAtPeriodEnd ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                        {subscription.cancelAtPeriodEnd ? 'Cancels at period end' : 'Active (Renews Automatically)'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400">No active billing subscription.</p>
                )}
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="font-semibold text-slate-100 flex items-center gap-2 text-sm">
                  <BarChart2 className="w-4 h-4 text-emerald-400" />
                  Revenue & MRR Contribution
                </h4>
                <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 text-center">
                  <div className="text-slate-400 text-xs">Current Monthly Recurring Revenue (MRR)</div>
                  <div className="text-3xl font-extrabold text-emerald-400 mt-1">${mrr} / mo</div>
                  <div className="text-[11px] text-slate-500 mt-1">Tier: {subscription?.plan || 'STARTER'}</div>
                </div>
                <p className="text-[11px] text-slate-400 italic">
                  * MRR reflects standard pricing: Starter $49, Growth $99, Pro $199, Enterprise $499.
                </p>
              </div>
            </div>
          )}

          {/* SubTab 5: Usage */}
          {activeSubTab === 'usage' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                <div className="text-slate-400 text-xs">Monthly Reply Limit</div>
                <div className="text-2xl font-bold text-slate-100 mt-1">{usage.monthlyReplyLimit}</div>
                <div className="text-[11px] text-slate-500 mt-1">Allocated by {subscription?.plan} plan</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                <div className="text-slate-400 text-xs">Processed Reviews (30d)</div>
                <div className="text-2xl font-bold text-indigo-400 mt-1">{usage.reviewsProcessedThisMonth}</div>
                <div className="text-[11px] text-slate-500 mt-1">Ingested via Google API</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                <div className="text-slate-400 text-xs">Auto-Publish Rate</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">{usage.autoPublishRate}%</div>
                <div className="text-[11px] text-slate-500 mt-1">Safe positive reviews auto-published</div>
              </div>
            </div>
          )}

          {/* SubTab 6: Review Activity */}
          {activeSubTab === 'reviews' && (
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-100 text-sm">Recent Review Ingestion & Safety Intercepts</h4>
              {recentReviews.length === 0 ? (
                <p className="text-slate-400">No review activity recorded for this tenant yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentReviews.map((rev) => (
                    <div key={rev.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="font-semibold text-slate-200">
                          {rev.author.displayName} &bull; {rev.starRating} Stars
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            rev.riskAssessment?.riskLevel === 'LOW'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}
                        >
                          Risk: {rev.riskAssessment?.riskLevel || 'UNKNOWN'}
                        </span>
                      </div>
                      <p className="text-slate-300 italic text-[11px]">"{rev.comment || 'No comment provided'}"</p>
                      {rev.riskAssessment?.explanation && (
                        <p className="text-[10px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800">
                          Shield Analysis: {rev.riskAssessment.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SubTab 7: Support History */}
          {activeSubTab === 'support' && (
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-100 text-sm">Support Tickets Logged by this Customer</h4>
              {supportTickets.length === 0 ? (
                <p className="text-slate-400">No support tickets opened by this customer.</p>
              ) : (
                <div className="space-y-2">
                  {supportTickets.map((t) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex justify-between items-center"
                    >
                      <div>
                        <div className="font-semibold text-slate-100 flex items-center gap-2">
                          <span>{t.subject}</span>
                          <span className="font-mono text-[10px] text-slate-500">#{t.id}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Category: {t.category} &bull; Created: {new Date(t.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                          {t.priority}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                          {t.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SubTab 8: Audit Events */}
          {activeSubTab === 'audit' && (
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-100 text-sm">Security & Operational Audit Trail</h4>
              {auditEvents.length === 0 ? (
                <p className="text-slate-400">No audit events recorded for this customer.</p>
              ) : (
                <div className="space-y-2">
                  {auditEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex justify-between items-center text-[11px]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-indigo-400 font-bold">{evt.action}</span>
                        <span className="text-slate-400">on {evt.targetResourceType} ({evt.targetResourceId})</span>
                      </div>
                      <div className="text-slate-500">
                        {new Date(evt.timestamp).toLocaleString()} by {evt.actorType}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SubTab 9: Private Admin Notes */}
          {activeSubTab === 'notes' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl text-amber-200 text-xs flex items-center gap-2">
                <Shield className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  <strong>Strict Internal Confidentiality:</strong> These notes are stored exclusively for platform administrators and customer support staff. They are never rendered or transmitted to the SaaSCustomer.
                </span>
              </div>

              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="space-y-2">
                <label className="block text-slate-300 font-semibold text-xs">Add New Internal Note</label>
                <textarea
                  rows={3}
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Record internal customer relationship facts, special handling requests, or history..."
                  className="w-full text-xs p-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={addingNote || !newNoteText.trim()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{addingNote ? 'Saving...' : 'Add Private Note'}</span>
                  </button>
                </div>
              </form>

              {/* Notes List */}
              <div className="space-y-2 pt-2">
                <h5 className="font-semibold text-slate-300 text-xs">Recorded Notes ({notes.length})</h5>
                {notes.length === 0 ? (
                  <p className="text-slate-500 italic">No internal notes added for this customer yet.</p>
                ) : (
                  notes.map((n) => (
                    <div
                      key={n.id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-start gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span className="font-semibold text-indigo-400">{n.authorAdminName}</span>
                          <span>&bull;</span>
                          <span>{new Date(n.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-200 whitespace-pre-line text-xs">{n.note}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteNote(n.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition"
                        title="Delete note"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
