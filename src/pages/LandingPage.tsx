import React, { useState } from 'react';
import {
  ShieldCheck,
  Star,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Building2,
  Zap,
} from 'lucide-react';

interface LandingPageProps {
  onStartOnboarding: () => void;
  onEnterDemo: () => void;
  onOpenAdmin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartOnboarding,
  onEnterDemo,
  onOpenAdmin,
}) => {
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('Dentist');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName || !email) return;
    setIsSubmitting(true);
    try {
      await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, email, category }),
      });
      setShowSignupModal(false);
      onStartOnboarding();
    } catch {
      onStartOnboarding();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-base tracking-tight">
                Google Review Autopilot
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                Single-Location First
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onEnterDemo}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition"
            >
              Explore Live App
            </button>
            <button
              onClick={onOpenAdmin}
              className="hidden sm:inline-flex text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2 rounded-lg hover:bg-slate-100 transition"
            >
              Super Admin Portal
            </button>
            <button
              onClick={() => setShowSignupModal(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-xs flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-6">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Safe AI Google Business Profile Automation</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Never leave a Google review unanswered. <br className="hidden sm:block" />
          <span className="text-blue-600">Safely automated with Gemini.</span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Connect your Google Business Profile in 2 minutes. Automatically publish warm,
          on-brand responses to 4-5 star reviews. Rest easy knowing negative reviews and
          untrusted comments always require your approval.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => setShowSignupModal(true)}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition shadow-sm flex items-center justify-center gap-2"
          >
            <span>Start 14-Day Free Trial</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onEnterDemo}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-sm transition shadow-xs"
          >
            Launch Interactive Demo
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          No credit card required &bull; Connects via official Google API &bull; 2-minute setup
        </p>
      </section>

      {/* The 3-Step Value Grid */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-slate-200">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="text-2xl font-bold text-slate-900">How Google Review Autopilot Works</h2>
          <p className="text-xs text-slate-500 mt-1">
            Built specifically for single-location dentists, repair shops, clinics, and local services.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 font-bold border border-blue-100">
                1
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Connect Google Location</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                One-click OAuth link with your official Google Business Profile. We securely listen for new customer reviews.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verified Google OAuth Adapter</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 font-bold border border-blue-100">
                2
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Protected AI Reply Drafting</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Google Gemini generates a polite, personalized response using verified business facts. Zero hallucinated refunds or promises.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-blue-600 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Prompt Injection Defense Active</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 font-bold border border-blue-100">
                3
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Autonomous Safety Rules</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                5★ and 4★ reviews auto-publish after your configurable grace period. 1–3★ reviews and any flagged risks wait for your approval.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-amber-600 font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>15–30 min edit grace window</span>
            </div>
          </div>
        </div>
      </section>

      {/* Safety Gate Comparison Table */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <ShieldAlert className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                The Non-Negotiable Safety Architecture
              </h3>
              <p className="text-xs text-slate-500">
                How our strict rule engine guarantees your business reputation is never compromised.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 text-xs mt-6">
            <div className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                </div>
                <span className="font-bold text-slate-800">5-Star & 4-Star Reviews (Low Risk)</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold uppercase text-[11px] border border-emerald-200">
                Auto-Publishes after 15–30m
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                </div>
                <span className="font-bold text-slate-800">3-Star Mixed Feedback</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold uppercase text-[11px] border border-amber-200">
                Requires Manual Approval
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                </div>
                <span className="font-bold text-slate-800">1–2 Star Negative Reviews</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 font-bold uppercase text-[11px] border border-rose-200">
                Always Locked to Approval
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span className="font-bold text-slate-800">Legal Threat / Safety Emergency / Injection Attempt</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 font-bold uppercase text-[11px] border border-rose-200">
                Barred from Auto-Publishing
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center border-t border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900">Simple, Transparent Pricing</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          No setup fees. Cancel anytime directly in your customer billing portal.
        </p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <h4 className="font-bold text-sm text-slate-900">Starter</h4>
            <div className="mt-2 text-2xl font-extrabold text-slate-900">$29 <span className="text-xs font-normal text-slate-500">/ mo</span></div>
            <p className="text-xs text-slate-500 mt-1">1 Google Location &bull; 50 replies/mo</p>
          </div>
          <div className="p-5 rounded-2xl bg-blue-50 border border-blue-400 shadow-xs relative">
            <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">Most Popular</div>
            <h4 className="font-bold text-sm text-slate-900">Growth</h4>
            <div className="mt-1 text-2xl font-extrabold text-slate-900">$69 <span className="text-xs font-normal text-slate-500">/ mo</span></div>
            <p className="text-xs text-slate-600 mt-1">Up to 3 Locations &bull; 200 replies/mo</p>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <h4 className="font-bold text-sm text-slate-900">Pro</h4>
            <div className="mt-2 text-2xl font-extrabold text-slate-900">$149 <span className="text-xs font-normal text-slate-500">/ mo</span></div>
            <p className="text-xs text-slate-500 mt-1">Up to 10 Locations &bull; Unlimited replies</p>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={() => setShowSignupModal(true)}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs"
          >
            Start Free 14-Day Trial &rarr;
          </button>
        </div>
      </section>

      {/* Signup Modal */}
      {showSignupModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-slate-900">Create SaaSCustomer Account</h3>
              </div>
              <button
                onClick={() => setShowSignupModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Set up your business identity to begin the 2-minute Google Business Profile onboarding.
            </p>

            <form onSubmit={handleSignupSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Business Legal / Trading Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bayview Family Dental"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Billing Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. office@bayviewdental.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Dentist">Dental Practice / Dentist</option>
                  <option value="Auto Repair">Auto Repair / Mechanic</option>
                  <option value="Medical Clinic">Medical / Health Clinic</option>
                  <option value="Plumber / HVAC">Plumbing & HVAC Services</option>
                  <option value="Law Office">Legal / Law Practice</option>
                  <option value="Restaurant">Restaurant / Cafe</option>
                  <option value="Other">Other Local Service</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSignupModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating Account...' : 'Continue to Google Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 text-center text-xs text-slate-500">
        <p>Google Review Autopilot &bull; Automated, safe review replies for local businesses</p>
        <p className="mt-1 text-[11px] text-slate-400">
          Strict Anti-Scope: No CRM &bull; No SMS blasts &bull; Reviews are untrusted UGC &bull; AI commitments prohibited
        </p>
      </footer>
    </div>
  );
};
