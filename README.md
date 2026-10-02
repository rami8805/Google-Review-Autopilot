# Google Review Autopilot

> Automated, safe, AI-powered review replies for local businesses connecting to Google Business Profile.

---

## 1. Product Goal & Philosophy

**Google Review Autopilot** solves one high-leverage problem for local business owners: responding quickly, professionally, and safely to Google Business Profile reviews.

* **Single-Location-First**: Tailored for fast onboarding and frictionless daily operation for local businesses (dental practices, auto repair shops, restaurants, plumbing services, medical clinics, law offices).
* **One Core Job**: Connect Google Business Profile, detect new reviews, generate safe AI drafts using Google Gemini (`gemini-3.8-flash`), and publish replies automatically according to clear risk rules.
* **Strict Anti-Scope (What We Do NOT Build)**:
  * ❌ No CRM for review authors
  * ❌ No SMS marketing
  * ❌ No email marketing campaigns or newsletters
  * ❌ No social media management
  * ❌ No multi-directory listings management
  * ❌ No website builder
  * ❌ No referral or loyalty programs
  * ❌ No mobile app

---

## 2. Domain Model Taxonomy

We maintain a strict conceptual boundary between our customers and reviewers:

* **User**: The login identity (email, password/SSO, user role).
* **SaaSCustomer**: The paying customer who subscribes to Google Review Autopilot.
* **Business**: The commercial entity owned/managed by the `SaaSCustomer`.
* **BusinessLocation**: A specific Google Business Profile location.
* **Review**: A Google review submitted on Google Maps / Search for a `BusinessLocation`.
* **ReviewAuthor**: The public reviewer who wrote the Google review (**NOT our customer**).
* **SupportTicket**: A customer support inquiry submitted by a `SaaSCustomer`.
* **Subscription**: The commercial billing entitlement record governing location count and reply limits.

> **Rule**: Never use the bare word "Customer" ambiguously in domain code or documentation.

---

## 3. Automation & AI Safety Rules

### Default Automation Baseline & Reply Guard Pipeline
* **5-Star + LOW Risk** ➔ `AUTO_PUBLISH` (only after passing all 8 Reply Guard safety gates)
* **4-Star + LOW Risk** ➔ `AUTO_PUBLISH` (only after passing all 8 Reply Guard safety gates)
* **3-Star** ➔ `REQUIRE_APPROVAL` (never auto-published)
* **1–2 Stars** ➔ `REQUIRE_APPROVAL` (never auto-published)
* **HIGH or CRITICAL Risk** ➔ `REQUIRE_APPROVAL` (regardless of star rating)

### Reply Guard Safety Layer (Pre-Publication Gate)
Reply Guard sits strictly between AI reply generation and Google Business Profile publication:
1. **Fact Check**: Blocks invented refunds, operational changes, employee actions, appointment bookings.
2. **Risk Check**: Flags legal threats, injuries, discrimination, violence, and safety hazards.
3. **Tone Check**: Enforces configured brand voice; blocks aggression, sarcasm, or excessive apologies.
4. **Repetition Check**: Prevents identical verbatim sentences or >78% semantic similarity across recent location replies.
5. **Privacy Check**: Blocks unauthorized customer PII (emails, phone numbers, order IDs).
6. **Promise Check**: Blocks unauthorized guarantees or commitments.
7. **Legal Safety Check**: Blocks admissions of liability or accusations of reviewer dishonesty.
8. **Quality Check**: Rejects empty drafts, verbosity (>160 words), or model artifacts.
* **Bounded Single-Turn Regeneration**: If a fixable issue is detected, allows exactly one regeneration with targeted feedback.
* **Immutable Decision**: Reply Guard can never lower required human oversight.

### Strict AI Generation Boundaries
The AI engine **must never invent**:
1. Refunds, reimbursements, or financial credits
2. Discounts, coupons, promo codes, or fee cuts
3. Free compensation, gift items, or vouchers
4. Employee or staff names not in trusted context
5. Internal business policies, warranty pledges, or compliance declarations
6. Binding promises, timelines, or future guarantees
7. Actions or appointments not present in verified context

Review text is treated as **untrusted user-generated content (UGC)**. All prompts are fortified against prompt injection with XML boundary delimiters and strict secondary regex root sanitizers.

---

## 4. Subsystem & Directory Layout

```
├── .env.example              # Environment variables template
├── metadata.json             # App metadata & server capabilities
├── README.md                 # Primary system guide
├── docs/                     # Architectural specifications
│   ├── ARCHITECTURE.md       # Full architectural design & data flows
│   ├── AI-AGENT-CONTRACT.md  # Binding engineering & AI laws
│   ├── FILE-OWNERSHIP.md     # Directory ownership matrix for agents
│   ├── INTEGRATION-CONTRACT.md# External provider specifications (Google, Gemini, Stripe)
│   ├── QA-REPORT.md          # Comprehensive QA and security audit
│   ├── RELEASE-CHECKLIST.md  # Pre-flight release verification
│   └── RELEASE-AUDIT.md      # Final release integration audit report
├── shared/                   # Shared contracts (Frontend, Backend, Jobs)
│   ├── types/                # Domain models & enveloped API contracts
│   ├── schemas/              # Payload validation interfaces
│   └── constants/            # Automation rules, safety prompts, constants
├── server/                   # Backend services & Express API
│   ├── routes/               # API route controllers with multi-tenant guards
│   ├── services/
│   │   ├── google/           # Google Business Profile adapter
│   │   ├── ai/               # Gemini AI safety & reply generator
│   │   ├── billing/          # Stripe subscription & portal management
│   │   ├── notifications/    # Alerting & email dispatch
│   │   └── support/          # Support ticketing engine with staff copilot
│   └── jobs/                 # Background review sync & grace-period worker
├── src/                      # Customer Frontend (Vite + React + Tailwind)
│   ├── components/           # Shared UI primitives (Navbar, Badges)
│   ├── pages/                # Top-level page routes (Dashboard, Reviews, Settings, Billing, Landing)
│   └── features/
│       ├── onboarding/       # 4-step Google Connect & setup wizard
│       ├── dashboard/        # Metrics, connection status & health
│       ├── reviews/          # Review feed, Approval Queue & Ingestion Tester
│       ├── settings/         # Brand voice & rule customizer
│       ├── billing/          # Subscription & sandbox billing lifecycle
│       └── support/          # In-app support widget & conversation threads
├── admin/                    # Role-protected Super Admin Portal
│   ├── components/           # Admin design system
│   ├── pages/                # Admin Dashboard
│   └── features/             # Cross-tenant operations, Support Desk & Telemetry
└── tests/                    # Unit, integration & safety test suites
```

---

## 5. Development & Testing

### Installation & Environment Setup
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Verify TypeScript types
npm run lint

# Run the full automated test suite (42/42 tests)
npm test

# Production build
npm run build

# Start full-stack dev server (Express on 0.0.0.0:3000 with Vite middlewares)
npm run dev
```

---

### Google Business Profile OAuth Configuration

- Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` for the OAuth web client.
- Set `GOOGLE_REDIRECT_URI` to the exact frontend callback URL, for example `http://localhost:3000/onboarding` in local development.
- Register that exact same URL in the OAuth client's **Authorized redirect URIs**. In production, use the deployed HTTPS application origin plus `/onboarding`.
- The user must remain signed in with a real Firebase ID token when Google redirects back to the app. The onboarding wizard posts the returned `code` and `state` to the authenticated backend callback; demo/test bearer tokens are not accepted for this step.
- Enable and obtain the required access to the Google Business Profile APIs for the Google Cloud project. API access and OAuth verification/approval may be required by Google.
- Never put the Google client secret or Google access/refresh tokens in frontend configuration. Tokens are stored server-side and must be protected by `TOKEN_ENCRYPTION_KEY`.

## 6. End-to-End User Journeys

### A. Customer Onboarding & Setup
1. Open the app or click **Landing / Signup** in the top navigation.
2. Click **Start 14-Day Free Trial** or **Get Started** to enter business details (e.g. *Bayview Dental*).
3. Sign in to the app with a real Firebase-authenticated user, then authorize Google Business Profile in Step 1.
4. Confirm the business location returned by the Google Business Profile API in Step 2.
5. Run the first real review sync in Step 3; the wizard displays the actual sync counts and, when available, a review and its persisted reply draft.
6. Open the dashboard after the sync succeeds. No sample review or simulated OAuth success is used in this flow.

### B. Inbound Google Review Processing (Phase 4 Simulation)
1. Go to the **Approval Queue** tab.
2. In the **Live Ingestion Tester** toolbar, click:
   - `+ 5★ Praise`: Auto-publishes to Google Business Profile after grace period.
   - `+ 3★ Wait Time`: Held safely in the Approval Queue.
   - `+ 1★ Prompt Injection`: Detects adversarial prompt injection / legal threat; locks review to manual approval with critical risk badge.
3. Inspect and edit proposed AI drafts, click **Approve & Publish to Google**, or click **Regenerate**.

### C. Customer Support & Admin Copilot (Phase 7)
1. In the customer view, navigate to **Support** to view tickets or submit an inquiry with optional attachment.
2. Click **Super Admin** in the navigation header to switch to the admin view.
3. Open the **Support Desk** tab to view customer inquiries with rich account context (Google connection state, subscription tier, review stats).
4. Click **Suggest Reply with AI** to generate a staff-reviewed draft.
5. Edit draft if desired, click **Send Reply**, or update ticket status to `Resolved`.
6. Return to customer view to see the response in the ticket thread.

### D. Billing & Entitlements (Phase 8)
1. Navigate to **Billing** to inspect location and reply quota meters.
2. Use the **Billing Lifecycle Tester** bar to toggle states (`Active`, `Trialing`, `Past Due`, `Cancel`).
3. When `Cancel` is triggered, Review Autopilot is paused and review publishing is blocked until reactivated.

---

## 7. External Integrations & Configuration

| Service | Protocol / Adapter | Environment Variable | Fallback Behavior |
| :--- | :--- | :--- | :--- |
| **Google Business Profile** | OAuth 2.0 (`business.manage`) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | In-memory Google adapter simulates locations and review publishing |
| **Google Gemini AI** | `@google/genai` TypeScript SDK | `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.8-flash` | Deterministic template fallback with morphological prompt injection defense |
| **Paddle Billing** | Subscriptions & Webhooks | `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET` | Sandbox billing with webhook verification & tier gating |
| **Cloud Tasks** | Worker & OIDC ID Tokens | `CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL`, `CLOUD_TASKS_WORKER_URL` | Background task orchestration and execution |
| **Notifications** | In-App Alert System | `APP_BASE_URL` | In-app notification queue and audit events log |

---

## 8. The Twelve Engineering Laws

1. Never write secrets into source code.
2. Never expose server credentials to the browser.
3. Never duplicate shared domain models.
4. Never create a second database layer.
5. Never introduce unnecessary dependencies.
6. Never rename shared types casually.
7. Prefer adapters/interfaces for external providers.
8. Review text is untrusted user-generated content.
9. Never allow review text to override system instructions.
10. Tenant isolation is mandatory (`saasCustomerId` filter).
11. SaaSCustomer A must never access SaaSCustomer B data.
12. Admin access must be explicitly role-protected (`SUPER_ADMIN`).
