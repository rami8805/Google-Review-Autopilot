import React, { useState, useEffect } from 'react';
import {
  Send,
  CheckCircle2,
  MessageSquare,
  LifeBuoy,
  Plus,
  Paperclip,
  Clock,
  Check,
  RotateCcw,
  XCircle,
  FileText,
  AlertCircle,
  User,
  Headphones,
} from 'lucide-react';
import { apiClient, type ClientSupportTicket } from '../../services/apiClient';
import type { SupportMessage } from '../../../shared/types/domain';

interface SupportWidgetProps {
  userEmail: string;
}

export const SupportWidget: React.FC<SupportWidgetProps> = ({ userEmail }) => {
  const [tickets, setTickets] = useState<ClientSupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // New Ticket Form state
  const [isCreating, setIsCreating] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<ClientSupportTicket['category']>('AI_REPLIES');
  const [priority, setPriority] = useState<ClientSupportTicket['priority']>('MEDIUM');
  const [description, setDescription] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Conversation Reply state
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    const list = await apiClient.getTickets();
    setTickets([...list]);
    if (list.length > 0 && !selectedTicketId) {
      setSelectedTicketId(list[0].id);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    setIsSubmitting(true);
    const newTicket = await apiClient.createTicket({
      email: userEmail,
      subject,
      description,
      category,
      priority,
      attachmentName: attachedFile ? attachedFile.name : undefined,
    });

    setIsSubmitting(false);
    setIsCreating(false);
    setSubject('');
    setDescription('');
    setAttachedFile(null);

    await loadTickets();
    setSelectedTicketId(newTicket.id);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !replyText.trim()) return;

    setIsReplying(true);
    await apiClient.replyToTicket(selectedTicketId, replyText.trim(), 'Dr. Sarah Lin');
    setIsReplying(false);
    setReplyText('');
    await loadTickets();
  };

  const handleStatusToggle = async (ticket: ClientSupportTicket) => {
    const isClosed = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';
    const nextStatus = isClosed ? 'OPEN' : 'RESOLVED';
    await apiClient.updateTicketStatus(ticket.id, nextStatus);
    await loadTickets();
  };

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);

  // Helper for status badge rendering
  const renderStatusBadge = (status: ClientSupportTicket['status']) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
            Open
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
            In Progress
          </span>
        );
      case 'WAITING_ON_CUSTOMER':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">
            Waiting for Customer
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
            Resolved
          </span>
        );
      case 'CLOSED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
            Closed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header with New Ticket button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Customer Support & Help Desk</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Submit questions regarding your Google integration, AI replies, or safety settings.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Ticket</span>
        </button>
      </div>

      {/* Main 2-Column Split: Ticket List (Left) + Conversation Thread (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Tickets List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Your Tickets ({tickets.length})
              </span>
              <span className="text-[11px] text-slate-400">Response time &lt; 4 hours</span>
            </div>

            {tickets.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-semibold text-slate-700">No support tickets found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Click "Create New Ticket" to reach our team.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {tickets.map((t) => {
                  const isSelected = t.id === selectedTicketId;
                  const lastMessage = t.messages[t.messages.length - 1];

                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTicketId(t.id)}
                      className={`p-4 cursor-pointer transition ${
                        isSelected
                          ? 'bg-blue-50/60 border-l-4 border-blue-600'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="font-bold text-xs text-slate-900 line-clamp-1">{t.subject}</span>
                        {renderStatusBadge(t.status)}
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {lastMessage ? lastMessage.message : 'No messages yet.'}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-500 uppercase">{t.category}</span>
                        <span>{new Date(t.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Contact & Docs Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs shadow-xs">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Headphones className="w-3.5 h-3.5 text-blue-600" />
                <span>Priority Email</span>
              </div>
              <div className="text-slate-500 text-[11px] mt-1">care@reviewautopilot.com</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs shadow-xs">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <LifeBuoy className="w-3.5 h-3.5 text-blue-600" />
                <span>Documentation</span>
              </div>
              <div className="text-slate-500 text-[11px] mt-1">Google API Safety Guide</div>
            </div>
          </div>
        </div>

        {/* Right Column: Ticket Conversation Thread */}
        <div className="lg:col-span-7">
          {selectedTicket ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[650px]">
              {/* Thread Header */}
              <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900">{selectedTicket.subject}</h3>
                    {renderStatusBadge(selectedTicket.status)}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span>Priority: <strong>{selectedTicket.priority}</strong></span>
                    <span>&bull;</span>
                    <span>Category: <strong>{selectedTicket.category}</strong></span>
                    {selectedTicket.attachmentName && (
                      <>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1 text-blue-600">
                          <Paperclip className="w-3 h-3" />
                          {selectedTicket.attachmentName}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Close / Reopen Action */}
                <button
                  onClick={() => handleStatusToggle(selectedTicket)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition self-start sm:self-center shrink-0"
                >
                  {selectedTicket.status === 'RESOLVED' || selectedTicket.status === 'CLOSED' ? (
                    <>
                      <RotateCcw className="w-3 h-3 text-blue-600" />
                      <span>Reopen Ticket</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Mark Resolved</span>
                    </>
                  )}
                </button>
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {selectedTicket.messages.map((msg) => {
                  const isCustomer = msg.senderType === 'SAAS_CUSTOMER';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-600">{msg.senderName}</span>
                        <span>&bull;</span>
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div
                        className={`max-w-md p-4 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                          isCustomer
                            ? 'bg-blue-600 text-white rounded-br-xs'
                            : 'bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200/80'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Box Footer */}
              <div className="p-4 border-t border-slate-200 bg-white">
                {selectedTicket.status === 'CLOSED' ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                    This ticket is closed. Click "Reopen Ticket" above to reply.
                  </div>
                ) : (
                  <form onSubmit={handleSendReply} className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your response to support..."
                      className="flex-1 text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={isReplying || !replyText.trim()}
                      className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isReplying ? 'Sending...' : 'Send'}</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 h-[500px] flex flex-col justify-center items-center">
              <MessageSquare className="w-12 h-12 text-slate-200 mb-3" />
              <h4 className="font-bold text-sm text-slate-700">No ticket selected</h4>
              <p className="text-xs text-slate-400 mt-1">
                Choose a ticket from the left column to view the conversation.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Ticket Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Create Support Ticket</h3>
              <button
                onClick={() => setIsCreating(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Issue syncing new reviews from Google Business Profile"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Category Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="AI_REPLIES">AI Reply Drafting</option>
                    <option value="GOOGLE_INTEGRATION">Google Business Profile Sync</option>
                    <option value="BILLING">Billing & Subscription</option>
                    <option value="ACCOUNT">Account & Access</option>
                    <option value="OTHER">Other Inquiry</option>
                  </select>
                </div>

                {/* Priority Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent (Reviews blocked)</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe what happened, any error messages, or details for our team..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Screenshot / File attachment */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Attach Screenshot or File (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition">
                    <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                    <span>Choose file</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setAttachedFile(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                  {attachedFile && (
                    <span className="text-xs text-slate-600 truncate max-w-xs flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      {attachedFile.name} ({(attachedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Ticket'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
