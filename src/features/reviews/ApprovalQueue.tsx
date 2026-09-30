import React, { useState } from 'react';
import type { Review, ReviewReply } from '../../../shared/types/domain';
import { RiskBadge } from '../../components/RiskBadge';
import { StatusBadge } from '../../components/StatusBadge';
import {
  Star,
  Sparkles,
  Send,
  Edit3,
  RotateCw,
  AlertTriangle,
  Check,
  Zap,
  ShieldAlert,
} from 'lucide-react';

interface ApprovalQueueProps {
  reviews: (Review & { reply?: ReviewReply })[];
  onApprove: (reviewId: string, editedText?: string) => Promise<void>;
  onRegenerate: (reviewId: string) => Promise<void>;
  onSimulateReview?: (preset: 'five_star' | 'four_star' | 'three_star' | 'critical_risk') => Promise<void>;
  isSimulatingReview?: boolean;
}

export const ApprovalQueue: React.FC<ApprovalQueueProps> = ({
  reviews,
  onApprove,
  onRegenerate,
  onSimulateReview,
  isSimulatingReview,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PUBLISHED'>('PENDING');
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editedTextMap, setEditedTextMap] = useState<Record<string, string>>({});
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const filteredReviews = reviews.filter((r) => {
    if (filter === 'PENDING') return r.reply?.status === 'PENDING_APPROVAL';
    if (filter === 'PUBLISHED')
      return r.reply?.status === 'AUTO_PUBLISHED' || r.reply?.status === 'MANUALLY_PUBLISHED';
    return true;
  });

  const handleStartEdit = (replyId: string, currentText: string) => {
    setEditingReplyId(replyId);
    setEditedTextMap((prev) => ({ ...prev, [replyId]: currentText }));
  };

  const handleApproveClick = async (reviewId: string, replyId?: string) => {
    setLoadingAction(`approve_${reviewId}`);
    try {
      const textToPublish = replyId ? editedTextMap[replyId] : undefined;
      await onApprove(reviewId, textToPublish);
      setEditingReplyId(null);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRegenerateClick = async (reviewId: string) => {
    setLoadingAction(`regen_${reviewId}`);
    try {
      await onRegenerate(reviewId);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and count banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Google Review Inbox & Approvals</h2>
          <p className="text-xs text-slate-500">
            Reviews ingested directly from Google Business Profile. AI reply drafts are held for approval based on safety rules.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filter === 'PENDING' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Needs Approval ({reviews.filter((r) => r.reply?.status === 'PENDING_APPROVAL').length})
          </button>
          <button
            onClick={() => setFilter('PUBLISHED')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filter === 'PUBLISHED' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Published ({reviews.filter((r) => r.reply?.status === 'AUTO_PUBLISHED' || r.reply?.status === 'MANUALLY_PUBLISHED').length})
          </button>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All ({reviews.length})
          </button>
        </div>
      </div>

      {/* Simulator Quick Action Toolbar */}
      {onSimulateReview && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <Zap className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <span className="font-bold text-slate-900">Live Ingestion Tester: </span>
              <span className="text-slate-500">Simulate incoming review to verify the end-to-end Google review lifecycle.</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => onSimulateReview('five_star')}
              disabled={isSimulatingReview}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition disabled:opacity-50"
            >
              + 5★ Praise (Auto-Publishes)
            </button>
            <button
              onClick={() => onSimulateReview('three_star')}
              disabled={isSimulatingReview}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition disabled:opacity-50"
            >
              + 3★ Wait Time (Needs Approval)
            </button>
            <button
              onClick={() => onSimulateReview('critical_risk')}
              disabled={isSimulatingReview}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition disabled:opacity-50 flex items-center gap-1"
            >
              <ShieldAlert className="w-3 h-3 text-rose-600" />
              <span>+ 1★ Prompt Injection (Locked)</span>
            </button>
          </div>
        </div>
      )}

      {/* Review List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
            <Check className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <div className="font-semibold text-sm text-slate-800">No reviews in this view</div>
            <div className="text-xs text-slate-400 mt-1">All incoming reviews are up to date!</div>
          </div>
        ) : (
          filteredReviews.map((review) => {
            const reply = review.reply;
            const isEditing = reply && editingReplyId === reply.id;
            const currentDraftText =
              reply && editedTextMap[reply.id] !== undefined
                ? editedTextMap[reply.id]
                : reply?.proposedText || '';

            return (
              <div
                key={review.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-slate-300 transition space-y-4"
              >
                {/* Header: Author, Star Rating, Status, Risk */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{review.author.displayName}</span>
                      <div className="flex items-center text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < review.starRating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(review.reviewCreatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {review.riskAssessment && (
                      <RiskBadge
                        riskLevel={review.riskAssessment.riskLevel}
                        flags={review.riskAssessment.flags}
                      />
                    )}
                    {reply && <StatusBadge status={reply.status} />}
                  </div>
                </div>

                {/* Untrusted Review Text Container */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 flex items-center gap-1">
                    <span>Google Review (Untrusted User Content)</span>
                  </div>
                  <p className="text-sm text-slate-800 italic">"{review.comment || 'No written comment provided.'}"</p>
                </div>

                {/* AI Safety Explanation if flagged */}
                {review.riskAssessment && review.riskAssessment.explanation && (
                  <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50/70 border border-amber-200 px-3 py-2 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{review.riskAssessment.explanation}</span>
                  </div>
                )}

                {/* Reply Section */}
                {reply && (
                  <div className="bg-blue-50/40 rounded-xl p-4 border border-blue-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span>
                          {reply.status === 'AUTO_PUBLISHED'
                            ? 'Auto-Published Response (Google Business Profile)'
                            : reply.status === 'MANUALLY_PUBLISHED'
                            ? 'Manually Published Response (Google Business Profile)'
                            : 'AI Proposed Reply (Ready for Review)'}
                        </span>
                        {reply.aiModel && (
                          <span className="text-[10px] text-blue-500 font-mono px-1.5 py-0.2 rounded bg-blue-100/60">
                            {reply.aiModel}
                          </span>
                        )}
                      </div>

                      {reply.status === 'PENDING_APPROVAL' && !isEditing && (
                        <div className="flex items-center gap-2 text-xs">
                          <button
                            onClick={() => handleStartEdit(reply.id, reply.proposedText)}
                            className="text-slate-600 hover:text-blue-600 font-medium flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => handleRegenerateClick(review.id)}
                            disabled={loadingAction === `regen_${review.id}`}
                            className="text-slate-600 hover:text-blue-600 font-medium flex items-center gap-1"
                          >
                            <RotateCw
                              className={`w-3.5 h-3.5 ${
                                loadingAction === `regen_${review.id}` ? 'animate-spin' : ''
                              }`}
                            />
                            Regenerate
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Reply content or Editor */}
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          rows={3}
                          value={currentDraftText}
                          onChange={(e) =>
                            setEditedTextMap({ ...editedTextMap, [reply.id]: e.target.value })
                          }
                          className="w-full text-xs p-3 rounded-lg border border-blue-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                        />
                        <div className="flex justify-end gap-2 text-xs">
                          <button
                            onClick={() => setEditingReplyId(null)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-700 leading-relaxed font-sans">
                        {reply.publishedText || reply.proposedText}
                      </p>
                    )}

                    {/* Pending Action Bar */}
                    {reply.status === 'PENDING_APPROVAL' && (
                      <div className="pt-2 border-t border-blue-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">
                          Approving will immediately publish this reply to your Google Business Profile.
                        </span>

                        <button
                          onClick={() => handleApproveClick(review.id, reply.id)}
                          disabled={loadingAction === `approve_${review.id}`}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>
                            {loadingAction === `approve_${review.id}`
                              ? 'Publishing to Google...'
                              : 'Approve & Publish to Google'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
