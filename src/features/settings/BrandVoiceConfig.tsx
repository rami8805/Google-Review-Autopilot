import React, { useState } from 'react';
import type { BrandVoice } from '../../../shared/types/domain';
import { Save, Check } from 'lucide-react';

interface BrandVoiceConfigProps {
  brandVoice: BrandVoice;
  onSave: (updated: BrandVoice) => Promise<void>;
}

export const BrandVoiceConfig: React.FC<BrandVoiceConfigProps> = ({ brandVoice, onSave }) => {
  const [tone, setTone] = useState(brandVoice.tone);
  const [signOff, setSignOff] = useState(brandVoice.signOffTemplate || '');
  const [ownerTitle, setOwnerTitle] = useState(
    brandVoice.trustedBusinessContext.ownerOrManagerTitle || ''
  );
  const [contactEmail, setContactEmail] = useState(
    brandVoice.trustedBusinessContext.contactEmailForInquiries || ''
  );
  const [contactPhone, setContactPhone] = useState(
    brandVoice.trustedBusinessContext.contactPhoneForInquiries || ''
  );
  const [services, setServices] = useState(
    brandVoice.trustedBusinessContext.coreServicesOffered.join(', ')
  );
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      ...brandVoice,
      tone,
      signOffTemplate: signOff,
      trustedBusinessContext: {
        ...brandVoice.trustedBusinessContext,
        ownerOrManagerTitle: ownerTitle,
        contactEmailForInquiries: contactEmail,
        contactPhoneForInquiries: contactPhone,
        coreServicesOffered: services.split(',').map((s) => s.trim()).filter(Boolean),
      },
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-slate-900">Brand Voice & Trusted Business Context</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Gemini strictly limits its generated replies to the verified business facts provided below.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Reply Tone</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as any)}
            className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="WARM_AND_PROFESSIONAL">Warm & Professional (Recommended)</option>
            <option value="FRIENDLY_AND_CASUAL">Friendly & Casual</option>
            <option value="FORMAL_AND_POLITE">Formal & Polite</option>
            <option value="CONCISE_AND_DIRECT">Concise & Direct</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Public Sign-Off Signature
          </label>
          <textarea
            rows={2}
            value={signOff}
            onChange={(e) => setSignOff(e.target.value)}
            placeholder="e.g. Warm regards, Dr. Sarah & The Downtown Dental Team"
            className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Owner / Representative Title
            </label>
            <input
              type="text"
              value={ownerTitle}
              onChange={(e) => setOwnerTitle(e.target.value)}
              placeholder="e.g. Practice Director / General Manager"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Customer Inquiries Email
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="e.g. care@downtowndental-sf.com"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Customer Inquiries Phone
            </label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="e.g. +1-415-555-0199"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Core Services Offered (Comma-separated)
            </label>
            <input
              type="text"
              value={services}
              onChange={(e) => setServices(e.target.value)}
              placeholder="Cleanings, Whitening, Invisalign, Implants"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs"
          >
            {isSaved ? <Check className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
            <span>{isSaved ? 'Saved Context!' : 'Save Brand Voice'}</span>
          </button>
        </div>
      </div>
    </form>
  );
};
