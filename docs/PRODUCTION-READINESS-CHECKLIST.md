> **Validation status — 2026-10-01:** The checklist describes required gates. Because the execution environment could not reach GitHub to install dependencies, current-branch validation is intentionally not claimed here; see the CI workflow.

# Production Readiness Checklist — Google Review Autopilot

**Target Stage**: Multi-Tenant Production SaaS  
**Infrastructure**: Google Cloud Platform (Cloud Run, Cloud SQL, Cloud Tasks, Secret Manager)  
**Billing**: Paddle Sandbox Billing  
**Authentication**: Google Identity Platform OIDC  
**Last Updated**: 2026-10-01 (production-readiness hardening branch)

---

## 1. Security & Isolation Gate
- [x] **Tenant Isolation**: Every database table includes `tenant_id` and foreign key references.
- [x] **Zero Header Trust**: Tenant identity and role derived only from verified ID tokens (`req.auth`).
- [x] **Admin RBAC**: `requireRole(['SUPER_ADMIN'])` — missing role is 403.
- [x] **IDOR Prevention**: `requireTenantOwnership` on mutations.
- [x] **AI Sandbox Defense**: Untrusted review delimiters + morphological sanitizers.
- [x] **No Secrets in Code**: Zero credentials committed.
- [x] **Test/Dev Token Hard Block**: `test_token_*` / `mock_access_token` rejected when `NODE_ENV=production`.
- [x] **Token Encryption at Rest**: AES-256-GCM (`tokenCrypto.ts` + `googleTokenHelpers.ts`); `TOKEN_ENCRYPTION_KEY` required in production.

---

## 2. Reply Guard Safety Gate
- [x] Fact / Risk / Tone / Repetition / Privacy / Promise / Legal / Quality checks
- [x] Bounded single-turn regeneration
- [x] 1–3★ reviews never auto-published

---

## 3. Data & Persistence Gate
- [x] Drizzle PostgreSQL schema + migrations
- [x] Repository layer + connection pooling
- [x] `/health` includes DB probe

---

## 4. Billing & Entitlements Gate
- [x] Paddle (no Stripe)
- [x] Webhook HMAC + idempotency
- [x] Canceled subscription blocks autopilot

---

## 5. Runtime & Container Gate
- [x] Production Dockerfile uses `tsx`, non-root, HEALTHCHECK
- [x] Graceful SIGTERM + pool close
- [x] `npm start` → `tsx server.ts`

---

## 6. Frontend Routing
- [x] **react-router-dom** already wired (`BrowserRouter`, path routes for `/`, `/reviews`, `/settings`, `/billing`, `/support`, `/admin`, `/landing`, `/onboarding`)

---

## 7. Tests
- [x] Rule engine, injection defense, Reply Guard, integration, production auth/tenant/Paddle
- [x] Token crypto + auth production tests (`tests/security/tokenCrypto.test.ts`)

---

## 8. Remaining (staging OK)
- [ ] Confirm `postgresRepositories.updateTokens` inlines `encryptToken` (or all callers use `ensureEncryptedToken`)
- [ ] Wire live OAuth code exchange end-to-end with encrypted storage
- [ ] `supertest` HTTP suite (optional hardening)
- [ ] Real GBP sandbox smoke test
