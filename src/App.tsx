import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { SettingsPage } from './pages/SettingsPage';
import { BillingPage } from './pages/BillingPage';
import { LandingPage } from './pages/LandingPage';
import { SupportWidget } from './features/support/SupportWidget';
import { OnboardingWizard } from './features/onboarding/OnboardingWizard';
import { AdminDashboardPage } from '../admin/pages/AdminDashboardPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { getPaddleInstance } from './lib/paddle';
import type {
  BusinessLocation,
  Review,
  ReviewReply,
  AutomationRule,
  BrandVoice,
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../shared/types/domain';
import { DEFAULT_AUTOMATION_RULES } from '../shared/constants/automation';

function AppContent() {
  const navigate = useNavigate();
  const locationPath = useLocation();
  const { getAuthHeaders, email } = useAuth();

  // Core state
  const [location, setLocation] = useState<BusinessLocation>({
    id: 'loc_001',
    businessId: 'biz_001',
    saasCustomerId: 'saas_cust_demo_01',
    googleLocationId: 'locations/1089274910284',
    googlePlaceId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
    locationName: 'Downtown Dental Practice',
    address: {
      addressLines: ['104 Market Street', 'Suite 200'],
      locality: 'San Francisco',
      administrativeArea: 'CA',
      postalCode: '94103',
      country: 'US',
    },
    primaryPhone: '+1-415-555-0199',
    primaryCategory: 'Dentist',
    isConnected: true,
    automationEnabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [reviews, setReviews] = useState<(Review & { reply?: ReviewReply })[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>(
    DEFAULT_AUTOMATION_RULES.map((r, i) => ({
      ...r,
      id: `rule_00${i + 1}`,
      saasCustomerId: 'saas_cust_demo_01',
    }))
  );

  const [brandVoice, setBrandVoice] = useState<BrandVoice>({
    id: 'bv_001',
    saasCustomerId: 'saas_cust_demo_01',
    tone: 'WARM_AND_PROFESSIONAL',
    signOffTemplate: 'Warm regards,\nDr. Sarah & The Downtown Dental Team',
    trustedBusinessContext: {
      ownerOrManagerTitle: 'Practice Director',
      contactEmailForInquiries: 'care@downtowndental-sf.com',
      contactPhoneForInquiries: '+1-415-555-0199',
      coreServicesOffered: ['General Dentistry', 'Cleanings', 'Invisalign', 'Emergency Dental Care'],
      prohibitedTopics: ['No prices over public reviews', 'No admission of liability', 'No free service offers'],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [subscription, setSubscription] = useState<Subscription>({
    id: 'sub_demo_01',
    saasCustomerId: 'saas_cust_demo_01',
    plan: 'STARTER',
    status: 'ACTIVE',
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
    cancelAtPeriodEnd: false,
    locationLimit: 1,
    monthlyReplyLimit: 50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [isSimulatingReview, setIsSimulatingReview] = useState(false);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  // Fetch reviews on mount or route transition
  const loadReviewsFromApi = async () => {
    setIsLoadingReviews(true);
    try {
      const res = await fetch('/api/reviews', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.success && Array.isArray(data.data)) {
          setReviews(data.data);
        }
      }
    } catch {
      // Backend offline or loading
    } finally {
      setIsLoadingReviews(false);
    }
  };

  useEffect(() => {
    loadReviewsFromApi();
  }, []);

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
    } catch (err) {
      showFeedback((err as Error).message, 'error');
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
    } catch (err) {
      showFeedback((err as Error).message, 'error');
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
    } catch (err) {
      showFeedback((err as Error).message, 'error');
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
    } catch (err) {
      showFeedback((err as Error).message, 'error');
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

      // Use Paddle.js overlay if available, otherwise direct checkout URL
      const paddle = await getPaddleInstance();
      if (paddle && transactionId) {
        paddle.Checkout.open({
          transactionId,
          settings: {
            displayMode: 'overlay',
            theme: 'light',
          },
        });
      } else if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }

      showFeedback('Paddle checkout initialized. Paid entitlements activate once confirmed via webhook.', 'success');

      // Re-fetch authoritative subscription state from database
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
    } catch (err) {
      showFeedback((err as Error).message, 'error');
    }
  };

  const handleSimulateInboundReview = async (
    preset: 'five_star' | 'four_star' | 'three_star' | 'critical_risk'
  ) => {
    setIsSimulatingReview(true);
    try {
      const res = await fetch('/api/google/sync-reviews', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ preset }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error?.message || 'Unable to sync review. Check connection.');
      }

      const payload = await res.json();
      if (payload?.success && payload.data?.ingestedReview) {
        const newRev = payload.data.ingestedReview;
        setReviews((prev) => [newRev, ...prev]);

        if (payload.data.result?.actionTaken === 'AUTO_PUBLISHED') {
          showFeedback('Inbound 5★ Review: Gemini drafted safe reply & published automatically to Google!', 'success');
        } else if (payload.data.result?.riskLevel === 'CRITICAL') {
          showFeedback('Inbound 1★ Review: Prompt injection / legal threat flagged! Locked to Approval Queue.', 'error');
        } else {
          showFeedback('Inbound Review: Held in Approval Queue according to your safety rules.', 'success');
        }
      }
    } catch (err) {
      showFeedback((err as Error).message, 'error');
    } finally {
      setIsSimulatingReview(false);
    }
  };

  const handleSyncReviews = async () => {
    setIsLoadingReviews(true);
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
      if (payload?.success && payload.data?.ingestedReview) {
        setReviews((prev) => [payload.data.ingestedReview, ...prev]);
        showFeedback('Synced 1 new review from Google Business Profile!', 'success');
      } else {
        showFeedback('Google Business Profile is up to date!', 'success');
      }
    } catch (err) {
      showFeedback((err as Error).message, 'error');
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const pendingApprovalsCount = reviews.filter((r) => r.reply?.status === 'PENDING_APPROVAL').length;
  const isAdminView = locationPath.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar
        pendingCount={pendingApprovalsCount}
        locationName={location.locationName}
        isConnected={location.isConnected}
      />

      {feedbackToast && (
        <div
          className={`py-2 px-4 text-center text-xs font-semibold transition-all ${
            feedbackToast.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-emerald-600 text-white'
          }`}
        >
          {feedbackToast.message}
        </div>
      )}

      {isLoadingReviews && (
        <div className="bg-blue-50 text-blue-700 py-1 text-center text-[11px] font-medium border-b border-blue-100">
          Syncing latest Google Business Profile reviews...
        </div>
      )}

      <main className="flex-1">
        <Routes>
          <Route
            path="/"
            element={
              <DashboardPage
                reviews={reviews}
                location={location}
                subscription={subscription}
                onOpenApprovalQueue={() => navigate('/reviews')}
                onSyncReviews={handleSyncReviews}
                isSyncing={isLoadingReviews}
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
                onSimulateReview={handleSimulateInboundReview}
                isSimulatingReview={isSimulatingReview}
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
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <SupportWidget userEmail={email} />
              </div>
            }
          />
          <Route
            path="/landing"
            element={
              <LandingPage
                onStartOnboarding={() => navigate('/onboarding')}
                onEnterDemo={() => navigate('/')}
                onOpenAdmin={() => navigate('/admin')}
              />
            }
          />
          <Route
            path="/onboarding"
            element={
              <OnboardingWizard
                location={location}
                onComplete={(connectedLocation) => {
                  if (connectedLocation) {
                    setLocation({ ...connectedLocation, isConnected: true, automationEnabled: connectedLocation.automationEnabled });
                  }
                  showFeedback('Initial Google review sync completed. Review your dashboard and safety settings before enabling automation.', 'success');
                  navigate('/');
                }}
                onCancel={() => navigate('/')}
              />
            }
          />
          <Route
            path="/admin"
            element={
              <div>
                <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex justify-between items-center text-xs text-slate-300">
                  <span className="font-mono">Super Admin Console &bull; Verified Google Identity Platform RBAC</span>
                  <button
                    onClick={() => navigate('/')}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
                  >
                    &larr; Return to Customer Dashboard
                  </button>
                </div>
                <AdminDashboardPage />
              </div>
            }
          />
        </Routes>
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p>Google Review Autopilot &bull; Production Multi-Tenant Architecture &bull; Paddle Billing Sandbox</p>
        <p className="mt-1 text-[11px] text-slate-400">
          Google Cloud SQL PostgreSQL &bull; Reply Guard 8 Safety Gates &bull; Google Identity Platform RBAC
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
