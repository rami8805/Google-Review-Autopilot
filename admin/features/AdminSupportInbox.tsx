import React, { useState, useEffect } from 'react';
import type { SupportTicket, TicketCategory } from '../../shared/types/domain';
import { AdminTicketDetailModal } from './AdminTicketDetailModal';
import {
  Inbox,
  Filter,
  Search,
  MessageSquare,
  AlertCircle,
  Clock,
  CheckCircle2,
  UserCheck,
  ChevronRight,
  Flame,
} from 'lucide-react';

export const AdminSupportInbox: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<
    'ALL_OPEN' | 'ASSIGNED_TO_ME' | 'WAITING_FOR_CUSTOMER' | 'HIGH_PRIORITY' | 'UNRESOLVED' | 'RECENTLY_CLOSED'
  >('ALL_OPEN');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const fetchInbox = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        view: currentView,
        category: categoryFilter,
        search: searchQuery,
      });

      const res = await fetch(`/api/admin/support/inbox?${params.toString()}`, {
        headers: { 'x-user-role': 'PLATFORM_ADMIN', 'x-user-id': 'admin_usr_01' },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setTickets(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to load support inbox:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, [currentView, categoryFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Header & View Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Inbox className="w-4 h-4 text-indigo-400" />
            Support Operations Inbox
          </h2>
          <p className="text-xs text-slate-400">
            Customer inquiries, Google API token disconnects, and automation inquiries
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets by subject, email, or ID..."
            className="text-xs pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-72"
          />
        </div>
      </div>

      {/* View Tabs & Category Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setCurrentView('ALL_OPEN')}
            className={`px-3 py-1.5 rounded-lg transition ${
              currentView === 'ALL_OPEN'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            All Open
          </button>
          <button
            onClick={() => setCurrentView('ASSIGNED_TO_ME')}
            className={`px-3 py-1.5 rounded-lg transition ${
              currentView === 'ASSIGNED_TO_ME'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Assigned to Me
          </button>
          <button
            onClick={() => setCurrentView('WAITING_FOR_CUSTOMER')}
            className={`px-3 py-1.5 rounded-lg transition ${
              currentView === 'WAITING_FOR_CUSTOMER'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Waiting for Customer
          </button>
          <button
            onClick={() => setCurrentView('HIGH_PRIORITY')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
              currentView === 'HIGH_PRIORITY'
                ? 'bg-rose-600 text-white font-semibold'
                : 'text-rose-400 hover:text-rose-300 hover:bg-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>High / Urgent Priority</span>
          </button>
          <button
            onClick={() => setCurrentView('UNRESOLVED')}
            className={`px-3 py-1.5 rounded-lg transition ${
              currentView === 'UNRESOLVED'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Unresolved
          </button>
          <button
            onClick={() => setCurrentView('RECENTLY_CLOSED')}
            className={`px-3 py-1.5 rounded-lg transition ${
              currentView === 'RECENTLY_CLOSED'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Closed / Resolved
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Categories</option>
            <option value="GOOGLE_CONNECTION">Google Connection</option>
            <option value="REVIEW_REPLY">Review Reply</option>
            <option value="AUTOMATION">Automation</option>
            <option value="BILLING">Billing</option>
            <option value="ACCOUNT">Account</option>
            <option value="BUG">Bug</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60 shadow-lg">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-2" />
            Loading support tickets...
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-200">Inbox Clear</h4>
            <p className="text-xs text-slate-500">No support tickets match this filter view.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-800/80 text-slate-300 font-semibold border-b border-slate-800 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Ticket</th>
                <th className="py-3 px-4">Customer & Tenant</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned Admin</th>
                <th className="py-3 px-4">Last Response</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {tickets.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setSelectedTicketId(t.id)}
                  className="hover:bg-slate-800/40 transition cursor-pointer"
                >
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-100 flex items-center gap-2">
                      <span>{t.subject}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">#{t.id}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-slate-200 font-medium">{t.createdByUserEmail}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{t.saasCustomerId}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700/60">
                      {t.category}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.priority === 'URGENT'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : t.priority === 'HIGH'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {t.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.status === 'OPEN'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : t.status === 'WAITING_FOR_CUSTOMER'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : t.status === 'RESOLVED' || t.status === 'CLOSED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {t.assignedAdminName || <span className="text-slate-500 italic">Unassigned</span>}
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px]">
                    {t.lastResponseAt ? new Date(t.lastResponseAt).toLocaleTimeString() : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTicketId(t.id);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-indigo-200 text-xs font-semibold inline-flex items-center gap-1 transition"
                    >
                      <span>Open</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicketId && (
        <AdminTicketDetailModal
          ticketId={selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
          onTicketUpdated={() => fetchInbox()}
        />
      )}
    </div>
  );
};
