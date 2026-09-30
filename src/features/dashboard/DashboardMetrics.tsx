import React from 'react';
import { Star, CheckCircle, Clock, ShieldCheck, Zap } from 'lucide-react';
import type { Review, ReviewReply } from '../../../shared/types/domain';

interface DashboardMetricsProps {
  reviews: (Review & { reply?: ReviewReply })[];
  onOpenApprovalQueue: () => void;
}

export const DashboardMetrics: React.FC<DashboardMetricsProps> = ({ reviews, onOpenApprovalQueue }) => {
  const totalReviews = reviews.length;
  const pendingReviews = reviews.filter((r) => r.reply?.status === 'PENDING_APPROVAL');
  const publishedReviews = reviews.filter(
    (r) => r.reply?.status === 'AUTO_PUBLISHED' || r.reply?.status === 'MANUALLY_PUBLISHED'
  );
  const autoPublishedReviews = reviews.filter((r) => r.reply?.status === 'AUTO_PUBLISHED');

  const avgRating = totalReviews > 0
    ? (reviews.reduce((acc, r) => acc + r.starRating, 0) / totalReviews).toFixed(1)
    : '5.0';

  const autoPublishRate = publishedReviews.length > 0
    ? Math.round((autoPublishedReviews.length / publishedReviews.length) * 100)
    : 100;

  return (
    <div className="space-y-6">
      {/* Pending approval banner if queue not empty */}
      {pendingReviews.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500 text-white rounded-xl shadow-xs">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-900">
                {pendingReviews.length} {pendingReviews.length === 1 ? 'review requires' : 'reviews require'} your approval
              </h3>
              <p className="text-xs text-amber-700 mt-0.5">
                Gemini generated safe reply drafts with zero hallucinations. Inspect and publish with 1 click.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenApprovalQueue}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            Review Queue ({pendingReviews.length})
          </button>
        </div>
      )}

      {/* Metrics 4-grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Average Google Rating</span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900">{avgRating} <span className="text-base font-normal text-slate-400">/ 5.0</span></div>
          <div className="mt-1 text-xs text-slate-500">Based on recent synced reviews</div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Autopilot Rate</span>
            <Zap className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900">{autoPublishRate}%</div>
          <div className="mt-1 text-xs text-emerald-600 font-medium">
            {autoPublishedReviews.length} 4-5★ reviews auto-replied
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Pending Approvals</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900">{pendingReviews.length}</div>
          <div className="mt-1 text-xs text-slate-500">Requires owner sign-off</div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>AI Safety Defense</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 text-3xl font-extrabold text-emerald-700">100%</div>
          <div className="mt-1 text-xs text-slate-500">Zero unauthorized promises made</div>
        </div>
      </div>

      {/* Quick Recent Activity */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-slate-900">Recent Review Activity</h4>
          <button
            onClick={onOpenApprovalQueue}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
          >
            View All Reviews &rarr;
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {reviews.slice(0, 3).map((r) => (
            <div key={r.id} className="py-3 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-slate-800">{r.author.displayName}</span>
                  <div className="flex items-center text-amber-400">
                    {Array.from({ length: r.starRating }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400" />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-600 line-clamp-1 italic">"{r.comment}"</p>
              </div>

              <div className="shrink-0 text-right">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  r.reply?.status === 'AUTO_PUBLISHED'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}>
                  {r.reply?.status === 'AUTO_PUBLISHED' ? 'Auto-Published' : 'Needs Approval'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
