# Missing Tests Inventory — Google Review Autopilot

**Audit Date**: September 30, 2026  
**Auditor**: Senior Software Architect  
**Subject**: Verification Gaps & Test Coverage Deficiencies

---

## 1. Test Suite Current Status

The existing test suite (`npm test`) executes 42 tests across 4 test runners:
1. `tests/rules/automationRules.test.ts` (8 tests) — **PASS**
2. `tests/safety/injectionDefense.test.ts` (5 tests) — **PASS**
3. `tests/integration/endToEndJourney.test.ts` (6 tests) — **PASS**
4. `tests/guard/replyGuard.test.ts` (23 tests) — **PASS**

**Strong Areas**:
- Automation rule decision matrix (1★ to 5★ ratings vs Risk levels).
- Adversarial prompt injection defense.
- Reply Guard 8 safety checks (Fact, Risk, Tone, Repetition, Privacy, Promise, Legal, Quality).
- Bounded single-turn regeneration invariant.

---

## 2. Critical Missing Tests

### TEST-GAP-01: HTTP API Route Integration Tests
- **Gap**: Zero automated tests exercise Express routes via `supertest` or HTTP requests.
- **Untested Paths**:
  - `POST /api/auth/signup` validation.
  - `POST /api/reviews/:id/approve` and edit overrides.
  - `PUT /api/settings/automation-rules` safety rule sanitization endpoint.
  - `POST /api/support/tickets` and ticket replies.
  - `GET /admin/*` role guard verification.
- **Risk**: Route regressions, malformed payloads, or header handling bugs can slip past unit tests.

### TEST-GAP-02: Tenant Isolation Cross-Tenant Exploit Tests
- **Gap**: No automated test attempts to query or mutate Tenant B's data using Tenant A's context.
- **Untested Scenarios**:
  - Sending `x-tenant-id: tenant_b` on `GET /api/reviews/rev_of_tenant_a`.
  - Updating automation rules for Tenant A and ensuring Tenant B's rules remain unmodified.
  - Listing support tickets of another tenant.
- **Risk**: Silent cross-tenant data leakage.

### TEST-GAP-03: Real Database Persistence & Concurrency Tests
- **Gap**: When a database (PostgreSQL / Cloud SQL) is connected, there are currently no tests for:
  - Database connection pool exhaustion.
  - Concurrent review sync job race conditions.
  - Unique constraint violations on `(saasCustomerId, googleReviewId)`.
  - Transaction rollback on partial sync failure.

### TEST-GAP-04: Billing Webhook & Replay Idempotency Tests
- **Gap**: No tests for Stripe webhook payload signature verification, event replays, or idempotency keys.
- **Untested Scenarios**:
  - Receiving duplicate `invoice.payment_succeeded` events.
  - Receiving out-of-order `customer.subscription.deleted` events.
  - Invalid signature payload rejection.

### TEST-GAP-05: Real Google Business Profile API Edge Cases
- **Gap**: Google Business Profile error handling is only tested via mock stubs.
- **Untested Scenarios**:
  - Expired refresh tokens requiring re-authentication.
  - HTTP 429 Quota Exceeded backoff and retry behavior.
  - Review deleted on Google prior to publishing reply (HTTP 404).
  - Special characters, non-English emojis, and Unicode normalization in review comments.

### TEST-GAP-06: Frontend Component & User Interaction Tests
- **Gap**: Zero React testing library / Vitest component tests.
- **Untested Scenarios**:
  - `ApprovalQueue` rendering and action button dispatch.
  - `AutomationRulesConfig` slider and checkbox updates.
  - `SupportWidget` ticket submission form.
  - Feedback toast display and timeout clearance.
