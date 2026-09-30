# Architecture vs. Documentation Discrepancy Matrix

**Audit Date**: September 30, 2026  
**Auditor**: Senior Software Architect  
**Subject**: Codebase Truth vs. Documentation Claims

---

## Classification Standard
Every discrepancy is classified into one of four categories:
- `DOCUMENTATION_WRONG`: Documentation asserts behavior or features that do not exist or work differently in code.
- `CODE_WRONG`: Code violates documented design principles or safety contracts.
- `INCOMPLETE`: Code implements a scaffold, mock, or partial feature without the full documented lifecycle.
- `AMBIGUOUS`: Specification is vague or open to conflicting interpretations.

---

## Discrepancy Audit Matrix

| Item # | Subject | Documentation Claim (`docs/*`, `README.md`) | Code Implementation Reality | Classification | Severity |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **DISC-01** | Database Persistence | `docs/ARCHITECTURE.md` Section 6 specifies: "Every database record belongs to a specific saasCustomerId. Queries MUST ALWAYS include WHERE saas_customer_id = ?." | There is **no database** or SQL query engine in the project. All entities exist as in-memory JavaScript variables. | `INCOMPLETE` | **HIGH** |
| **DISC-02** | Google OAuth Flow | `docs/INTEGRATION-CONTRACT.md` describes full Google OAuth 2.0 token management with automatic refresh on HTTP 401. | `googleProfileProvider.ts` returns static mock tokens unless `GOOGLE_CLIENT_SECRET` is provided, and does not update a persistent `GoogleConnection` table. | `INCOMPLETE` | **MEDIUM** |
| **DISC-03** | Stripe Billing Webhooks | `.env.example` lists `STRIPE_WEBHOOK_SECRET` and `docs/ARCHITECTURE.md` references webhook processing. | There is **no webhook route** mounted in `server/routes/index.ts`. Plan upgrades are updated via unauthenticated POST endpoint. | `CODE_WRONG` | **HIGH** |
| **DISC-04** | Admin Role Security | `docs/ARCHITECTURE.md` Section 6: "Internal Admin dashboards are strictly isolated under /admin and require role = 'SUPER_ADMIN'." | `verifyAdminRole()` in `server/routes/index.ts` has a logic bug: `if (role && role !== 'SUPER_ADMIN')` permits access when `x-user-role` header is omitted. | `CODE_WRONG` | **CRITICAL** |
| **DISC-05** | Gemini Model Reference | `docs/RELEASE-AUDIT.md` mentions `gemini-3.8-flash`, while `docs/ARCHITECTURE.md` mentions `Gemini 2.5 Flash`. | Code in `server/services/ai/aiReplyEngine.ts` uses `process.env.GEMINI_MODEL || 'gemini-3.8-flash'`. Documentation is out of sync. | `DOCUMENTATION_WRONG` | **LOW** |
| **DISC-06** | Multi-Location Rule Scoping | `shared/types/domain.ts` documents `AutomationRule.businessLocationId` for location-specific rules. | `server/routes/index.ts` stores a single flat array `mockRules` applied globally regardless of location ID. | `INCOMPLETE` | **LOW** |
| **DISC-07** | Reply Guard Safety Implementation | `docs/REPLY-GUARD.md` documents 8 deterministic checks, single-turn bounded regeneration, and 1-3★ manual approval invariant. | **100% Implemented & Verified in Code**: `server/services/workflow/replyGuardService.ts` strictly implements all 8 checks and passes 23 unit tests. | **MATCH (ACCURATE)** | **NONE** |
| **DISC-08** | Domain Model Taxonomy | `docs/ARCHITECTURE.md` specifies `ReviewAuthor != SaaSCustomer` and prohibits ambiguous "Customer" naming. | **100% Implemented & Verified in Code**: `shared/types/domain.ts` and test suite enforce strict taxonomy separation. | **MATCH (ACCURATE)** | **NONE** |
