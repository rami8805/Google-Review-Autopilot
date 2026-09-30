import React, { useState } from 'react';
import type {
  AutomationRule,
  BrandVoice,
  BusinessLocation,
} from '../../shared/types/domain';
import { AutomationRulesConfig } from '../features/settings/AutomationRulesConfig';
import { BrandVoiceConfig } from '../features/settings/BrandVoiceConfig';
import {
  apiClient,
  type SensitiveReviewBehaviorSettings,
  type NotificationPreferences,
} from '../services/apiClient';
import {
  Building2,
  Sliders,
  Sparkles,
  ShieldAlert,
  Bell,
  Pause,
  Play,
  Check,
  Save,
  AlertTriangle,
  Lock,
} from 'lucide-react';

interface SettingsPageProps {
  location: BusinessLocation;
  rules: AutomationRule[];
  brandVoice: BrandVoice;
  isAutomationPaused: boolean;
  onSaveLocation: (updatedLocation: Partial<BusinessLocation>) => Promise<void>;
  onSaveRules: (updatedRules: AutomationRule[]) => Promise<void>;
  onSaveBrandVoice: (updatedBrandVoice: BrandVoice) => Promise<void>;
  onToggleAutomation: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  location,
  rules,
  brandVoice,
  isAutomationPaused,
  onSaveLocation,
  onSaveRules,
  onSaveBrandVoice,
  onToggleAutomation,
}) => {
  const [activeTab, setActiveTab] = useState<
    'business' | 'voice' | 'rules' | 'sensitive' | 'notifications' | 'pause'
  >('business');

  // Business info form state
  const [locName, setLocName] = useState(location.locationName);
  const [category, setCategory] = useState(location.primaryCategory || 'Dentist');
  const [address1, setAddress1] = useState(location.address.addressLines[0] || '');
  const [locality, setLocality] = useState(location.address.locality || '');
  const [stateCode, setStateCode] = useState(location.address.administrativeArea || '');
  const [zip, setZip] = useState(location.address.postalCode || '');
  const [phone, setPhone] = useState(location.primaryPhone || '');
  const [businessSaved, setBusinessSaved] = useState(false);

  // Sensitive review behavior state
  const [sensitiveSettings, setSensitiveSettings] = useState<SensitiveReviewBehaviorSettings>(
    apiClient.getSensitiveBehaviors()
  );
  const [sensitiveSaved, setSensitiveSaved] = useState(false);

  // Notification preferences state
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(
    apiClient.getNotificationPreferences()
  );
  const [notifSaved, setNotifSaved] = useState(false);

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveLocation({
      locationName: locName,
      primaryCategory: category,
      primaryPhone: phone,
      address: {
        ...location.address,
        addressLines: [address1, location.address.addressLines[1] || ''].filter(Boolean),
        locality,
        administrativeArea: stateCode,
        postalCode: zip,
      },
    });
    setBusinessSaved(true);
    setTimeout(() => setBusinessSaved(false), 2000);
  };

  const handleSaveSensitive = (e: React.FormEvent) => {
    e.preventDefault();
    apiClient.saveSensitiveBehaviors(sensitiveSettings);
    setSensitiveSaved(true);
    setTimeout(() => setSensitiveSaved(false), 2000);
  };

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    apiClient.saveNotificationPreferences(notifPrefs);
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Autopilot Settings & Configuration</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your practice information, brand voice, automation safety rules, and alerts.
          </p>
        </div>

        {/* Global Pause Automation quick control */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-slate-800">
              {isAutomationPaused ? 'Autopilot: PAUSED' : 'Autopilot: ACTIVE'}
            </div>
            <div className="text-[10px] text-slate-400">
              {isAutomationPaused ? 'All replies require manual click' : '5★ & 4★ auto-publishing enabled'}
            </div>
          </div>
          <button
            onClick={onToggleAutomation}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-xs ${
              isAutomationPaused
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
            }`}
          >
            {isAutomationPaused ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume Automation</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Automation</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-px text-xs font-bold scrollbar-none">
        <button
          onClick={() => setActiveTab('business')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'business'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Business Information</span>
        </button>

        <button
          onClick={() => setActiveTab('voice')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'voice'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Brand Voice & Context</span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'rules'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Automation Rules</span>
        </button>

        <button
          onClick={() => setActiveTab('sensitive')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'sensitive'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Sensitive Review Behavior</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'notifications'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notification Preferences</span>
        </button>

        <button
          onClick={() => setActiveTab('pause')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'pause'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Pause className="w-4 h-4" />
          <span>Pause Automation</span>
        </button>
      </div>

      {/* Tab 1: Business Information */}
      {activeTab === 'business' && (
        <form onSubmit={handleSaveBusiness} className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Google Business Profile Location</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Verified location details synced with your Google Business Profile.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  required
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Category
                </label>
                <input
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Street Address
              </label>
              <input
                type="text"
                required
                value={address1}
                onChange={(e) => setAddress1(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Locality / City</label>
                <input
                  type="text"
                  required
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">State / Province</label>
                <input
                  type="text"
                  required
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Postal Code</label>
                <input
                  type="text"
                  required
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs"
              >
                {businessSaved ? <Check className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
                <span>{businessSaved ? 'Location Saved!' : 'Save Business Info'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tab 2: Brand Voice & Context */}
      {activeTab === 'voice' && (
        <BrandVoiceConfig brandVoice={brandVoice} onSave={onSaveBrandVoice} />
      )}

      {/* Tab 3: Automation Rules */}
      {activeTab === 'rules' && (
        <AutomationRulesConfig rules={rules} onSaveRules={onSaveRules} />
      )}

      {/* Tab 4: Sensitive Review Behavior */}
      {activeTab === 'sensitive' && (
        <form onSubmit={handleSaveSensitive} className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Sensitive Review Safety Guardrails</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Define deterministic behaviors when high-risk or contentious reviews are received.
              </p>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sensitiveSettings.holdLegalThreats}
                  onChange={(e) =>
                    setSensitiveSettings({ ...sensitiveSettings, holdLegalThreats: e.target.checked })
                  }
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-rose-600" />
                    <span>Lock all legal threats to manual approval (CRITICAL)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Any review mentioning attorneys, lawsuits, regulatory agencies, or legal counsel is quarantined immediately.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sensitiveSettings.holdCompensationRequests}
                  onChange={(e) =>
                    setSensitiveSettings({
                      ...sensitiveSettings,
                      holdCompensationRequests: e.target.checked,
                    })
                  }
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Never auto-reply to refund or financial compensation demands
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Reviews demanding chargebacks, refunds, or financial reimbursements are held for management review.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sensitiveSettings.holdSafetyAllegations}
                  onChange={(e) =>
                    setSensitiveSettings({
                      ...sensitiveSettings,
                      holdSafetyAllegations: e.target.checked,
                    })
                  }
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Quarantine medical, health, or physical safety allegations
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Allegations of poisoning, hospital visits, bodily injury, or sanitary violations require manual inspection.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sensitiveSettings.redirectUnresolvedToPrivateContact}
                  onChange={(e) =>
                    setSensitiveSettings({
                      ...sensitiveSettings,
                      redirectUnresolvedToPrivateContact: e.target.checked,
                    })
                  }
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Always redirect unresolved grievances to private customer support channel
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Replies will include verified contact info (e.g. care@downtowndental-sf.com) without public argument.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs"
              >
                {sensitiveSaved ? <Check className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
                <span>{sensitiveSaved ? 'Saved Behaviors!' : 'Save Sensitive Behaviors'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tab 5: Notification Preferences */}
      {activeTab === 'notifications' && (
        <form onSubmit={handleSaveNotifications} className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Email & In-App Alerts</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose when and how your team is notified of new reviews and approval requests.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Recipient Alert Email
              </label>
              <input
                type="email"
                required
                value={notifPrefs.recipientEmail}
                onChange={(e) =>
                  setNotifPrefs({ ...notifPrefs, recipientEmail: e.target.value })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifPrefs.emailOnPendingApproval}
                  onChange={(e) =>
                    setNotifPrefs({ ...notifPrefs, emailOnPendingApproval: e.target.checked })
                  }
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800">Email on Pending Approval</span>
                  <p className="text-[11px] text-slate-500">
                    Receive an immediate email whenever a 1-3★ review is waiting in your queue.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifPrefs.emailOnCriticalRisk}
                  onChange={(e) =>
                    setNotifPrefs({ ...notifPrefs, emailOnCriticalRisk: e.target.checked })
                  }
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800">Email on Critical Risk Detection</span>
                  <p className="text-[11px] text-slate-500">
                    Instant alert if a legal threat, prompt injection, or safety claim is identified.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifPrefs.monthlyPerformanceDigest}
                  onChange={(e) =>
                    setNotifPrefs({
                      ...notifPrefs,
                      monthlyPerformanceDigest: e.target.checked,
                    })
                  }
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800">Monthly Autopilot Digest</span>
                  <p className="text-[11px] text-slate-500">
                    A summary of reviews processed, auto-publish velocity, and average star ratings.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs"
              >
                {notifSaved ? <Check className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
                <span>{notifSaved ? 'Preferences Saved!' : 'Save Notification Preferences'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tab 6: Pause Automation */}
      {activeTab === 'pause' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pause Automatic Review Replies</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Temporarily pause all automated publishing. While paused, Gemini continues to generate safe drafts, but nothing is posted to Google without manual approval.
              </p>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                isAutomationPaused
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              }`}
            >
              {isAutomationPaused ? 'Status: PAUSED' : 'Status: ACTIVE'}
            </span>
          </div>

          <div
            className={`p-4 rounded-xl border text-xs space-y-2 ${
              isAutomationPaused
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div className="font-bold flex items-center gap-1.5">
              {isAutomationPaused ? (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              ) : (
                <Check className="w-4 h-4 text-emerald-600" />
              )}
              <span>{isAutomationPaused ? 'Autopilot is currently paused' : 'Autopilot is actively running'}</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              {isAutomationPaused
                ? 'New reviews will be staged in the Approval Queue with drafted replies. No replies will be dispatched automatically.'
                : '5-star and 4-star low-risk reviews are automatically replied to after their configured grace period delay.'}
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onToggleAutomation}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-xs ${
                isAutomationPaused
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              {isAutomationPaused ? (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Resume Review Autopilot</span>
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause Review Autopilot</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
