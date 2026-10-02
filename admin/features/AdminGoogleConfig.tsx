import React, { useState, useEffect } from 'react';
import { useAuth } from '../../src/context/AuthContext';
import {
  ShieldCheck,
  Building2,
  Key,
  Globe,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Lock,
} from 'lucide-react';

interface OAuthConfigData {
  clientId: string;
  hasSecret: boolean;
  redirectUri: string;
  isConfigured: boolean;
  suggestedRedirectUri?: string;
  suggestedOrigin?: string;
}

export const AdminGoogleConfig: React.FC = () => {
  const { getAuthHeaders } = useAuth();
  const [config, setConfig] = useState<OAuthConfigData | null>(null);
  const [clientIdInput, setClientIdInput] = useState('');
  const [clientSecretInput, setClientSecretInput] = useState('');
  const [redirectUriInput, setRedirectUriInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const defaultRedirectUri = typeof window !== 'undefined' ? `${window.location.origin}/onboarding` : '';

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/google/oauth-config', { headers: getAuthHeaders() });
      if (res.ok) {
        const payload = await res.json();
        if (payload?.success && payload.data) {
          setConfig(payload.data);
          setClientIdInput(payload.data.clientId || '');
          setRedirectUriInput(payload.data.redirectUri || defaultRedirectUri);
        }
      }
    } catch (err) {
      console.warn('Failed to load Google OAuth config:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/google/oauth-config', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          clientId: clientIdInput,
          clientSecret: clientSecretInput,
          redirectUri: redirectUriInput || defaultRedirectUri,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.error?.message || 'Failed to update Google OAuth credentials.');
      }
      setConfig(payload.data);
      setClientSecretInput('');
      setFeedback({
        message: 'Google Cloud OAuth credentials updated successfully! Real Google Business Profile connection is now active.',
        type: 'success',
      });
    } catch (err: any) {
      setFeedback({ message: err.message || 'Error updating configuration', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              <span>Real Google Business Profile (GBP) Integration</span>
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                config?.isConfigured
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700'
                  : 'bg-amber-950/60 text-amber-300 border-amber-700'
              }`}
            >
              {config?.isConfigured ? 'PRODUCTION LIVE READY' : 'CREDENTIALS NEEDED'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Configure your real Google Cloud Project OAuth 2.0 Client credentials to connect real Google Business Profile
            locations, sync live customer reviews, and publish verified replies directly to Google Maps.
          </p>
        </div>

        <button
          onClick={fetchConfig}
          disabled={isLoading}
          className="self-start md:self-auto px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
              : 'bg-rose-950/40 border-rose-800 text-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-400" />
              <span>OAuth 2.0 Credentials (Web Application)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Obtain these from your Google Cloud Console project with Google Business Profile APIs enabled.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Google Client ID
              </label>
              <input
                type="text"
                value={clientIdInput}
                onChange={(e) => setClientIdInput(e.target.value)}
                placeholder="e.g. 1092837465910-abcdef.apps.googleusercontent.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 font-mono text-xs focus:outline-hidden focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Google Client Secret
                </label>
                {config?.hasSecret && (
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                    <Lock className="w-3 h-3" /> Secret is saved &amp; encrypted
                  </span>
                )}
              </div>
              <input
                type="password"
                value={clientSecretInput}
                onChange={(e) => setClientSecretInput(e.target.value)}
                placeholder={config?.hasSecret ? '•••••••••••••••••••••••• (Leave blank to keep existing secret)' : 'Enter client secret from Google Cloud Console'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 font-mono text-xs focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Authorized Redirect URI (Must match Google Cloud Console)
              </label>
              <input
                type="text"
                value={redirectUriInput}
                onChange={(e) => setRedirectUriInput(e.target.value)}
                placeholder={defaultRedirectUri}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 font-mono text-xs focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-xs flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>{isSaving ? 'Saving Credentials…' : 'Save & Activate Google OAuth'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Col: Google Cloud Console Instructions */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>Google Cloud Setup Guide</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Copy these exact URIs into your Google Cloud OAuth Client:
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 mb-1">
                <span>1. Authorized JavaScript Origin:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(originUrl, 'origin')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[10px] flex items-center gap-1 transition"
                >
                  {copiedField === 'origin' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedField === 'origin' ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 truncate">
                {originUrl}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 mb-1">
                <span>2. Authorized Redirect URI:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(defaultRedirectUri, 'redirect')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[10px] flex items-center gap-1 transition"
                >
                  {copiedField === 'redirect' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedField === 'redirect' ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 truncate">
                {defaultRedirectUri}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-900/40 text-[11px] text-indigo-200 space-y-1.5 leading-relaxed">
              <div className="font-semibold text-indigo-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Google APIs to enable:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                <li>Google Business Profile API</li>
                <li>My Business Account Management API</li>
                <li>My Business Business Information API</li>
              </ul>
            </div>

            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition text-center"
            >
              <span>Open Google Cloud Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
