import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Inbox,
  Sliders,
  Sparkles,
  CreditCard,
  HelpCircle,
  Shield,
  Building2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LogOut,
  ChevronDown,
  MapPin,
  Compass,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { BusinessLocation, Subscription } from '../../../shared/types/domain';

interface AppLayoutProps {
  children: React.ReactNode;
  location: BusinessLocation;
  availableLocations?: BusinessLocation[];
  onSelectLocation?: (location: BusinessLocation) => void;
  subscription: Subscription;
  pendingApprovalsCount: number;
  onSyncReviews: () => void;
  isSyncing: boolean;
  onToggleAutomation?: (enabled: boolean) => Promise<void>;
  isDemoMode?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  location,
  availableLocations = [location],
  onSelectLocation,
  subscription,
  pendingApprovalsCount,
  onSyncReviews,
  isSyncing,
  onToggleAutomation,
  isDemoMode = false,
}) => {
  const navigate = useNavigate();
  const currentPath = useLocation().pathname;
  const auth = useAuth();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const isCanceled = subscription.status === 'CANCELED';
  const hasLocation = Boolean(location && location.id && location.locationName);

  const navItems = [
    {
      label: 'Overview',
      path: '/',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      label: 'Review Inbox',
      path: '/reviews',
      icon: Inbox,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      label: 'Rules & Voice',
      path: '/settings',
      icon: Sliders,
      badge: null,
    },
    {
      label: 'Billing & Usage',
      path: '/billing',
      icon: CreditCard,
      badge: isCanceled ? 'Past Due' : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      label: 'Help & Support',
      path: '/support',
      icon: HelpCircle,
      badge: null,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* 
        ========================================================================
        1. DESKTOP SIDEBAR NAVIGATION (Collapsible 240px / 72px)
        ========================================================================
      */}
      <aside
        className={`hidden md:flex flex-col bg-white border-r border-slate-200 transition-all duration-200 shrink-0 z-30 sticky top-0 h-screen ${
          sidebarCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {/* Brand Lockup */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200">
          <div
            className="flex items-center gap-3 cursor-pointer overflow-hidden"
            onClick={() => navigate('/')}
            title="Google Review Autopilot"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            {!sidebarCollapsed && (
              <div className="truncate">
                <span className="font-bold text-slate-900 text-sm tracking-tight block">
                  Review Autopilot
                </span>
                <span className="text-[10px] text-slate-400 font-medium block">
                  Local Reputation Engine
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar width"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Primary Navigation Links */}
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition relative group ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition ${
                    isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                {item.badge !== null && (
                  <span
                    className={`ml-auto font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      item.badgeColor || 'bg-slate-200 text-slate-700'
                    } ${sidebarCollapsed ? 'absolute -top-1 -right-1' : ''}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer: Location Mini Card & External Links */}
        <div className="p-3 border-t border-slate-200 space-y-2">
          {!sidebarCollapsed && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
              <div className="flex items-center gap-2 text-slate-500 text-[11px] font-medium">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{location.primaryCategory || 'Business'}</span>
              </div>
              <div className="font-semibold text-slate-800 truncate mt-0.5">
                {location.locationName}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <button
              onClick={() => navigate('/demo')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-50 text-xs font-semibold transition ${
                sidebarCollapsed ? 'justify-center' : ''
              }`}
              title="Explore Live Demo"
            >
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              {!sidebarCollapsed && <span className="truncate">Explore Live Demo</span>}
            </button>

            <button
              onClick={() => navigate('/landing')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 text-xs font-medium transition ${
                sidebarCollapsed ? 'justify-center' : ''
              }`}
              title="View Public Landing Page"
            >
              <Compass className="w-4 h-4 text-blue-500 shrink-0" />
              {!sidebarCollapsed && <span className="truncate">Public Landing Page</span>}
            </button>

            <button
              onClick={() => navigate('/admin')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 text-xs font-medium transition ${
                sidebarCollapsed ? 'justify-center' : ''
              }`}
              title="Super Admin Console"
            >
              <Shield className="w-4 h-4 text-indigo-500 shrink-0" />
              {!sidebarCollapsed && <span className="truncate">Super Admin</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* 
        ========================================================================
        2. MOBILE SLIDE-OUT DRAWER
        ========================================================================
      */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-slideRight">
            <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                  <Zap className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-900 text-sm">Review Autopilot</span>
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                aria-label="Close navigation drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = currentPath === item.path;
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setMobileDrawerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== null && (
                      <span
                        className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.badgeColor || 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-200 space-y-2 text-xs">
              <button
                onClick={() => {
                  navigate('/landing');
                  setMobileDrawerOpen(false);
                }}
                className="w-full flex items-center gap-2 py-2 text-slate-600 font-medium"
              >
                <Compass className="w-4 h-4 text-blue-500" />
                <span>Public Landing Page</span>
              </button>
              <button
                onClick={() => {
                  navigate('/admin');
                  setMobileDrawerOpen(false);
                }}
                className="w-full flex items-center gap-2 py-2 text-slate-600 font-medium"
              >
                <Shield className="w-4 h-4 text-indigo-500" />
                <span>Super Admin Portal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        3. MAIN WORKSPACE CONTAINER (Top Header + Viewport)
        ========================================================================
      */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Application Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20 h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 md:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Location Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition text-left"
              >
                <div className={`w-6 h-6 rounded-lg ${location.isConnected ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'} flex items-center justify-center shrink-0`}>
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <div className="max-w-[160px] sm:max-w-[220px] truncate">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {location.isConnected ? location.locationName : (location.locationName || 'Connect Google Profile')}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                    <span>{location.isConnected ? (location.address.locality || 'Verified Google Profile') : 'Google Disconnected'}</span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              </button>

              {/* Location Switcher Menu */}
              {locationDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-72 bg-white rounded-xl border border-slate-200 shadow-lg py-2 z-50 text-xs">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Switch Google Business Location
                  </div>
                  {availableLocations.map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => {
                        onSelectLocation?.(loc);
                        setLocationDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-start gap-2.5 hover:bg-slate-50 transition ${
                        loc.id === location.id ? 'bg-blue-50/60 text-blue-900 font-semibold' : 'text-slate-700'
                      }`}
                    >
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div className="truncate">
                        <div className="font-bold text-xs truncate">{loc.locationName}</div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {loc.address.addressLines?.join(', ') || loc.address.locality || (loc.isConnected ? 'Verified Google Business Profile' : 'Google Profile Not Linked')}
                        </div>
                      </div>
                      {loc.id === location.id && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 ml-auto" />
                      )}
                    </button>
                  ))}
                  <div className="p-2 border-t border-slate-100 mt-1">
                    <button
                      onClick={() => {
                        setLocationDropdownOpen(false);
                        navigate('/onboarding');
                      }}
                      className="w-full py-1.5 text-center text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      + Connect Additional Location
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Header Zone: Connection Status, Sync Button & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Google Connection Health Badge */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs">
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                  location.isConnected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
                title={location.isConnected ? 'Google Business Profile OAuth Connected' : 'Google Disconnected'}
              >
                {location.isConnected ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span className="hidden lg:inline">Google Connected</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 text-rose-600" />
                    <span>Disconnected</span>
                  </>
                )}
              </span>
            </div>

            {/* Live Autopilot Status Badge */}
            <div className="hidden lg:flex items-center">
              <span
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                  isCanceled
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : location.automationEnabled
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {isCanceled
                  ? 'Autopilot Suspended'
                  : location.automationEnabled
                  ? 'Autopilot ON'
                  : 'Autopilot OFF (Manual Mode)'}
              </span>
            </div>

            {/* Manual Sync Reviews Button with Spinner */}
            <button
              onClick={onSyncReviews}
              disabled={isSyncing || isCanceled}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
              title="Sync latest reviews from Google Business Profile"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync Reviews'}</span>
            </button>

            {/* User Profile & Auth Menu */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition"
              >
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                  {(auth.name || auth.email || 'U')[0].toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 leading-tight max-w-[100px] truncate">
                    {auth.name || 'User'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    {auth.role || 'Member'}
                  </span>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl border border-slate-200 shadow-lg py-2 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <div className="font-bold text-slate-900">{auth.name || 'User'}</div>
                    <div className="text-[11px] text-slate-500 truncate">{auth.email}</div>
                    <span className="inline-block mt-1 text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      Role: {auth.role}
                    </span>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('/billing');
                      }}
                      className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                    >
                      <span>Subscription Plan</span>
                      <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-bold">
                        {subscription.plan}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('/settings');
                      }}
                      className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50"
                    >
                      Account Settings
                    </button>
                  </div>

                  <div className="pt-1 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        auth.logout();
                      }}
                      className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
