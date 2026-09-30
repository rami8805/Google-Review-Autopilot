import React from 'react';
import type { ApprovalStatus } from '../../shared/types/domain';
import { CheckCircle2, Clock, XCircle, Send, AlertCircle } from 'lucide-react';

export const StatusBadge: React.FC<{ status: ApprovalStatus }> = ({ status }) => {
  switch (status) {
    case 'PENDING_APPROVAL':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
          <Clock className="w-3 h-3 text-amber-600" />
          Pending Approval
        </span>
      );
    case 'AUTO_PUBLISHED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Auto-Published
        </span>
      );
    case 'MANUALLY_PUBLISHED':
    case 'APPROVED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
          <Send className="w-3 h-3 text-blue-600" />
          Published
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
          <XCircle className="w-3 h-3 text-slate-500" />
          Rejected
        </span>
      );
    case 'FAILED_TO_PUBLISH':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
          <AlertCircle className="w-3 h-3 text-rose-600" />
          Publish Failed
        </span>
      );
  }
};
