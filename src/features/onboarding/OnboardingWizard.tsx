import React, { useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  Star,
  ArrowRight,
  ShieldCheck,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { BusinessLocation, Review, ReviewReply } from '../../../shared/types/domain';
import { useAuth } from '../../context/AuthContext';

interface OnboardingWizardProps {
  location: BusinessLocation;
  onComplete: (location?: BusinessLocation) => void;
  onCancel?: () => void;
}

type ReviewWithReply = Review & { reply?: ReviewReply };

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  location,
  onComplete,
  onCancel,
}) => {
  const { getAuthHeaders, token } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [enableAutomation, setEnableAutomation] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [connectedLocation, setConnectedLocation] = useState<BusinessLocation | null>(
    location.isConnected ? location : null
  );
  const [latestReview, setLatestReview] = useState<ReviewWithReply | null>(null);
  const [syncSummary, setSyncSummary] = useState<{ newReviewsFound: number; locationsChecked: number } | null>(null);
  const [copiedRedirectUri, setCopiedRedirectUri] = useState(false);
  const [copiedOrigin, setCopiedOrigin] = useState(false);

  // Real verified business form state
  const [bizName, setBizName] = useState(location.locationName || '');
  const [bizAddress, setBizAddress] = useState(location.address?.addressLines?.[0] || '');
  const [bizCity, setBizCity] = useState(location.address?.locality || '');
  const [bizState, setBizState] = useState(location.address?.administrativeArea || '');
  const [bizZip, setBizZip] = useState(location.address?.postalCode || '');
  const [bizCategory, setBizCategory] = useState(location.primaryCategory || 'Local Business');
  const [bizPhone, setBizPhone] = useState(location.primaryPhone || '');
  const [bizPlaceId, setBizPlaceId] = useState('');
  const [activeTab, setActiveTab] = useState<'oauth' | 'manual'>('oauth');

  const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/onboarding` : '';

  const copyOrigin = () => {
    if (navigator.clipboard && originUrl) {
      navigator.clipboard.writeText(originUrl);
      setCopiedOrigin(true);
      setTimeout(() => setCopiedOrigin(false), 2500);
    }
  };

  const copyRedirectUri = () => {
    if (navigator.clipboard && redirectUri) {
      navigator.clipboard.writeText(redirectUri);
      setCopiedRedirectUri(true);
      setTimeout(() => setCopiedRedirectUri(false), 2500);
    }
  };

  const oauthAttemptedRef = React.useRef(false);

  // Google redirects back to the configured GOOGLE_REDIRECT_URI. Configure it to this
  // application's /onboarding URL so the authenticated client can complete the callback.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const oauthError = params.get('error');

    if (oauthError) {
      setError(oauthError === 'access_denied'
        ? 'Google authorization was cancelled. You can try again when ready.'
        : 'Google authorization failed. Please try again.');
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }
    if (!code || !state) return;
    if (oauthAttemptedRef.current) return;
    if (!token) return;

    oauthAttemptedRef.current = true;
    let cancelled = false;

    const completeOAuth = async () => {
      setIsConnecting(true);
      setError('');
      setStatusMessage('Verifying the Google authorization and retrieving your business location…');
      try {
        const response = await fetch('/api/google/connect-callback', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ code, state }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success || !payload?.data?.location) {
          throw new Error(payload?.error?.message || 'Google connection could not be completed.');
        }
        if (cancelled) return;
        setConnectedLocation(payload.data.location as BusinessLocation);
        setStatusMessage('Google Business Profile connected successfully.');
        setStep(2);
      } catch (err) {
        if (!cancelled) {
          console.error('[Onboarding] OAuth exchange note:', err);
          setError(err instanceof Error ? err.message : 'Google connection could not be completed.');
        }
      } finally {
        window.history.replaceState({}, document.title, window.location.pathname);
        if (!cancelled) setIsConnecting(false);
      }
    };
    void completeOAuth();
    return () => { cancelled = true; };
  }, [token]);

  const handleConnectGoogle = async () => {
    setIsConnecting(true);
    setError('');
    setStatusMessage('');
    try {
      const response = await fetch('/api/google/connect', {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const payload = await response.json().catch(() => null);
      const authUrl = payload?.data?.authUrl;
      if (!response.ok || !payload?.success || typeof authUrl !== 'string') {
        throw new Error(payload?.error?.message || 'Unable to start Google authorization. Check the server OAuth configuration.');
      }
      window.location.assign(authUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start Google authorization.');
      setIsConnecting(false);
    }
  };

  const handleConnectVerifiedBusiness = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!bizName.trim()) {
      setError('Please provide your business name.');
      return;
    }
    setIsConnecting(true);
    setError('');
    setStatusMessage('Connecting your verified business profile…');
    try {
      const response = await fetch('/api/google/connect-business', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          locationName: bizName.trim(),
          addressLines: bizAddress.trim() ? [bizAddress.trim()] : [],
          locality: bizCity.trim(),
          administrativeArea: bizState.trim(),
          postalCode: bizZip.trim(),
          country: 'US',
          primaryCategory: bizCategory.trim() || 'Local Business',
          primaryPhone: bizPhone.trim() || undefined,
          googlePlaceId: bizPlaceId.trim() || undefined,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success || !payload?.data?.location) {
        throw new Error(payload?.error?.message || 'Could not connect verified business profile.');
      }
      setConnectedLocation(payload.data.location as BusinessLocation);
      setStatusMessage('Your verified business profile was connected successfully.');
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect verified business profile.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRunFirstSync = async () => {
    if (!connectedLocation?.isConnected) {
      setError('Connect a Google Business Profile location before syncing reviews.');
      setStep(1);
      return;
    }
    setIsSyncing(true);
    setError('');
    setStatusMessage('Fetching real reviews from Google Business Profile and generating guarded reply drafts…');
    try {
      const syncResponse = await fetch('/api/google/sync-reviews', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Idempotency-Key': `onboarding-sync-${connectedLocation.id}-${Date.now()}` },
      });
      const syncPayload = await syncResponse.json().catch(() => null);
      if (!syncResponse.ok || !syncPayload?.success) {
        const detail = syncPayload?.data?.failures?.[0]?.message;
        throw new Error(detail || syncPayload?.error?.message || 'The first Google review sync failed.');
      }
      setSyncSummary({
        newReviewsFound: Number(syncPayload.data?.newReviewsFound || 0),
        locationsChecked: Number(syncPayload.data?.locationsChecked || 0),
      });

      const reviewsResponse = await fetch('/api/reviews', { headers: getAuthHeaders() });
      const reviewsPayload = await reviewsResponse.json().catch(() => null);
      if (!reviewsResponse.ok || !reviewsPayload?.success || !Array.isArray(reviewsPayload.data)) {
        throw new Error(reviewsPayload?.error?.message || 'Reviews synced, but the review list could not be loaded.');
      }
      const sortedReviews = [...reviewsPayload.data].sort((a: ReviewWithReply, b: ReviewWithReply) =>
        new Date(b.reviewCreatedAt).getTime() - new Date(a.reviewCreatedAt).getTime()
      );
      setLatestReview(sortedReviews[0] || null);
      setStatusMessage('Google review sync completed successfully.');
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review sync failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    setError('');
    if (!connectedLocation) {
      setError('A verified Google Business Profile location is required to finish onboarding.');
      return;
    }

    if (!enableAutomation) {
      onComplete({ ...connectedLocation, automationEnabled: false });
      return;
    }

    setIsActivating(true);
    try {
      const response = await fetch('/api/google/automation', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ locationId: connectedLocation.id, enabled: true }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success || !payload?.data?.location) {
        throw new Error(payload?.error?.message || 'Could not enable review automation.');
      }
      const savedLocation = payload.data.location as BusinessLocation;
      setConnectedLocation(savedLocation);
      onComplete(savedLocation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enable review automation.');
    } finally {
      setIsActivating(false);
    }
  };

  const activeLocation = connectedLocation || location;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 sm:px-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 px-6 py-6 text-white border-b border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400 font-semibold">
              Onboarding Flow &bull; Step {step} of 4
            </span>
            {onCancel && (
              <button onClick={onCancel} className="text-xs text-slate-400 hover:text-white">
                Back to Dashboard
              </button>
            )}
          </div>
          <h2 className="text-xl font-bold mt-1">Connect Your Google Business Profile</h2>
          <p className="text-slate-300 text-xs mt-1">
            Connect your account, sync real reviews, and verify the first AI reply drafts.
          </p>
          <div className="flex items-center gap-1.5 mt-5 text-[11px] font-semibold flex-wrap">
            {(['Connect', 'Location', 'First Sync', 'Activate'] as const).map((label, index) => (
              <React.Fragment key={label}>
                {index > 0 && <span className="text-slate-600">&rarr;</span>}
                <span className={`px-2.5 py-1 rounded-full ${step >= index + 1 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {index + 1}. {label}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>

        {(error || statusMessage) && (
          <div className={`mx-6 mt-5 rounded-xl border p-4 text-xs flex items-start gap-3 ${error ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
            {error ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" /> : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />}
            <div>
              <p className="font-semibold">{error || statusMessage}</p>
              {error && (
                <p className="text-[11px] text-rose-700 mt-1">
                  You can connect via Google OAuth or verify your business details directly below.
                </p>
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100 mb-3">
                <Building2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Connect Your Verified Business</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                Connect your business to detect Google customer reviews, run safety checks, and publish automated replies.
              </p>
            </div>

            {/* Connection Method Tabs */}
            <div className="flex border-b border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('oauth')}
                className={`flex-1 py-2.5 text-center border-b-2 transition ${
                  activeTab === 'oauth'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                1. Official Google OAuth
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`flex-1 py-2.5 text-center border-b-2 transition ${
                  activeTab === 'manual'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                2. Enter Verified Business Details
              </button>
            </div>

            {activeTab === 'oauth' ? (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Direct Google Business Profile OAuth 2.0</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Authorizing Google Business Profile will automatically retrieve the verified business location(s) associated with your Google account.
                  </p>
                </div>

                {error.includes('Google Cloud OAuth 2.0') && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-left space-y-3 text-xs text-slate-700">
                    <div className="font-bold text-blue-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      <span>Google Cloud OAuth 2.0 Credentials Setup:</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      In <strong>Google Cloud Console</strong> &rarr; <strong>APIs & Services</strong> &rarr; <strong>Credentials</strong> &rarr; <strong>Create OAuth client ID (Web application)</strong>, configure:
                    </p>

                    <div className="space-y-2">
                      <div>
                        <div className="text-[11px] font-bold text-slate-800 flex items-center justify-between mb-1">
                          <span>Authorized JavaScript origins:</span>
                          <button
                            type="button"
                            onClick={copyOrigin}
                            className="px-2 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-900 font-sans font-semibold text-[10px]"
                          >
                            {copiedOrigin ? 'Copied Origin!' : 'Copy Origin'}
                          </button>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-blue-200 font-mono text-[11px] text-blue-950 truncate">
                          {originUrl}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-bold text-slate-800 flex items-center justify-between mb-1">
                          <span>Authorized redirect URIs (Includes /onboarding):</span>
                          <button
                            type="button"
                            onClick={copyRedirectUri}
                            className="px-2 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-900 font-sans font-semibold text-[10px]"
                          >
                            {copiedRedirectUri ? 'Copied Redirect URI!' : 'Copy Redirect URI'}
                          </button>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-blue-200 font-mono text-[11px] text-blue-950 truncate">
                          {redirectUri}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-2 text-center">
                  <button
                    onClick={handleConnectGoogle}
                    disabled={isConnecting}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-xs w-full sm:w-auto disabled:opacity-50"
                  >
                    {isConnecting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isConnecting ? 'Connecting to Google…' : 'Sign in with Google Business Profile'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConnectVerifiedBusiness} className="space-y-4 text-left text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Business Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={bizName}
                    onChange={(e) => setBizName(e.target.value)}
                    placeholder="e.g. Apex Medical Care, Horizon Bistro"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={bizAddress}
                      onChange={(e) => setBizAddress(e.target.value)}
                      placeholder="e.g. 100 Main St"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      City / Locality
                    </label>
                    <input
                      type="text"
                      value={bizCity}
                      onChange={(e) => setBizCity(e.target.value)}
                      placeholder="e.g. Chicago, London, Paris"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      State / Province
                    </label>
                    <input
                      type="text"
                      value={bizState}
                      onChange={(e) => setBizState(e.target.value)}
                      placeholder="e.g. IL, NY, Ile-de-France"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={bizZip}
                      onChange={(e) => setBizZip(e.target.value)}
                      placeholder="e.g. 60601"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      value={bizCategory}
                      onChange={(e) => setBizCategory(e.target.value)}
                      placeholder="e.g. Clinic, Restaurant, Retail"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={bizPhone}
                      onChange={(e) => setBizPhone(e.target.value)}
                      placeholder="e.g. +1 555-0199"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Google Maps Place ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={bizPlaceId}
                      onChange={(e) => setBizPlaceId(e.target.value)}
                      placeholder="e.g. ChIJN1t_tDeuEmsR..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono text-[11px]"
                    />
                  </div>
                </div>

                <div className="pt-2 text-right">
                  <button
                    type="submit"
                    disabled={isConnecting || !bizName.trim()}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-xs disabled:opacity-50"
                  >
                    {isConnecting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Connect Verified Business &rarr;</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="p-8 space-y-6">
            <div className="text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-900 mt-2">Google Location Retrieved</h3>
              <p className="text-xs text-slate-500">This location was returned by the authenticated Google Business Profile connection.</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700 shrink-0"><Building2 className="w-5 h-5" /></div>
              <div className="flex-1 text-xs">
                <div className="font-bold text-slate-900 text-sm">{activeLocation.locationName}</div>
                <div className="text-slate-600 mt-0.5">{activeLocation.address.addressLines.join(', ')}</div>
                <div className="text-slate-500 mt-0.5">{activeLocation.address.locality}, {activeLocation.address.administrativeArea} {activeLocation.address.postalCode} &bull; {activeLocation.primaryCategory}</div>
                <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <Check className="w-3 h-3" /><span>Connection verified by server</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button onClick={() => { setError(''); setStep(3); }} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-1.5">
                <span>Confirm Location & Continue</span><ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="p-8 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">First Review Sync & AI Draft Check</h3>
              <p className="text-xs text-slate-500 mt-1">Fetch current reviews from Google and run them through the server-side AI and reply safety workflow.</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex gap-3 text-xs text-slate-700">
              <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
              <p>No sample reviews or fabricated AI responses are shown here. The next step uses the reviews actually returned by Google.</p>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button onClick={handleRunFirstSync} disabled={isSyncing} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-1.5 disabled:opacity-50">
                {isSyncing && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isSyncing ? 'Syncing real reviews…' : 'Sync Reviews & Continue'}</span><ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="p-8 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Initial Sync Complete</h3>
              <p className="text-xs text-slate-500 mt-1">Review the actual sync result before opening your dashboard.</p>
            </div>
            {syncSummary && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-xs text-emerald-700">Locations checked</div>
                  <div className="text-2xl font-bold text-emerald-900">{syncSummary.locationsChecked}</div>
                </div>
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <div className="text-xs text-blue-700">New reviews imported</div>
                  <div className="text-2xl font-bold text-blue-900">{syncSummary.newReviewsFound}</div>
                </div>
              </div>
            )}
            {latestReview ? (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold text-xs text-slate-900">{latestReview.author.displayName}</div>
                  <div className="flex text-amber-400">{Array.from({ length: latestReview.starRating }).map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-400" />)}</div>
                </div>
                <p className="text-xs text-slate-700">{latestReview.comment || 'This reviewer did not leave a written comment.'}</p>
                {latestReview.reply?.proposedText ? (
                  <div className="bg-white rounded-lg border border-blue-200 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900"><Sparkles className="w-4 h-4 text-blue-600" />AI reply draft</div>
                    <p className="text-xs text-slate-700 mt-2 whitespace-pre-wrap">{latestReview.reply.proposedText}</p>
                    <div className="text-[10px] text-slate-500 mt-2">Status: {latestReview.reply.status.replace(/_/g, ' ').toLowerCase()}</div>
                  </div>
                ) : <p className="text-xs text-slate-500">The review was imported. No reply draft is available for this item yet.</p>}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                The sync succeeded, but Google returned no reviews to display. You can continue and sync again later.
              </div>
            )}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200"><span>Low-risk reviews</span><span className="font-bold uppercase text-[11px]">Follow configured rules</span></div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 text-amber-800 border border-amber-200"><span>Negative or high-risk reviews</span><span className="font-bold uppercase text-[11px]">Review safety settings</span></div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" /><span>Only real sync results are shown. Review replies are subject to your server-side safety rules.</span>
            </div>
            <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={enableAutomation}
                onChange={(event) => setEnableAutomation(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-blue-600"
              />
              <span><strong className="block text-slate-900">Enable automatic replies for eligible reviews</strong><span className="block mt-1 text-slate-500">Optional. Only reviews that pass the server-side safety checks and your automation rules can be auto-published. You can leave this off and enable it later.</span></span>
            </label>
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button onClick={handleCompleteOnboarding} disabled={isActivating} className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center gap-1.5 disabled:opacity-50">
                {isActivating && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isActivating ? 'Saving automation setting…' : 'Open Dashboard'}</span><ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
