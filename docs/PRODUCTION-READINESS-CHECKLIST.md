# Production Readiness Checklist — Google Review Autopilot

**Target Stage**: Multi-Tenant Production SaaS  
**Infrastructure**: Google Cloud Platform (Cloud Run, Cloud SQL, Cloud Tasks, Secret Manager)  
**Billing**: Paddle Sandbox Billing  
**Authentication**: Google Identity Platform OIDC  
**Last Updated**: 2026-10-01 (production-readiness hardening branch)

---

## 1. Security & Isolation Gate
- [x] **Tenant Isolation**: Every database table includes `tenant_id` and foreign key references.
- [x] **Zero Header Trust**: `x-tenant-id` and `x-user-role` are rejected as trusted client input; tenant identity and role are strictly derived from cryptographic ID tokens (`req.auth`).
- [x] **Admin RBAC Enforcement**: `requireRole(['SUPER_ADMIN'])` strictly requires role from verified token; missing/invalid role returns HTTP 403.
- [x] **IDOR Prevention**: All repository queries and route mutations call `requireTenantOwnership(entityTenantId, req, res)`.
- [x] **AI Sandbox Defense**: `<untrusted_review_content>` tags, system prompts prohibiting hallucinated commitments, and output regex sanitizers active.
- [x] **No Secrets in Code**: Zero API keys, database passwords, or webhook secrets committed in repository.
- [x] **Test/Dev Token Hard Block**: `test_token_*`, `mock_access_token`, and `dev_bearer_token` are rejected when `NODE_ENV=production`.
- [x] **Token Encryption at Rest**: AES-256-GCM helpers in `server/lib/tokenCrypto.ts`; `TOKEN_ENCRYPTION_KEY` required in production.

---

## 2. Reply Guard Safety Gate
- [x] **Fact Check**: Blocks invented refunds (`CRITICAL`), equipment/staff operational changes (`HIGH`), discounts (`HIGH`), appointment claims (`HIGH`).
- [x] **Risk Check**: Flags legal threats, acute injuries, harassment, violence, regulatory complaints.
- [x] **Tone Check**: Suppresses aggressive, defensive, sarcastic, or excessively apologetic phrasing.
- [x] **Repetition Check**: Detects duplicate phrasing and >78% semantic similarity against recent location replies.
- [x] **Privacy Check**: Blocks private emails, unverified phone numbers, order numbers, and SSN patterns.
- [x] **Promise Check**: Blocks unauthorized binding operational or financial guarantees.
- [x] **Legal Safety Check**: Blocks liability admissions and accusations of lying.
- [x] **Quality Check**: Rejects drafts <10 characters, >160 words, or containing AI meta-artifacts (`as an AI`, ```` ````).
- [x] **Bounded Single-Turn Regeneration**: Regeneration capped at exactly 1 attempt for fixable issues.
- [x] **Immutable Safety Invariant**: 1–3★ reviews strictly require manual human approval.

---

## 3. Data & Persistence Gate
- [x] **Drizzle PostgreSQL Schema**: 21+ normalized tables covering users, tenants, memberships, businesses, locations, connections, reviews, replies, rules, brand voice, subscriptions, paddle entities, audits, tickets, messages, notifications, idempotency keys, and job records.
- [x] **Explicit Migration Files**: `drizzle/0000_*.sql` and `drizzle/0001_*.sql` ready for `drizzle-kit migrate` / `npm run db:migrate`.
- [x] **Lazy Connection Pooling**: Connection pool handles database reconnections without eager module-load failures.
- [x] **Repository Layer**: Controllers interact through typed repository interfaces, keeping persistence decoupled from presentation.
- [x] **Health Check**: `/health` probes PostgreSQL with `SELECT 1` and reports latency.

---

## 4. Billing & Entitlements Gate
- [x] **No Stripe References**: Stripe completely excised from code, environment, and services.
- [x] **Paddle Sandbox Integration**: Transaction creation, checkout URL generation, and portal integration.
- [x] **Webhook HMAC-SHA256 Signature Verification**: Timing-safe verification on `Paddle-Signature` header.
- [x] **Replay & Idempotency Protection**: Timestamp drift window and `event_id` deduplication.
- [x] **Entitlement Enforcement**: Canceled subscriptions strictly deny automatic review replies.
- [x] **Tamper Protection**: Normal users cannot manipulate plan or status via unauthenticated client requests.

---

## 5. Background Processing & Observability Gate
- [x] **Cloud Tasks Worker**: Background processing for review sync, AI generation, and Google publication.
- [x] **Job Records Tracking**: `job_records` tracks `job_id`, `tenant_id`, `operation`, `attemptCount`, and `status`.
- [x] **Structured Logging**: JSON logging on all HTTP requests with `x-request-id` correlation tracking and latency metrics.
- [x] **Graceful Shutdown**: SIGTERM/SIGINT closes HTTP server and DB pool cleanly (Cloud Run friendly).

---

## 6. Container & Runtime Gate
- [x] **Production Dockerfile**: Multi-stage build; runs as non-root user; uses `tsx` (production dependency) for TypeScript entrypoint.
- [x] **Docker HEALTHCHECK**: Probes `/health` every 30s.
- [x] **Start Script**: `npm start` → `tsx server.ts` (no bare `node server.ts` in production).
- [x] **Trust Proxy**: Enabled in production for correct client IPs behind Cloud Load Balancing.

---

## 7. Automated Testing Gate
- [x] Automation Rule Engine tests: 8/8 PASS
- [x] AI Injection Defense tests: 5/5 PASS
- [x] End-to-End Integration tests: 6/6 PASS
- [x] Reply Guard Safety Layer tests: 23/23 PASS
- [x] Production Architecture, Auth, Tenant, and Paddle tests: 17/17 PASS
- [x] **Total Test Suite**: 59/59 PASS (0 failures)
- [x] TypeScript Compilation (`tsc --noEmit`): 0 errors
- [x] Production Build (`npm run build`): Clean build

---

## 8. Remaining Pre-Launch Items (not blockers for staging)
- [ ] Wire `encryptToken` / `decryptToken` into Google connection upsert path when live OAuth tokens are stored
- [ ] Add `supertest` HTTP integration tests for route + tenant isolation
- [ ] Migrate frontend tab-state routing to `react-router-dom` URL routes
- [ ] Rotate and store `TOKEN_ENCRYPTION_KEY` in Secret Manager
- [ ] End-to-end smoke test against real Google Business Profile sandbox account
