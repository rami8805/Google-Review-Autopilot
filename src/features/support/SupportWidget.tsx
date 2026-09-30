import React, { useState, useEffect } from 'react';
import type {
  SupportTicket,
  TicketCategory,
  TicketPriority,
  KnowledgeBaseArticle,
} from '../../../shared/types/domain';
import {
  Send,
  CheckCircle2,
  MessageSquare,
  LifeBuoy,
  PlusCircle,
  Paperclip,
  Clock,
  BookOpen,
  Search,
  ChevronRight,
  X,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface SupportWidgetProps {
  userEmail: string;
}

export const SupportWidget: React.FC<SupportWidgetProps> = ({ userEmail }) => {
  const [activeTab, setActiveTab] = useState<'tickets' | 'new' | 'kb'>('tickets');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // New ticket state
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('GOOGLE_CONNECTION');
  const [priority, setPriority] = useState<TicketPriority>('NORMAL');
  const [message, setMessage] = useState('');
  const [attachmentBase64, setAttachmentBase64] = useState<string | null>(null);
  const [attachmentFileName, setAttachmentFileName] = useState('');
  const [attachmentMimeType, setAttachmentMimeType] = useState('');
  const [attachmentFileSize, setAttachmentFileSize] = useState(0);
  const [attachmentError, setAttachmentError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Reply state
  const [replyMessage, setReplyMessage] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  // Knowledge base state
  const [articles, setArticles] = useState<KnowledgeBaseArticle[]>([]);
  const [kbSearch, setKbSearch] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeBaseArticle | null>(null);

  const fetchTickets = async () => {
    try {
      setLoadingTickets(true);
      const res = await fetch('/api/support/tickets', {
        headers: { 'x-user-email': userEmail },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setTickets(json.data);
          // If we had a selected ticket, refresh it
          if (selectedTicket) {
            const updated = json.data.find((t: any) => t.id === selectedTicket.id);
            if (updated) setSelectedTicket(updated);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch support tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const fetchKnowledgeBase = async () => {
    try {
      const q = kbSearch ? `?search=${encodeURIComponent(kbSearch)}` : '';
      const res = await fetch(`/api/support/knowledge-base${q}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setArticles(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to load KB:', err);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (activeTab === 'kb') {
      fetchKnowledgeBase();
    }
  }, [activeTab, kbSearch]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttachmentError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setAttachmentError('Invalid file type. Only PNG, JPEG, JPG, WEBP, and PDF files are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAttachmentError('File exceeds 5MB size limit.');
      return;
    }

    setAttachmentFileName(file.name);
    setAttachmentMimeType(file.type);
    setAttachmentFileSize(file.size);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;
      setAttachmentBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    try {
      setSubmitting(true);
      const attachments = attachmentBase64
        ? [
            {
              fileName: attachmentFileName,
              mimeType: attachmentMimeType,
              fileSize: attachmentFileSize,
              dataBase64: attachmentBase64,
            },
          ]
        : [];

      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-email': userEmail },
        body: JSON.stringify({
          subject: subject.trim(),
          category,
          priority,
          message: message.trim(),
          attachments,
          email: userEmail,
        }),
      });

      if (res.ok) {
        setSubmittedSuccess(true);
        setSubject('');
        setMessage('');
        setAttachmentBase64(null);
        setAttachmentFileName('');
        fetchTickets();
      }
    } catch (err) {
      console.error('Failed to create ticket:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplyTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    try {
      setReplySubmitting(true);
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-email': userEmail },
        body: JSON.stringify({
          message: replyMessage.trim(),
          senderName: userEmail,
        }),
      });

      if (res.ok) {
        setReplyMessage('');
        // Refresh single ticket
        const ticketRes = await fetch(`/api/support/tickets/${selectedTicket.id}`, {
          headers: { 'x-user-email': userEmail },
        });
        if (ticketRes.ok) {
          const json = await ticketRes.json();
          if (json.success) setSelectedTicket(json.data);
        }
        fetchTickets();
      }
    } catch (err) {
      console.error('Failed to reply to ticket:', err);
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/close`, {
        method: 'POST',
        headers: { 'x-user-email': userEmail },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setSelectedTicket(json.data);
        fetchTickets();
      }
    } catch (err) {
      console.error('Failed to close ticket:', err);
    }
  };

  const handleReopenTicket = async () => {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/reopen`, {
        method: 'POST',
        headers: { 'x-user-email': userEmail },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setSelectedTicket(json.data);
        fetchTickets();
      }
    } catch (err) {
      console.error('Failed to reopen ticket:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title */}
      <div>
        <h3 className="text-xl font-bold text-slate-900">Help & Support Center</h3>
        <p className="text-xs text-slate-500 mt-1">
          Technical assistance, Google Business Profile troubleshooting, automation inquiries, and product guides
        </p>
      </div>

      {/* Navigation tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold">
        <button
          onClick={() => {
            setActiveTab('tickets');
            setSelectedTicket(null);
          }}
          className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'tickets'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>My Tickets ({tickets.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('new');
            setSelectedTicket(null);
            setSubmittedSuccess(false);
          }}
          className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'new'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Support Ticket</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('kb');
            setSelectedTicket(null);
          }}
          className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'kb'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Knowledge Base</span>
        </button>
      </div>

      {/* TAB 1: MY TICKETS */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          {selectedTicket ? (
            /* Single Ticket Conversation View */
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">
                      #{selectedTicket.id}
                    </span>
                    <h4 className="text-base font-bold text-slate-900">{selectedTicket.subject}</h4>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span>Category: <strong>{selectedTicket.category}</strong></span>
                    <span>&bull;</span>
                    <span>Created: {new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-bold ${
                      selectedTicket.status === 'RESOLVED' || selectedTicket.status === 'CLOSED'
                        ? 'bg-slate-100 text-slate-600'
                        : selectedTicket.status === 'WAITING_FOR_CUSTOMER'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {selectedTicket.status}
                  </span>

                  {selectedTicket.status === 'CLOSED' || selectedTicket.status === 'RESOLVED' ? (
                    <button
                      onClick={handleReopenTicket}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                    >
                      Reopen Ticket
                    </button>
                  ) : (
                    <button
                      onClick={handleCloseTicket}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                    >
                      Mark Resolved
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Message thread */}
              <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
                {selectedTicket.messages?.map((m) => {
                  const isCustomer = m.senderType === 'SAAS_CUSTOMER';
                  const isSystem = m.senderType === 'SYSTEM';

                  if (isSystem) {
                    return (
                      <div key={m.id} className="text-center py-1">
                        <span className="text-[11px] text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                          {m.message}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
                    >
                      <div className="text-[11px] text-slate-400 mb-1 px-1">
                        {isCustomer ? 'You' : 'Support Specialist'} &bull;{' '}
                        {new Date(m.createdAt).toLocaleTimeString()}
                      </div>
                      <div
                        className={`max-w-[80%] p-4 rounded-2xl text-xs ${
                          isCustomer
                            ? 'bg-blue-600 text-white rounded-tr-xs shadow-xs'
                            : 'bg-slate-100 text-slate-800 rounded-tl-xs'
                        }`}
                      >
                        <p className="whitespace-pre-line leading-relaxed">{m.message}</p>
                        {m.attachments && m.attachments.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-blue-500/30 space-y-1">
                            {m.attachments.map((att) => (
                              <div
                                key={att.id}
                                className="flex items-center gap-1.5 text-[11px] underline opacity-90"
                              >
                                <Paperclip className="w-3 h-3" />
                                <span>{att.fileName}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply box */}
              {selectedTicket.status !== 'CLOSED' ? (
                <form onSubmit={handleReplyTicket} className="pt-4 border-t border-slate-100 space-y-3">
                  <label className="block text-xs font-semibold text-slate-700">Reply to Support</label>
                  <textarea
                    rows={3}
                    required
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your reply or additional details here..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={replySubmitting || !replyMessage.trim()}
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{replySubmitting ? 'Sending...' : 'Send Reply'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                  This ticket is marked as resolved and closed. Click "Reopen Ticket" above to send another reply.
                </div>
              )}
            </div>
          ) : (
            /* Ticket List */
            <div className="space-y-3">
              {loadingTickets ? (
                <div className="p-8 text-center text-slate-400 text-xs">Loading tickets...</div>
              ) : tickets.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
                  <LifeBuoy className="w-10 h-10 text-slate-400 mx-auto" />
                  <h4 className="text-base font-bold text-slate-800">No Support Tickets Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Have a question or running into an issue? Create a support ticket and our engineering team will assist.
                  </p>
                  <button
                    onClick={() => setActiveTab('new')}
                    className="mt-2 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Open New Ticket
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {tickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      className="bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-400 hover:shadow-xs transition cursor-pointer flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">
                            #{t.id}
                          </span>
                          <h4 className="text-sm font-bold text-slate-800">{t.subject}</h4>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-3">
                          <span>Category: <strong>{t.category}</strong></span>
                          <span>&bull;</span>
                          <span>Updated: {t.lastResponseAt ? new Date(t.lastResponseAt).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                            t.status === 'RESOLVED' || t.status === 'CLOSED'
                              ? 'bg-slate-100 text-slate-600'
                              : t.status === 'WAITING_FOR_CUSTOMER'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {t.status}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: NEW TICKET */}
      {activeTab === 'new' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          {submittedSuccess ? (
            <div className="text-center py-8 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h4 className="text-base font-bold text-slate-900">Support Ticket Created</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                We received your inquiry. Our support team will review your ticket and reply directly. You will receive an email notification when a specialist responds.
              </p>
              <button
                onClick={() => setActiveTab('tickets')}
                className="mt-4 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700"
              >
                View My Tickets
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Your Email</label>
                <input
                  type="email"
                  disabled
                  value={userEmail}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TicketCategory)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="GOOGLE_CONNECTION">Google Connection / Token Expired</option>
                    <option value="REVIEW_REPLY">Review Reply Drafts</option>
                    <option value="AUTOMATION">Automation & Grace Periods</option>
                    <option value="BILLING">Billing & Plans</option>
                    <option value="ACCOUNT">Account Configuration</option>
                    <option value="BUG">Bug Report</option>
                    <option value="OTHER">Other Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TicketPriority)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="LOW">Low (General guidance)</option>
                    <option value="NORMAL">Normal (Standard assistance)</option>
                    <option value="HIGH">High (Impacts live operations)</option>
                    <option value="URGENT">Urgent (Reviews completely down)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Google connection token expired"
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
                  placeholder="Describe your issue or question in detail..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Screenshot / File upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Attach Screenshot or Diagnostic Log (Optional)
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Supported formats: PNG, JPEG, WEBP, PDF (max 5MB). File is securely stored in tenant-isolated storage.
                </p>
                {attachmentError && (
                  <p className="text-xs text-rose-500 mt-1">{attachmentError}</p>
                )}
                {attachmentFileName && !attachmentError && (
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Attached: {attachmentFileName} ({(attachmentFileSize / 1024).toFixed(0)} KB)</span>
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting...' : 'Submit Support Ticket'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 3: KNOWLEDGE BASE */}
      {activeTab === 'kb' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={kbSearch}
              onChange={(e) => setKbSearch(e.target.value)}
              placeholder="Search help articles (e.g. google connection, safe mode, rules)..."
              className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {articles.map((art) => (
              <div
                key={art.id}
                onClick={() => setSelectedArticle(art)}
                className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-xs transition cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                    {art.category}
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm mt-2">{art.title}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{art.summary}</p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-semibold mt-3">
                  <span>Read Guide</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>

          {/* KB Modal */}
          {selectedArticle && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
              <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-xl p-6 space-y-4 max-h-[85vh] overflow-y-auto text-slate-800">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                      {selectedArticle.category}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{selectedArticle.title}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedArticle(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-xs leading-relaxed text-slate-700 whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {selectedArticle.content}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setSelectedArticle(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs rounded-lg text-slate-700 font-semibold"
                  >
                    Close Guide
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
