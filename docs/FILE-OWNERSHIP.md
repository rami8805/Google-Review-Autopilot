# File Ownership & Subsystem Boundaries

To prevent conflicting modifications, race conditions, and boundary violations across AI agents and specialized engineering streams, every path in this repository has an explicitly assigned subsystem owner.

**Rule**: Agents working on a specific task or feature MUST ONLY modify files within their assigned directories, plus designated documentation updates. Cross-boundary modifications require architectural review.

---

## 1. Directory Ownership Matrix

| Directory / File Path | Assigned Subsystem Owner | Scope & Responsibility |
| :--- | :--- | :--- |
| **`shared/types/`** | Core Architect | Global domain interfaces, enums, API request/response contracts. Must remain strictly backward-compatible. |
| **`shared/schemas/`** | Core Architect | Shared validation schemas, type guards, runtime parsers. |
| **`shared/constants/`** | Core Architect | System-wide constants, default automation rules, AI constraints. |
| **`server/routes/`** | API Gateway Lead | Express route definitions, HTTP status mapping, middleware chaining (Auth, Tenant Guard, Rate Limit). |
| **`server/services/google/`** | Google Integration Agent | Google Business Profile API client, OAuth token refresh, location fetching, review polling, reply publishing. |
| **`server/services/ai/`** | AI Safety Agent | Gemini client initialization, prompt templates, risk assessment engine, hallucination guardrails. |
| **`server/services/billing/`** | Billing Agent | Stripe webhook handler, subscription status syncing, quota enforcement. |
| **`server/services/notifications/`** | Notifications Agent | Email and in-app alerts for pending approvals, critical risk flags, and failed dispatches. |
| **`server/services/support/`** | Support Agent | In-app support ticketing, message threads between SaaSCustomer and support staff. |
| **`server/jobs/`** | Jobs & Worker Agent | Background review synchronization cron, auto-publish grace period scheduler, token health monitor. |
| **`src/features/onboarding/`** | Frontend Onboarding Lead | Location connection flow, initial brand voice setup, first review test run. |
| **`src/features/dashboard/`** | Frontend Dashboard Lead | Key metrics (reply rate, average rating, pending queue count, risk distribution). |
| **`src/features/reviews/`** | Frontend Review Inbox Lead | Review feed, Approval Queue, inline reply editor, risk flag badges, publish status. |
| **`src/features/settings/`** | Frontend Settings Lead | Automation rules editor (star/risk matrix), Brand Voice configuration, business profile details. |
| **`src/features/billing/`** | Frontend Billing Lead | Plan selection, Stripe customer portal redirect, usage metering indicators. |
| **`src/features/support/`** | Frontend Support Lead | Customer help widget, support ticket creation and conversation views. |
| **`src/components/`** | Design System Engineer | Shared design components (buttons, badges, modals, typography, layout containers). |
| **`src/pages/`** | Application Router Lead | Top-level page wrappers and route configurations. |
| **`admin/`** | Admin Portal Lead | Super-admin dashboard, cross-tenant telemetry, customer suspension, system health. |
| **`tests/`** | QA Engineer | Unit tests, mock provider fixtures, end-to-end user journeys, safety regressions. |
| **`docs/`** | System Architect | Architectural records, agent contracts, API specifications, and release checklists. |

---

## 2. Cross-Subsystem Modification Protocol

1. **Shared Changes First**: If a feature requires updating a shared type, update `shared/types/` and run `npm run lint` before touching feature directories.
2. **Server Before Client**: Backend API endpoints, provider adapters, and security guards must be defined before implementing consuming frontend features.
3. **No Direct Database Access in UI**: Frontend components must communicate exclusively via `/api/*` endpoints. Direct database clients or server SDKs must never be imported in `src/` or `admin/`.
4. **Never Bypass the AI Safety Service**: Frontend must never attempt to generate reviews directly from client-side Gemini calls. All review drafting and risk checking must route through `server/services/ai/`.
