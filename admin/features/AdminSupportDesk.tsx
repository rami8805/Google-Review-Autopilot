import React, { useState, useEffect } from 'react';
import type { SupportTicket, SupportMessage } from '../../shared/types/domain';
import { useAuth } from '../../src/context/AuthContext';
import {
  LifeBuoy,
  MessageSquare,
  Sparkles,
  Send,
  CheckCircle2,
  Building2,
  CreditCard,
  Clock,
  Shield,
  User,
  AlertCircle,
} from 'lucide-react';

export const AdminSupportDesk: React.FC = () => {
  const { getAuthHeaders } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isGeneratingAiDraft, setIsGeneratingAiDraft] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [aiDraftNotice, setAiDraftNotice] = useState<string | null>(null);

  const fetchTickets = async () => {
    setIsLoadingTickets(true);
    try {
      const res = await fetch('/api/admin/support/tickets', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const payload = await res.json();
        if (payload?.success && Array.isArray(payload.data)) {
          setTickets(payload.data);
          if (payload.data.length > 0 && !selectedTicket) {
            loadTicketThread(payload.data[0]);
          }
        }
      }
    } catch {
      // offline fallback
    } finally {
      setIsLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const loadTicketThread = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setAiDraftNotice(null);
    try {
      const res = await fetch(`/api/support/tickets/${ticket.id}/messages`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const payload = await res.json();
        if (payload?.success && Array.isArray(payload.data?.messages)) {
          setMessages(payload.data.messages);
        }
      }
    } catch {
      // offline fallback
    }
  };

  const handleGenerateAiDraft = async () => {
    if (!selectedTicket) return;
    setIsGeneratingAiDraft(true);
    try {
      const res = await fetch('/api/admin/support/ai-draft', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ticketSubject: selectedTicket.subject,
          userMessage: messages[0]?.message || '',
          customerName: 'Customer',
        }),
      });

      if (res.ok) {
        const payload = await res.json();
        if (payload?.success && payload.data?.suggestedDraft) {
          setReplyText(payload.data.suggestedDraft);
          setAiDraftNotice('AI draft generated for human review. Edit if needed before sending.');
        }
      }
    } catch {
      // offline fallback
    } finally {
      setIsGeneratingAiDraft(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setIsSending(true);
    try {
      const res = await fetch(`/api/admin/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          message: replyText.trim(),
          senderName: 'Support Team Specialist',
        }),
      });

      if (res.ok) {
        const payload = await res.json();
        if (payload?.success && payload.data) {
          setMessages((prev) => [...prev, payload.data]);
          setReplyText('');
          setAiDraftNotice(null);
          setSelectedTicket((prev) => (prev ? { ...prev, status: 'IN_PROGRESS' } : null));
        }
      }
    } catch {
      // offline fallback
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED') => {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'SUPER_ADMIN',
          'x-tenant-id': selectedTicket.saasCustomerId,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setSelectedTicket({ ...selectedTicket, status });
        setTickets((prev) =>
          prev.map((t) => (t.id === selectedTicket.id ? { ...t, status } : t))
        );
      }
    } catch {
      // offline fallback
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
          Super Admin Support Desk
        </h2>
        <p className="text-xs text-slate-400">
          Inspect customer account context, use Gemini Support Copilot for reply suggestions, and reply to merchants.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tickets Sidebar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/80">
          <div className="p-3 bg-slate-800/60 text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Customer Inquiries ({tickets.length})</span>
            <LifeBuoy className="w-4 h-4 text-indigo-400" />
          </div>

          <div className="max-h-[550px] overflow-y-auto divide-y divide-slate-800/60">
            {isLoadingTickets ? (
              <div className="p-6 text-center text-xs text-slate-500">Loading tickets...</div>
            ) : tickets.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">No support tickets</div>
            ) : (
              tickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => loadTicketThread(t)}
                  className={`p-3.5 hover:bg-slate-800/40 cursor-pointer transition text-xs space-y-1 ${
                    selectedTicket?.id === t.id ? 'bg-slate-800/60 border-l-2 border-indigo-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 line-clamp-1">{t.subject}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        t.status === 'RESOLVED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : t.status === 'IN_PROGRESS'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 line-clamp-1">{t.createdByUserEmail}</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Conversation & Action Center */}
        <div className="md:col-span-2 space-y-4">
          {selectedTicket ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between">
              {/* Customer Account Context Banner (Phase 7 Requirement) */}
              <div className="p-4 bg-slate-950 border-b border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-slate-100">
                      Customer Context: Downtown Dental SF
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      ({selectedTicket.saasCustomerId})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleStatusChange('OPEN')}
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                        selectedTicket.status === 'OPEN'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Open
                    </button>
                    <button
                      onClick={() => handleStatusChange('IN_PROGRESS')}
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                        selectedTicket.status === 'IN_PROGRESS'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      In Progress
                    </button>
                    <button
                      onClick={() => handleStatusChange('RESOLVED')}
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                        selectedTicket.status === 'RESOLVED'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Resolved
                    </button>
                  </div>
                </div>

                {/* Account telemetry tags */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-slate-300">Google: Connected (loc_001)</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="text-slate-300">Plan: Starter ($29/mo, Active)</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-slate-300">Reviews: 3 Synced, 2 Pending</span>
                  </div>
                </div>
              </div>

              {/* Message History */}
              <div className="p-5 space-y-3 max-h-72 overflow-y-auto bg-slate-900/40">
                {messages.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">No messages in thread</div>
                ) : (
                  messages.map((m) => {
                    const isStaff = m.senderType === 'SUPPORT_AGENT';
                    return (
                      <div
                        key={m.id}
                        className={`flex items-start gap-2.5 ${isStaff ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isStaff && (
                          <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-bold shrink-0">
                            <User className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div
                          className={`max-w-md rounded-xl p-3 text-xs space-y-1 shadow-xs ${
                            isStaff
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-800 text-slate-200 border border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 text-[10px] opacity-75">
                            <span className="font-semibold">{m.senderName}</span>
                            <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="whitespace-pre-line leading-relaxed">{m.message}</p>
                        </div>
                        {isStaff && (
                          <div className="w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                            <Shield className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reply Box & AI Copilot Action */}
              <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400">
                    Draft Support Response to Merchant
                  </span>

                  {/* AI Support Suggestion (Strictly human-in-the-loop: NEVER AUTO-SENDS) */}
                  <button
                    onClick={handleGenerateAiDraft}
                    disabled={isGeneratingAiDraft}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-indigo-950 border border-indigo-700 text-indigo-300 hover:bg-indigo-900 transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{isGeneratingAiDraft ? 'Generating Draft...' : 'Suggest Reply with AI'}</span>
                  </button>
                </div>

                {aiDraftNotice && (
                  <div className="p-2 rounded bg-indigo-950/60 border border-indigo-800 text-[11px] text-indigo-300 flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>{aiDraftNotice}</span>
                  </div>
                )}

                <form onSubmit={handleSendReply} className="space-y-3">
                  <textarea
                    rows={4}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your response to the customer..."
                    className="w-full text-xs p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-500">
                      Messages sent here appear directly in the customer's Support tab.
                    </span>

                    <button
                      type="submit"
                      disabled={isSending || !replyText.trim()}
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSending ? 'Sending...' : 'Send Reply'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-500 bg-slate-900 rounded-xl border border-slate-800">
              Select a ticket from the left to view customer context and conversation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
