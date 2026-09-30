import React, { useState } from 'react';
import { Building2, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { BusinessLocation } from '../../../shared/types/domain';

interface OnboardingWizardProps {
  location: BusinessLocation;
  onComplete: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ location, onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleSimulatedOAuth = () => {
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      setStep(2);
    }, 1200);
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Progress header */}
        <div className="bg-blue-600 px-6 py-6 text-white">
          <h2 className="text-xl font-bold">Welcome to Google Review Autopilot</h2>
          <p className="text-blue-100 text-sm mt-1">
            Connect your Google Business Profile and activate safe automated replies in 2 minutes.
          </p>
          <div className="flex items-center gap-2 mt-4 text-xs font-semibold">
            <span className={`px-2.5 py-1 rounded-full ${step >= 1 ? 'bg-white text-blue-700' : 'bg-blue-500 text-blue-200'}`}>
              1. Connect Google
            </span>
            <span>&rarr;</span>
            <span className={`px-2.5 py-1 rounded-full ${step >= 2 ? 'bg-white text-blue-700' : 'bg-blue-500 text-blue-200'}`}>
              2. Confirm Location
            </span>
            <span>&rarr;</span>
            <span className={`px-2.5 py-1 rounded-full ${step >= 3 ? 'bg-white text-blue-700' : 'bg-blue-500 text-blue-200'}`}>
              3. Set Safety Rules
            </span>
          </div>
        </div>

        {/* Step 1: Connect Google Business Profile */}
        {step === 1 && (
          <div className="p-8 space-y-6 text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Connect Google Business Profile</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-2">
                Authorize Google Review Autopilot to fetch new reviews and post replies on your behalf.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left flex gap-3 text-xs text-amber-800">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-semibold">Safe Autopilot Guarantee:</span> Negative reviews (1-3 stars) and risky feedback are NEVER published automatically without your manual approval.
              </div>
            </div>

            <button
              onClick={handleSimulatedOAuth}
              disabled={isConnecting}
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition shadow-sm w-full sm:w-auto"
            >
              {isConnecting ? 'Authenticating with Google...' : 'Sign in with Google Business Profile'}
            </button>
          </div>
        )}

        {/* Step 2: Confirm Location */}
        {step === 2 && (
          <div className="p-8 space-y-6">
            <div className="text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-lg font-bold text-slate-900 mt-2">Location Discovered!</h3>
              <p className="text-sm text-slate-500">We found the following verified location in your Google account:</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-4">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="flex-1 text-sm">
                <div className="font-bold text-slate-900">{location.locationName}</div>
                <div className="text-slate-600">{location.address.addressLines.join(', ')}</div>
                <div className="text-slate-500 text-xs">
                  {location.address.locality}, {location.address.administrativeArea} {location.address.postalCode} • {location.primaryCategory}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(3)}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition"
              >
                Confirm & Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Default Safety Confirmation */}
        {step === 3 && (
          <div className="p-8 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Safety & Automation Baseline</h3>
              <p className="text-sm text-slate-500 mt-1">Review the default automation rules protecting your business:</p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span>5-Star & 4-Star Reviews (Low Risk)</span>
                <span className="font-bold uppercase">Auto-Publish (15 min delay)</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                <span>3-Star Reviews</span>
                <span className="font-bold uppercase">Require Manual Approval</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
                <span>1–2 Star Reviews or High Risk</span>
                <span className="font-bold uppercase">Require Manual Approval</span>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={onComplete}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition"
              >
                Activate Autopilot
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
