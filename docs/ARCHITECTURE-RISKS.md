# Architecture Risks & Vulnerabilities — Google Review Autopilot

**Audit Date**: September 30, 2026  
**Auditor**: Senior Software Architect  
**Classification**: Static Architectural Security & Resilience Analysis

---

## 1. Critical Security Risks (P0)

### RISK-01: Admin Route Authorization Bypass
- **File**: `server/routes/index.ts` (lines 339–348)
- **Code**:
  ```typescript
  function verifyAdminRole(req: Request, res: Response): boolean {
    const role = req.headers['x-user-role'] as string;
    if (role && role !== 'SUPER_ADMIN') {
      sendError(res, 403, 'FORBIDDEN', 'Access denied: SUPER_ADMIN role required');
      return false;
    }
    return true;
  }
  ```
- **Vulnerability**: If an attacker sends an HTTP request with NO `x-user-role` header (or empty string), `role` is falsy. The condition `role && role !== 'SUPER_ADMIN'` evaluates to `false`, allowing the unauthenticated caller to access all administrative customer data, audit logs, and internal notes!
- **Severity**: **CRITICAL**

### RISK-02: Client-Spoofable Tenant Isolation (IDOR)
- **File**: `server/routes/index.ts` (lines 324–336)
- **Code**:
  ```typescript
  function getTenantId(req: Request): string {
    return (req.headers['x-tenant-id'] as string) || mockSaaSCustomerId;
  }
  function verifyTenant(req: Request, res: Response, targetTenantId: string): boolean {
    const reqTenant = getTenantId(req);
    if (reqTenant !== targetTenantId) {
      sendError(res, 403, 'TENANT_MISMATCH', ...);
      return false;
    }
    return true;
  }
  ```
- **Vulnerability**: `x-tenant-id` is an unauthenticated client request header. An attacker can set `x-tenant-id: saas_cust_target` and request another tenant's reviews or support tickets without a validated session, signed JWT, or cookie verification.
- **Severity**: **CRITICAL**

### RISK-03: Missing Stripe Webhook Verification Endpoint
- **File**: `server/routes/index.ts`, `server/services/billing/billingService.ts`
- **Vulnerability**: `.env.example` lists `STRIPE_WEBHOOK_SECRET`, but there is no webhook endpoint mounted to receive Stripe billing events. Instead, the frontend can call `POST /api/billing/update-plan` directly with arbitrary plan names and statuses (`ACTIVE`, `GROWTH`, `PRO`). Any user can promote themselves to an enterprise plan without payment.
- **Severity**: **CRITICAL**

---

## 2. High Architectural & Operational Risks (P1)

### RISK-04: Ephemeral State Loss on Container Recycling
- **File**: Entire `server/` layer
- **Vulnerability**: Zero persistent database integration. Any server reboot, deployment, or Cloud Run cold start wipes all customer onboarding, newly synced reviews, generated replies, automation rule configurations, brand voices, and support tickets.
- **Severity**: **HIGH**

### RISK-05: Synchronous Review Sync Blocks Node Event Loop
- **File**: `server/jobs/reviewSyncJob.ts`, `server/routes/index.ts`
- **Vulnerability**: In `POST /api/google/sync-reviews`, risk assessment, Gemini drafting, Reply Guard, and Google publication run sequentially inside a single HTTP request handler. Under concurrent load (e.g. 50 reviews arriving simultaneously), requests will hit the 3500ms timeout, leading to request queuing, dropped connections, and gateway 504 errors.
- **Severity**: **HIGH**

### RISK-06: Global State Mutation Overwrites Across Tenants
- **File**: `server/routes/index.ts` (lines 799–847)
- **Vulnerability**: `PUT /api/settings/automation-rules` and `PUT /api/settings/brand-voice` update the shared variables `mockRules` and `mockBrandVoice`. If Tenant B saves brand voice, Tenant A's settings are completely overwritten.
- **Severity**: **HIGH**

---

## 3. Medium & Safety Risks (P2)

### RISK-07: Regular Expression Denial of Service (ReDoS) in Reply Guard
- **File**: `server/services/workflow/replyGuardService.ts`
- **Vulnerability**: Complex regex patterns with wildcards (e.g., `/\b((we have|we've|has been) (fixed|repaired|resolved the (issue|problem|bug|leak|glitch)))\b/i`) could experience performance degradation on crafted long strings.
- **Mitigation Present**: The quality check caps string length at 900 characters and 160 words before deeper regex matching.
- **Severity**: **MEDIUM**

### RISK-08: Dual State Drift Between Client & Server
- **File**: `src/App.tsx`
- **Vulnerability**: Frontend stores full domain collections in React state (`useState`) and has try-catch fallbacks that mutate local state when API calls fail. A customer can believe an action succeeded (e.g. approving a reply) when the server rejected or failed it.
- **Severity**: **MEDIUM**
