import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, Bot, ArrowRight, Sparkles, Building2, Sliders } from 'lucide-react';
import type { BusinessLocation, BrandVoice } from '../../../shared/types/domain';
import { apiClient } from '../../services/apiClient';

interface OnboardingWizardProps {
  location: BusinessLocation;
  brandVoice?: BrandVoice;
  onComplete: (data: {
    businessType: string;
    businessName: string;
    brandTone: BrandVoice['tone'];
    automationMode: 'SAFE' | 'BALANCED' | 'FULL';
  }) => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  location,
  brandVoice,
  onComplete,
}) => {
  // ASK ONLY:
  // 1. Business type
  // 2. Business name
  // 3. Brand tone
  // 4. Automation mode (DEFAULT: SAFE)

  const [businessType, setBusinessType] = useState(location.primaryCategory || 'Dentist');
  const [businessName, setBusinessName] = useState(location.locationName || 'Downtown Dental Practice');
  const [brandTone, setBrandTone] = useState<BrandVoice['tone']>(
    brandVoice?.tone || 'WARM_AND_PROFESSIONAL'
  );
  const [automationMode, setAutomationMode] = useState<'SAFE' | 'BALANCED' | 'FULL'>('SAFE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Apply the automation mode to client state
    apiClient.applyAutomationMode(automationMode);
    apiClient.updateLocation({
      locationName: businessName,
      primaryCategory: businessType,
      isConnected: true,
      automationEnabled: true,
    });
    apiClient.saveBrandVoice({ tone: brandTone });

    setTimeout(() => {
      setIsSubmitting(false);
      onComplete({
        businessType,
        businessName,
        brandTone,
        automationMode,
      });
    }, 500);
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 sm:px-6 font-sans">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white backdrop-blur-xs">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Set Up Google Review Autopilot</h2>
              <p className="text-blue-100 text-xs mt-0.5">
                Configure your practice and choose your automation safety level. Takes less than a minute.
              </p>
            </div>
          </div>
        </div>

        {/* Form asking ONLY the 4 required fields */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {/* 1. Business Type */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              1. Business Type
            </label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="Dentist">Dental Practice & Orthodontics</option>
              <option value="Auto Repair">Auto Repair & Service Center</option>
              <option value="Restaurant">Restaurant & Cafe</option>
              <option value="Salon & Spa">Hair Salon & Spa</option>
              <option value="Medical Clinic">Medical Clinic & Chiropractic</option>
              <option value="Law Firm">Law Firm & Legal Services</option>
              <option value="Accounting">Accounting & Financial Services</option>
              <option value="Home Services">Home Services (Plumbing, HVAC, Electrical)</option>
              <option value="Retail Store">Local Retail Boutique</option>
              <option value="Other">Other Local Business</option>
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Used by Gemini to ensure industry-appropriate vocabulary and terminology.
            </p>
          </div>

          {/* 2. Business Name */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              2. Business Name
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Downtown Dental Practice"
                className="w-full text-xs pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Your public business name as verified on Google Business Profile.
            </p>
          </div>

          {/* 3. Brand Tone */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              3. Brand Tone
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                {
                  value: 'WARM_AND_PROFESSIONAL' as const,
                  title: 'Warm & Professional',
                  desc: 'Respectful, caring, and trustworthy (Recommended for healthcare & clinics)',
                },
                {
                  value: 'FRIENDLY_AND_CASUAL' as const,
                  title: 'Friendly & Casual',
                  desc: 'Upbeat, approachable, and welcoming (Great for cafes & salons)',
                },
                {
                  value: 'FORMAL_AND_POLITE' as const,
                  title: 'Formal & Polite',
                  desc: 'Courteous, dignified, and restrained (Ideal for legal & accounting)',
                },
                {
                  value: 'CONCISE_AND_DIRECT' as const,
                  title: 'Concise & Direct',
                  desc: 'Quick, efficient, and to-the-point (Great for trades & auto repair)',
                },
              ].map((toneOption) => (
                <div
                  key={toneOption.value}
                  onClick={() => setBrandTone(toneOption.value)}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    brandTone === toneOption.value
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-500'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{toneOption.title}</span>
                    {brandTone === toneOption.value && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">{toneOption.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Automation Mode (DEFAULT: SAFE) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                4. Automation Mode
              </label>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Default: SAFE
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* SAFE */}
              <div
                onClick={() => setAutomationMode('SAFE')}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  automationMode === 'SAFE'
                    ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-500 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900">SAFE</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block mb-2">
                    Maximum Protection
                  </span>
                  <ul className="text-[11px] text-slate-600 space-y-1">
                    <li>&bull; 5★ auto-published (15m delay)</li>
                    <li>&bull; 4★ auto-published (30m delay)</li>
                    <li>&bull; 1-3★ held for approval</li>
                    <li>&bull; Any flagged risk held</li>
                  </ul>
                </div>
                {automationMode === 'SAFE' && (
                  <div className="mt-3 pt-2 border-t border-blue-200/60 text-[10px] font-bold text-blue-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Selected Mode
                  </div>
                )}
              </div>

              {/* BALANCED */}
              <div
                onClick={() => setAutomationMode('BALANCED')}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  automationMode === 'BALANCED'
                    ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-500 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900">BALANCED</span>
                    <Sliders className="w-4 h-4 text-blue-600 shrink-0" />
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block mb-2">
                    Moderate Velocity
                  </span>
                  <ul className="text-[11px] text-slate-600 space-y-1">
                    <li>&bull; 5★ auto-published (10m delay)</li>
                    <li>&bull; 4★ auto-published (15m delay)</li>
                    <li>&bull; 3★ held for 60 min</li>
                    <li>&bull; 1-2★ held for approval</li>
                  </ul>
                </div>
                {automationMode === 'BALANCED' && (
                  <div className="mt-3 pt-2 border-t border-blue-200/60 text-[10px] font-bold text-blue-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Selected Mode
                  </div>
                )}
              </div>

              {/* FULL */}
              <div
                onClick={() => setAutomationMode('FULL')}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  automationMode === 'FULL'
                    ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-500 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900">FULL</span>
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                  </div>
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block mb-2">
                    High Automation
                  </span>
                  <ul className="text-[11px] text-slate-600 space-y-1">
                    <li>&bull; 4-5★ auto-published (5-10m)</li>
                    <li>&bull; 3★ auto-published (30m)</li>
                    <li>&bull; 1-2★ held for approval</li>
                    <li>&bull; Critical risk held</li>
                  </ul>
                </div>
                {automationMode === 'FULL' && (
                  <div className="mt-3 pt-2 border-t border-blue-200/60 text-[10px] font-bold text-blue-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Selected Mode
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Settings can be updated at any time under Settings &bull; Rules
            </span>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-2"
            >
              <span>{isSubmitting ? 'Configuring Autopilot...' : 'Finish Setup & Open Dashboard'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
