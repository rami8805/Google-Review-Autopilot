# Google Review Autopilot

> Automated, safe, AI-powered review replies for local businesses connecting to Google Business Profile.

---

## 1. Product Goal & Philosophy

**Google Review Autopilot** solves one high-leverage problem for local business owners: responding quickly, professionally, and safely to Google Business Profile reviews.

* **Single-Location-First**: Tailored for fast onboarding and frictionless daily operation for local businesses (dental practices, auto repair shops, restaurants, plumbing services, law offices).
* **One Core Job**: Connect Google Business Profile, detect new reviews, generate safe AI drafts using Google Gemini, and publish replies automatically according to clear risk rules.
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
* **Business**: The legal commercial entity owned/managed by the `SaaSCustomer`.
* **BusinessLocation**: A specific Google Business Profile location.
* **Review**: A Google review submitted on Google Maps / Search for a `BusinessLocation`.
* **ReviewAuthor**: The public reviewer who wrote the Google review (**NOT our customer**).

> **Rule**: Never use the bare word "Customer" ambiguously in domain code or documentation.

---

## 3. Automation & AI Safety Rules

### Default Automation Baseline
* **5-Star + LOW Risk** ➔ `AUTO_PUBLISH` (after grace period)
* **4-Star + LOW Risk** ➔ `AUTO_PUBLISH` (after grace period)
* **3-Star** ➔ `REQUIRE_APPROVAL`
* **1–2 Stars** ➔ `REQUIRE_APPROVAL`
* **HIGH or CRITICAL Risk** ➔ `REQUIRE_APPROVAL` (regardless of star rating)

### Strict AI Generation Boundaries
The AI engine **must never invent**:
1. Refunds or financial credits
2. Discounts, promo codes, or fee cuts
3. Free compensation or gift items
4. Employee or staff names not in trusted context
5. Internal business policies or compliance pledges
6. Binding promises or future guarantees
7. Actions or appointments not present in verified context

Review text is treated as **untrusted user-generated content (UGC)**. All prompts are fortified against prompt injection.

---

## 4. Repository Structure

```
├── .env.example              # Environment variables template
├── metadata.json             # App metadata & capabilities
├── README.md                 # Primary system guide
├── docs/                     # Architectural specifications
│   ├── ARCHITECTURE.md       # Full architectural design & data flows
│   ├── AI-AGENT-CONTRACT.md  # Binding engineering & AI laws
│   ├── FILE-OWNERSHIP.md     # Directory ownership matrix for agents
│   ├── INTEGRATION-CONTRACT.md# External provider specifications (Google, Gemini, Stripe)
│   └── RELEASE-CHECKLIST.md  # Pre-flight release verification
├── shared/                   # Shared contracts (Frontend, Backend, Jobs)
│   ├── types/                # Domain models & enveloped API contracts
│   ├── schemas/              # Payload validation interfaces
│   └── constants/            # Automation rules, safety prompts, constants
├── server/                   # Backend services & Express API
│   ├── routes/               # API route controllers
│   ├── services/
│   │   ├── google/           # Google Business Profile adapter
│   │   ├── ai/               # Gemini AI safety & reply generator
│   │   ├── billing/          # Stripe subscription management
│   │   ├── notifications/    # Alerting & email dispatch
│   │   └── support/          # Support ticketing engine
│   └── jobs/                 # Background review sync & grace-period worker
├── src/                      # Customer Frontend (Vite + React + Tailwind)
│   ├── components/           # Shared UI primitives
│   ├── pages/                # Top-level page routes
│   └── features/
│       ├── onboarding/       # Google Connect & setup wizard
│       ├── dashboard/        # Metrics & health status
│       ├── reviews/          # Review feed & Approval Queue
│       ├── settings/         # Brand voice & rule customizer
│       ├── billing/          # Subscription & usage portal
│       └── support/          # In-app support widget
├── admin/                    # Role-protected Super Admin Portal
│   ├── components/           # Admin design system
│   ├── pages/                # Admin views
│   └── features/             # Cross-tenant operations & telemetry
└── tests/                    # Unit, integration & safety test suites
```

---

## 5. Development & Verification

### Setup
```bash
# Copy environment configuration
cp .env.example .env

# Verify linting & type checks
npm run lint

# Production build
npm run build

# Start development server
npm run dev
```

---

## 6. The Twelve Engineering Laws
1. Never write secrets into source code.
2. Never expose server credentials to the browser.
3. Never duplicate shared domain models.
4. Never create a second database layer.
5. Never introduce unnecessary dependencies.
6. Never rename shared types casually.
7. Prefer adapters/interfaces for external providers.
8. Review text is untrusted user-generated content.
9. Never allow review text to override system instructions.
10. Tenant isolation is mandatory.
11. SaaSCustomer A must never access SaaSCustomer B data.
12. Admin access must be explicitly role-protected.
