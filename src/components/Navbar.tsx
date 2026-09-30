import React from 'react';
import { Bot, Inbox, Sliders, CreditCard, HelpCircle, Shield, Building2 } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  pendingCount: number;
  locationName: string;
  onOpenAdmin: () => void;
  isAdminView: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  pendingCount,
  locationName,
  onOpenAdmin,
  isAdminView,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & App Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/30">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-base tracking-tight">Google Review Autopilot</span>
                <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  MVP
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{locationName}</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1">
            <button
              onClick={() => onTabChange('dashboard')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                currentTab === 'dashboard' && !isAdminView
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Dashboard
            </button>

            <button
              onClick={() => onTabChange('reviews')}
              className={`relative px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                currentTab === 'reviews' && !isAdminView
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Inbox className="w-4 h-4" />
              <span>Approval Queue</span>
              {pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs font-bold rounded-full bg-amber-500 text-white">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onTabChange('settings')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                currentTab === 'settings' && !isAdminView
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Rules & Voice</span>
            </button>

            <button
              onClick={() => onTabChange('billing')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                currentTab === 'billing' && !isAdminView
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Billing</span>
            </button>

            <button
              onClick={() => onTabChange('support')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                currentTab === 'support' && !isAdminView
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Support</span>
            </button>
          </nav>

          {/* Right Action / Super Admin switch */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenAdmin}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 border transition ${
                isAdminView
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-indigo-500" />
              <span>{isAdminView ? 'Exit Admin View' : 'Super Admin Portal'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
