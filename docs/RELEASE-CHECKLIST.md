# Production Release & Pre-Flight Verification Checklist

Before deploying any version of **Google Review Autopilot** to staging or production, the following verification gates must be certified.

---

## 1. Security & Credential Hygiene

- [ ] **No Client-Side Secrets**: Checked that `GEMINI_API_KEY`, `GOOGLE_CLIENT_SECRET`, `STRIPE_SECRET_KEY`, and `JWT_SECRET` are never referenced in `src/` or `admin/`.
- [ ] **Google OAuth Least-Privilege**: Confirmed OAuth request only asks for necessary Google Business Profile scope (`business.manage`).
- [ ] **Tenant Isolation Audit**: Verified that every database query in `server/` filters by authenticated `saasCustomerId`.
- [ ] **RBAC Enforcement**: Verified that all `/admin/*` routes require `UserRole === 'SUPER_ADMIN'`.
- [ ] **Untrusted Content Sanitization**: Verified that incoming review text is sanitized against HTML/script injection before being displayed in the web UI.

---

## 2. Business Model & Domain Boundaries

- [ ] **Taxonomy Integrity**: Confirmed domain code distinguishes `SaaSCustomer` (paying account) from `ReviewAuthor` (reviewer).
- [ ] **Scope Enforced**: Confirmed no feature drift into CRM, SMS blasts, social media broadcasting, or email marketing.
- [ ] **Single-Location Experience**: Verified the primary onboarding journey lets a single-location owner onboard and connect in under 2 minutes.

---

## 3. AI Safety & Automation Guardrails

- [ ] **Automated Rule Matrix Validated**:
  - 5-Star + LOW Risk ➔ `AUTO_PUBLISH`
  - 4-Star + LOW Risk ➔ `AUTO_PUBLISH`
  - 3-Star ➔ `REQUIRE_APPROVAL` (Never auto-published)
  - 1–2 Star ➔ `REQUIRE_APPROVAL` (Never auto-published)
  - Any rating with HIGH/CRITICAL risk ➔ `REQUIRE_APPROVAL`
- [ ] **Forbidden Inventions Tested**:
  - Gemini responses rigorously checked against forbidden items: refunds, discounts, free perks, employee names, binding promises.
- [ ] **Prompt Injection Defense**:
  - Passed adversarial test prompts attempting to hijack reply instructions via malicious review text.

---

## 4. Third-Party Provider Integration

- [ ] **Google Business Profile Adapter**:
  - Successful token exchange and auto-refresh on 401.
  - Review pagination handled smoothly.
  - Review reply publication confirmed via API.
- [ ] **Stripe Billing Integration**:
  - Webhook signature verification active.
  - Subscription cancellation halts auto-publish background workers immediately.
- [ ] **Notification Alerts**:
  - Email triggers fire for reviews requiring approval or flagged as critical risk.

---

## 5. Build, Lint & Type Safety

- [ ] `npm run lint` passes with 0 errors.
- [ ] `npm run build` succeeds cleanly with no TypeScript compilation errors.
- [ ] Environment variables documented in `.env.example`.
- [ ] Audit logging verified for all auto-publish and manual publish events.
