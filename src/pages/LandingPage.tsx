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
  Check,
  ChevronDown,
  ChevronUp,
  Lock,
  ExternalLink,
  MessageSquare,
  Sliders,
  AlertTriangle,
  Stethoscope,
  Wrench,
  Utensils,
  Store,
  Layers,
  ArrowUpRight,
  RefreshCw,
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
  const [category, setCategory] = useState('Dental Practice');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hero Interactive Demo State
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<'positive' | 'negative'>('positive');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* 
        ========================================================================
        1. TOP NAVIGATION BAR (Strict 3-Zone Top Bar Contract)
        Zone 1: Single text element wordmark
        Zone 2: 5 clean text navigation links with hover underlines
        Zone 3: 2 clear actions (Live Demo + Connect Google Profile)
        ========================================================================
      */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={onEnterDemo}>
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Zap className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-900 text-base tracking-tight">
              Google Review Autopilot
            </span>
          </div>

          {/* Zone 2: 5 clean text navigation links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-600">
            <a href="#how-it-works" className="hover:text-blue-600 transition-colors">
              How It Works
            </a>
            <a href="#safety-engine" className="hover:text-blue-600 transition-colors">
              Safety Engine
            </a>
            <a href="#use-cases" className="hover:text-blue-600 transition-colors">
              Use Cases
            </a>
            <a href="#pricing" className="hover:text-blue-600 transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-blue-600 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Zone 3: 2 clear actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onEnterDemo}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3.5 py-2 rounded-lg hover:bg-slate-100 transition whitespace-nowrap"
            >
              Explore Live App
            </button>
            <button
              onClick={() => setShowSignupModal(true)}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-xs flex items-center gap-1.5 whitespace-nowrap"
            >
              <span>Connect Google Profile</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 
        ========================================================================
        2. HERO SECTION
        Concise positioning, outcome-focused headline, dual CTAs, reassuring subtext
        ========================================================================
      */}
      <section className="pt-16 pb-12 sm:pt-24 sm:pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        {/* Eyebrow - Clean unboxed text with typographic separator */}
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 mb-4 bg-blue-50/70 border border-blue-200/60 px-3 py-1 rounded-full">
          <span>Official Google Business Profile Integration</span>
          <span aria-hidden="true" className="text-blue-300">·</span>
          <span>ReplyGuard™ Safety Layer</span>
        </div>

        {/* Primary Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12] text-balance">
          Every Google review answered. <br className="hidden sm:inline" />
          <span className="text-blue-600">Zero hours lost. Zero reputational risk.</span>
        </h1>

        {/* Supporting Copy */}
        <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed text-balance">
          Connect your Google Business Profile in two minutes. Automatically draft and publish warm, on-brand responses to positive customer reviews—while holding negative feedback and complex issues for your team&apos;s approval.
        </p>

        {/* Dual Primary & Secondary Action CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <button
            onClick={() => setShowSignupModal(true)}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition shadow-sm flex items-center justify-center gap-2"
          >
            <span>Start 14-Day Free Trial</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onEnterDemo}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 font-bold text-sm transition shadow-xs flex items-center justify-center gap-2"
          >
            <span>See Interactive Demo</span>
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Trust/Context Element */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-500 font-medium">
          <span>Connects via official Google OAuth</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>15-minute edit grace period</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>Cancel anytime in 1 click</span>
        </div>
      </section>

      {/* 
        ========================================================================
        3. HERO VISUAL: REALISTIC PRODUCT WORKFLOW ENGINE
        Shows real SaaS UI: Review Inbound -> AI Draft -> Safety Engine -> Google Publish
        Allows switching between 5-star positive review and 2-star sensitive review
        ========================================================================
      */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto pb-16">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
          {/* Top Interface Bar */}
          <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <span className="font-semibold text-slate-300 ml-2">
                Google Business Profile Review Pipeline
              </span>
            </div>

            {/* Interactive Workflow Switcher */}
            <div className="flex items-center bg-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setActiveWorkflowTab('positive')}
                className={`px-3 py-1 rounded text-xs font-semibold transition ${
                  activeWorkflowTab === 'positive'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                5★ Routine Review (Auto-Publish)
              </button>
              <button
                onClick={() => setActiveWorkflowTab('negative')}
                className={`px-3 py-1 rounded text-xs font-semibold transition ${
                  activeWorkflowTab === 'negative'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                2★ Service Delay (Approval Queue)
              </button>
            </div>
          </div>

          {/* Workflow Stage Container */}
          <div className="p-6 sm:p-8 space-y-6">
            {activeWorkflowTab === 'positive' ? (
              <div className="space-y-6 animate-fadeIn">
                {/* Step 1: Inbound Customer Review */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                        SJ
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">Sarah Jenkins</span>
                          <span className="text-[11px] text-slate-400">Google Local Guide · 42 reviews</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="flex text-amber-400">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                            ))}
                          </div>
                          <span className="text-xs text-slate-400">2 hours ago on Google Maps</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                      Downtown Dental Practice
                    </span>
                  </div>
                  <p className="mt-3 text-xs sm:text-sm text-slate-700 leading-relaxed">
                    &ldquo;Dr. Sarah and her hygienist were amazing! So gentle with my deep cleaning, and the office was spotless. Best dental experience I&apos;ve had in SF.&rdquo;
                  </p>
                </div>

                {/* Step 2 & 3: Gemini Draft + ReplyGuard Safety Inspection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* AI Generated Draft */}
                  <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/30 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                          <span>Gemini 3.8-Flash AI Draft</span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500">
                          Tone: Warm & Professional
                        </span>
                      </div>
                      <p className="mt-3 text-xs text-slate-700 leading-relaxed font-sans">
                        &ldquo;Hi Sarah, thank you so much for the 5-star review! Dr. Sarah and our whole hygiene team are thrilled to hear your cleaning went so smoothly. We look forward to seeing you at your next regular visit!&rdquo;
                      </p>
                      <div className="mt-2 text-[11px] text-slate-500 font-medium">
                        — Warm regards, Dr. Sarah & The Downtown Dental Team
                      </div>
                    </div>

                    <div className="mt-4 pt-2.5 border-t border-blue-100 text-[11px] text-blue-800 flex items-center justify-between font-medium">
                      <span>Personalized to patient &amp; service</span>
                      <span>0.8s generation</span>
                    </div>
                  </div>

                  {/* Safety Inspection Gate */}
                  <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50/30 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>ReplyGuard™ 8 Safety Gates</span>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-700 uppercase">
                          All Passed (Low Risk)
                        </span>
                      </div>

                      <ul className="mt-3 space-y-2 text-xs text-slate-700">
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>No unauthorized refund or coupon promises</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>No medical liability admission or clinical claims</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Complies with practice sign-off &amp; forbidden topics</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Anti-repetition &amp; prompt injection defense passed</span>
                        </li>
                      </ul>
                    </div>

                    <div className="mt-4 pt-2.5 border-t border-emerald-100 text-[11px] text-emerald-800 flex items-center justify-between font-bold">
                      <span>Action: AUTO_PUBLISH Eligible</span>
                      <span>15-min edit grace window</span>
                    </div>
                  </div>
                </div>

                {/* Step 4: Publication Status */}
                <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="font-bold">Scheduled to Publish to Google Business Profile in 14:12</span>
                      <span className="block text-[11px] text-slate-400 mt-0.5">
                        You have full control: Edit draft, publish immediately, or cancel with one click.
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={onEnterDemo}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition"
                    >
                      Edit Text
                    </button>
                    <button
                      onClick={onEnterDemo}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition"
                    >
                      Publish to Google Now
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-fadeIn">
                {/* Step 1: Inbound 2-Star Review */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-sm shrink-0">
                        MV
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">Marcus Vance</span>
                          <span className="text-[11px] text-slate-400">Local Reviewer</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="flex text-amber-400">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            <Star className="w-3.5 h-3.5 text-slate-300" />
                            <Star className="w-3.5 h-3.5 text-slate-300" />
                            <Star className="w-3.5 h-3.5 text-slate-300" />
                          </div>
                          <span className="text-xs text-slate-400">35 minutes ago on Google Maps</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                      Downtown Dental Practice
                    </span>
                  </div>
                  <p className="mt-3 text-xs sm:text-sm text-slate-700 leading-relaxed">
                    &ldquo;The dental cleaning was fine, but I had to wait 35 minutes in the lobby after my appointment time with no explanation from the desk.&rdquo;
                  </p>
                </div>

                {/* Safety Engine Intervention */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Generated Proposed Draft */}
                  <div className="border border-amber-200 rounded-xl p-4 bg-amber-50/30 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>Carefully Prepared Diplomatic Draft</span>
                        </div>
                        <span className="text-[11px] font-semibold text-amber-800">
                          Requires Approval
                        </span>
                      </div>
                      <p className="mt-3 text-xs text-slate-700 leading-relaxed font-sans">
                        &ldquo;Hello Marcus, thank you for sharing your feedback. We appreciate your kind words regarding the cleaning, but sincerely apologize for the delay past your appointment time. We value your time and are addressing this with our reception team. Please reach out to our practice director at care@downtowndental-sf.com so we can discuss your visit directly.&rdquo;
                      </p>
                    </div>

                    <div className="mt-4 pt-2.5 border-t border-amber-200/60 text-[11px] text-amber-900 flex items-center justify-between font-medium">
                      <span>Redirects to private email</span>
                      <span>Zero admission of liability</span>
                    </div>
                  </div>

                  {/* Safety Lock Card */}
                  <div className="border border-rose-200 rounded-xl p-4 bg-rose-50/30 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-rose-200/60">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                          <ShieldAlert className="w-4 h-4 text-rose-600" />
                          <span>ReplyGuard™ Rule Check</span>
                        </div>
                        <span className="text-[11px] font-bold text-rose-700 uppercase">
                          Auto-Publish Blocked
                        </span>
                      </div>

                      <ul className="mt-3 space-y-2 text-xs text-slate-700">
                        <li className="flex items-center gap-2 text-rose-800 font-semibold">
                          <Lock className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>Star rating &lt; 4 (Strictly barred from auto-publishing)</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Protected from accidental public debate</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Private director email inserted for escalation</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Assigned to Staff Approval Queue</span>
                        </li>
                      </ul>
                    </div>

                    <div className="mt-4 pt-2.5 border-t border-rose-200/60 text-[11px] text-rose-900 flex items-center justify-between font-bold">
                      <span>Status: HELD FOR REVIEW</span>
                      <span>Never auto-published</span>
                    </div>
                  </div>
                </div>

                {/* Safe Resolution Action */}
                <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                    <div>
                      <span className="font-bold">Held in Approval Queue: Requires Manager Sign-Off</span>
                      <span className="block text-[11px] text-slate-400 mt-0.5">
                        Your business is never put at risk by unchecked AI bots. Review, tweak, and approve on your terms.
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={onEnterDemo}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition"
                    >
                      Open in Approval Queue
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 
        ========================================================================
        4. LEGITIMATE TRUST & SECURITY ARCHITECTURE
        No fake metrics, no fake logos. Pure technical proof and security guarantees.
        ========================================================================
      */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200/80">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Enterprise-Grade Reliability &amp; Data Security
          </h2>
          <p className="text-lg font-bold text-slate-900 mt-1">
            Built directly on Google&apos;s official infrastructure with strict tenant isolation
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Official Google Business Profile API</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Direct OAuth connection with no scraping, no browser emulators, and no third-party credential storage.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">AES-256 Token Encryption</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Google OAuth access and refresh tokens are encrypted at rest with AES-256-GCM and never exposed to the frontend.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">PostgreSQL Tenant Scoping</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Every database query strictly checks tenant boundaries. Your reviews and brand voice are completely isolated.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Human-in-the-Loop Control</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Autopilot is opt-in and defaults to OFF. You decide whether to auto-publish or manually inspect every draft.
            </p>
          </div>
        </div>
      </section>

      {/* 
        ========================================================================
        5. THE REAL PROBLEM SECTION
        Concrete operational pain: what happens when reviews are managed manually
        ========================================================================
      */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-slate-200/80">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-600">The Problem</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Manual review management is draining your time and risking your reputation
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Local business owners know Google reviews drive customer choices. Yet keeping up manually creates four major operational bottlenecks:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-sm shrink-0">
                1
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Days-long response delays hurt conversion</h3>
            </div>
            <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
              When prospective customers check your Google Business listing, unanswered reviews or week-old delays signal slow customer support. Modern searchers choose the clinic or shop that demonstrates active, attentive management.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-sm shrink-0">
                2
              </div>
              <h3 className="font-bold text-slate-900 text-sm">5 to 10 hours lost to repetitive typing</h3>
            </div>
            <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
              Practice managers, front desk coordinators, and shop owners waste hours every week writing variations of &ldquo;Thank you for coming in!&rdquo; Time that should be spent serving clients in person is lost to repetitive administrative typing.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-sm shrink-0">
                3
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Dangerous generic AI &amp; staff mistakes</h3>
            </div>
            <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
              Unchecked AI tools or stressed staff often post erratic responses: accidentally offering $50 refunds in public, admitting fault during a medical dispute, or sounding like cold robots. Once published on Google, that damage is permanent.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-sm shrink-0">
                4
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Multi-location reviews fall through cracks</h3>
            </div>
            <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
              If your business runs two or more locations, logging into multiple Google accounts to track feedback is chaotic. Reviews sit neglected on secondary profiles, lowering local search rankings and customer engagement.
            </p>
          </div>
        </div>
      </section>

      {/* 
        ========================================================================
        6. THE SOLUTION / TRANSFORMATION (Before vs. After)
        ========================================================================
      */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-slate-200/80">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">The Transformation</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Turn review management from a daily chore into an automated, safe engine
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Before Column */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800">Before Google Review Autopilot</h3>
              <span className="text-[11px] font-bold text-rose-600 uppercase bg-rose-50 px-2 py-0.5 rounded">
                Manual Chaos
              </span>
            </div>
            <ul className="mt-4 space-y-3 text-xs text-slate-600">
              <li className="flex items-start gap-2.5">
                <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                <span>Reviews sit for 3 to 7 days before anyone notices</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                <span>Staff spend hours typing generic, repetitive responses</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                <span>Inconsistent tone between different team members</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                <span>Accidental commitments or public disputes on negative reviews</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                <span>Logging in and out of multiple Google accounts every day</span>
              </li>
            </ul>
          </div>

          {/* After Column */}
          <div className="p-6 rounded-2xl bg-blue-50/50 border border-blue-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-blue-100">
              <h3 className="font-bold text-sm text-blue-950">With Google Review Autopilot</h3>
              <span className="text-[11px] font-bold text-emerald-700 uppercase bg-emerald-100/70 px-2 py-0.5 rounded">
                Protected Autopilot
              </span>
            </div>
            <ul className="mt-4 space-y-3 text-xs text-slate-700">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Reviews answered within 15–30 minutes automatically</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Gemini generates personalized replies referencing specific services</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Consistent brand voice with custom sign-off and practice context</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Sensitive or 1–3★ reviews strictly held for team approval</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Centralized dashboard monitoring all your Google locations</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 
        ========================================================================
        7. HOW IT WORKS (4-Step Visual Workflow)
        Clear editorial numbered flow matching the exact implementation
        ========================================================================
      */}
      <section id="how-it-works" className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-slate-200/80">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">The Process</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            How Google Review Autopilot Works
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            A reliable 4-step pipeline designed so you retain 100% control while saving hours every week.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm mb-4 border border-blue-100">
                01
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Connect Profile</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Authorize your Google Business Profile with one secure click via official Google OAuth. No technical configuration needed.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-emerald-600 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Takes under 2 minutes</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm mb-4 border border-blue-100">
                02
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Sync Reviews</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                The system ingests past reviews and listens for new feedback in real time across your authorized business locations.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-blue-600 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Real-time webhook sync</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm mb-4 border border-blue-100">
                03
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Ground &amp; Draft</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Gemini generates a courteous, context-aware draft using your approved business facts, staff names, and trusted sign-off.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-indigo-600 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Zero hallucinated claims</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm mb-4 border border-blue-100">
                04
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Protect &amp; Publish</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                5★ reviews publish after your chosen grace window. 1–3★ reviews and flagged risks wait in your team&apos;s Approval Queue.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-amber-600 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>15–30 min edit window</span>
            </div>
          </div>
        </div>
      </section>

      {/* 
        ========================================================================
        8. CORE PRODUCT CAPABILITIES (Asymmetric Bento Grid)
        Structured by customer value, avoiding tech clutter
        ========================================================================
      */}
      <section id="safety-engine" className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-slate-200/80">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Product Capabilities</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Engineered specifically for local reputation protection
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Every feature is designed to eliminate manual friction while guaranteeing that your business never makes an unauthorized commitment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Span 2 - ReplyGuard Safety Engine */}
          <div className="md:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">ReplyGuard™ Multi-Vector Safety Engine</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Standard AI models hallucinate discounts, admit legal fault, and get confused by adversarial prompts. ReplyGuard is a specialized 8-gate verification layer running before any reply is eligible for publishing.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Blocks unauthorized refund or coupon offers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Blocks medical, legal, and financial liability</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Neutralizes prompt injection attacks</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Flags customer privacy leaks (PII)</span>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Automated safety telemetry</span>
              <span className="font-semibold text-emerald-700">Guaranteed Brand Protection</span>
            </div>
          </div>

          {/* Card 2: Custom Brand Voice */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <Sliders className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Custom Brand Voice</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Configure your tone (Warm &amp; Professional, Empathetic, Enthusiastic), define authorized escalation emails, and set strictly forbidden topics (e.g., &ldquo;Never discuss pricing in public reviews&rdquo;).
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-blue-600">
              Matches your real staff tone
            </div>
          </div>

          {/* Card 3: Edit Grace Window */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Configurable Edit Window</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Choose a 15, 30, or 60-minute holding period for routine 5★ reviews before they publish to Google. Gives your team plenty of time to edit or adjust before anything goes live.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-amber-600">
              15–60 minute safety delay
            </div>
          </div>

          {/* Card 4: Span 2 - Centralized Approval Queue */}
          <div className="md:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Centralized Team Approval Queue</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Every review requiring review arrives in an organized queue. With a single click, your team can approve the AI draft, make inline text edits, or regenerate with fresh context. Once approved, it publishes to Google Business Profile instantly.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>One-click regenerate with Gemini</span>
              <span className="font-semibold text-slate-700">Immediate Google API sync</span>
            </div>
          </div>
        </div>
      </section>

      {/* 
        ========================================================================
        9. DIFFERENTIATION: WHY THIS PRODUCT EXISTS
        Specific, focused vs generic enterprise bloat or raw ChatGPT
        ========================================================================
      */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-slate-200/80">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Why Autopilot</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Built for local businesses, not enterprise IT departments
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Most reputation tools are bloated $500/month platforms with 60 features you will never touch. Here is why Google Review Autopilot is different:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm">Laser-Focused on Google</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Google Business Profile is responsible for over 80% of local discovery. We do not dilute focus with SMS marketing blasts, survey forms, or unneeded CRM tools. We do one thing exceptionally well: Google reviews.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm">True Safety Guardrails</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Unlike generic ChatGPT browser extensions that reply blindly to everything, our ReplyGuard engine actively blocks hallucinations, denies unauthorized discounts, and flags sensitive reviews before they publish.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm">Two-Minute Setup</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              No developer required. No code snippets to install on your website. Simply authorize your Google Business Profile via official OAuth, set your brand tone, and you are live in under two minutes.
            </p>
          </div>
        </div>
      </section>

      {/* 
        ========================================================================
        10. USE CASES FOR HIGH-VALUE EARLY ADOPTERS
        Dental Clinics, Auto Repair, Home Services, Hospitality
        ========================================================================
      */}
      <section id="use-cases" className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-slate-200/80">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Tailored Solutions</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Proven workflows for high-reputation local industries
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dental & Medical Clinics */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Dental &amp; Medical Practices</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-800">The Problem:</strong> Healthcare reviews must be handled with utmost care. Stressed patients, hygiene praise, and scheduling hiccups require polite, non-clinical responses.
              </p>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                <strong className="text-slate-800">The Workflow:</strong> 5★ routine cleanings auto-publish with grateful acknowledgment. Any review mentioning treatment pain, clinical outcomes, or disputes is instantly locked for the practice director&apos;s review.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-blue-700">
              Outcome: Active Google Maps presence without HIPAA liability
            </div>
          </div>

          {/* Auto Repair & Collision */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Auto Repair &amp; Service Shops</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-800">The Problem:</strong> Mechanics and shop owners spend all day with their hands on tools, not at a desk typing review responses. Reviews go unanswered for weeks.
              </p>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                <strong className="text-slate-800">The Workflow:</strong> Quick responses referencing specific brake jobs or inspections publish automatically, highlighting the shop&apos;s honesty and quick turnaround.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-amber-700">
              Outcome: Consistently high local Google ranking with zero manual typing
            </div>
          </div>

          {/* Home Services & HVAC */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Store className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Plumbing, HVAC &amp; Contractors</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-800">The Problem:</strong> Homeowners choose contractors based on response speed and reliable reputation on Google Maps. Delays lead customers to call the next contractor.
              </p>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                <strong className="text-slate-800">The Workflow:</strong> Instant acknowledgments thanking homeowners for trusting the team with emergency furnace or plumbing repairs reassure prospective customers.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-emerald-700">
              Outcome: Superior speed-to-reply advantage over local competitors
            </div>
          </div>

          {/* Restaurants & Hospitality */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Utensils className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Restaurants &amp; Hospitality</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-800">The Problem:</strong> High review volume means managers face dozens of reviews weekly. Food lovers want to feel acknowledged, but manual replies take hours.
              </p>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                <strong className="text-slate-800">The Workflow:</strong> Hospitality-focused replies celebrate dish recommendations and thank diners, while table delay complaints are kept for general manager review.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-indigo-700">
              Outcome: Vibrant, appreciative restaurant presence on Google Maps
            </div>
          </div>
        </div>
      </section>

      {/* 
        ========================================================================
        11. PRICING & MONETIZATION
        Reflects actual Paddle billing implementation: Starter, Growth, Pro
        ========================================================================
      */}
      <section id="pricing" className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-slate-200/80">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Transparent Pricing</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Simple plans based on your location count
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Every plan includes a 14-day free trial. No setup fees. Cancel anytime in your self-serve billing portal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Starter Plan */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Starter</h3>
              <p className="text-xs text-slate-500 mt-1">For single-location practices and shops</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">$29</span>
                <span className="text-xs text-slate-500">/ month</span>
              </div>

              <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>1 Google Business Profile location</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Up to 50 AI review replies / month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>ReplyGuard™ prompt injection defense</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Approval queue for 1–3★ reviews</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>15–30 min edit grace window</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowSignupModal(true)}
                className="w-full py-2.5 rounded-xl font-semibold text-xs border border-blue-600 text-blue-600 hover:bg-blue-50 transition"
              >
                Start 14-Day Free Trial
              </button>
            </div>
          </div>

          {/* Growth Plan - Featured */}
          <div className="p-6 rounded-2xl bg-blue-50/50 border-2 border-blue-600 shadow-sm flex flex-col justify-between relative">
            <div className="absolute -top-3 right-6 bg-blue-600 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Most Popular
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-base">Growth</h3>
              <p className="text-xs text-slate-600 mt-1">For busy practices &amp; expanding businesses</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">$69</span>
                <span className="text-xs text-slate-600">/ month</span>
              </div>

              <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-semibold">Up to 3 Google Business locations</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Up to 200 AI review replies / month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Full Auto-Publishing for 4–5★ reviews</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Custom brand voice &amp; forbidden topics</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Priority Google webhook synchronization</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-blue-200">
              <button
                onClick={() => setShowSignupModal(true)}
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition"
              >
                Start 14-Day Free Trial
              </button>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Pro</h3>
              <p className="text-xs text-slate-500 mt-1">For multi-location groups and franchises</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">$149</span>
                <span className="text-xs text-slate-500">/ month</span>
              </div>

              <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-semibold">Up to 10 Google Business locations</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Unlimited AI review replies / month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Multi-user team roles (Owner, Admin, Member)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Audit logging &amp; compliance history</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Dedicated priority support</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowSignupModal(true)}
                className="w-full py-2.5 rounded-xl font-semibold text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
              >
                Start 14-Day Free Trial
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-slate-500">
          Need more than 10 locations? Contact our support team for custom franchise deployments.
        </div>
      </section>

      {/* 
        ========================================================================
        12. FAQ (SEO / GEO / AI Search Optimized)
        Addresses real objections, technical details, and security policies
        ========================================================================
      */}
      <section id="faq" className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto border-t border-slate-200/80">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Questions &amp; Answers</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Everything you need to know about Google Business Profile integration, AI safety, and billing.
          </p>
        </div>

        <div className="space-y-3.5">
          {[
            {
              q: 'How does Google Review Autopilot connect to my Google Business Profile?',
              a: 'Google Review Autopilot connects via Google’s official OAuth 2.0 protocol. When you authorize the app, Google grants secure API access to read your reviews and publish approved replies. We never see or store your Google account password.',
            },
            {
              q: 'Can the AI accidentally offer customers free refunds or discounts?',
              a: 'No. Our proprietary ReplyGuard™ safety engine scans every draft before publication. Any draft attempting to promise financial compensation, discounts, or equipment replacements is blocked immediately. You can also configure explicit prohibited topics in your brand settings.',
            },
            {
              q: 'What happens when someone leaves a 1-star or negative review?',
              a: '1-star and 2-star reviews are strictly barred from auto-publishing. They are held in your team’s Approval Queue alongside a diplomatic, carefully drafted suggestion that invites the customer to reach out to your private management email.',
            },
            {
              q: 'Can I disable automated publishing completely?',
              a: 'Yes. Auto-publishing is completely optional and defaults to OFF when you first connect your profile. You can keep the system in draft-only mode indefinitely, requiring manual approval for every single response.',
            },
            {
              q: 'How does the 15-minute edit grace period work?',
              a: 'When an eligible 4 or 5-star review arrives, the system drafts an on-brand reply and schedules it to publish in 15 minutes (or 30/60 minutes depending on your settings). During this window, you receive a notification and can review, edit, or cancel the draft before it goes live to Google.',
            },
            {
              q: 'Does it support multi-location businesses?',
              a: 'Yes. The Growth plan supports up to 3 Google Business locations and the Pro plan supports up to 10 locations. You can monitor and manage reviews across all your locations from a single unified dashboard.',
            },
            {
              q: 'How does the 14-day free trial work?',
              a: 'You can test all features of Google Review Autopilot free for 14 days. You can cancel with a single click at any time in your customer billing portal. No long-term contracts or cancellation penalties.',
            },
          ].map((item, idx) => {
            const isOpen = expandedFaq === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden transition shadow-2xs"
              >
                <button
                  onClick={() => setExpandedFaq(isOpen ? null : idx)}
                  className="w-full py-4 px-5 text-left flex items-center justify-between text-xs sm:text-sm font-bold text-slate-900 hover:text-blue-600 transition"
                >
                  <span>{item.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 ml-3" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-3" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 
        ========================================================================
        13. FINAL CONVERSION CTA
        High-intent conclusion reinforcing core value proposition
        ========================================================================
      */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center border-t border-slate-200/80">
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-14 shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Start managing your Google reviews with less manual work
            </h2>
            <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
              Connect your Google Business Profile in two minutes. Join local practices and shops that never leave customer reviews unanswered.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <button
                onClick={() => setShowSignupModal(true)}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition shadow-sm flex items-center justify-center gap-2"
              >
                <span>Connect Google Business Profile</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onEnterDemo}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition"
              >
                Explore Live Demo First
              </button>
            </div>

            <div className="mt-4 text-xs text-slate-400">
              14-day free trial · No setup fees · Cancel anytime
            </div>
          </div>
        </div>
      </section>

      {/* 
        ========================================================================
        14. CLEAN ACCESSIBLE SIGNUP MODAL
        Captures business details and seamlessly routes to Google onboarding
        ========================================================================
      */}
      {showSignupModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Start Your 14-Day Trial</h3>
                  <p className="text-[11px] text-slate-500">Connect Google Business Profile</p>
                </div>
              </div>
              <button
                onClick={() => setShowSignupModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Enter your practice or business details to launch the secure Google OAuth connection wizard.
            </p>

            <form onSubmit={handleSignupSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Business Legal or Trading Name
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
                  Work Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. director@bayviewdental.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Industry / Business Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Dental Practice">Dental Practice / Dentist</option>
                  <option value="Medical Clinic">Medical or Wellness Clinic</option>
                  <option value="Auto Repair">Auto Repair &amp; Service</option>
                  <option value="Home Services">Plumbing, HVAC &amp; Electrical</option>
                  <option value="Restaurant">Restaurant or Cafe</option>
                  <option value="Professional Services">Legal or Accounting Practice</option>
                  <option value="Other">Other Local Business</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowSignupModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 transition flex items-center gap-1.5"
                >
                  <span>{isSubmitting ? 'Initializing...' : 'Continue to Google OAuth'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        15. QUIET FOOTER
        Clean copyright, navigation links, and administrative entry point
        ========================================================================
      */}
      <footer className="bg-white border-t border-slate-200 py-10 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-800">Google Review Autopilot</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500">© 2026 All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#how-it-works" className="hover:text-slate-900 transition">How It Works</a>
            <a href="#safety-engine" className="hover:text-slate-900 transition">Safety Engine</a>
            <a href="#pricing" className="hover:text-slate-900 transition">Pricing</a>
            <a href="#faq" className="hover:text-slate-900 transition">FAQ</a>
            <button
              onClick={onOpenAdmin}
              className="text-slate-400 hover:text-slate-600 font-medium transition"
            >
              Admin Portal
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
