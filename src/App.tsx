import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { GlobalStateAlerts } from './components/GlobalStateAlerts';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { SettingsPage } from './pages/SettingsPage';
import { BillingPage } from './pages/BillingPage';
import { SupportPage } from './pages/SupportPage';
import { AdminDashboardPage } from '../admin/pages/AdminDashboardPage';
import { apiClient } from './services/apiClient';
import type {
  BusinessLocation,
  Review,
  ReviewReply,
  AutomationRule,
  BrandVoice,
  Subscription,
} from '../shared/types/domain';

type NavigationTab =
  | 'landing'
  | 'login'
  | 'onboarding'
  | 'dashboard'
  | 'reviews'
  | 'settings'
  | 'billing'
  | 'support';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [isAdminView, setIsAdminView] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [userEmail, setUserEmail] = useState('owner@downtowndental-sf.com');
  const [userName, setUserName] = useState('Dr. Sarah Lin');

  // Core domain state loaded via apiClient abstraction
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
  const [rules, setRules] = useState<AutomationRule[]>([]);
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

  // Global Error & Simulation states
  const [isGoogleConnected, setIsGoogleConnected] = useState(true);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [isSubscriptionActive, setIsSubscriptionActive] = useState(true);
  const [isAutomationPaused, setIsAutomationPaused] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Initial Data Fetching via apiClient abstraction
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const [loc, revs, rls, voice, sub] = await Promise.all([
        apiClient.getLocation(),
        apiClient.getReviews(),
        apiClient.getAutomationRules(),
        apiClient.getBrandVoice(),
        apiClient.getSubscription(),
      ]);

      setLocation(loc);
      setReviews(revs);
      setRules(rls);
      setBrandVoice(voice);
      setSubscription(sub);

      const sim = apiClient.getSimulationState();
      setIsGoogleConnected(sim.isGoogleConnected);
      setIsSessionExpired(sim.isSessionExpired);
      setIsSubscriptionActive(sim.isSubscriptionActive);
      setIsAutomationPaused(sim.isAutomationPaused);
    } catch (err) {
      setFetchError('Failed to load application data. Using offline local state.');
    } finally {
      setIsLoading(false);
    }
  };

  // Action Handlers
  const handleApprove = async (reviewId: string, editedText?: string) => {
    try {
      const updatedReply = await apiClient.approveReview(reviewId, editedText);
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, reply: updatedReply } : r))
      );
    } catch (err) {
      console.error('Approve failed:', err);
    }
  };

  const handleReject = async (reviewId: string) => {
    try {
      const updatedReply = await apiClient.rejectReview(reviewId);
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, reply: updatedReply } : r))
      );
    } catch (err) {
      console.error('Reject failed:', err);
    }
  };

  const handleRegenerate = async (reviewId: string) => {
    try {
      const updatedReply = await apiClient.regenerateReply(reviewId);
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, reply: updatedReply } : r))
      );
    } catch (err) {
      console.error('Regenerate failed:', err);
    }
  };

  const handleToggleAutomation = () => {
    const paused = apiClient.toggleAutomationPaused();
    setIsAutomationPaused(paused);
    setLocation((prev) => ({ ...prev, automationEnabled: !paused }));
  };

  const handleSaveLocation = async (updates: Partial<BusinessLocation>) => {
    const updated = await apiClient.updateLocation(updates);
    setLocation(updated);
  };

  const handleSaveRules = async (updatedRules: AutomationRule[]) => {
    const saved = await apiClient.saveAutomationRules(updatedRules);
    setRules(saved);
  };

  const handleSaveBrandVoice = async (updatedVoice: BrandVoice) => {
    const saved = await apiClient.saveBrandVoice(updatedVoice);
    setBrandVoice(saved);
  };

  const handlePlanChanged = (updatedSub: Subscription) => {
    setSubscription(updatedSub);
  };

  const handleSyncReviews = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/google/sync-reviews', { method: 'POST' });
    } catch {
      // Offline fallback
    }
    const freshRevs = await apiClient.getReviews();
    setReviews(freshRevs);
    setIsSyncing(false);
  };

  // Reconnection and Authentication actions
  const handleReconnectGoogle = () => {
    apiClient.setGoogleConnected(true);
    setIsGoogleConnected(true);
    setLocation((prev) => ({ ...prev, isConnected: true }));
  };

  const handleRefreshSession = () => {
    apiClient.setSessionExpired(false);
    setIsSessionExpired(false);
  };

  const handleLoginSuccess = (email: string, name: string, isDemoNew = false) => {
    setUserEmail(email);
    setUserName(name);
    setIsLoggedIn(true);
    setIsSessionExpired(false);

    if (isDemoNew) {
      // Direct new persona to Onboarding
      setLocation({
        ...location,
        locationName: 'Rivera Auto Works',
        primaryCategory: 'Auto Repair',
      });
      setCurrentTab('onboarding');
    } else {
      setCurrentTab('dashboard');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentTab('landing');
  };

  const pendingApprovalsCount = reviews.filter((r) => r.reply?.status === 'PENDING_APPROVAL').length;

  // View: Landing Page
  if (currentTab === 'landing') {
    return (
      <LandingPage
        onConnectGoogle={() => {
          if (isLoggedIn) {
            setCurrentTab('onboarding');
          } else {
            setCurrentTab('login');
          }
        }}
        onGoToLogin={() => setCurrentTab('login')}
        onGoToDashboard={() => setCurrentTab('dashboard')}
        isLoggedIn={isLoggedIn}
      />
    );
  }

  // View: Login Page
  if (currentTab === 'login') {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onGoToLanding={() => setCurrentTab('landing')}
        expiredSessionAlert={isSessionExpired}
      />
    );
  }

  // View: Onboarding Page
  if (currentTab === 'onboarding') {
    return (
      <OnboardingPage
        location={location}
        brandVoice={brandVoice}
        onComplete={({ businessName, businessType, brandTone }) => {
          setLocation((prev) => ({
            ...prev,
            locationName: businessName,
            primaryCategory: businessType,
            isConnected: true,
            automationEnabled: true,
          }));
          setBrandVoice((prev) => ({
            ...prev,
            tone: brandTone,
          }));
          setCurrentTab('dashboard');
        }}
      />
    );
  }

  // View: Super Admin View
  if (isAdminView) {
    return (
      <div>
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex justify-between items-center text-xs text-slate-300">
          <span>Switched to Super Admin Context (Role: SUPER_ADMIN)</span>
          <button
            onClick={() => setIsAdminView(false)}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-medium"
          >
            &larr; Return to Customer Portal
          </button>
        </div>
        <AdminDashboardPage />
      </div>
    );
  }

  // Main Customer Portal Shell (Dashboard, Reviews, Settings, Billing, Support)
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar
        currentTab={currentTab}
        onTabChange={(t) => setCurrentTab(t as NavigationTab)}
        pendingCount={pendingApprovalsCount}
        locationName={location.locationName}
        userEmail={userEmail}
        userName={userName}
        isGoogleConnected={isGoogleConnected}
        isAutomationPaused={isAutomationPaused}
        isSessionExpired={isSessionExpired}
        isSubscriptionActive={isSubscriptionActive}
        onOpenAdmin={() => setIsAdminView(true)}
        isAdminView={isAdminView}
        onLogout={handleLogout}
        onToggleGoogleConnected={() => {
          const next = !isGoogleConnected;
          apiClient.setGoogleConnected(next);
          setIsGoogleConnected(next);
          setLocation((prev) => ({ ...prev, isConnected: next }));
        }}
        onToggleSessionExpired={() => {
          const next = !isSessionExpired;
          apiClient.setSessionExpired(next);
          setIsSessionExpired(next);
        }}
        onToggleSubscriptionActive={() => {
          const next = !isSubscriptionActive;
          apiClient.setSubscriptionActive(next);
          setIsSubscriptionActive(next);
        }}
        onToggleAutomationPaused={handleToggleAutomation}
      />

      {/* Global State Alert Banners for Error State Handling */}
      <GlobalStateAlerts
        isGoogleConnected={isGoogleConnected}
        isSessionExpired={isSessionExpired}
        isSubscriptionActive={isSubscriptionActive}
        isAutomationPaused={isAutomationPaused}
        onReconnectGoogle={handleReconnectGoogle}
        onRefreshSession={handleRefreshSession}
        onNavigateBilling={() => setCurrentTab('billing')}
        onResumeAutomation={handleToggleAutomation}
      />

      <main className="flex-1">
        {currentTab === 'dashboard' && (
          <DashboardPage
            reviews={reviews}
            location={location}
            subscription={subscription}
            isGoogleConnected={isGoogleConnected}
            onOpenApprovalQueue={() => setCurrentTab('reviews')}
            onNavigateBilling={() => setCurrentTab('billing')}
            onReconnectGoogle={handleReconnectGoogle}
            onSyncReviews={handleSyncReviews}
            isLoading={isLoading}
            error={fetchError}
            onRetry={loadAllData}
            isSyncing={isSyncing}
          />
        )}

        {currentTab === 'reviews' && (
          <ReviewsPage
            reviews={reviews}
            isAutomationPaused={isAutomationPaused}
            onApprove={handleApprove}
            onRegenerate={handleRegenerate}
            onReject={handleReject}
            onToggleAutomation={handleToggleAutomation}
            isLoading={isLoading}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsPage
            location={location}
            rules={rules}
            brandVoice={brandVoice}
            isAutomationPaused={isAutomationPaused}
            onSaveLocation={handleSaveLocation}
            onSaveRules={handleSaveRules}
            onSaveBrandVoice={handleSaveBrandVoice}
            onToggleAutomation={handleToggleAutomation}
          />
        )}

        {currentTab === 'billing' && (
          <BillingPage
            subscription={subscription}
            onPlanChanged={handlePlanChanged}
          />
        )}

        {currentTab === 'support' && <SupportPage userEmail={userEmail} />}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            &copy; 2026 Google Review Autopilot &bull; Safe, automated review replies for local businesses
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <button onClick={() => setCurrentTab('landing')} className="hover:text-slate-600">
              Landing Page
            </button>
            <button onClick={() => setCurrentTab('support')} className="hover:text-slate-600">
              Help Center
            </button>
            <button onClick={() => setCurrentTab('settings')} className="hover:text-slate-600">
              Safety Rules
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
