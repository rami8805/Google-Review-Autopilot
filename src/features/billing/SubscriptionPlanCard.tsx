import React, { useState } from 'react';
import type { Subscription } from '../../../shared/types/domain';
import {
  Check,
  ShieldCheck,
  Zap,
  CreditCard,
  Calendar,
  AlertTriangle,
  Download,
  CheckCircle2,
  X,
} from 'lucide-react';
import { apiClient, type BillingInvoice } from '../../services/apiClient';

interface SubscriptionPlanCardProps {
  subscription: Subscription;
  onPlanChanged?: (updated: Subscription) => void;
}

export const SubscriptionPlanCard: React.FC<SubscriptionPlanCardProps> = ({
  subscription,
  onPlanChanged,
}) => {
  const [invoices] = useState<BillingInvoice[]>(apiClient.getInvoices());
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelConfirmed, setCancelConfirmed] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState<'STARTER' | 'GROWTH' | 'PRO' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const nextBillingDate = new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handlePlanSelect = async (plan: 'STARTER' | 'GROWTH' | 'PRO') => {
    setIsProcessing(true);
    const updated = await apiClient.changePlan(plan);
    setIsProcessing(false);
    setUpgradingPlan(null);
    setSuccessToast(`Plan successfully changed to ${plan}!`);
    setTimeout(() => setSuccessToast(null), 3000);
    onPlanChanged?.(updated);
  };

  const handleConfirmCancel = async () => {
    setIsProcessing(true);
    const updated = await apiClient.cancelSubscription();
    setIsProcessing(false);
    setShowCancelModal(false);
    setCancelConfirmed(true);
    setSuccessToast('Your subscription will cancel at the end of the current billing cycle.');
    setTimeout(() => setSuccessToast(null), 4000);
    onPlanChanged?.(updated);
  };

  const handleDownloadInvoice = (inv: BillingInvoice) => {
    // Simulated receipt download
    const blob = new Blob(
      [
        `RECEIPT: ${inv.invoiceNumber}\nDate: ${new Date(inv.date).toLocaleDateString()}\nPlan: ${inv.planName}\nAmount: $${inv.amount.toFixed(2)}\nStatus: ${inv.status}\nCustomer: Downtown Dental Practice`,
      ],
      { type: 'text/plain' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${inv.invoiceNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Toast Alert */}
      {successToast && (
        <div className="p-3 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-200 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Current Plan & Subscription Status Overview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Subscription Overview
            </span>
            <div className="flex items-center gap-3 mt-1">
              <h3 className="text-2xl font-extrabold text-slate-900">{subscription.plan} Plan</h3>
              <span
                className={`px-3 py-0.5 rounded-full text-xs font-bold ${
                  subscription.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : subscription.status === 'TRIALING'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {subscription.status}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>
                {subscription.cancelAtPeriodEnd
                  ? 'Access expires on:'
                  : 'Next billing date:'}{' '}
                <strong>{nextBillingDate}</strong>
              </span>
            </span>
          </div>
        </div>

        {/* Quota bar */}
        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-600">Monthly AI Reply Quota</span>
            <span className="font-semibold text-slate-900">
              {subscription.monthlyReplyLimit} replies included
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: '36%' }}
            ></div>
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>18 replies used this period</span>
            <span>{subscription.locationLimit} Google location active</span>
          </div>
        </div>

        {/* Cancel warning if scheduled */}
        {subscription.cancelAtPeriodEnd && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Your subscription is set to cancel at the end of the billing period ({nextBillingDate}).
              You will not be billed again.
            </span>
          </div>
        )}
      </div>

      {/* 2. Upgrade / Plans Comparison Grid */}
      <div>
        <div className="mb-4">
          <h3 className="text-base font-bold text-slate-900">Available Plans & Upgrades</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Switch plans anytime with prorated billing. Upgrade to unlock multiple locations.
          </p>
        </div>

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
                Ideal for single practice or neighborhood shop.
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>1 Google Business location</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Up to 50 AI review replies / month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Injection defense shield</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Approval queue for 1-3★</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100">
              <button
                disabled={subscription.plan === 'STARTER' || isProcessing}
                onClick={() => handlePlanSelect('STARTER')}
                className="w-full py-2.5 rounded-xl font-semibold text-xs border border-blue-600 text-blue-600 hover:bg-blue-50 transition disabled:opacity-50"
              >
                {subscription.plan === 'STARTER' ? 'Current Plan' : 'Downgrade to Starter'}
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
                For expanding practices with multiple branch locations.
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>3 Google Business locations</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>200 AI replies / month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Custom brand voice per branch</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Priority email notifications</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100">
              <button
                disabled={subscription.plan === 'GROWTH' || isProcessing}
                onClick={() => handlePlanSelect('GROWTH')}
                className={`w-full py-2.5 rounded-xl font-semibold text-xs transition shadow-xs ${
                  subscription.plan === 'GROWTH'
                    ? 'border border-blue-600 text-blue-600 disabled:opacity-50'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
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
                For regional multi-clinic or franchise operations.
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>10 Google Business locations</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Unlimited AI replies</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Custom safe phrase whitelisting</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Dedicated support manager</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100">
              <button
                disabled={subscription.plan === 'PRO' || isProcessing}
                onClick={() => handlePlanSelect('PRO')}
                className={`w-full py-2.5 rounded-xl font-semibold text-xs transition shadow-xs ${
                  subscription.plan === 'PRO'
                    ? 'border border-blue-600 text-blue-600 disabled:opacity-50'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {subscription.plan === 'PRO' ? 'Current Plan' : 'Upgrade to Pro'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Billing History & Invoices */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Billing History & Invoices</h3>
            <p className="text-xs text-slate-500">Download receipts and tax invoices</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <CreditCard className="w-4 h-4 text-slate-400" />
            <span>Card on file: Visa ending in 4242</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-4">Invoice</th>
                <th className="py-2.5 px-4">Billing Date</th>
                <th className="py-2.5 px-4">Plan / Description</th>
                <th className="py-2.5 px-4">Amount</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-mono font-medium text-slate-900">{inv.invoiceNumber}</td>
                  <td className="py-3 px-4">{new Date(inv.date).toLocaleDateString()}</td>
                  <td className="py-3 px-4">{inv.planName}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">${inv.amount.toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDownloadInvoice(inv)}
                      className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>PDF</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Cancel Subscription Section */}
      {!subscription.cancelAtPeriodEnd && (
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold text-slate-800">Cancel Subscription</h4>
            <p className="text-[11px] text-slate-500">
              You can cancel your subscription at any time. You will retain access until the end of the current billing cycle.
            </p>
          </div>
          <button
            onClick={() => setShowCancelModal(true)}
            className="px-4 py-2 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition shrink-0"
          >
            Cancel Subscription
          </button>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Cancel Subscription?</h3>
                <p className="text-xs text-slate-500">We're sorry to see you go.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              If you cancel, automated review publishing will remain active until{' '}
              <strong>{nextBillingDate}</strong>. After that date, reviews will no longer receive safe AI reply drafts.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                {isProcessing ? 'Processing...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
