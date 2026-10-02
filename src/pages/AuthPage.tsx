import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, ShieldCheck, Sparkles, Building2, CheckCircle2, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../../shared/types/domain';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithGoogle, loginAs, email, role, isAuthenticated } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  const copyHostname = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    setIsUnauthorizedDomain(false);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      const code = err?.code || '';
      const msg = err?.message || '';
      if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
        setIsUnauthorizedDomain(true);
        setLoginError('This domain is not authorized in your Firebase Console.');
      } else {
        setLoginError(msg || 'Google sign-in could not be completed. You can also explore the Live Demo.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleQuickLogin = (targetRole: UserRole) => {
    loginAs(targetRole);
    if (targetRole === 'SUPER_ADMIN') {
      navigate('/admin', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  React.useEffect(() => {
    // If user is authenticated, route immediately to appropriate view
    if (isAuthenticated && email) {
      if (email.toLowerCase() === 'rami8805@gmail.com' || role === 'SUPER_ADMIN') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, email, role, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-blue-100 selection:text-blue-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div
          onClick={() => navigate('/landing')}
          className="inline-flex items-center gap-2.5 cursor-pointer mb-4"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Zap className="w-5 h-5" />
          </div>
          <span className="font-bold text-slate-900 text-xl tracking-tight">
            Google Review Autopilot
          </span>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Sign in to your Business Account
        </h2>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          Manage your verified Google Business Profile, inspect AI-drafted replies, and configure automation safety rules.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10 space-y-6">
          {isUnauthorizedDomain ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-3">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <span>⚠️ Firebase: auth/unauthorized-domain</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                This preview domain is not yet in your Firebase <strong>Authorized domains</strong> list. To enable Google sign-in:
              </p>
              <div className="bg-white p-2 rounded-lg border border-amber-200 flex items-center justify-between gap-2 font-mono text-[11px] select-all">
                <span className="truncate">{currentHostname}</span>
                <button
                  type="button"
                  onClick={copyHostname}
                  className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-sans font-semibold text-[10px] shrink-0"
                >
                  {copiedDomain ? 'Copied!' : 'Copy Domain'}
                </button>
              </div>
              <ol className="list-decimal list-inside text-[11px] text-amber-800 space-y-0.5">
                <li>Open <strong>Firebase Console</strong> → Authentication → Settings.</li>
                <li>Go to <strong>Authorized domains</strong> → Add domain.</li>
                <li>Paste the copied domain above.</li>
              </ol>
              <div className="pt-2 border-t border-amber-200/60">
                <button
                  type="button"
                  onClick={() => loginAs('OWNER')}
                  className="w-full py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition"
                >
                  Or Continue Immediately as Business Owner &rarr;
                </button>
              </div>
            </div>
          ) : (
            loginError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {loginError}
              </div>
            )
          )}

          {/* Primary Action: Real Google Sign-in */}
          <div>
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-xs transition disabled:opacity-60"
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
              <span>{isLoggingIn ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>
          </div>

          {/* Trust badges */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-4 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Official Google API</span>
            </span>
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              <span>AES-256 Encrypted</span>
            </span>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-semibold tracking-wider text-[10px]">
                Or explore without signing in
              </span>
            </div>
          </div>

          {/* Demo Callout Card */}
          <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Explore Interactive Live Demo</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Test drive the review inbox, Gemini AI drafting, and safety engine with realistic sample business data. No Google login required.
            </p>
            <button
              onClick={() => navigate('/demo')}
              className="w-full mt-1 py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>Launch Live Demo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick RBAC Switcher for Local Dev / Testing */}
          <div className="pt-3 border-t border-slate-100 text-center">
            <div className="text-[11px] text-slate-400 mb-1.5">Developer Sandbox Switcher:</div>
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <button
                onClick={() => handleQuickLogin('OWNER')}
                className="px-2 py-0.5 text-[10px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition"
              >
                Owner
              </button>
              <button
                onClick={() => handleQuickLogin('ADMIN')}
                className="px-2 py-0.5 text-[10px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition"
              >
                Admin
              </button>
              <button
                onClick={() => handleQuickLogin('MEMBER')}
                className="px-2 py-0.5 text-[10px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition"
              >
                Member
              </button>
              <button
                onClick={() => handleQuickLogin('SUPER_ADMIN')}
                className="px-2 py-0.5 text-[10px] font-mono bg-slate-900 text-white hover:bg-slate-800 rounded transition"
              >
                Super Admin (rami8805@gmail.com)
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/landing')}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            &larr; Back to Public Landing Page
          </button>
        </div>
      </div>
    </div>
  );
};
