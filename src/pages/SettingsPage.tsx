import React, { useState } from 'react';
import { AutomationRulesConfig } from '../features/settings/AutomationRulesConfig';
import { BrandVoiceConfig } from '../features/settings/BrandVoiceConfig';
import type { AutomationRule, BrandVoice } from '../../shared/types/domain';

interface SettingsPageProps {
  rules: AutomationRule[];
  brandVoice: BrandVoice;
  onSaveRules: (updatedRules: AutomationRule[]) => Promise<void>;
  onSaveBrandVoice: (updatedBrandVoice: BrandVoice) => Promise<void>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  rules,
  brandVoice,
  onSaveRules,
  onSaveBrandVoice,
}) => {
  const [subTab, setSubTab] = useState<'rules' | 'brandVoice'>('rules');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setSubTab('rules')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 ${
            subTab === 'rules'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Automation Rules Matrix
        </button>
        <button
          onClick={() => setSubTab('brandVoice')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 ${
            subTab === 'brandVoice'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Brand Voice & Trusted Context
        </button>
      </div>

      {subTab === 'rules' ? (
        <AutomationRulesConfig rules={rules} onSaveRules={onSaveRules} />
      ) : (
        <BrandVoiceConfig brandVoice={brandVoice} onSave={onSaveBrandVoice} />
      )}
    </div>
  );
};
