import React from 'react';
import { DashboardMetrics } from '../features/dashboard/DashboardMetrics';
import type { Review, ReviewReply, BusinessLocation, Subscription } from '../../shared/types/domain';
import { RefreshCw, AlertCircle, WifiOff } from 'lucide-react';

interface DashboardPageProps {
  reviews: (Review & { reply?: ReviewReply })[];
  location: BusinessLocation;
  subscription: Subscription;
  isGoogleConnected: boolean;
  onOpenApprovalQueue: () => void;
  onNavigateBilling: () => void;
  onReconnectGoogle: () => void;
  onSyncReviews?: () => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  isSyncing?: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  reviews,
  location,
  subscription,
  isGoogleConnected,
  onOpenApprovalQueue,
  onNavigateBilling,
  onReconnectGoogle,
  onSyncReviews,
  isLoading,
  error,
  onRetry,
  isSyncing,
}) => {
  // Loading State
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
        <div className="h-20 bg-slate-200 rounded-2xl"></div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl"></div>
          ))}
        </div>
        <div className="h-64 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center max-w-lg mx-auto space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
          <h3 className="text-base font-bold text-rose-900">Failed to load dashboard metrics</h3>
          <p className="text-xs text-rose-700">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardMetrics
        reviews={reviews}
        location={location}
        subscription={subscription}
        isGoogleConnected={isGoogleConnected}
        onOpenApprovalQueue={onOpenApprovalQueue}
        onNavigateBilling={onNavigateBilling}
        onReconnectGoogle={onReconnectGoogle}
        onSyncReviews={onSyncReviews}
        isSyncing={isSyncing}
      />
    </div>
  );
};
