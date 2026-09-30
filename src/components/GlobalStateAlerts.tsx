import React from 'react';
import { AlertTriangle, WifiOff, CreditCard, Clock, RefreshCw, Play, Pause } from 'lucide-react';

interface GlobalStateAlertsProps {
  isGoogleConnected: boolean;
  isSessionExpired: boolean;
  isSubscriptionActive: boolean;
  isAutomationPaused: boolean;
  onReconnectGoogle: () => void;
  onRefreshSession: () => void;
  onNavigateBilling: () => void;
  onResumeAutomation: () => void;
}

export const GlobalStateAlerts: React.FC<GlobalStateAlertsProps> = ({
  isGoogleConnected,
  isSessionExpired,
  isSubscriptionActive,
  isAutomationPaused,
  onReconnectGoogle,
  onRefreshSession,
  onNavigateBilling,
  onResumeAutomation,
}) => {
  return (
    <div className="space-y-2">
      {/* Expired Session Alert Modal / Top Banner */}
      {isSessionExpired && (
        <div className="bg-rose-600 text-white px-4 py-3 shadow-md flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-2.5 font-medium">
            <Clock className="w-4 h-4 shrink-0 text-rose-200 animate-pulse" />
            <span>
              <strong>Session Expired:</strong> Your authentication session has timed out. Please sign in again to sync new reviews or publish replies.
            </span>
          </div>
          <button
            onClick={onRefreshSession}
            className="px-3 py-1.5 rounded-lg bg-white text-rose-700 font-bold text-xs hover:bg-rose-50 transition shrink-0 ml-4 flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-authenticate</span>
          </button>
        </div>
      )}

      {/* Disconnected Google Account Banner */}
      {!isGoogleConnected && (
        <div className="bg-amber-500 text-white px-4 py-3 shadow-xs flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-2.5 font-medium">
            <WifiOff className="w-4 h-4 shrink-0 text-amber-100" />
            <span>
              <strong>Google Business Profile Disconnected:</strong> OAuth token revoked or expired. Review synchronization and automated replies are halted.
            </span>
          </div>
          <button
            onClick={onReconnectGoogle}
            className="px-3 py-1.5 rounded-lg bg-white text-amber-800 font-bold text-xs hover:bg-amber-50 transition shrink-0 ml-4 shadow-xs"
          >
            Reconnect Google
          </button>
        </div>
      )}

      {/* Inactive / Past Due Subscription Banner */}
      {!isSubscriptionActive && (
        <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between text-xs border-b border-slate-800">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-rose-400" />
            <span>
              <strong>Subscription Inactive or Past Due:</strong> Automatic publishing is temporarily paused until payment method is updated.
            </span>
          </div>
          <button
            onClick={onNavigateBilling}
            className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[11px] transition shrink-0 ml-3"
          >
            Update Payment Details
          </button>
        </div>
      )}

      {/* Automation Paused Notification */}
      {isAutomationPaused && (
        <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl text-xs text-blue-900 flex items-center justify-between mx-4 sm:mx-6 lg:mx-8 mt-2">
          <div className="flex items-center gap-2 font-medium">
            <Pause className="w-3.5 h-3.5 text-blue-600" />
            <span>
              <strong>Autopilot Paused:</strong> All review replies are currently held for manual review. No automatic posts will be sent to Google.
            </span>
          </div>
          <button
            onClick={onResumeAutomation}
            className="px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold text-xs flex items-center gap-1 transition"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Resume Autopilot</span>
          </button>
        </div>
      )}
    </div>
  );
};
