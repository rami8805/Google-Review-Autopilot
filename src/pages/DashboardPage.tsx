import React, { useState } from 'react';
import {
  Star,
  Clock,
  ShieldCheck,
  Zap,
  Building2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Sparkles,
  MessageSquare,
  Sliders,
  Send,
  Edit3,
  RotateCw,
  Search,
  Filter,
  Check,
  AlertTriangle,
  Lock,
  ChevronDown,
  ChevronUp,
  MapPin,
  ExternalLink,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import type {
  Review,
  ReviewReply,
  BusinessLocation,
  Subscription,
  AutomationRule,
  BrandVoice,
} from '../../shared/types/domain';

interface DashboardPageProps {
  reviews: (Review & { reply?: ReviewReply })[];
  location: BusinessLocation;
  subscription: Subscription;
  rules?: AutomationRule[];
  brandVoice?: BrandVoice;
  onOpenApprovalQueue: () => void;
  onSyncReviews: () => void;
  isSyncing: boolean;
  onApprove: (reviewId: string, editedText?: string) => Promise<void>;
  onRegenerate: (reviewId: string) => Promise<void>;
  onSimulateReview?: (preset: 'five_star' | 'four_star' | 'three_star' | 'critical_risk') => Promise<void>;
  isSimulatingReview?: boolean;
  onToggleAutomation?: (enabled: boolean) => Promise<void>;
  onNavigateToSettings?: (tab?: string) => void;
  onNavigateToBilling?: () => void;
  onConnectGoogle?: () => void;
  isDemoMode?: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  reviews,
  location,
  subscription,
  rules = [],
  brandVoice,
  onOpenApprovalQueue,
  onSyncReviews,
  isSyncing,
  onApprove,
  onRegenerate,
  onSimulateReview,
  isSimulatingReview = false,
  onToggleAutomation,
  onNavigateToSettings,
  onNavigateToBilling,
  onConnectGoogle,
  isDemoMode = false,
}) => {
  // State for Review Stream Filtering & Search
  const [reviewFilter, setReviewFilter] = useState<'ALL' | 'PENDING' | 'AUTO' | 'MANUAL' | 'NEGATIVE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);

  // State for Inline Draft Editing
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState<string>('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // State for Automation Toggle confirmation
  const [isUpdatingAutomation, setIsUpdatingAutomation] = useState(false);

  // Core KPI Calculations (Real Backend Data)
  const totalReviews = reviews.length;
  const pendingReviews = reviews.filter((r) => r.reply?.status === 'PENDING_APPROVAL');
  const autoPublishedReviews = reviews.filter((r) => r.reply?.status === 'AUTO_PUBLISHED');
  const manuallyPublishedReviews = reviews.filter((r) => r.reply?.status === 'MANUALLY_PUBLISHED');
  const allPublishedReviews = [...autoPublishedReviews, ...manuallyPublishedReviews];

  const fiveStarReviews = reviews.filter((r) => r.starRating === 5);
  const fourStarReviews = reviews.filter((r) => r.starRating === 4);
  const negativeReviews = reviews.filter((r) => r.starRating <= 3);

  const avgRating =
    totalReviews > 0
      ? (reviews.reduce((acc, r) => acc + r.starRating, 0) / totalReviews).toFixed(1)
      : '—';

  const autoPublishRate =
    allPublishedReviews.length > 0
      ? `${Math.round((autoPublishedReviews.length / allPublishedReviews.length) * 100)}%`
      : totalReviews > 0
      ? '0%'
      : '—';

  const isCanceled = subscription.status === 'CANCELED';

  // Handle Inline Approve & Publish
  const handleInlineApprove = async (reviewId: string, replyText?: string) => {
    setActionLoadingId(`approve_${reviewId}`);
    try {
      await onApprove(reviewId, replyText);
      setEditingReviewId(null);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Inline Regenerate
  const handleInlineRegenerate = async (reviewId: string) => {
    setActionLoadingId(`regen_${reviewId}`);
    try {
      await onRegenerate(reviewId);
      setEditingReviewId(null);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Automation Switch
  const handleToggleAutopilot = async () => {
    if (!onToggleAutomation) return;
    setIsUpdatingAutomation(true);
    try {
      await onToggleAutomation(!location.automationEnabled);
    } finally {
      setIsUpdatingAutomation(false);
    }
  };

  // Filter Reviews Stream
  const filteredReviews = reviews.filter((r) => {
    // Status filter
    if (reviewFilter === 'PENDING' && r.reply?.status !== 'PENDING_APPROVAL') return false;
    if (reviewFilter === 'AUTO' && r.reply?.status !== 'AUTO_PUBLISHED') return false;
    if (reviewFilter === 'MANUAL' && r.reply?.status !== 'MANUALLY_PUBLISHED') return false;
    if (reviewFilter === 'NEGATIVE' && r.starRating > 3) return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = r.author.displayName.toLowerCase().includes(q);
      const commentMatch = (r.comment || '').toLowerCase().includes(q);
      const replyMatch = (r.reply?.publishedText || r.reply?.proposedText || '').toLowerCase().includes(q);
      if (!nameMatch && !commentMatch && !replyMatch) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 
        ========================================================================
        1. HERO / ACCOUNT STATE BANNER (5-Second Answer: What's next?)
        Dynamic alert prioritizing required action, caught up state, or warnings
        ========================================================================
      */}
      {isCanceled ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-rose-900">
                Subscription Inactive &bull; Autopilot Suspended
              </h2>
              <p className="text-xs text-rose-700 mt-0.5">
                Your subscription has ended. Automated publishing is halted to prevent unauthorized charges.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToBilling}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition shadow-xs whitespace-nowrap"
          >
            Reactivate Plan
          </button>
        </div>
      ) : !location.isConnected ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-amber-900">
                Google Business Profile Not Connected
              </h2>
              <p className="text-xs text-amber-700 mt-0.5">
                Connect your Google Business Profile to detect customer reviews, run safety checks, and automate approved replies.
              </p>
            </div>
          </div>
          <button
            onClick={onConnectGoogle || (() => (window.location.href = '/api/google/connect'))}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-xs whitespace-nowrap"
          >
            Connect Google Profile
          </button>
        </div>
      ) : pendingReviews.length > 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-amber-950">
                  {pendingReviews.length} {pendingReviews.length === 1 ? 'Review Requires' : 'Reviews Require'} Attention
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-full">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                Gemini prepared safe on-brand drafts for sensitive or negative reviews. Inspect and approve below.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenApprovalQueue}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-xs whitespace-nowrap flex items-center gap-1.5"
          >
            <span>Review Full Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : totalReviews === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <RefreshCw className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Ready to Sync Reviews
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                  Profile Connected
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                <strong className="text-slate-700">{location.locationName}</strong> is connected. Click sync to retrieve your customer reviews from Google Business Profile.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            {isDemoMode && onSimulateReview && (
              <button
                onClick={() => onSimulateReview('five_star')}
                disabled={isSimulatingReview}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
                title="Simulate inbound review to test the AI drafting and safety pipeline"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>{isSimulatingReview ? 'Simulating...' : 'Test Pipeline'}</span>
              </button>
            )}
            <button
              onClick={onSyncReviews}
              disabled={isSyncing}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Reviews'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  You&apos;re All Caught Up
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                  All Reviews Answered
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Autopilot is active and monitoring <strong className="text-slate-700">{location.locationName}</strong> for new customer feedback.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            {isDemoMode && onSimulateReview && (
              <button
                onClick={() => onSimulateReview('five_star')}
                disabled={isSimulatingReview}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
                title="Simulate inbound review to test the AI drafting and safety pipeline"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>{isSimulatingReview ? 'Simulating...' : 'Test Pipeline'}</span>
              </button>
            )}
            <button
              onClick={onSyncReviews}
              disabled={isSyncing}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync with Google'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        2. ACTIONABLE KPI CARDS (Real backend data & Tabular Figures)
        ========================================================================
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Needs Attention */}
        <div
          onClick={pendingReviews.length > 0 ? onOpenApprovalQueue : undefined}
          className={`p-5 rounded-2xl border transition shadow-xs ${
            pendingReviews.length > 0
              ? 'bg-amber-50/40 border-amber-200 cursor-pointer hover:border-amber-300'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Needs Attention</span>
            <Clock
              className={`w-4 h-4 ${
                pendingReviews.length > 0 ? 'text-amber-600' : 'text-slate-400'
              }`}
            />
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
            {pendingReviews.length}
          </div>
          <div className="mt-1 text-xs text-slate-500 flex items-center justify-between">
            <span>{pendingReviews.length > 0 ? 'Requires approval' : 'Queue clear'}</span>
            {pendingReviews.length > 0 && (
              <span className="text-amber-700 font-bold flex items-center gap-0.5 text-[11px]">
                Review now &rarr;
              </span>
            )}
          </div>
        </div>

        {/* Metric 2: Published Google Replies */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Published Replies</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
            {allPublishedReviews.length}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            <span className="text-emerald-700 font-semibold font-mono tabular-nums">
              {autoPublishedReviews.length}
            </span>{' '}
            automated &bull;{' '}
            <span className="text-blue-700 font-semibold font-mono tabular-nums">
              {manuallyPublishedReviews.length}
            </span>{' '}
            manual
          </div>
        </div>

        {/* Metric 3: Autopilot Coverage Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Autopilot Coverage</span>
            <Zap className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
            {autoPublishRate}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {location.automationEnabled ? 'Autopilot active' : 'Autopilot paused (Draft mode)'}
          </div>
        </div>

        {/* Metric 4: Average Google Rating */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Average Google Rating</span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
            {avgRating} {avgRating !== '—' && <span className="text-sm font-normal text-slate-400">/ 5.0</span>}
          </div>
          <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
            Across {totalReviews} synced {totalReviews === 1 ? 'review' : 'reviews'}
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        3. PRIMARY ACTION AREA: REVIEWS NEEDING ATTENTION
        Immediate inline action for reviews awaiting approval
        ========================================================================
      */}
      {pendingReviews.length > 0 && (
        <section className="bg-white rounded-2xl border border-amber-200/80 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Action Center &bull; Reviews Awaiting Your Approval</span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  {pendingReviews.length}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect AI-drafted suggestions, make quick edits, or approve with 1 click to publish directly to Google Business Profile.
              </p>
            </div>
            <button
              onClick={onOpenApprovalQueue}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 self-start sm:self-auto"
            >
              Open Full Queue &rarr;
            </button>
          </div>

          <div className="space-y-4">
            {pendingReviews.slice(0, 3).map((review) => {
              const isEditing = editingReviewId === review.id;
              const isApproving = actionLoadingId === `approve_${review.id}`;
              const isRegenerating = actionLoadingId === `regen_${review.id}`;
              const draftText = isEditing ? editedText : review.reply?.proposedText || '';

              return (
                <div
                  key={review.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3"
                >
                  {/* Customer Review Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {(review.author.displayName || 'G')[0]}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                          <span>{review.author.displayName}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(review.reviewCreatedAt || review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center text-amber-400 mt-0.5">
                          {Array.from({ length: review.starRating }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400" />
                          ))}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full uppercase">
                      Needs Sign-Off
                    </span>
                  </div>

                  {/* Customer Comment */}
                  <p className="text-xs text-slate-700 leading-relaxed italic bg-white p-3 rounded-lg border border-slate-200/80">
                    &ldquo;{review.comment || 'No written text provided.'}&rdquo;
                  </p>

                  {/* Gemini Reply Suggestion Card */}
                  <div className="rounded-lg bg-blue-50/40 border border-blue-200/70 p-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 font-bold text-blue-900">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>Gemini 3.8-Flash Draft</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 text-[10px]">
                        <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>ReplyGuard Passed</span>
                        </span>
                        <span>&bull;</span>
                        <span>Tone: {brandVoice?.tone ? brandVoice.tone.replace(/_/g, ' ') : 'Warm & Professional'}</span>
                      </div>
                    </div>

                    {isEditing ? (
                      <textarea
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        rows={3}
                        className="w-full text-xs p-2.5 rounded-lg border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="Edit reply before publishing..."
                      />
                    ) : (
                      <p className="text-xs text-slate-800 leading-relaxed">
                        {draftText}
                      </p>
                    )}

                    {/* Action Bar */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-blue-100">
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <button
                            onClick={() => setEditingReviewId(null)}
                            className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                          >
                            Cancel
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingReviewId(review.id);
                              setEditedText(review.reply?.proposedText || '');
                            }}
                            className="text-xs text-blue-700 hover:text-blue-800 font-semibold flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Quick Edit</span>
                          </button>
                        )}
                        <span className="text-slate-300">&bull;</span>
                        <button
                          onClick={() => handleInlineRegenerate(review.id)}
                          disabled={isRegenerating || isApproving}
                          className="text-xs text-slate-600 hover:text-slate-800 font-semibold flex items-center gap-1 disabled:opacity-50"
                        >
                          <RotateCw className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                          <span>{isRegenerating ? 'Regenerating...' : 'Regenerate'}</span>
                        </button>
                      </div>

                      <button
                        onClick={() => handleInlineApprove(review.id, isEditing ? editedText : undefined)}
                        disabled={isApproving || isRegenerating}
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Send className="w-3 h-3" />
                        <span>{isApproving ? 'Publishing to Google...' : 'Approve & Publish to Google'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 
        ========================================================================
        4. AUTOMATION & SAFETY CONTROL CENTER
        Deliberate, trustworthy control over Autopilot behavior
        ========================================================================
      */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Automation Status & Rules Snapshot */}
        <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-900">
                    Google Review Autopilot Engine
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      isCanceled
                        ? 'bg-rose-50 text-rose-700'
                        : location.automationEnabled
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {isCanceled
                      ? 'Suspended'
                      : location.automationEnabled
                      ? 'Enabled (Active)'
                      : 'Disabled (Manual Mode)'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Applies strictly to <strong className="text-slate-800">{location.locationName}</strong>.
                </p>
              </div>

              {/* Automation Toggle Switch */}
              <button
                onClick={handleToggleAutopilot}
                disabled={isUpdatingAutomation || isCanceled}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                  location.automationEnabled && !isCanceled ? 'bg-blue-600' : 'bg-slate-300'
                }`}
                title={location.automationEnabled ? 'Turn Autopilot OFF' : 'Turn Autopilot ON'}
                aria-label="Toggle review automation"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    location.automationEnabled && !isCanceled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Rules Breakdown */}
            <div className="mt-4 space-y-2.5 text-xs text-slate-700">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <strong className="text-slate-900">4-Star &amp; 5-Star Reviews:</strong>{' '}
                  {location.automationEnabled
                    ? 'Eligible for auto-publishing after a 15-minute edit grace window.'
                    : 'Held in approval queue (Autopilot is currently turned off).'}
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <strong className="text-slate-900">1-Star, 2-Star &amp; 3-Star Reviews:</strong>{' '}
                  Strictly held in approval queue. Autonomous publishing is barred by rule to protect your reputation.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <strong className="text-slate-900">ReplyGuard™ Safety Active:</strong>{' '}
                  Every response is verified against unauthorized refund offers, liability admissions, employee names, and prompt injection attempts.
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Tone: <strong>{brandVoice?.tone ? brandVoice.tone.replace(/_/g, ' ') : 'Warm & Professional'}</strong>
            </span>
            <button
              onClick={() => onNavigateToSettings?.('rules')}
              className="text-blue-600 hover:text-blue-700 font-bold"
            >
              Configure Rules &amp; Voice &rarr;
            </button>
          </div>
        </section>

        {/* Right Column (1 Col): Google Integration & Location Card */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Google Business Profile</span>
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  location.isConnected
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700'
                }`}
              >
                {location.isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {location.isConnected ? (
              <div className="mt-3 space-y-2 text-xs text-slate-600">
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Verified Business</span>
                  <span className="font-bold text-slate-800">{location.locationName}</span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Storefront Address</span>
                  <span className="text-slate-700">
                    {[
                      location.address.addressLines?.join(', '),
                      location.address.locality,
                      location.address.administrativeArea,
                      location.address.postalCode,
                    ]
                      .filter(Boolean)
                      .join(', ') || 'No physical storefront (Service area)'}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-1 text-[11px]">
                  <span className="text-slate-400">Category:</span>
                  <span className="font-semibold text-slate-700">{location.primaryCategory || 'Local Business'}</span>
                </div>

                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Security:</span>
                  <span className="text-emerald-700 font-semibold">AES-256-GCM Encrypted</span>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-2.5 text-xs text-slate-600">
                <p className="text-xs text-slate-500 leading-relaxed">
                  No Google Business Profile is linked yet. Connect your verified account to sync your verified business name, address, and live Google customer reviews.
                </p>
                <button
                  onClick={onConnectGoogle}
                  className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Connect Google Profile</span>
                </button>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            {location.isConnected ? (
              <button
                onClick={onSyncReviews}
                disabled={isSyncing}
                className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Reviews Now'}</span>
              </button>
            ) : (
              <button
                onClick={onConnectGoogle}
                className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
              >
                <span>Launch Connection Wizard &rarr;</span>
              </button>
            )}
            <span className="text-[11px] text-slate-400">OAuth 2.0 API</span>
          </div>
        </section>
      </div>

      {/* 
        ========================================================================
        5. RECENT REVIEW STREAM WITH FILTERS & SEARCH
        Complete transparent visibility of every review and its reply state
        ========================================================================
      */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              Inbound Google Review Stream
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live records synchronized from Google Business Profile.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reviewer or comment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setReviewFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              reviewFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All Reviews ({totalReviews})
          </button>
          <button
            onClick={() => setReviewFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              reviewFilter === 'PENDING'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Needs Attention ({pendingReviews.length})
          </button>
          <button
            onClick={() => setReviewFilter('AUTO')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              reviewFilter === 'AUTO'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Auto-Published ({autoPublishedReviews.length})
          </button>
          <button
            onClick={() => setReviewFilter('MANUAL')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              reviewFilter === 'MANUAL'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Manually Published ({manuallyPublishedReviews.length})
          </button>
          <button
            onClick={() => setReviewFilter('NEGATIVE')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              reviewFilter === 'NEGATIVE'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            1–3★ Reviews ({negativeReviews.length})
          </button>
        </div>

        {/* Review List */}
        {filteredReviews.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 space-y-2">
            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="font-semibold text-slate-700">No matching reviews found</div>
            <p className="max-w-xs mx-auto text-slate-400">
              {searchQuery ? 'Try clearing your search query.' : 'Sync latest reviews from your Google Business Profile.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredReviews.map((review) => {
              const isExpanded = expandedReviewId === review.id;
              const reply = review.reply;
              const isPublished = reply?.status === 'AUTO_PUBLISHED' || reply?.status === 'MANUALLY_PUBLISHED';
              const isPending = reply?.status === 'PENDING_APPROVAL';

              return (
                <div key={review.id} className="py-3.5 space-y-2 transition hover:bg-slate-50/50 rounded-xl px-2 -mx-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {(review.author.displayName || 'G')[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {review.author.displayName}
                          </span>
                          <span className="text-[11px] text-slate-400 shrink-0">
                            {new Date(review.reviewCreatedAt || review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center text-amber-400">
                            {Array.from({ length: review.starRating }).map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-amber-400" />
                            ))}
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {review.starRating}.0 / 5.0
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 mt-1 line-clamp-2 leading-relaxed">
                          &ldquo;{review.comment || 'No text provided.'}&rdquo;
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0 flex items-center gap-2">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                          reply?.status === 'AUTO_PUBLISHED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : reply?.status === 'MANUALLY_PUBLISHED'
                            ? 'bg-blue-50 text-blue-700'
                            : isPending
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {reply?.status === 'AUTO_PUBLISHED'
                          ? 'Auto-Published'
                          : reply?.status === 'MANUALLY_PUBLISHED'
                          ? 'Published'
                          : isPending
                          ? 'Needs Sign-Off'
                          : 'No Reply'}
                      </span>

                      <button
                        onClick={() => setExpandedReviewId(isExpanded ? null : review.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                        title={isExpanded ? 'Collapse reply' : 'View reply details'}
                        aria-label="Toggle review reply details"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Reply Drawer */}
                  {isExpanded && reply && (
                    <div className="mt-3 ml-11 bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pb-1.5 border-b border-slate-200">
                        <span className="flex items-center gap-1.5 font-bold text-slate-800">
                          <Sparkles className="w-3 h-3 text-blue-600" />
                          <span>
                            {isPublished
                              ? `Published Response (${reply.status === 'AUTO_PUBLISHED' ? 'Autopilot' : 'Manual'})`
                              : 'AI Suggested Response'}
                          </span>
                        </span>
                        <span>Model: {reply.aiModel || 'Gemini 3.8-Flash'}</span>
                      </div>

                      <p className="text-xs text-slate-800 leading-relaxed font-sans">
                        {reply.publishedText || reply.proposedText}
                      </p>

                      {isPending && (
                        <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                          <button
                            onClick={() => handleInlineApprove(review.id)}
                            disabled={actionLoadingId === `approve_${review.id}`}
                            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition"
                          >
                            Approve &amp; Publish
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 
        ========================================================================
        6. SUBSCRIPTION & USAGE SUMMARY
        Transparent billing quota progress without being noisy
        ========================================================================
      */}
      <section className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
              Subscription &bull; {subscription.plan} Plan
            </span>
            <span className="text-[10px] bg-slate-800 text-emerald-400 px-2 py-0.5 rounded font-bold uppercase">
              {subscription.status}
            </span>
          </div>
          <div className="text-base font-bold">
            {allPublishedReviews.length} of {subscription.monthlyReplyLimit} monthly replies used
          </div>
          <p className="text-xs text-slate-400">
            Current billing period active through {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToBilling}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
          >
            Manage Billing &amp; Invoices
          </button>
        </div>
      </section>
    </div>
  );
};
