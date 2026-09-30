# Technical Debt Inventory — Google Review Autopilot

**Audit Date**: September 30, 2026  
**Auditor**: Senior Software Architect  
**Classification**: Codebase Technical Debt & Refactoring Targets

---

## 1. High Priority Technical Debt

### DEBT-01: In-Memory Storage Stubs
- **Area**: Persistence layer (`server/routes/index.ts`, `server/services/*`)
- **Description**: Mock arrays and objects (`mockReviews`, `mockReplies`, `mockRules`, `tickets`, `notifications`) are used throughout the server instead of a real database (PostgreSQL / Cloud SQL / SQLite) with an ORM (Drizzle/Prisma).
- **Effort**: Large. Requires provisioning relational tables, writing migrations, and replacing mock arrays with repository queries.

### DEBT-02: Cryptographic Session Authentication Missing
- **Area**: Authentication & Identity (`server/routes/index.ts`)
- **Description**: Auth relies on arbitrary headers (`x-tenant-id`, `x-user-role`). Needs real session cookies, JWT verification, or OAuth session tokens validated via a standard auth middleware.
- **Effort**: Medium.

### DEBT-03: Lack of Stripe Webhook Ingestion & Signature Verification
- **Area**: Billing Service (`server/services/billing/billingService.ts`)
- **Description**: Webhook secret is defined in `.env.example`, but no raw body parser or signature verification endpoint (`/api/billing/webhook`) exists to process `checkout.session.completed`, `customer.subscription.updated`, or `invoice.payment_failed`.
- **Effort**: Medium.

---

## 2. Medium Priority Technical Debt

### DEBT-04: Monolithic Route Controller in `server/routes/index.ts`
- **Area**: API Architecture
- **Description**: `server/routes/index.ts` contains 1,133 lines handling auth, google sync, review approval, settings, billing, support, admin metrics, and customer notes.
- **Remediation**: Split into dedicated routers:
  - `server/routes/auth.routes.ts`
  - `server/routes/google.routes.ts`
  - `server/routes/reviews.routes.ts`
  - `server/routes/settings.routes.ts`
  - `server/routes/billing.routes.ts`
  - `server/routes/support.routes.ts`
  - `server/routes/admin.routes.ts`
- **Effort**: Small/Medium.

### DEBT-05: Client Tab-State Routing Instead of URL-Based Router
- **Area**: Frontend Architecture (`src/App.tsx`)
- **Description**: Navigation uses React `useState<'dashboard' | 'reviews' | 'settings' | 'billing' | 'support'>` without browser history, bookmarking, deep-linking, or back-button support.
- **Remediation**: Transition to `react-router` or hash/path-based navigation.
- **Effort**: Medium.

### DEBT-06: Duplicated State Fallbacks in Frontend Components
- **Area**: Frontend UI
- **Description**: `src/App.tsx` contains duplicated optimistic update logic in try-catch blocks that simulate API responses when the backend is unreachable.
- **Remediation**: Standardize API client calls with React Query (TanStack Query) or SWR for caching, retry, and server-state sync.
- **Effort**: Medium.

---

## 3. Low Priority Technical Debt & Code Hygiene

### DEBT-07: Hardcoded Fallback Business Details in Components
- **Area**: UI Components (`src/features/support/SupportWidget.tsx`, `src/App.tsx`)
- **Description**: Email `owner@downtowndental-sf.com` is hardcoded as default prop values in several presentation components.
- **Effort**: Small.

### DEBT-08: Prompt Assembly via String Interpolation
- **Area**: AI Reply Engine (`server/services/ai/aiReplyEngine.ts`)
- **Description**: Prompts are constructed via multiline template literals. Separating prompt templates into version-controlled template files improves readability and auditing.
- **Effort**: Small.
