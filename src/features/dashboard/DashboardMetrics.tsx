import React from 'react';
import {
  Star,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Zap,
  Building2,
  Wifi,
  WifiOff,
  CreditCard,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import type { Review, ReviewReply, BusinessLocation, Subscription } from '../../../shared/types/domain';
import { RiskBadge } from '../../components/RiskBadge';
import { StatusBadge } from '../../components/StatusBadge';
import { SentimentBadge } from '../../components/SentimentBadge';
import { computeReviewSentiment } from '../../services/apiClient';

interface DashboardMetricsProps {
  reviews: (Review & { reply?: ReviewReply })[];
  location: BusinessLocation;
  subscription: Subscription;
  isGoogleConnected: boolean;
  onOpenApprovalQueue: () => void;
  onNavigateBilling: () => void;
  onReconnectGoogle: () => void;
  onSyncReviews?: () => void;
  isSyncing?: boolean;
}

export const DashboardMetrics: React.FC<DashboardMetricsProps> = ({
  reviews,
  location,
  subscription,
  isGoogleConnected,
  onOpenApprovalQueue,
  onNavigateBilling,
  onReconnectGoogle,
  onSyncReviews,
  isSyncing,
}) => {
  // 1. Reviews handled
  const reviewsHandled = reviews.length;

  // 2. Auto-published
  const autoPublishedReviews = reviews.filter((r) => r.reply?.status === 'AUTO_PUBLISHED');
  const autoPublishedCount = autoPublishedReviews.length;

  // 3. Pending approval
  const pendingReviews = reviews.filter((r) => r.reply?.status === 'PENDING_APPROVAL');
  const pendingCount = pendingReviews.length;

  // 4. High-risk reviews
  const highRiskReviews = reviews.filter(
    (r) => r.riskAssessment?.riskLevel === 'HIGH' || r.riskAssessment?.riskLevel === 'CRITICAL'
  );
  const highRiskCount = highRiskReviews.length;

  // Plan limits
  const monthlyUsed = reviews.filter((r) => r.reply?.status !== 'REJECTED').length;
  const replyLimit = subscription.monthlyReplyLimit || 50;
  const quotaPercent = Math.min(Math.round((monthlyUsed / replyLimit) * 100), 100);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Welcome & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">{location.locationName}</h2>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {location.primaryCategory || 'Local Business'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Google Business Profile ID: <span className="font-mono text-slate-600">{location.googleLocationId}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onSyncReviews && (
            <button
              onClick={onSyncReviews}
              disabled={isSyncing || !isGoogleConnected}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Reviews'}</span>
            </button>
          )}

          {pendingCount > 0 && (
            <button
              onClick={onOpenApprovalQueue}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{pendingCount} Pending Approvals</span>
            </button>
          )}
        </div>
      </div>

      {/* Main 6 Metric Grid (Requested Dashboard KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Reviews Handled */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Reviews Handled</span>
            <Star className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900">{reviewsHandled}</div>
            <div className="mt-1 text-[11px] text-slate-400">Total ingested</div>
          </div>
        </div>

        {/* 2. Auto-Published */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Auto-Published</span>
            <Zap className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-emerald-600">{autoPublishedCount}</div>
            <div className="mt-1 text-[11px] text-emerald-700 font-medium">
              {reviewsHandled > 0 ? Math.round((autoPublishedCount / reviewsHandled) * 100) : 100}% automation rate
            </div>
          </div>
        </div>

        {/* 3. Pending Approval */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Pending Approval</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-amber-600">{pendingCount}</div>
            <div className="mt-1 text-[11px] text-slate-400">Requires owner check</div>
          </div>
        </div>

        {/* 4. High-Risk Reviews */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>High-Risk Reviews</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-3">
            <div className={`text-3xl font-extrabold ${highRiskCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {highRiskCount}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Locked to manual</div>
          </div>
        </div>

        {/* 5. Google Connection Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Google Status</span>
            {isGoogleConnected ? (
              <Wifi className="w-4 h-4 text-emerald-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-rose-600 animate-pulse" />
            )}
          </div>
          <div className="mt-3">
            {isGoogleConnected ? (
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Connected
                </span>
                <div className="mt-1 text-[11px] text-slate-400">Polling active</div>
              </div>
            ) : (
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  Disconnected
                </span>
                <button
                  onClick={onReconnectGoogle}
                  className="mt-1.5 text-[11px] text-blue-600 font-bold hover:underline block"
                >
                  Reconnect now &rarr;
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 6. Current Plan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Current Plan</span>
            <CreditCard className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold text-slate-900">{subscription.plan}</span>
              <button
                onClick={onNavigateBilling}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800"
              >
                Manage
              </button>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all"
                style={{ width: `${quotaPercent}%` }}
              ></div>
            </div>
            <div className="mt-1 text-[10px] text-slate-500">
              {monthlyUsed} / {replyLimit} replies used
            </div>
          </div>
        </div>
      </div>

      {/* Pending Approval Attention Box */}
      {pendingCount > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-950">
                {pendingCount} {pendingCount === 1 ? 'review requires' : 'reviews require'} owner approval
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Safe reply drafts are staged with zero monetary promises or unauthorized commitments.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenApprovalQueue}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition shrink-0"
          >
            <span>Open Approval Inbox</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 7. Recent Activity Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
            <p className="text-xs text-slate-500">Latest review syncs and published responses</p>
          </div>
          <button
            onClick={onOpenApprovalQueue}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
          >
            <span>View All Reviews</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
            <p className="text-xs font-semibold text-slate-700">No review activity recorded yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Reviews will appear automatically once synced.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {reviews.slice(0, 5).map((r) => {
              const sentiment = computeReviewSentiment(r.starRating, r.comment);
              return (
                <div key={r.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{r.author.displayName}</span>
                      <div className="flex items-center text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < r.starRating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <SentimentBadge sentiment={sentiment} />
                      <span className="text-[11px] text-slate-400">
                        {new Date(r.reviewCreatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-1 italic">
                      "{r.comment || 'No written comment.'}"
                    </p>

                    {r.reply?.publishedText && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-blue-500 shrink-0" />
                        <span className="font-semibold text-slate-700">Replied:</span>
                        <span>{r.reply.publishedText}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    {r.riskAssessment && (
                      <RiskBadge
                        riskLevel={r.riskAssessment.riskLevel}
                        flags={r.riskAssessment.flags}
                      />
                    )}
                    {r.reply && <StatusBadge status={r.reply.status} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
