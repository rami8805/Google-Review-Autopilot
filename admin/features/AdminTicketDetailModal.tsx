import React, { useState, useEffect } from 'react';
import type { SupportTicket, TicketStatus, TicketPriority } from '../../shared/types/domain';
import {
  X,
  Send,
  Sparkles,
  Shield,
  Paperclip,
  CheckCircle2,
  Clock,
  User,
  BookOpen,
  ArrowRight,
  AlertTriangle,
  Lock,
} from 'lucide-react';

interface AdminTicketDetailModalProps {
  ticketId: string;
  onClose: () => void;
  onTicketUpdated: () => void;
}

export const AdminTicketDetailModal: React.FC<AdminTicketDetailModalProps> = ({
  ticketId,
  onClose,
  onTicketUpdated,
}) => {
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [internalNoteText, setInternalNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/support/tickets/${ticketId}`, {
        headers: { 'x-user-role': 'PLATFORM_ADMIN' },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setTicket(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to load admin ticket detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      setSendingReply(true);
      const res = await fetch(`/api/admin/support/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'PLATFORM_ADMIN',
          'x-user-name': 'Platform Support Lead',
          'x-user-id': 'admin_usr_01',
        },
        body: JSON.stringify({ message: replyText.trim() }),
      });

      if (res.ok) {
        setReplyText('');
        fetchTicket();
        onTicketUpdated();
      }
    } catch (err) {
      console.error('Failed to send admin reply:', err);
    } finally {
      setSendingReply(false);
    }
  };

  const handleAddInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalNoteText.trim()) return;

    try {
      setAddingNote(true);
      const res = await fetch(`/api/admin/support/tickets/${ticketId}/internal-notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'PLATFORM_ADMIN',
          'x-user-name': 'Platform Support Lead',
          'x-user-id': 'admin_usr_01',
        },
        body: JSON.stringify({ note: internalNoteText.trim() }),
      });

      if (res.ok) {
        setInternalNoteText('');
        fetchTicket();
        onTicketUpdated();
      }
    } catch (err) {
      console.error('Failed to add internal note:', err);
    } finally {
      setAddingNote(false);
    }
  };

  const handleUpdateStatus = async (status: TicketStatus) => {
    try {
      const res = await fetch(`/api/admin/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'PLATFORM_ADMIN',
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchTicket();
        onTicketUpdated();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleUpdatePriority = async (priority: TicketPriority) => {
    try {
      const res = await fetch(`/api/admin/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'PLATFORM_ADMIN',
        },
        body: JSON.stringify({ priority }),
      });
      if (res.ok) {
        fetchTicket();
        onTicketUpdated();
      }
    } catch (err) {
      console.error('Failed to update priority:', err);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center text-slate-300">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sm">Loading ticket conversation & AI intelligence...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full text-center text-slate-300">
          <p className="text-sm text-rose-400">Support ticket not found.</p>
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

  const ai = ticket.aiAssistantSuggestion;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold">
                  #{ticket.id}
                </span>
                <h3 className="text-base font-bold text-slate-100">{ticket.subject}</h3>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                <span>Customer: <strong className="text-slate-200">{ticket.createdByUserEmail}</strong></span>
                <span>&bull;</span>
                <span>Tenant: <code className="text-indigo-300">{ticket.saasCustomerId}</code></span>
                <span>&bull;</span>
                <span>Category: <strong className="text-slate-200">{ticket.category}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium">Status:</span>
              <select
                value={ticket.status}
                onChange={(e) => handleUpdateStatus(e.target.value as TicketStatus)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-100 font-semibold focus:outline-none focus:border-indigo-500"
              >
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="WAITING_FOR_CUSTOMER">WAITING_FOR_CUSTOMER</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>

            {/* Priority Dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium">Priority:</span>
              <select
                value={ticket.priority}
                onChange={(e) => handleUpdatePriority(e.target.value as TicketPriority)}
                className={`rounded-lg px-2.5 py-1 font-bold border focus:outline-none ${
                  ticket.priority === 'URGENT' || ticket.priority === 'HIGH'
                    ? 'bg-rose-950 text-rose-300 border-rose-800'
                    : 'bg-slate-800 text-slate-200 border-slate-700'
                }`}
              >
                <option value="LOW">LOW</option>
                <option value="NORMAL">NORMAL</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          {/* Left Column: Messages Thread & Reply Form (7 cols) */}
          <div className="lg:col-span-7 border-r border-slate-800 flex flex-col overflow-hidden bg-slate-900/60">
            {/* Messages Scroll Area */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {ticket.messages?.map((msg) => {
                const isCustomer = msg.senderType === 'SAAS_CUSTOMER';
                const isSystem = msg.senderType === 'SYSTEM';

                if (isSystem) {
                  return (
                    <div key={msg.id} className="text-center py-1">
                      <span className="text-[11px] text-slate-500 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
                        {msg.message} &bull; {new Date(msg.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-300">
                        {msg.senderName} ({isCustomer ? 'Customer' : 'Support Admin'})
                      </span>
                      <span>&bull;</span>
                      <span>{new Date(msg.createdAt).toLocaleString()}</span>
                    </div>

                    <div
                      className={`max-w-[85%] p-4 rounded-2xl border ${
                        isCustomer
                          ? 'bg-slate-950 text-slate-200 border-slate-800 rounded-tl-xs'
                          : 'bg-indigo-950/40 text-slate-100 border-indigo-800/60 rounded-tr-xs'
                      }`}
                    >
                      <p className="whitespace-pre-line leading-relaxed">{msg.message}</p>

                      {/* Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-800 space-y-1">
                          <span className="text-[10px] text-slate-400 font-semibold block">Attachments:</span>
                          {msg.attachments.map((att) => (
                            <a
                              key={att.id}
                              href={`/api/support/tickets/${ticket.id}/attachments/${att.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-indigo-300 text-[11px] transition"
                            >
                              <Paperclip className="w-3 h-3" />
                              <span>{att.fileName}</span>
                              <span className="text-slate-400 text-[10px]">
                                ({(att.fileSize / 1024).toFixed(0)} KB)
                              </span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Admin Reply Form */}
            <form onSubmit={handleSendReply} className="p-4 border-t border-slate-800 bg-slate-950 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-indigo-400" />
                  Reply to Customer
                </span>
                <span className="text-[11px] text-slate-500">
                  Sending this reply will dispatch an email notification to <strong>{ticket.createdByUserEmail}</strong>
                </span>
              </div>

              <textarea
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your official support response to the customer..."
                className="w-full text-xs p-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />

              <div className="flex justify-between items-center">
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Audit logged response</span>
                </div>

                <button
                  type="submit"
                  disabled={sendingReply || !replyText.trim()}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingReply ? 'Dispatching...' : 'Send Reply to Customer'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: AI Support Assistant & Internal Admin Notes (5 cols) */}
          <div className="lg:col-span-5 flex flex-col overflow-y-auto p-5 space-y-6 bg-slate-950/40 text-xs">
            {/* AI Support Assistant Box */}
            {ai && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/40 to-purple-950/30 border border-indigo-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    AI Support Assistant
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-200 border border-indigo-700/50">
                    Draft & Diagnostics Only
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-300">Issue Summary</div>
                  <p className="text-slate-300 text-[11px] leading-relaxed bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    {ai.issueSummary}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-300">Probable Cause & Diagnostic</div>
                  <p className="text-slate-300 text-[11px] leading-relaxed bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    {ai.probableCause}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-300">Customer Diagnostics Context</div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <div>Plan: <strong className="text-slate-200">{ai.relevantCustomerContext.plan}</strong></div>
                    <div>Locations: <strong className="text-slate-200">{ai.relevantCustomerContext.googleLocationsCount}</strong></div>
                    <div>
                      Google Sync:{' '}
                      <strong className={ai.relevantCustomerContext.hasGoogleConnectionError ? 'text-rose-400' : 'text-emerald-400'}>
                        {ai.relevantCustomerContext.hasGoogleConnectionError ? 'Disrupted' : 'Healthy'}
                      </strong>
                    </div>
                    <div>Risk Flags (30d): <strong className="text-slate-200">{ai.relevantCustomerContext.recentRiskFlagsCount}</strong></div>
                  </div>
                </div>

                {ai.suggestedArticleTitle && (
                  <div className="p-2.5 rounded-lg bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                      <div>
                        <div className="text-[10px] text-slate-400">Suggested Help Article:</div>
                        <div className="font-semibold text-indigo-200 text-[11px]">{ai.suggestedArticleTitle}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Suggested Reply with Insert Action */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-semibold text-slate-300">Suggested Response</span>
                    <button
                      type="button"
                      onClick={() => setReplyText(ai.suggestedResponse)}
                      className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[10px] flex items-center gap-1 transition"
                    >
                      <span>Insert Draft into Reply Box</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 italic max-h-36 overflow-y-auto">
                    "{ai.suggestedResponse}"
                  </p>
                  <p className="text-[10px] text-amber-300 flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>AI cannot auto-send. You must review and click "Send Reply to Customer".</span>
                  </p>
                </div>
              </div>
            )}

            {/* Internal Notes Section (Strictly Admin-Only) */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  Internal Notes
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 font-bold">
                  Strictly Confidential
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Staff notes are encrypted and never transmitted to the SaaSCustomer.
              </p>

              {/* Add Note Form */}
              <form onSubmit={handleAddInternalNote} className="space-y-2">
                <textarea
                  rows={2}
                  value={internalNoteText}
                  onChange={(e) => setInternalNoteText(e.target.value)}
                  placeholder="Add private staff note (e.g. escalated to engineering, token revoked on GSuite)..."
                  className="w-full text-xs p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={addingNote || !internalNoteText.trim()}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition disabled:opacity-50"
                  >
                    {addingNote ? 'Saving...' : 'Add Internal Note'}
                  </button>
                </div>
              </form>

              {/* Notes List */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80 max-h-48 overflow-y-auto">
                {ticket.internalNotes && ticket.internalNotes.length > 0 ? (
                  ticket.internalNotes.map((n) => (
                    <div key={n.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] space-y-1">
                      <div className="flex justify-between items-center text-slate-400">
                        <span className="font-semibold text-amber-400">{n.authorAdminName}</span>
                        <span>{new Date(n.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-200 whitespace-pre-line">{n.note}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 italic text-[11px]">No internal notes on this ticket yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
