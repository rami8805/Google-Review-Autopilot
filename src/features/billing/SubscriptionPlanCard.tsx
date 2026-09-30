import React from 'react';
import type { Subscription } from '../../../shared/types/domain';
import { Check, ShieldCheck, Zap } from 'lucide-react';

interface SubscriptionPlanCardProps {
  subscription: Subscription;
}

export const SubscriptionPlanCard: React.FC<SubscriptionPlanCardProps> = ({ subscription }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-slate-900">Subscription & Plan Limits</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Google Review Autopilot is tailored for local businesses with simple, transparent per-location pricing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Starter Plan */}
        <div className={`rounded-2xl border p-6 flex flex-col justify-between ${
          subscription.plan === 'STARTER'
            ? 'bg-blue-50/40 border-blue-500 shadow-sm relative'
            : 'bg-white border-slate-200 shadow-xs'
        }`}>
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
              Perfect for a single practice or local service shop.
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
                <span>AI safety & prompt injection shield</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Approval queue for non-positive reviews</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100">
            <button
              disabled={subscription.plan === 'STARTER'}
              className="w-full py-2.5 rounded-xl font-semibold text-xs border border-blue-600 text-blue-600 hover:bg-blue-50 transition disabled:opacity-50"
            >
              {subscription.plan === 'STARTER' ? 'Active Subscription' : 'Downgrade to Starter'}
            </button>
          </div>
        </div>

        {/* Growth Plan */}
        <div className={`rounded-2xl border p-6 flex flex-col justify-between ${
          subscription.plan === 'GROWTH'
            ? 'bg-blue-50/40 border-blue-500 shadow-sm relative'
            : 'bg-white border-slate-200 shadow-xs'
        }`}>
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
                <span>3 Google Business Profile locations</span>
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
            <button className="w-full py-2.5 rounded-xl font-semibold text-xs bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs">
              Upgrade to Growth
            </button>
          </div>
        </div>

        {/* Pro Plan */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs">
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
                <span>10 Google Business Profile locations</span>
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
            <button className="w-full py-2.5 rounded-xl font-semibold text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 transition">
              Upgrade to Pro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
