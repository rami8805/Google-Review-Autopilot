import React, { useState } from 'react';
import {
  Bot,
  LayoutDashboard,
  Inbox,
  Sliders,
  CreditCard,
  HelpCircle,
  Shield,
  Building2,
  Wifi,
  WifiOff,
  LogOut,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  pendingCount: number;
  locationName: string;
  userEmail: string;
  userName: string;
  isGoogleConnected: boolean;
  isAutomationPaused: boolean;
  isSessionExpired: boolean;
  isSubscriptionActive: boolean;
  onOpenAdmin: () => void;
  isAdminView: boolean;
  onLogout: () => void;
  onToggleGoogleConnected: () => void;
  onToggleSessionExpired: () => void;
  onToggleSubscriptionActive: () => void;
  onToggleAutomationPaused: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  pendingCount,
  locationName,
  userEmail,
  userName,
  isGoogleConnected,
  isAutomationPaused,
  isSessionExpired,
  isSubscriptionActive,
  onOpenAdmin,
  isAdminView,
  onLogout,
  onToggleGoogleConnected,
  onToggleSessionExpired,
  onToggleSubscriptionActive,
  onToggleAutomationPaused,
}) => {
  const [showSimMenu, setShowSimMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Location Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onTabChange('dashboard')}
              className="flex items-center gap-2.5 text-left focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 text-sm tracking-tight">
                    Review Autopilot
                  </span>
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    B2B
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  <span className="truncate max-w-[140px] sm:max-w-xs">{locationName}</span>
                </div>
              </div>
            </button>
          </div>

          {/* Navigation Links for Customer Portal */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => onTabChange('dashboard')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                currentTab === 'dashboard' && !isAdminView
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => onTabChange('reviews')}
              className={`relative px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                currentTab === 'reviews' && !isAdminView
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Inbox className="w-4 h-4" />
              <span>Reviews</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500 text-white">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onTabChange('settings')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                currentTab === 'settings' && !isAdminView
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Settings</span>
            </button>

            <button
              onClick={() => onTabChange('billing')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                currentTab === 'billing' && !isAdminView
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Billing</span>
            </button>

            <button
              onClick={() => onTabChange('support')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                currentTab === 'support' && !isAdminView
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Support</span>
            </button>
          </nav>

          {/* Right Action: Error State Simulation Menu & User Profile */}
          <div className="flex items-center gap-2">
            {/* Simulation Controls Menu for testing error states */}
            <div className="relative">
              <button
                onClick={() => setShowSimMenu(!showSimMenu)}
                title="Test Error States & Scenarios"
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center gap-1.5 transition"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Test Scenarios</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showSimMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 text-xs">
                  <div className="px-3 py-1.5 font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                    Simulate Platform States
                  </div>

                  <button
                    onClick={() => {
                      onToggleGoogleConnected();
                      setShowSimMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between"
                  >
                    <span>Google Connected</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isGoogleConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {isGoogleConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      onToggleSessionExpired();
                      setShowSimMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between"
                  >
                    <span>Session Status</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSessionExpired ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isSessionExpired ? 'Expired' : 'Valid'}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      onToggleSubscriptionActive();
                      setShowSimMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between"
                  >
                    <span>Subscription Status</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSubscriptionActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {isSubscriptionActive ? 'Active' : 'Past Due'}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      onToggleAutomationPaused();
                      setShowSimMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between"
                  >
                    <span>Autopilot State</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isAutomationPaused ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isAutomationPaused ? 'Paused' : 'Running'}
                    </span>
                  </button>

                  <div className="border-t border-slate-100 my-1"></div>

                  <button
                    onClick={() => {
                      onTabChange('landing');
                      setShowSimMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-blue-600 hover:bg-blue-50 font-semibold text-xs"
                  >
                    View Public Landing Page &rarr;
                  </button>
                  <button
                    onClick={() => {
                      onTabChange('onboarding');
                      setShowSimMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 font-semibold text-xs"
                  >
                    Re-run Onboarding Wizard
                  </button>
                </div>
              )}
            </div>

            {/* Super Admin Switcher */}
            <button
              onClick={onOpenAdmin}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 border transition ${
                isAdminView
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">{isAdminView ? 'Customer Portal' : 'Admin'}</span>
            </button>

            {/* User Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200"
              >
                {userName.charAt(0) || 'U'}
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <div className="font-bold text-slate-800">{userName}</div>
                    <div className="text-[11px] text-slate-500 truncate">{userEmail}</div>
                  </div>

                  <button
                    onClick={() => {
                      onTabChange('landing');
                      setShowUserMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-700"
                  >
                    Landing Page
                  </button>

                  <button
                    onClick={() => {
                      onTabChange('settings');
                      setShowUserMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-700"
                  >
                    Account Settings
                  </button>

                  <div className="border-t border-slate-100 my-1"></div>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 font-semibold"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-100 text-xs font-semibold">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`px-2 py-1 rounded ${currentTab === 'dashboard' ? 'text-blue-600' : 'text-slate-600'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => onTabChange('reviews')}
            className={`px-2 py-1 rounded ${currentTab === 'reviews' ? 'text-blue-600' : 'text-slate-600'}`}
          >
            Reviews {pendingCount > 0 && `(${pendingCount})`}
          </button>
          <button
            onClick={() => onTabChange('settings')}
            className={`px-2 py-1 rounded ${currentTab === 'settings' ? 'text-blue-600' : 'text-slate-600'}`}
          >
            Settings
          </button>
          <button
            onClick={() => onTabChange('billing')}
            className={`px-2 py-1 rounded ${currentTab === 'billing' ? 'text-blue-600' : 'text-slate-600'}`}
          >
            Billing
          </button>
          <button
            onClick={() => onTabChange('support')}
            className={`px-2 py-1 rounded ${currentTab === 'support' ? 'text-blue-600' : 'text-slate-600'}`}
          >
            Support
          </button>
        </div>
      </div>
    </header>
  );
};
