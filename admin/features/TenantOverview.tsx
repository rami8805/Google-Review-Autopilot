import React, { useState, useEffect } from 'react';
import { CustomerDetailModal } from './CustomerDetailModal';
import {
  Search,
  Filter,
  ArrowUpDown,
  Building,
  CheckCircle,
  AlertTriangle,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface TenantOverviewProps {
  onViewAsCustomer: (customerId: string) => void;
}

export const TenantOverview: React.FC<TenantOverviewProps> = ({ onViewAsCustomer }) => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [connectionFilter, setConnectionFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'mrr' | 'reviews' | 'lastActivity' | 'name' | 'createdAt'>('mrr');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search,
        plan: planFilter,
        status: statusFilter,
        connectionStatus: connectionFilter,
        sortBy,
        sortOrder,
      });

      const res = await fetch(`/api/admin/customers?${params.toString()}`, {
        headers: { 'x-user-role': 'PLATFORM_ADMIN' },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setCustomers(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to load customers directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, planFilter, statusFilter, connectionFilter, sortBy, sortOrder]);

  const toggleSort = (field: 'mrr' | 'reviews' | 'lastActivity' | 'name' | 'createdAt') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Title & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-400" />
            SaaSCustomer Commercial Directory
          </h2>
          <p className="text-xs text-slate-400">
            Active paying business tenants, Google location links, monthly subscription revenue & health
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenant name, email, or ID..."
            className="text-xs pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-72"
          />
        </div>
      </div>

      {/* Filter and Sorting Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Plan Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Plan:</span>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Plans</option>
              <option value="STARTER">Starter ($49/mo)</option>
              <option value="GROWTH">Growth ($99/mo)</option>
              <option value="PRO">Pro ($199/mo)</option>
              <option value="ENTERPRISE">Enterprise ($499/mo)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="TRIALING">Trialing</option>
              <option value="PAST_DUE">Past Due</option>
              <option value="CANCELED">Cancelled</option>
            </select>
          </div>

          {/* Google Connection Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Google Sync:</span>
            <select
              value={connectionFilter}
              onChange={(e) => setConnectionFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Connections</option>
              <option value="HEALTHY">Healthy Sync</option>
              <option value="FAILED">Sync Disrupted / Expired</option>
            </select>
          </div>
        </div>

        {/* Sort indicator */}
        <div className="text-slate-400 text-[11px] flex items-center gap-1">
          <span>Sorted by: <strong>{sortBy.toUpperCase()}</strong> ({sortOrder})</span>
        </div>
      </div>

      {/* Customer Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60 shadow-lg">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-2" />
            Loading customer accounts...
          </div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No SaaSCustomers match the selected search or filter criteria.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-800/80 text-slate-300 font-semibold border-b border-slate-800 text-[11px] uppercase tracking-wider">
                <th
                  onClick={() => toggleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Customer</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3 px-4">Business</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Google Locations</th>
                <th
                  onClick={() => toggleSort('reviews')}
                  className="py-3 px-4 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Reviews Handled</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('lastActivity')}
                  className="py-3 px-4 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Last Activity</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('mrr')}
                  className="py-3 px-4 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>MRR</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {customers.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                  className="hover:bg-slate-800/40 transition cursor-pointer"
                >
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-100">{c.name}</div>
                    <div className="text-[11px] text-slate-400">{c.billingEmail}</div>
                    <div className="font-mono text-[10px] text-slate-500 mt-0.5">{c.id}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-slate-200 font-medium">{c.businessName}</div>
                    <div className="text-[11px] text-slate-500">{c.industryCategory}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                      {c.plan}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.subscriptionStatus === 'ACTIVE'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : c.subscriptionStatus === 'TRIALING'
                          ? 'bg-blue-950 text-blue-400 border border-blue-800'
                          : c.subscriptionStatus === 'PAST_DUE'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {c.subscriptionStatus}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-slate-200">{c.locationsCount}</span>
                      {c.hasConnectionFailure ? (
                        <span className="flex items-center text-[10px] text-rose-400 gap-0.5 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/60">
                          <AlertTriangle className="w-3 h-3" /> Sync Failed
                        </span>
                      ) : (
                        <span className="flex items-center text-[10px] text-emerald-400 gap-0.5 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
                          <CheckCircle className="w-3 h-3" /> Connected
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-200 font-semibold">
                    {c.reviewsHandled}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                    {new Date(c.lastActivity).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-emerald-400 font-mono text-xs">
                      ${c.mrr}/mo
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewAsCustomer(c.id);
                        }}
                        className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-medium flex items-center gap-1 transition"
                        title="Audit-logged read-only view"
                      >
                        <Eye className="w-3 h-3" />
                        <span className="hidden sm:inline">View as</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomerId(c.id);
                        }}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white text-[11px] font-medium transition"
                      >
                        Inspect
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Customer Detail Inspection Modal */}
      {selectedCustomerId && (
        <CustomerDetailModal
          customerId={selectedCustomerId}
          onClose={() => setSelectedCustomerId(null)}
          onViewAsCustomer={onViewAsCustomer}
        />
      )}
    </div>
  );
};
