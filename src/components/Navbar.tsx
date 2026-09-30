import React from 'react';
import {
  Inbox,
  Sliders,
  CreditCard,
  HelpCircle,
  Shield,
  Building2,
  CheckCircle2,
  Zap,
  Compass,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  pendingCount: number;
  locationName: string;
  isConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  pendingCount,
  locationName,
  isConnected,
}) => {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const isAdminView = currentPath.startsWith('/admin');

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & App Name */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-base tracking-tight">
                  Google Review Autopilot
                </span>
                <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${
                  isConnected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{isConnected ? 'Google Connected' : 'Google Disconnected'}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate max-w-[200px]">{locationName}</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => navigate('/')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition ${
                currentPath === '/' && !isAdminView
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Dashboard
            </button>

            <button
              onClick={() => navigate('/reviews')}
              className={`relative px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                currentPath === '/reviews' && !isAdminView
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Inbox className="w-4 h-4" />
              <span>Approval Queue</span>
              {pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-white">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => navigate('/settings')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                currentPath === '/settings' && !isAdminView
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Rules & Voice</span>
            </button>

            <button
              onClick={() => navigate('/billing')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                currentPath === '/billing' && !isAdminView
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Billing</span>
            </button>

            <button
              onClick={() => navigate('/support')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                currentPath === '/support' && !isAdminView
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Support</span>
            </button>
          </nav>

          {/* Quick Context Switchers */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/landing')}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition flex items-center gap-1"
              title="Experience the Landing & Signup page"
            >
              <Compass className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Landing / Signup</span>
            </button>

            <button
              onClick={() => navigate('/admin')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 border transition ${
                isAdminView
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Super Admin</span>
            </button>

            {/* Google Identity & Auth Badge */}
            {auth.isAuthenticated ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="flex flex-col text-right">
                  <span className="text-[11px] font-bold text-slate-800 leading-tight max-w-[120px] truncate">
                    {auth.name || auth.email}
                  </span>
                  <span className="text-[9px] font-semibold text-blue-600 uppercase tracking-wider">
                    {auth.role}
                  </span>
                </div>
                <button
                  onClick={() => auth.logout()}
                  className="px-2 py-1 text-[10px] font-semibold rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                  title="Sign out"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => auth.loginWithGoogle()}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition flex items-center gap-1.5"
              >
                <span>Sign in with Google</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile secondary navigation */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-100 text-xs">
          <button
            onClick={() => navigate('/')}
            className={`px-2 py-1 font-semibold ${currentPath === '/' ? 'text-blue-600' : 'text-slate-600'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate('/reviews')}
            className={`px-2 py-1 font-semibold relative ${currentPath === '/reviews' ? 'text-blue-600' : 'text-slate-600'}`}
          >
            Queue {pendingCount > 0 && `(${pendingCount})`}
          </button>
          <button
            onClick={() => navigate('/settings')}
            className={`px-2 py-1 font-semibold ${currentPath === '/settings' ? 'text-blue-600' : 'text-slate-600'}`}
          >
            Settings
          </button>
          <button
            onClick={() => navigate('/billing')}
            className={`px-2 py-1 font-semibold ${currentPath === '/billing' ? 'text-blue-600' : 'text-slate-600'}`}
          >
            Billing
          </button>
          <button
            onClick={() => navigate('/support')}
            className={`px-2 py-1 font-semibold ${currentPath === '/support' ? 'text-blue-600' : 'text-slate-600'}`}
          >
            Support
          </button>
        </div>
      </div>
    </header>
  );
};
