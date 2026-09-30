import React, { useState } from 'react';
import type { Subscription, SubscriptionPlan, SubscriptionStatus } from '../../../shared/types/domain';
import { Check, ShieldCheck, Zap, AlertTriangle, AlertCircle, RefreshCw, CreditCard } from 'lucide-react';

interface SubscriptionPlanCardProps {
  subscription: Subscription;
  onUpdateSubscription?: (plan?: SubscriptionPlan, status?: SubscriptionStatus) => Promise<void>;
}

export const SubscriptionPlanCard: React.FC<SubscriptionPlanCardProps> = ({
  subscription,
  onUpdateSubscription,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const handlePlanChange = async (plan: SubscriptionPlan) => {
    if (!onUpdateSubscription) return;
    setIsUpdating(true);
    try {
      await onUpdateSubscription(plan, 'ACTIVE');
      setActionFeedback(`Successfully switched plan to ${plan}!`);
      setTimeout(() => setActionFeedback(null), 3000);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = async (status: SubscriptionStatus) => {
    if (!onUpdateSubscription) return;
    setIsUpdating(true);
    try {
      await onUpdateSubscription(subscription.plan, status);
      setActionFeedback(`Subscription state updated to ${status}!`);
      setTimeout(() => setActionFeedback(null), 3000);
    } finally {
      setIsUpdating(false);
    }
  };

  const isCanceled = subscription.status === 'CANCELED';
  const isPastDue = subscription.status === 'PAST_DUE';
  const isTrial = subscription.status === 'TRIALING';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Subscription & Billing Entitlements</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent per-location pricing for local businesses. Easily manage plans and entitlements.
          </p>
        </div>

        {/* Current status chip */}
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
              isCanceled
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : isPastDue
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : isTrial
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {subscription.status}
          </span>
        </div>
      </div>

      {actionFeedback && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
          {actionFeedback}
        </div>
      )}

      {/* Subscription Warnings if Canceled or Past Due */}
      {isCanceled && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between text-xs text-rose-900 shadow-xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold">Autopilot Paused:</span> Your subscription has been cancelled. Review auto-publishing is suspended and new reviews will remain unreplied until you reactivate.
            </div>
          </div>
          <button
            onClick={() => handleStatusChange('ACTIVE')}
            disabled={isUpdating}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shrink-0"
          >
            Reactivate Plan
          </button>
        </div>
      )}

      {isPastDue && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-amber-900 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <span className="font-bold">Payment Overdue:</span> Please update your payment method in the Paddle Customer Portal to avoid autopilot interruption.
          </div>
        </div>
      )}

      {/* Usage & Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div>
          <span className="text-xs text-slate-400 font-medium">Current Tier</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{subscription.plan}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {subscription.plan === 'STARTER' ? '$29/mo' : subscription.plan === 'GROWTH' ? '$69/mo' : '$149/mo'}
          </div>
        </div>

        <div>
          <span className="text-xs text-slate-400 font-medium">Locations Managed</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            1 <span className="text-sm font-normal text-slate-400">/ {subscription.locationLimit} permitted</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full"
              style={{ width: `${Math.min((1 / subscription.locationLimit) * 100, 100)}%` }}
            />
          </div>
        </div>

        <div>
          <span className="text-xs text-slate-400 font-medium">Monthly AI Reply Quota</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            14 <span className="text-sm font-normal text-slate-400">/ {subscription.monthlyReplyLimit} used</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full"
              style={{ width: `${Math.min((14 / subscription.monthlyReplyLimit) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Simulator bar for testing Phase 8 lifecycle */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-slate-600" />
          <span className="font-bold text-slate-800">Billing Lifecycle Tester (Paddle Sandbox):</span>
          <span className="text-slate-500">Test how app entitlements respond to state changes.</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => handleStatusChange('ACTIVE')}
            disabled={isUpdating}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
              subscription.status === 'ACTIVE'
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => handleStatusChange('TRIALING')}
            disabled={isUpdating}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
              subscription.status === 'TRIALING'
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Trialing
          </button>
          <button
            onClick={() => handleStatusChange('PAST_DUE')}
            disabled={isUpdating}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
              subscription.status === 'PAST_DUE'
                ? 'bg-amber-600 text-white'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Past Due
          </button>
          <button
            onClick={() => handleStatusChange('CANCELED')}
            disabled={isUpdating}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
              subscription.status === 'CANCELED'
                ? 'bg-rose-600 text-white'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Cancel / Paused
          </button>
        </div>
      </div>

      {/* 3-Tier Plan Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Starter Plan */}
        <div
          className={`rounded-2xl border p-6 flex flex-col justify-between ${
            subscription.plan === 'STARTER'
              ? 'bg-blue-50/40 border-blue-500 shadow-sm relative'
              : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          {subscription.plan === 'STARTER' && (
            <div className="absolute -top-3 right-6 bg-blue-600 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Current Plan
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              <h4 className="font-bold text-slate-900 text-sm">Starter (Single Location)</h4>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-slate-900">$29</span>
              <span className="text-slate-500 text-xs"> / month</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Perfect for a single practice or local shop.
            </p>

            <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>1 Google Business Profile location</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Up to 50 AI review replies / month</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>AI safety & prompt injection defense</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Approval queue for 1–3★ reviews</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100">
            <button
              onClick={() => handlePlanChange('STARTER')}
              disabled={subscription.plan === 'STARTER' || isUpdating}
              className="w-full py-2.5 rounded-xl font-semibold text-xs border border-blue-600 text-blue-600 hover:bg-blue-50 transition disabled:opacity-50"
            >
              {subscription.plan === 'STARTER' ? 'Current Plan' : 'Switch to Starter'}
            </button>
          </div>
        </div>

        {/* Growth Plan */}
        <div
          className={`rounded-2xl border p-6 flex flex-col justify-between ${
            subscription.plan === 'GROWTH'
              ? 'bg-blue-50/40 border-blue-500 shadow-sm relative'
              : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          {subscription.plan === 'GROWTH' && (
            <div className="absolute -top-3 right-6 bg-blue-600 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Current Plan
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-600" />
              <h4 className="font-bold text-slate-900 text-sm">Growth (Up to 3 Locations)</h4>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-slate-900">$69</span>
              <span className="text-slate-500 text-xs"> / month</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              For expanding local businesses with multiple clinic or branch locations.
            </p>

            <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Up to 3 Google Business Profile locations</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Up to 200 AI review replies / month</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Custom brand voice per location</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Priority email notifications</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100">
            <button
              onClick={() => handlePlanChange('GROWTH')}
              disabled={subscription.plan === 'GROWTH' || isUpdating}
              className="w-full py-2.5 rounded-xl font-semibold text-xs bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs disabled:opacity-50"
            >
              {subscription.plan === 'GROWTH' ? 'Current Plan' : 'Upgrade to Growth'}
            </button>
          </div>
        </div>

        {/* Pro Plan */}
        <div
          className={`rounded-2xl border p-6 flex flex-col justify-between ${
            subscription.plan === 'PRO'
              ? 'bg-blue-50/40 border-blue-500 shadow-sm relative'
              : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          {subscription.plan === 'PRO' && (
            <div className="absolute -top-3 right-6 bg-blue-600 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Current Plan
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-slate-700" />
              <h4 className="font-bold text-slate-900 text-sm">Pro (Up to 10 Locations)</h4>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-slate-900">$149</span>
              <span className="text-slate-500 text-xs"> / month</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              For regional local business operators.
            </p>

            <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Up to 10 Google Business Profile locations</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Unlimited review reply generations</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Dedicated account manager support</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100">
            <button
              onClick={() => handlePlanChange('PRO')}
              disabled={subscription.plan === 'PRO' || isUpdating}
              className="w-full py-2.5 rounded-xl font-semibold text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
            >
              {subscription.plan === 'PRO' ? 'Current Plan' : 'Upgrade to Pro'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
