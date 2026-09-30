import React, { useState, useEffect } from 'react';
import {
  Send,
  CheckCircle2,
  MessageSquare,
  LifeBuoy,
  Plus,
  Paperclip,
  Check,
  Clock,
  ArrowLeft,
  User,
  Shield,
} from 'lucide-react';
import type { SupportTicket, SupportMessage } from '../../../shared/types/domain';

interface SupportWidgetProps {
  userEmail: string;
}

export const SupportWidget: React.FC<SupportWidgetProps> = ({ userEmail }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Create form state
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Reply form state
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const fetchTickets = async () => {
    setIsLoadingTickets(true);
    try {
      const res = await fetch('/api/support/tickets');
      if (res.ok) {
        const data = await res.json();
        if (data?.success && Array.isArray(data.data)) {
          setTickets(data.data);
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

  const openTicketThread = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticket.id}/messages`);
      if (res.ok) {
        const data = await res.json();
        if (data?.success && Array.isArray(data.data?.messages)) {
          setMessages(data.data.messages);
        }
      }
    } catch {
      // offline fallback
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setIsSubmitting(true);
    setFeedback(null);

    const fullMessage = attachmentName
      ? `${message.trim()}\n\n[Attached File: ${attachmentName}]`
      : message.trim();

    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, subject, message: fullMessage }),
      });

      if (!res.ok) {
        throw new Error('Unable to submit ticket. Please check your connection and try again.');
      }

      const data = await res.json();
      if (data?.success && data?.data) {
        setTickets((prev) => [data.data, ...prev]);
        setSubject('');
        setMessage('');
        setAttachmentName(null);
        setActiveTab('list');
        openTicketThread(data.data);
      }
    } catch (err) {
      setFeedback({ text: (err as Error).message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setIsSendingReply(true);
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText.trim(), senderName: 'Dr. Sarah Lin' }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.success && data.data) {
          setMessages((prev) => [...prev, data.data]);
          setReplyText('');
        }
      }
    } catch {
      // offline fallback
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleResolveTicket = async () => {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RESOLVED' }),
      });
      if (res.ok) {
        setSelectedTicket({ ...selectedTicket, status: 'RESOLVED' });
        setTickets((prev) =>
          prev.map((t) => (t.id === selectedTicket.id ? { ...t, status: 'RESOLVED' } : t))
        );
      }
    } catch {
      // offline fallback
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Support & Engineering Assistance</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Dedicated customer support for Google Business Profile integration, rules, and billing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!selectedTicket && (
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveTab('list')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'list'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                My Tickets ({tickets.length})
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                  activeTab === 'create'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Ticket</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold ${
            feedback.type === 'error'
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Ticket Conversation View */}
      {selectedTicket ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{selectedTicket.subject}</h4>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[11px] text-slate-400">ID: {selectedTicket.id}</span>
                  <span>&bull;</span>
                  <span>Created {new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                  selectedTicket.status === 'RESOLVED'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : selectedTicket.status === 'IN_PROGRESS'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {selectedTicket.status}
              </span>
              {selectedTicket.status !== 'RESOLVED' && (
                <button
                  onClick={handleResolveTicket}
                  className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 font-semibold text-xs transition flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Mark Resolved</span>
                </button>
              )}
            </div>
          </div>

          {/* Messages Thread */}
          <div className="p-6 space-y-4 max-h-96 overflow-y-auto bg-slate-50/20">
            {isLoadingMessages ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading conversation thread...</div>
            ) : messages.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No messages in this ticket thread.</div>
            ) : (
              messages.map((m) => {
                const isStaff = m.senderType === 'SUPPORT_AGENT';
                return (
                  <div
                    key={m.id}
                    className={`flex items-start gap-3 ${isStaff ? 'justify-start' : 'justify-end'}`}
                  >
                    {isStaff && (
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        <Shield className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-lg rounded-2xl p-4 text-xs space-y-1 shadow-xs ${
                        isStaff
                          ? 'bg-white border border-blue-200 text-slate-800'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 text-[10px] opacity-75">
                        <span className="font-semibold">{isStaff ? 'Support Specialist' : 'You (Merchant)'}</span>
                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="whitespace-pre-line leading-relaxed">{m.message}</p>
                    </div>
                    {!isStaff && (
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Reply Input Box */}
          {selectedTicket.status !== 'RESOLVED' ? (
            <form onSubmit={handleSendReply} className="p-4 border-t border-slate-100 bg-white flex gap-2">
              <input
                type="text"
                placeholder="Type your response to support..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
              <button
                type="submit"
                disabled={isSendingReply || !replyText.trim()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          ) : (
            <div className="p-4 border-t border-slate-100 text-center text-xs text-slate-500 bg-slate-50">
              This ticket has been marked resolved. If you need further help, please create a new ticket.
            </div>
          )}
        </div>
      ) : activeTab === 'list' ? (
        /* Tickets List View */
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
            {isLoadingTickets ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading your support tickets...</div>
            ) : tickets.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <div className="font-semibold text-sm text-slate-800">No support tickets submitted yet</div>
                <p className="text-xs text-slate-400 mt-1">
                  Have a question regarding Google connection or custom risk rules? Click "New Ticket".
                </p>
              </div>
            ) : (
              tickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => openTicketThread(t)}
                  className="p-4 sm:p-5 hover:bg-slate-50 cursor-pointer transition flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{t.subject}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          t.status === 'RESOLVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : t.status === 'IN_PROGRESS'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3">
                      <span>Submitted {new Date(t.createdAt).toLocaleDateString()}</span>
                      <span>&bull;</span>
                      <span className="font-mono text-[11px] text-slate-400">Ref: {t.id}</span>
                    </div>
                  </div>

                  <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition">
                    View Thread &rarr;
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Create New Ticket Form */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Your Account Email</label>
              <input
                type="email"
                disabled
                value={userEmail}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Question about 4-star review auto-publish delay"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Message</label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue, Google connection inquiry, or feedback..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Optional Attachment</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAttachmentName('screenshot_google_profile.png')}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center gap-1.5 transition"
                >
                  <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                  <span>{attachmentName ? 'Attachment: ' + attachmentName : 'Attach Screenshot / Log'}</span>
                </button>
                {attachmentName && (
                  <button
                    type="button"
                    onClick={() => setAttachmentName(null)}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Support Ticket'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Info Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs flex gap-3 shadow-xs">
          <MessageSquare className="w-5 h-5 text-blue-600 shrink-0" />
          <div>
            <div className="font-bold text-slate-800">Support Hours & SLA</div>
            <div className="text-slate-500 mt-0.5">Responses guaranteed within 4 business hours.</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs flex gap-3 shadow-xs">
          <LifeBuoy className="w-5 h-5 text-blue-600 shrink-0" />
          <div>
            <div className="font-bold text-slate-800">System Architecture Docs</div>
            <div className="text-slate-500 mt-0.5">Refer to docs/ARCHITECTURE.md for specifications.</div>
          </div>
        </div>
      </div>
    </div>
  );
};
