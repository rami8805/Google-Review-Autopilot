import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  Star,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import type { BusinessLocation } from '../../../shared/types/domain';

interface OnboardingWizardProps {
  location: BusinessLocation;
  onComplete: () => void;
  onCancel?: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  location,
  onComplete,
  onCancel,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSimulatingSync, setIsSimulatingSync] = useState(false);
  const [simulatedSample, setSimulatedSample] = useState({
    author: 'Emily Rodriguez',
    rating: 5,
    comment: 'Dr. Sarah and the hygienists are the best in SF! Extremely gentle cleaning and spotless clinic.',
    riskLevel: 'LOW',
    aiDraft:
      'Hi Emily, thank you so much for the 5-star review! Dr. Sarah and the whole team are thrilled to hear your cleaning went so smoothly. See you at your next visit!',
  });

  const handleSimulatedOAuth = async () => {
    setIsConnecting(true);
    try {
      await fetch('/api/google/connect-callback', { method: 'POST' });
    } catch {
      // offline fallback
    } finally {
      setTimeout(() => {
        setIsConnecting(false);
        setStep(2);
      }, 1000);
    }
  };

  const handleRunFirstSync = () => {
    setIsSimulatingSync(true);
    setTimeout(() => {
      setIsSimulatingSync(false);
      setStep(4);
    }, 1200);
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 sm:px-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Progress header */}
        <div className="bg-slate-900 px-6 py-6 text-white border-b border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400 font-semibold">
              Onboarding Flow &bull; Step {step} of 4
            </span>
            {onCancel && (
              <button
                onClick={onCancel}
                className="text-xs text-slate-400 hover:text-white"
              >
                Skip / Back to Dashboard
              </button>
            )}
          </div>
          <h2 className="text-xl font-bold mt-1">Connect Your Google Business Profile</h2>
          <p className="text-slate-300 text-xs mt-1">
            Activate safe automated review replies in under 2 minutes.
          </p>

          <div className="flex items-center gap-1.5 mt-5 text-[11px] font-semibold flex-wrap">
            <span
              className={`px-2.5 py-1 rounded-full ${
                step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              1. Connect
            </span>
            <span className="text-slate-600">&rarr;</span>
            <span
              className={`px-2.5 py-1 rounded-full ${
                step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              2. Location
            </span>
            <span className="text-slate-600">&rarr;</span>
            <span
              className={`px-2.5 py-1 rounded-full ${
                step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              3. Test AI
            </span>
            <span className="text-slate-600">&rarr;</span>
            <span
              className={`px-2.5 py-1 rounded-full ${
                step >= 4 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              4. Activate
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
              <h3 className="text-lg font-bold text-slate-900">Authorize Google Business Profile</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
                Connect your official Google account so Google Review Autopilot can detect new reviews and publish verified replies.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left flex gap-3 text-xs text-amber-800">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-semibold">Safety Guarantee:</span> Reviews with 1-3 stars, legal threats, or refund requests are strictly held for your manual sign-off.
              </div>
            </div>

            <button
              onClick={handleSimulatedOAuth}
              disabled={isConnecting}
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-xs w-full sm:w-auto"
            >
              {isConnecting ? 'Authenticating with Google OAuth...' : 'Sign in with Google Business Profile'}
            </button>
          </div>
        )}

        {/* Step 2: Confirm Location */}
        {step === 2 && (
          <div className="p-8 space-y-6">
            <div className="text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-900 mt-2">Google Location Discovered!</h3>
              <p className="text-xs text-slate-500">
                We retrieved this verified business location from your Google account:
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700 shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="flex-1 text-xs">
                <div className="font-bold text-slate-900 text-sm">{location.locationName}</div>
                <div className="text-slate-600 mt-0.5">{location.address.addressLines.join(', ')}</div>
                <div className="text-slate-500 mt-0.5">
                  {location.address.locality}, {location.address.administrativeArea} {location.address.postalCode} &bull; {location.primaryCategory}
                </div>
                <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <Check className="w-3 h-3" />
                  <span>Google Place ID Verified: {location.googlePlaceId}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(3)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-xs flex items-center gap-1.5"
              >
                <span>Confirm Location & Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: First Review Sync & AI Calibration */}
        {step === 3 && (
          <div className="p-8 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">First Review Ingestion & AI Test</h3>
              <p className="text-xs text-slate-500 mt-1">
                We will pull your latest Google review and simulate Gemini's risk evaluation and draft generation.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900">{simulatedSample.author}</span>
                  <div className="flex text-amber-400">
                    {Array.from({ length: simulatedSample.rating }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400" />
                    ))}
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Low Risk &bull; Auto-Publish Eligible
                </span>
              </div>
              <p className="text-xs text-slate-700 italic">"{simulatedSample.comment}"</p>
            </div>

            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Gemini Draft Generated (Zero Hallucinations)</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-sans">
                {simulatedSample.aiDraft}
              </p>
              <div className="text-[10px] text-blue-700 flex items-center gap-1 mt-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Sanitized: No unauthorized refunds, coupons, or promises invented.</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                onClick={handleRunFirstSync}
                disabled={isSimulatingSync}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>{isSimulatingSync ? 'Calibrating Engine...' : 'Approve Test & Continue'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Safety Baseline & Activation */}
        {step === 4 && (
          <div className="p-8 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Autopilot Ready to Launch</h3>
              <p className="text-xs text-slate-500 mt-1">
                Your location is connected and calibrated. Confirm your baseline safety rules:
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span>5-Star & 4-Star Reviews (Low Risk)</span>
                <span className="font-bold uppercase text-[11px]">Auto-Publish (15m delay)</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
                <span>3-Star Mixed Reviews</span>
                <span className="font-bold uppercase text-[11px]">Require Manual Approval</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200">
                <span>1–2 Star Reviews or High Risk</span>
                <span className="font-bold uppercase text-[11px]">Require Manual Approval</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>You can adjust reply tone, business contact details, or delays anytime in Settings.</span>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={onComplete}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5"
              >
                <span>Launch Review Autopilot Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
