import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { SettingsPage } from './pages/SettingsPage';
import { BillingPage } from './pages/BillingPage';
import { LandingPage } from './pages/LandingPage';
import { DemoPage } from './pages/DemoPage';
import { AuthPage } from './pages/AuthPage';
import { SupportWidget } from './features/support/SupportWidget';
import { OnboardingWizard } from './features/onboarding/OnboardingWizard';
import { AdminDashboardPage } from '../admin/pages/AdminDashboardPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { getPaddleInstance } from './lib/paddle';
import { RefreshCw, AlertCircle, Zap, ShieldCheck } from 'lucide-react';
import type {
  BusinessLocation,
  Review,
  ReviewReply,
  AutomationRule,
  BrandVoice,
  Subscription,
  SubscriptionPlan,
} from '../shared/types/domain';
import { DEFAULT_AUTOMATION_RULES } from '../shared/constants/automation';

function ProductionAppContent() {
  const navigate = useNavigate();
  const locationPath = useLocation();
  const { getAuthHeaders, email, isAuthenticated, isLoadingAuth } = useAuth();

  // Production State: starts strictly empty / disconnected until loaded from real APIs
  const [location, setLocation] = useState<BusinessLocation>({
    id: '',
    businessId: '',
    saasCustomerId: '',
    googleLocationId: '',
    locationName: '',
    address: {
      addressLines: [],
      locality: '',
      administrativeArea: '',
      postalCode: '',
      country: 'US',
    },
    isConnected: false,
    automationEnabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [availableLocations, setAvailableLocations] = useState<BusinessLocation[]>([]);
  const [reviews, setReviews] = useState<(Review & { reply?: ReviewReply })[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>(
    DEFAULT_AUTOMATION_RULES.map((r, i) => ({
      ...r,
      id: `rule_${i + 1}`,
      saasCustomerId: '',
    }))
  );
  const [brandVoice, setBrandVoice] = useState<BrandVoice>({
    id: '',
    saasCustomerId: '',
    tone: 'WARM_AND_PROFESSIONAL',
    signOffTemplate: 'Warm regards,\nThe Management Team',
    trustedBusinessContext: {
      ownerOrManagerTitle: 'Business Manager',
      contactEmailForInquiries: '',
      coreServicesOffered: [],
      prohibitedTopics: ['No prices over public reviews', 'No admission of liability', 'No unverified promises'],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [subscription, setSubscription] = useState<Subscription>({
    id: '',
    saasCustomerId: '',
    plan: 'STARTER',
    status: 'TRIALING',
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 14 * 86400000).toISOString(),
    cancelAtPeriodEnd: false,
    locationLimit: 1,
    monthlyReplyLimit: 50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSyncingReviews, setIsSyncingReviews] = useState(false);

  const showFeedback = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  // Fetch Authoritative Production State
  const loadProductionData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingData(true);
    setLoadError(null);

    try {
      // 1. Fetch user & location from /api/auth/me
      const meRes = await fetch('/api/auth/me', { headers: getAuthHeaders() });
      if (!meRes.ok) {
        throw new Error(`Authentication check returned status ${meRes.status}`);
      }
      const meData = await meRes.json();
      const meLocation = meData?.data?.location;

      // 2. Fetch all locations for tenant
      const locsRes = await fetch('/api/google/locations', { headers: getAuthHeaders() });
      let locsList: BusinessLocation[] = [];
      if (locsRes.ok) {
        const locsData = await locsRes.json();
        if (locsData?.success && Array.isArray(locsData.data)) {
          locsList = locsData.data;
          setAvailableLocations(locsList);
        }
      }

      if (locsList.length > 0) {
        setLocation(locsList[0]);
      } else if (meLocation) {
        setLocation(meLocation);
        setAvailableLocations([meLocation]);
      } else {
        // Disconnected state
        setLocation({
          id: '',
          businessId: meData?.data?.business?.id || '',
          saasCustomerId: meData?.data?.saasCustomer?.id || '',
          googleLocationId: '',
          locationName: meData?.data?.saasCustomer?.name || 'My Business',
          address: {
            addressLines: [],
            locality: '',
            administrativeArea: '',
            postalCode: '',
            country: 'US',
          },
          isConnected: false,
          automationEnabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      // 3. Fetch real reviews for tenant
      const revsRes = await fetch('/api/reviews', { headers: getAuthHeaders() });
      if (revsRes.ok) {
        const revsData = await revsRes.json();
        if (revsData?.success && Array.isArray(revsData.data)) {
          setReviews(revsData.data);
        }
      }

      // 4. Fetch automation rules
      const rulesRes = await fetch('/api/settings/automation-rules', { headers: getAuthHeaders() });
      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        if (rulesData?.success && Array.isArray(rulesData.data) && rulesData.data.length > 0) {
          setRules(rulesData.data);
        }
      }

      // 5. Fetch brand voice
      const voiceRes = await fetch('/api/settings/brand-voice', { headers: getAuthHeaders() });
      if (voiceRes.ok) {
        const voiceData = await voiceRes.json();
        if (voiceData?.success && voiceData.data) {
          setBrandVoice(voiceData.data);
        }
      }

      // 6. Fetch subscription status
      const subRes = await fetch('/api/billing/subscription', { headers: getAuthHeaders() });
      if (subRes.ok) {
        const subData = await subRes.json();
        if (subData?.success && subData.data) {
          setSubscription(subData.data);
        }
      }
    } catch (err: any) {
      console.error('Failed to load production account data:', err);
      setLoadError(err?.message || 'Unable to connect to production API.');
    } finally {
      setIsLoadingData(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadProductionData();
    }
  }, [isAuthenticated, loadProductionData]);

  // Production Action Handlers
  const handleApprove = async (reviewId: string, editedText?: string) => {
    try {
      const res = await fetch(`/api/reviews/${reviewId}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ editedReplyText: editedText }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error?.message || 'Failed to publish reply to Google.');
      }

      const payload = await res.json();
      if (payload.success) {
        setReviews((prev) =>
          prev.map((r) => {
            if (r.id === reviewId && r.reply) {
              const publishedText = editedText || r.reply.proposedText;
              return {
                ...r,
                reply: {
                  ...r.reply,
                  status: 'MANUALLY_PUBLISHED',
                  publishedText,
                  publishedAt: new Date().toISOString(),
                },
              };
            }
            return r;
          })
        );
        showFeedback('Reply published directly to Google Business Profile!', 'success');
      }
    } catch (err: any) {
      showFeedback(err.message, 'error');
    }
  };

  const handleRegenerate = async (reviewId: string) => {
    try {
      const res = await fetch(`/api/reviews/${reviewId}/regenerate`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error?.message || 'Failed to regenerate reply.');
      }

      const payload = await res.json();
      if (payload?.data?.reply) {
        setReviews((prev) =>
          prev.map((r) => (r.id === reviewId ? { ...r, reply: payload.data.reply } : r))
        );
        showFeedback('Draft regenerated safely with Gemini!', 'success');
      }
    } catch (err: any) {
      showFeedback(err.message, 'error');
    }
  };

  const handleSaveRules = async (updatedRules: AutomationRule[]) => {
    try {
      const res = await fetch('/api/settings/automation-rules', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ rules: updatedRules }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error?.message || 'Failed to update automation rules.');
      }

      const payload = await res.json();
      if (payload?.data) {
        setRules(payload.data);
        showFeedback('Automation rules updated and active!', 'success');
      }
    } catch (err: any) {
      showFeedback(err.message, 'error');
    }
  };

  const handleSaveBrandVoice = async (updatedBrandVoice: BrandVoice) => {
    try {
      const res = await fetch('/api/settings/brand-voice', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedBrandVoice),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error?.message || 'Failed to update brand voice.');
      }

      const payload = await res.json();
      if (payload?.data) {
        setBrandVoice(payload.data);
        showFeedback('Brand Voice & Trusted Context saved!', 'success');
      }
    } catch (err: any) {
      showFeedback(err.message, 'error');
    }
  };

  const handleUpdateSubscription = async (plan?: SubscriptionPlan) => {
    const targetPlan = plan || 'GROWTH';
    try {
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ plan: targetPlan, returnUrl: window.location.href }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error?.message || 'Failed to initiate Paddle checkout.');
      }

      const payload = await res.json();
      const transactionId = payload?.data?.transactionId;
      const checkoutUrl = payload?.data?.checkoutUrl;

      const paddle = await getPaddleInstance();
      if (paddle && transactionId) {
        paddle.Checkout.open({
          transactionId,
          settings: { displayMode: 'overlay', theme: 'light' },
        });
      } else if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }

      showFeedback('Paddle checkout initialized. Paid entitlements activate once confirmed via webhook.', 'info');

      setTimeout(async () => {
        try {
          const subRes = await fetch('/api/billing/subscription', { headers: getAuthHeaders() });
          if (subRes.ok) {
            const subData = await subRes.json();
            if (subData?.data) setSubscription(subData.data);
          }
        } catch {
          // Ignore
        }
      }, 2500);
    } catch (err: any) {
      showFeedback(err.message, 'error');
    }
  };

  const handleSyncReviews = async () => {
    setIsSyncingReviews(true);
    try {
      const res = await fetch('/api/google/sync-reviews', {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error?.message || 'Failed to sync reviews from Google.');
      }

      const payload = await res.json();
      // Reload fresh reviews from production repository
      const revsRes = await fetch('/api/reviews', { headers: getAuthHeaders() });
      if (revsRes.ok) {
        const revsData = await revsRes.json();
        if (revsData?.success && Array.isArray(revsData.data)) {
          setReviews(revsData.data);
        }
      }

      const newCount = payload?.data?.newReviewsFound || 0;
      if (newCount > 0) {
        showFeedback(`Synced ${newCount} new review${newCount > 1 ? 's' : ''} from Google Business Profile!`, 'success');
      } else {
        showFeedback('Google Business Profile is up to date!', 'success');
      }
    } catch (err: any) {
      showFeedback(err.message, 'error');
    } finally {
      setIsSyncingReviews(false);
    }
  };

  const handleToggleAutomation = async (enabled: boolean) => {
    try {
      const res = await fetch('/api/google/automation', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ locationId: location.id, enabled }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.success && data?.data?.location) {
          setLocation(data.data.location);
          setAvailableLocations((prev) =>
            prev.map((loc) => (loc.id === data.data.location.id ? data.data.location : loc))
          );
          showFeedback(
            enabled
              ? 'Autopilot enabled: 4–5★ low-risk reviews will publish automatically after a 15-minute grace window.'
              : 'Autopilot paused: all replies now require manual approval.',
            'success'
          );
        }
      } else {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error?.message || 'Failed to update automation status.');
      }
    } catch (err: any) {
      showFeedback(err.message, 'error');
    }
  };

  // 1. Loading Authentication State
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white mb-4 animate-bounce">
          <Zap className="w-5 h-5" />
        </div>
        <p className="text-xs font-semibold text-slate-600 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
          <span>Verifying authentication session...</span>
        </p>
      </div>
    );
  }

  // 2. Unauthenticated View in Production Mode
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // 3. Loading Production Data State (No Silent Mock Fallback)
  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-sm w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Loading Your Business Workspace</h3>
            <p className="text-xs text-slate-500 mt-1">
              Retrieving verified Google Business Profile locations and review streams...
            </p>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-blue-600 h-1.5 rounded-full w-2/3 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // 4. Truthful Production Error State (No Silent Mock Fallback)
  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-rose-200 shadow-sm max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Unable to Load Production Account Data</h3>
            <p className="text-xs text-slate-500 mt-1">{loadError}</p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={() => loadProductionData()}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-xs flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Connection</span>
            </button>
            <button
              onClick={() => navigate('/demo')}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
            >
              Switch to Live Demo
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pendingApprovalsCount = reviews.filter((r) => r.reply?.status === 'PENDING_APPROVAL').length;

  return (
    <AppLayout
      location={location}
      availableLocations={availableLocations}
      onSelectLocation={(newLoc) => setLocation(newLoc)}
      subscription={subscription}
      pendingApprovalsCount={pendingApprovalsCount}
      onSyncReviews={handleSyncReviews}
      isSyncing={isSyncingReviews}
      onToggleAutomation={handleToggleAutomation}
      isDemoMode={false}
    >
      {feedbackToast && (
        <div
          className={`mb-4 py-2.5 px-4 rounded-xl text-center text-xs font-semibold shadow-xs transition-all ${
            feedbackToast.type === 'error'
              ? 'bg-rose-600 text-white'
              : feedbackToast.type === 'info'
              ? 'bg-indigo-600 text-white'
              : 'bg-emerald-600 text-white'
          }`}
        >
          {feedbackToast.message}
        </div>
      )}

      {isSyncingReviews && (
        <div className="mb-4 bg-blue-50 text-blue-700 py-2 px-4 rounded-xl text-center text-xs font-medium border border-blue-100 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <span>Syncing latest reviews with Google Business Profile API...</span>
        </div>
      )}

      <Routes>
        <Route
          path="/"
          element={
            <DashboardPage
              reviews={reviews}
              location={location}
              subscription={subscription}
              rules={rules}
              brandVoice={brandVoice}
              onOpenApprovalQueue={() => navigate('/reviews')}
              onSyncReviews={handleSyncReviews}
              isSyncing={isSyncingReviews}
              onApprove={handleApprove}
              onRegenerate={handleRegenerate}
              onToggleAutomation={handleToggleAutomation}
              onNavigateToSettings={(tab) => navigate(tab ? `/settings?tab=${tab}` : '/settings')}
              onNavigateToBilling={() => navigate('/billing')}
              onConnectGoogle={() => navigate('/onboarding')}
              isDemoMode={false}
            />
          }
        />
        <Route
          path="/reviews"
          element={
            <ReviewsPage
              reviews={reviews}
              onApprove={handleApprove}
              onRegenerate={handleRegenerate}
            />
          }
        />
        <Route
          path="/settings"
          element={
            <SettingsPage
              rules={rules}
              brandVoice={brandVoice}
              onSaveRules={handleSaveRules}
              onSaveBrandVoice={handleSaveBrandVoice}
            />
          }
        />
        <Route
          path="/billing"
          element={
            <BillingPage
              subscription={subscription}
              onUpdateSubscription={handleUpdateSubscription}
            />
          }
        />
        <Route
          path="/support"
          element={
            <div className="max-w-7xl mx-auto py-2">
              <SupportWidget userEmail={email} />
            </div>
          }
        />
        <Route
          path="/onboarding"
          element={
            <OnboardingWizard
              location={location}
              onComplete={(connectedLoc) => {
                if (connectedLoc) {
                  setLocation({ ...connectedLoc, isConnected: true, automationEnabled: connectedLoc.automationEnabled });
                  setAvailableLocations((prev) => [connectedLoc, ...prev.filter((l) => l.id !== connectedLoc.id)]);
                }
                showFeedback('Initial Google review sync completed. Review your dashboard and safety settings before enabling automation.', 'success');
                navigate('/');
              }}
              onCancel={() => navigate('/')}
            />
          }
        />
      </Routes>
    </AppLayout>
  );
}

function MainAppShell() {
  const navigate = useNavigate();
  const locationPath = useLocation();

  const isDemoView = locationPath.pathname === '/demo' || locationPath.pathname.startsWith('/demo/');
  const isLandingView = locationPath.pathname === '/landing';
  const isAdminView = locationPath.pathname.startsWith('/admin');

  // 1. Dedicated Demo Mode Entry Point
  if (isDemoView) {
    return <DemoPage />;
  }

  // 2. Public SaaS Landing Page
  if (isLandingView) {
    return (
      <LandingPage
        onStartOnboarding={() => navigate('/onboarding')}
        onEnterDemo={() => navigate('/demo')}
        onOpenAdmin={() => navigate('/admin')}
      />
    );
  }

  // 3. Super Admin Console
  if (isAdminView) {
    return (
      <div>
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex justify-between items-center text-xs text-slate-300">
          <span className="font-mono">Super Admin Console &bull; Verified Google Identity Platform RBAC</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/demo')}
              className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium transition"
            >
              Live Demo
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
            >
              &larr; Customer Workspace
            </button>
          </div>
        </div>
        <AdminDashboardPage />
      </div>
    );
  }

  // 4. Authenticated Production Application
  return <ProductionAppContent />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MainAppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}
