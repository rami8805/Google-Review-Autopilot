import React, { useState } from 'react';
import { Send, CheckCircle2, MessageSquare, LifeBuoy } from 'lucide-react';

interface SupportWidgetProps {
  userEmail: string;
}

export const SupportWidget: React.FC<SupportWidgetProps> = ({ userEmail }) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitted(true);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-base font-bold text-slate-900">Need Help or Have a Question?</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Our engineering support team is here to help with your Google Business Profile connection or safety rules.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        {submitted ? (
          <div className="text-center py-8 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h4 className="text-base font-bold text-slate-900">Ticket Submitted</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              We received your inquiry. Our support team will reply directly to <strong>{userEmail}</strong> within 4 business hours.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setSubject('');
                setMessage('');
              }}
              className="mt-4 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              Send Another Ticket
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Your Email</label>
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
                placeholder="e.g. Question about 3-star review grace period"
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
                placeholder="Describe your issue or feedback in detail..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Ticket</span>
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs flex gap-3">
          <MessageSquare className="w-5 h-5 text-blue-600 shrink-0" />
          <div>
            <div className="font-bold text-slate-800">Direct Contact</div>
            <div className="text-slate-500 mt-0.5">support@reviewautopilot.com</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs flex gap-3">
          <LifeBuoy className="w-5 h-5 text-blue-600 shrink-0" />
          <div>
            <div className="font-bold text-slate-800">Docs & Specifications</div>
            <div className="text-slate-500 mt-0.5">See docs/ARCHITECTURE.md</div>
          </div>
        </div>
      </div>
    </div>
  );
};
