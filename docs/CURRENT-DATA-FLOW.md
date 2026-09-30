# Current Real Data Flow Analysis — Google Review Autopilot

**Audit Date**: September 30, 2026  
**Auditor**: Senior Software Architect  
**Subject**: Actual Code Execution Traces (Workflows A through I)

---

## Workflow A: User Signup & Account Creation

```
[Browser Form (POST /api/auth/signup)]
        │
        ▼
[server/routes/index.ts -> router.post('/auth/signup')]
  ├── 1. Validates presence of `businessName` and `email`
  ├── 2. Generates new IDs in memory: `saasCustomerId = saas_cust_${Date.now()}`
  ├── 3. Constructs ephemeral `BusinessLocation` with `isConnected: false`
  ├── 4. Appends `CUSTOMER_SIGNUP` event to in-memory `mockAuditEvents` array
  └── 5. Returns JSON response with `saasCustomerId` and `newLocation`
```
*Actual Code Reality*: The new customer is NOT persisted to a database. The root state in `src/App.tsx` remains pointing to `saas_cust_demo_01` unless updated in local component state. If the server process restarts, the created IDs are lost.

---

## Workflow B: Google Connection & OAuth Flow

```
[Browser Click: Connect Google Profile]
        │
        ├── 1. GET /api/google/connect
        │        ├── Generates state parameter
        │        └── Returns Google OAuth URL: https://accounts.google.com/o/oauth2/v2/auth?...
        │
        └── 2. POST /api/google/connect-callback
                 ├── Reads `mockSaaSCustomerId`
                 ├── Sets `mockLocation.isConnected = true`
                 ├── Sets `mockLocation.automationEnabled = true`
                 ├── Logs `CONNECT_GOOGLE_LOCATION` to `mockAuditEvents`
                 └── Returns `{ connected: true, location: mockLocation }`
```
*Actual Code Reality*: Real token exchange (`POST https://oauth2.googleapis.com/token`) occurs only if `GOOGLE_CLIENT_SECRET` is set in environment; otherwise, `GoogleBusinessProfileService` generates mock tokens (`ya29.mock_access_token_*`). The frontend `OnboardingWizard.tsx` also contains a client-side simulation branch that marks `isConnected: true` without waiting for backend callback.

---

## Workflow C: Review Sync & Ingestion

```
[Trigger: POST /api/google/sync-reviews]
        │
        ▼
[server/routes/index.ts -> router.post('/google/sync-reviews')]
  ├── 1. Entitlement Check: Verifies `mockSubscription.status !== 'CANCELED'`
  ├── 2. Ingestion Selection: Selects review from `samplePool` or accepts `req.body.comment`
  ├── 3. Generates Review ID: `rev_${Date.now()}_${random}`
  ├── 4. Extracts `recentReplies` from `mockReplies` for repetition checking
  │
  ▼
[server/jobs/reviewSyncJob.ts -> processIngestedReview()]
  ├── Phase 1: Risk Assessment (`aiEngine.assessRisk()`)
  ├── Phase 2: Draft Generation (`aiEngine.generateReplyDraft()`)
  ├── Phase 3: Reply Guard Validation (`replyGuard.validateReply()`)
  ├── Phase 4: Single-Turn Regeneration (if `BLOCK_AND_REGENERATE` and `regenerationAllowed`)
  ├── Phase 5: Rule & Invariant Matching
  │      └── Eligible only if: rating >= 4 AND guardDecision === 'AUTO_PUBLISH'
  │          AND overallRisk === 'LOW' AND rule.action === 'AUTO_PUBLISH'
  │
  ▼
[Publishing or Staging]
  ├── If Eligible: Calls `googleService.publishReviewReply()`, sets status `AUTO_PUBLISHED`
  └── If Ineligible: Calls `notificationService.notifyApprovalRequired()`, sets status `PENDING_APPROVAL`
```
*Actual Code Reality*: Synchronous pipeline. The caller HTTP request blocks while Gemini evaluates the prompt, runs Reply Guard, and calls Google. There is no asynchronous worker queue (e.g. BullMQ/Redis).

---

## Workflow D: AI Reply Generation & Sandboxing

```
[Review Text + BrandVoice]
        │
        ▼
[GeminiAiReplyEngine (server/services/ai/aiReplyEngine.ts)]
  ├── 1. Context Preparation:
  │      Extracts `contactEmailForInquiries`, `coreServicesOffered`, `tone`
  ├── 2. Prompt Formatting:
  │      Appends `UNTRUSTED_REVIEW_DEFENSE_PROMPT`
  │      Wraps review inside `<untrusted_review_content>` tags
  ├── 3. Model Execution:
  │      Race between `aiClient.models.generateContent()` and 3500ms timeout
  ├── 4. Sanitization:
  │      Replaces "refund", "discount", "compensation", "guarantee" with `[redacted]`
  └── 5. Fallback Protection:
         If API fails, times out, or apiKey is missing -> emits deterministic safe template
```
*Actual Code Reality*: Prompts are hardcoded strings inside `aiReplyEngine.ts`. No prompt versioning registry or token telemetry metrics are stored in a database.

---

## Workflow E: Reply Guard & Automation Decision

```
[Proposed Draft + Context]
        │
        ▼
[ReplyGuardService (server/services/workflow/replyGuardService.ts)]
  ├── Check A (Fact Check): Blocks invented refunds, operational claims, appointments
  ├── Check B (Risk Check): Flags legal threats, injuries, harassment, injections
  ├── Check C (Tone Check): Suppresses aggressive, sarcastic, or excessively apologetic phrasing
  ├── Check D (Repetition Check): Compares Jaccard distance (>0.78) against last 5 replies
  ├── Check E (Privacy Check): Blocks emails/phones not in trusted context; blocks SSN patterns
  ├── Check F (Promise Check): Blocks binding guarantees
  ├── Check G (Legal Check): Blocks liability admissions or accusations of lying
  └── Check H (Quality Check): Enforces length (10-900 chars, <160 words) and strips AI tags
        │
        ▼
[Decision Logic]
  ├── CRITICAL risk -> STRICT REQUIRE_APPROVAL
  ├── Rating <= 3 -> STRICT REQUIRE_APPROVAL
  ├── Fixable failure + 0 previous attempts -> BLOCK_AND_REGENERATE
  └── 4-5★ + LOW risk + matching rule -> AUTO_PUBLISH
```
*Actual Code Reality*: Purely deterministic, regex-based and algorithmic execution. Extremely fast (<25ms) and 100% server-enforced.

---

## Workflow F: Google Publication

```
[Approval Event: POST /api/reviews/:id/approve]
        │
        ▼
[server/routes/index.ts -> router.post('/reviews/:id/approve')]
  ├── 1. Finds review and reply in memory
  ├── 2. Tenant Check: `verifyTenant(req, res, review.saasCustomerId)`
  ├── 3. Obtains `textToPublish = editedReplyText || reply.proposedText`
  ├── 4. Calls `googleService.publishReviewReply('mock_access_token', review.googleReviewName, textToPublish)`
  ├── 5. Updates reply in memory:
  │      `status = 'MANUALLY_PUBLISHED'`, `publishedAt = now`
  └── 6. Appends `MANUALLY_PUBLISHED_REPLY` to `mockAuditEvents`
```
*Actual Code Reality*: In development, `googleService.publishReviewReply` returns a simulated object without reaching Google. No persistent audit trail or webhook confirmation from Google is verified.

---

## Workflow G: Billing & Entitlements

```
[POST /api/billing/update-plan]
        │
        ▼
[server/routes/index.ts]
  ├── 1. Updates in-memory `mockSubscription.plan` and `mockSubscription.status`
  ├── 2. If status === 'CANCELED', sets `mockLocation.automationEnabled = false`
  └── 3. In `/api/google/sync-reviews`, if `mockSubscription.status === 'CANCELED'`,
         returns HTTP 403 `SUBSCRIPTION_CANCELED`
```
*Actual Code Reality*: Stripe webhooks are NOT wired into an Express endpoint. While `.env.example` lists `STRIPE_WEBHOOK_SECRET`, there is no `/api/billing/webhook` handler implemented. Plan changes are directly submitted by the frontend via `POST /api/billing/update-plan`.

---

## Workflow H: Support System

```
[Customer Form (POST /api/support/tickets)]
        │
        ▼
[SupportService (server/services/support/supportService.ts)]
  ├── 1. Appends ticket to `tickets` array
  ├── 2. Appends initial message to `messages` array
  └── 3. Returns ticket
        │
[Admin Response (POST /admin/support/tickets/:id/messages)]
  ├── 1. Verifies `verifyAdminRole()`
  ├── 2. Appends reply to `messages` array with senderType: 'SUPPORT_AGENT'
  └── 3. Updates ticket status to 'IN_PROGRESS'
```
*Actual Code Reality*: Completely in-memory. The AI support drafting endpoint (`POST /admin/support/ai-draft`) returns a static template for staff review, preserving human-in-the-loop integrity (never auto-sends).

---

## Workflow I: Admin Customer Management

```
[Admin Console: GET /admin/customers and GET /admin/customers/:id]
        │
        ▼
[server/routes/index.ts]
  ├── 1. Role Check: `verifyAdminRole()` (Checks `x-user-role` header)
  ├── 2. Lists hardcoded mock customers (`Downtown Dental SF`, `Golden Gate Auto Repair`)
  └── 3. Notes POST `/admin/customers/:id/notes` writes into in-memory `mockStaffNotes`
```
*Actual Code Reality*: Static data with in-memory augmentation. Anyone who calls the endpoint without `x-user-role` set bypasses the role check due to a logic flaw (`if (role && role !== 'SUPER_ADMIN')`).
