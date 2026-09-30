import React, { useState } from 'react';
import { Bot, Lock, Mail, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (userEmail: string, userName: string, isDemoNew?: boolean) => void;
  onGoToLanding: () => void;
  expiredSessionAlert?: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onGoToLanding,
  expiredSessionAlert,
}) => {
  const [email, setEmail] = useState('owner@downtowndental-sf.com');
  const [password, setPassword] = useState('••••••••••••');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(
    expiredSessionAlert ? 'Your session expired. Please sign in again.' : null
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setAuthError('Please enter a valid business email.');
      return;
    }
    setIsLoading(true);
    setAuthError(null);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess(email, 'Dr. Sarah Lin');
    }, 600);
  };

  const handleDemoLogin = (type: 'EXISTING' | 'NEW') => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (type === 'EXISTING') {
        onLoginSuccess('owner@downtowndental-sf.com', 'Dr. Sarah Lin', false);
      } else {
        onLoginSuccess('owner@rivera-autoworks.com', 'Alex Rivera', true);
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <button
          onClick={onGoToLanding}
          className="flex items-center justify-center gap-2.5 mx-auto group mb-2"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition">
            <Bot className="w-6 h-6" />
          </div>
          <span className="font-bold text-slate-900 text-xl tracking-tight">
            Google Review Autopilot
          </span>
        </button>
        <h2 className="text-center text-xl font-bold text-slate-900">
          Sign in to your customer portal
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Manage your Google Business Profile review automation safely
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10 space-y-5">
          {authError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* Google OAuth Direct Sign-In */}
          <button
            onClick={() => handleDemoLogin('EXISTING')}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-slate-300 rounded-xl shadow-xs bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google Business Profile</span>
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              Or sign in with email
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Business Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@yourpractice.com"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 border border-transparent rounded-xl shadow-xs text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition flex items-center justify-center gap-1.5"
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Switcher */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block text-center">
              Quick Test Personas
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('EXISTING')}
                className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition"
              >
                <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-emerald-600" />
                  <span>Dr. Sarah Lin</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate">Downtown Dental (Active)</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('NEW')}
                className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition"
              >
                <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-blue-600" />
                  <span>Alex Rivera</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate">New Business (Onboarding)</div>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={onGoToLanding}
            className="text-xs text-slate-500 hover:text-slate-800 font-medium"
          >
            &larr; Back to Landing Page
          </button>
        </div>
      </div>
    </div>
  );
};
