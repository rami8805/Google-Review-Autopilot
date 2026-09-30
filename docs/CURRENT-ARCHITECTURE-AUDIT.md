# Current Architecture Audit — Google Review Autopilot

**Audit Date**: September 30, 2026  
**Auditor**: Senior Software Architect  
**Target System**: Google Review Autopilot (Full-Stack SaaS)  
**Codebase Authority**: Code is primary truth; existing documentation is treated as secondary claim.

---

## 1. Executive Reconstructed Architecture

### 1.1 Overview
Google Review Autopilot is designed as a focused multi-tenant SaaS application for local brick-and-mortar businesses. Its core function is to automate Google Business Profile review responses safely using Google Gemini, enforcing strict policy barriers to prevent hallucinations, liability concessions, or adversarial prompt injections from reaching public Google profiles.

### 1.2 Technology Stack Inventory

| Layer | Declared / Target Tech | Actual Current Implementation in Code |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 (SPA) | Vite 8 + React 19 SPA (`src/App.tsx`, `src/pages/*`) |
| **Frontend Styling** | Tailwind CSS v4 | `@tailwindcss/vite` 4.3.3 + standard utility classes |
| **Routing** | Client-side Router | Custom React state tab routing (`currentTab`: dashboard, reviews, settings, billing, support) in `src/App.tsx` |
| **State Management** | Central Store | Component-level React `useState` hooks with optimistic local fallbacks |
| **Backend Runtime** | Node.js 22 | Node.js 22.23.2 with `tsx` (`server.ts`) |
| **Web Framework** | Express 4 | Express 4.21.2 (`server.ts`, `server/routes/index.ts`) |
| **API Architecture** | REST JSON Gateway | Enveloped JSON (`{ success: true, data, meta }` / `{ success: false, error }`) mounted at `/api` |
| **Database** | PostgreSQL / Cloud SQL | **In-memory mock singleton variables** in `server/routes/index.ts` and service instances. No persistence engine active. |
| **ORM / Migration** | None active | `shared/types/domain.ts` interfaces only. No Drizzle/Prisma/SQL drivers in dependencies. |
| **AI SDK** | `@google/genai` | `@google/genai` 2.4.0 (`server/services/ai/aiReplyEngine.ts`) with deterministic fallback |
| **External Auth** | Google OAuth 2.0 | Mock adapter in `server/services/google/googleProfileProvider.ts` |
| **Payments** | Stripe | Mock adapter in `server/services/billing/billingService.ts` |
| **Notifications** | Resend / In-app | In-memory queue in `server/services/notifications/notificationService.ts` |

---

## 2. Component Structure & Feature Boundaries

```
[Browser Client]
  ├── src/App.tsx (Root Controller, Tab Router, Shared State Orchestrator)
  ├── src/components/ (Navbar, RiskBadge, StatusBadge)
  ├── src/features/
  │    ├── billing/ (SubscriptionPlanCard)
  │    ├── dashboard/ (DashboardMetrics)
  │    ├── onboarding/ (OnboardingWizard)
  │    ├── reviews/ (ApprovalQueue)
  │    ├── settings/ (AutomationRulesConfig, BrandVoiceConfig)
  │    └── support/ (SupportWidget)
  ├── src/pages/ (DashboardPage, ReviewsPage, SettingsPage, BillingPage, LandingPage)
  └── admin/
       ├── components/ (AdminHeader)
       ├── features/ (AdminSupportDesk, TenantOverview)
       └── pages/ (AdminDashboardPage)

[API Gateway (server.ts)]
  └── server/routes/index.ts (Express Router)
       ├── /api/auth/*
       ├── /api/google/*
       ├── /api/reviews/*
       ├── /api/settings/*
       ├── /api/billing/*
       ├── /api/support/*
       └── /api/admin/*

[Domain & Safety Services (server/services/)]
  ├── ai/aiReplyEngine.ts (GeminiAiReplyEngine, Prompt Sandboxing, Risk Assessor)
  ├── workflow/replyGuardService.ts (ReplyGuardService: 8 Safety Gates)
  ├── google/googleProfileProvider.ts (GoogleBusinessProfileService)
  ├── billing/billingService.ts (BillingService)
  ├── support/supportService.ts (SupportService)
  ├── notifications/notificationService.ts (NotificationService)
  └── server/jobs/reviewSyncJob.ts (ReviewSyncJob Ingestion Orchestrator)
```

---

## 3. Database & Persistence Layer Findings

1. **Absence of Real Storage Engine**:
   - `package.json` contains no SQL client (`pg`, `mysql2`, `better-sqlite3`), NoSQL client (`mongodb`), or ORM (`drizzle-orm`, `prisma`).
   - All server state resides in memory:
     - `server/routes/index.ts`: `mockLocation`, `mockBrandVoice`, `mockRules`, `mockSubscription`, `mockStaffNotes`, `mockAuditEvents`, `mockReviews`, `mockReplies`.
     - `server/services/support/supportService.ts`: `tickets: SupportTicket[]`, `messages: SupportMessage[]`.
     - `server/services/notifications/notificationService.ts`: `notifications: Notification[]`.
2. **Ephemeral Volatility**:
   - Container restarts or server rebuilds immediately revert all mutations back to default fixture seeds.
3. **No Distributed Synchronization**:
   - Concurrent instances will have independent, desynchronized memory spaces.

---

## 4. Tenant Isolation Audit

1. **Tenant Identifier**: `saasCustomerId` (`string`).
2. **Header-Based Authentication**:
   - Routes inspect `req.headers['x-tenant-id']`.
   - If missing, `getTenantId(req)` defaults to `'saas_cust_demo_01'`.
3. **Flaws & Weaknesses**:
   - **No Cryptographic Proof**: Client can supply any arbitrary `x-tenant-id` string to access or impersonate another tenant.
   - **Singleton Overwrites**: Endpoints like `PUT /api/settings/automation-rules` and `PUT /api/settings/brand-voice` overwrite global memory variables rather than tenant-keyed dictionaries.
   - **Default Admin Vulnerability**: In `verifyAdminRole()`, `if (role && role !== 'SUPER_ADMIN')` permits access when `x-user-role` is undefined or null!

---

## 5. Domain Model Integrity Audit

The domain models defined in `shared/types/domain.ts` exhibit strict taxonomy:
- `SaaSCustomer`: The paying subscriber.
- `User`: The authenticated staff/owner identity.
- `Business`: The commercial company entity.
- `BusinessLocation`: The Google Business Profile venue.
- `Review`: Public review record.
- `ReviewAuthor`: The Google reviewer (explicitly NOT the SaaS customer).
- `SupportTicket` & `Subscription`: Operational and commercial records.

**Taxonomy Evaluation**: The domain types maintain clean separation and avoid ambiguous "Customer" terminology. However, in backend routing and frontend components, mock data merges some attributes (e.g. `mockLocation.saasCustomerId` and `mockLocation.businessId` reference static demo strings).

---

## 6. AI & Safety Layer Findings

1. **Model**: Configured for `process.env.GEMINI_MODEL || 'gemini-3.8-flash'` using `@google/genai`.
2. **Untrusted Review Content Sandboxing**: Review text is wrapped in `<untrusted_review_content>` tags with defensive instructions (`UNTRUSTED_REVIEW_DEFENSE_PROMPT`).
3. **Reply Guard**:
   - Implemented in `server/services/workflow/replyGuardService.ts`.
   - Runs 8 deterministic checks: Fact, Risk, Tone, Repetition, Privacy, Promise, Legal Safety, Quality.
   - Regeneration is bounded to exactly 1 turn (`regenerationAttempts === 0 && hasFixableFailure && !hasUnfixableCritical`).
   - 1-3 star reviews are hard-locked to require manual human approval.
4. **Deterministic Fallbacks**:
   - When Gemini times out (>3500ms, or >500ms in test) or lacks an API key, `GeminiAiReplyEngine` yields deterministic, safe template replies rather than crashing.

---

## 7. Build, Lint & Test Verification

- **Lint (`npm run lint`)**: Passed (`tsc --noEmit`, 0 errors).
- **Compilation (`compile_applet` / `npm run build`)**: Passed (Vite client assets bundled in 644ms).
- **Automated Tests (`npm test`)**: Passed all 42 tests across:
  - Automation Rule Engine (8/8)
  - Injection Defense & Safety (5/5)
  - End-to-End Integration & Invariants (6/6)
  - Reply Guard Safety Layer (23/23)
