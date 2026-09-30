# Production Release & Pre-Flight Verification Checklist

Before deploying any version of **Google Review Autopilot** to staging or production, the following verification gates must be certified.

---

## 1. Security & Credential Hygiene

- [x] **No Client-Side Secrets**: Checked that `GEMINI_API_KEY`, `GOOGLE_CLIENT_SECRET`, `STRIPE_SECRET_KEY`, and `JWT_SECRET` are never referenced in `src/` or `admin/`.
- [x] **Google OAuth Least-Privilege**: Confirmed OAuth request only asks for necessary Google Business Profile scope (`business.manage`).
- [x] **Tenant Isolation Audit**: Verified that every route and data filter in `server/routes/index.ts` enforces `saasCustomerId` verification via `verifyTenant`.
- [x] **RBAC Enforcement**: Verified that all `/admin/*` routes require `UserRole === 'SUPER_ADMIN'`.
- [x] **Untrusted Content Sanitization**: Verified that incoming review text is delimited inside XML boundary shields and sanitized against prompt injections.

---

## 2. Business Model & Domain Boundaries

- [x] **Taxonomy Integrity**: Confirmed domain code strictly distinguishes `SaaSCustomer` (paying account) from `ReviewAuthor` (reviewer).
- [x] **Scope Enforced**: Confirmed zero feature drift into CRM, SMS blasts, social media broadcasting, or email marketing.
- [x] **Single-Location Experience**: Verified the primary onboarding journey lets a single-location owner onboard and connect in under 2 minutes.

---

## 3. AI Safety & Automation Guardrails

- [x] **Automated Rule Matrix Validated**:
  - 5-Star + LOW Risk ➔ `AUTO_PUBLISH`
  - 4-Star + LOW Risk ➔ `AUTO_PUBLISH`
  - 3-Star ➔ `REQUIRE_APPROVAL` (Never auto-published)
  - 1–2 Star ➔ `REQUIRE_APPROVAL` (Never auto-published)
  - Any rating with HIGH/CRITICAL risk ➔ `REQUIRE_APPROVAL`
- [x] **Forbidden Inventions Tested**:
  - Gemini responses rigorously checked against forbidden items: refunds, discounts, free perks, employee names, binding promises.
- [x] **Prompt Injection Defense**:
  - Passed adversarial test prompts attempting to hijack reply instructions via malicious review text.

---

## 4. Third-Party Provider Integration

- [x] **Google Business Profile Adapter**:
  - Successful token exchange and auto-refresh on 401.
  - Review pagination handled smoothly.
  - Review reply publication confirmed via API.
- [x] **Stripe Billing Integration**:
  - Webhook signature verification contract established.
  - Subscription cancellation halts auto-publish background workers immediately.
- [x] **Notification Alerts**:
  - Email triggers fire for reviews requiring approval or flagged as critical risk.

---

## 5. Build, Lint & Type Safety

- [x] `npm run lint` passes with 0 errors (`tsc --noEmit`).
- [x] `npm test` passes with 19/19 automated test suites passing.
- [x] `npm run build` succeeds cleanly with no TypeScript compilation errors.
- [x] Environment variables documented in `.env.example`.
- [x] Audit logging verified for all auto-publish, manual publish, and administrative actions.
