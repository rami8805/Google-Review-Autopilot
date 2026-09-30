import React, { useState } from 'react';
import type { Review, ReviewReply } from '../../../shared/types/domain';
import { RiskBadge } from '../../components/RiskBadge';
import { StatusBadge } from '../../components/StatusBadge';
import { SentimentBadge } from '../../components/SentimentBadge';
import { computeReviewSentiment } from '../../services/apiClient';
import {
  Star,
  Sparkles,
  Send,
  Edit3,
  RotateCw,
  AlertTriangle,
  Check,
  XCircle,
  Pause,
  Play,
  Search,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface ApprovalQueueProps {
  reviews: (Review & { reply?: ReviewReply })[];
  isAutomationPaused: boolean;
  onApprove: (reviewId: string, editedText?: string) => Promise<void>;
  onRegenerate: (reviewId: string) => Promise<void>;
  onReject: (reviewId: string) => Promise<void>;
  onToggleAutomation: () => void;
  isLoading?: boolean;
}

export const ApprovalQueue: React.FC<ApprovalQueueProps> = ({
  reviews,
  isAutomationPaused,
  onApprove,
  onRegenerate,
  onReject,
  onToggleAutomation,
  isLoading,
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PUBLISHED' | 'REJECTED'>('PENDING');
  const [ratingFilter, setRatingFilter] = useState<number | 'ALL'>('ALL');
  const [riskFilter, setRiskFilter] = useState<string | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editedTextMap, setEditedTextMap] = useState<Record<string, string>>({});
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Filter pipeline
  const filteredReviews = reviews.filter((r) => {
    // Status filter
    if (statusFilter === 'PENDING' && r.reply?.status !== 'PENDING_APPROVAL') return false;
    if (
      statusFilter === 'PUBLISHED' &&
      r.reply?.status !== 'AUTO_PUBLISHED' &&
      r.reply?.status !== 'MANUALLY_PUBLISHED' &&
      r.reply?.status !== 'APPROVED'
    )
      return false;
    if (statusFilter === 'REJECTED' && r.reply?.status !== 'REJECTED') return false;

    // Rating filter
    if (ratingFilter !== 'ALL' && r.starRating !== ratingFilter) return false;

    // Risk filter
    if (riskFilter !== 'ALL' && r.riskAssessment?.riskLevel !== riskFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = r.author.displayName.toLowerCase().includes(q);
      const commentMatch = (r.comment || '').toLowerCase().includes(q);
      const replyMatch = (r.reply?.proposedText || '').toLowerCase().includes(q);
      if (!nameMatch && !commentMatch && !replyMatch) return false;
    }

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

  const handleRejectClick = async (reviewId: string) => {
    setLoadingAction(`reject_${reviewId}`);
    try {
      await onReject(reviewId);
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

  const pendingCount = reviews.filter((r) => r.reply?.status === 'PENDING_APPROVAL').length;
  const publishedCount = reviews.filter(
    (r) => r.reply?.status === 'AUTO_PUBLISHED' || r.reply?.status === 'MANUALLY_PUBLISHED'
  ).length;
  const rejectedCount = reviews.filter((r) => r.reply?.status === 'REJECTED').length;

  return (
    <div className="space-y-6 font-sans">
      {/* Header with Title and Global Pause Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Google Review Inbox & Approvals</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Reviews ingested directly from Google Business Profile. Inspect, edit, or publish AI drafts.
          </p>
        </div>

        {/* Pause Automation Action */}
        <button
          onClick={onToggleAutomation}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-xs ${
            isAutomationPaused
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
          }`}
        >
          {isAutomationPaused ? (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Resume Automation</span>
            </>
          ) : (
            <>
              <Pause className="w-3.5 h-3.5" />
              <span>Pause Automation</span>
            </>
          )}
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        {/* Status Tab buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'PENDING'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Needs Approval ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('PUBLISHED')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'PUBLISHED'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Published ({publishedCount})
            </button>
            <button
              onClick={() => setStatusFilter('REJECTED')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'REJECTED'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Rejected ({rejectedCount})
            </button>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Reviews ({reviews.length})
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reviewer or comment..."
              className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Secondary filters: Star Rating and Risk */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Filter by:
          </span>

          {/* Star selector */}
          <select
            value={ratingFilter}
            onChange={(e) =>
              setRatingFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
            }
            className="text-xs p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700"
          >
            <option value="ALL">All Star Ratings</option>
            <option value="5">5 Stars only</option>
            <option value="4">4 Stars only</option>
            <option value="3">3 Stars only</option>
            <option value="2">2 Stars only</option>
            <option value="1">1 Star only</option>
          </select>

          {/* Risk selector */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="text-xs p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="LOW">Low Risk only</option>
            <option value="MEDIUM">Medium Risk only</option>
            <option value="HIGH">High Risk only</option>
            <option value="CRITICAL">Critical Risk only</option>
          </select>

          {(ratingFilter !== 'ALL' || riskFilter !== 'ALL' || searchQuery.trim()) && (
            <button
              onClick={() => {
                setRatingFilter('ALL');
                setRiskFilter('ALL');
                setSearchQuery('');
              }}
              className="text-[11px] text-blue-600 hover:underline ml-2"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Review List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 animate-pulse">
            Loading reviews...
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
            <Check className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <div className="font-semibold text-sm text-slate-800">No reviews found in this view</div>
            <div className="text-xs text-slate-400 mt-1">
              Try adjusting your filter or search query.
            </div>
          </div>
        ) : (
          filteredReviews.map((review) => {
            const reply = review.reply;
            const isEditing = reply && editingReplyId === reply.id;
            const currentDraftText =
              reply && editedTextMap[reply.id] !== undefined
                ? editedTextMap[reply.id]
                : reply?.proposedText || '';

            const sentiment = computeReviewSentiment(review.starRating, review.comment);

            // Determine publish timestamp display
            let timestampDisplay = '';
            if (reply?.publishedAt) {
              timestampDisplay = `Published on ${new Date(reply.publishedAt).toLocaleString()}`;
            } else if (reply?.status === 'AUTO_PUBLISHED') {
              timestampDisplay = `Auto-published on ${new Date(reply.updatedAt).toLocaleString()}`;
            } else if (reply?.status === 'REJECTED') {
              timestampDisplay = `Rejected on ${new Date(reply.updatedAt).toLocaleString()}`;
            } else {
              timestampDisplay = `Created: ${new Date(review.reviewCreatedAt).toLocaleDateString()}`;
            }

            return (
              <div
                key={review.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-slate-300 transition space-y-4"
              >
                {/* 1. Header: Reviewer Name, Rating, Sentiment, Risk, Status */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {review.author.displayName}
                      </span>

                      {/* Rating (Stars) */}
                      <div className="flex items-center text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < review.starRating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-200'
                            }`}
                          />
                        ))}
                      </div>

                      {/* Sentiment */}
                      <SentimentBadge sentiment={sentiment} />

                      {/* Publish Timestamp */}
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timestampDisplay}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start">
                    {/* Risk Badge */}
                    {review.riskAssessment && (
                      <RiskBadge
                        riskLevel={review.riskAssessment.riskLevel}
                        flags={review.riskAssessment.flags}
                      />
                    )}

                    {/* Status Badge */}
                    {reply && <StatusBadge status={reply.status} />}
                  </div>
                </div>

                {/* 2. Review Text (Untrusted User Content) */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 flex items-center gap-1">
                    <span>Google Review (Untrusted User Content)</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-800 italic leading-relaxed">
                    "{review.comment || 'No written comment provided with this star rating.'}"
                  </p>
                </div>

                {/* AI Safety Explanation if flagged */}
                {review.riskAssessment && review.riskAssessment.explanation && (
                  <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50/80 border border-amber-200 px-3 py-2 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{review.riskAssessment.explanation}</span>
                  </div>
                )}

                {/* 3. Generated Reply Section */}
                {reply && (
                  <div className="bg-blue-50/40 rounded-xl p-4 border border-blue-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span>
                          {reply.status === 'AUTO_PUBLISHED'
                            ? 'Auto-Published Reply'
                            : reply.status === 'MANUALLY_PUBLISHED'
                            ? 'Published Reply'
                            : reply.status === 'REJECTED'
                            ? 'Dismissed Draft (No reply sent)'
                            : 'AI Proposed Reply'}
                        </span>
                        {reply.aiModel && (
                          <span className="text-[10px] text-blue-600 font-mono px-1.5 py-0.5 rounded bg-blue-100/70">
                            {reply.aiModel}
                          </span>
                        )}
                      </div>

                      {/* Header Actions: Edit & Regenerate */}
                      {reply.status === 'PENDING_APPROVAL' && !isEditing && (
                        <div className="flex items-center gap-2 text-xs">
                          <button
                            onClick={() => handleStartEdit(reply.id, reply.proposedText)}
                            className="text-slate-600 hover:text-blue-600 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-white"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => handleRegenerateClick(review.id)}
                            disabled={loadingAction === `regen_${review.id}`}
                            className="text-slate-600 hover:text-blue-600 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-white"
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

                    {/* Reply Text or Inline Editor */}
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
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[11px] text-slate-400">
                            {currentDraftText.length} characters &bull; Check for forbidden promises
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingReplyId(null)}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleApproveClick(review.id, reply.id)}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
                            >
                              Save & Publish
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-700 leading-relaxed font-sans">
                        {reply.publishedText || reply.proposedText}
                      </p>
                    )}

                    {/* Pending Actions Footer: Approve, Reject */}
                    {reply.status === 'PENDING_APPROVAL' && !isEditing && (
                      <div className="pt-2 border-t border-blue-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Zero liability admission or discount guarantees in this draft.
                        </span>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {/* Reject Action */}
                          <button
                            onClick={() => handleRejectClick(review.id)}
                            disabled={loadingAction === `reject_${review.id}`}
                            className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition"
                          >
                            <XCircle className="w-3.5 h-3.5 text-slate-500" />
                            <span>Reject</span>
                          </button>

                          {/* Approve Action */}
                          <button
                            onClick={() => handleApproveClick(review.id, reply.id)}
                            disabled={loadingAction === `approve_${review.id}`}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>
                              {loadingAction === `approve_${review.id}`
                                ? 'Publishing...'
                                : 'Approve & Publish'}
                            </span>
                          </button>
                        </div>
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
