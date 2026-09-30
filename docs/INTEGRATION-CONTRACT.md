# External Integration Contracts & Provider Adapters

This document establishes the interfaces, authentication mechanics, error protocols, and fallback behaviors for all third-party external integrations in **Google Review Autopilot**.

---

## 1. Google Business Profile Integration Contract

All communication with Google Business Profile APIs must occur through the `IGoogleBusinessProfileProvider` adapter located in `server/services/google/`.

### Required Google OAuth 2.0 Scopes
* `https://www.googleapis.com/auth/business.manage` (Google Business Profile management, location reviews, and review replies)

### Core Interface Definition
```typescript
export interface IGoogleBusinessProfileProvider {
  getAuthorizationUrl(state: string): Promise<string>;
  exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    accountId: string;
  }>;
  refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }>;
  listLocations(accessToken: string, accountId: string): Promise<GoogleLocationDto[]>;
  listReviews(
    accessToken: string,
    locationName: string,
    pageToken?: string
  ): Promise<{
    reviews: GoogleReviewDto[];
    nextPageToken?: string;
  }>;
  publishReviewReply(
    accessToken: string,
    reviewName: string,
    comment: string
  ): Promise<{
    replyName: string;
    comment: string;
    updateTime: string;
  }>;
  deleteReviewReply(accessToken: string, reviewName: string): Promise<void>;
}
```

### Rate Limiting & Error Handling
* **Token Expiration**: The adapter automatically catches HTTP 401, issues a refresh with `refreshToken`, updates the stored credential in `GoogleConnection`, and retries the operation once.
* **Quota / 429**: Implement exponential backoff with jitter (initial delay: 1000ms, max 3 retries).
* **Provider Error Mapping**: Wrap all upstream Google errors into `ProviderErrorDetail` with `provider: 'GOOGLE_BUSINESS_PROFILE'` and explicit `retryable` flags.

---

## 2. Google Gemini AI Safety & Reply Engine Contract

All LLM operations must route through `IAiReplyEngine` located in `server/services/ai/`.

### Core Interface Definition
```typescript
export interface IAiReplyEngine {
  /**
   * Evaluates untrusted review content for legal risk, toxicity, harassment,
   * compensation requests, employee targeting, and injection attempts.
   */
  assessRisk(reviewText: string, rating: number): Promise<RiskAssessment>;

  /**
   * Generates a constrained, personalized reply draft adhering strictly
   * to verified business context and forbidden invention rules.
   */
  generateReplyDraft(params: {
    reviewText: string;
    authorName: string;
    rating: number;
    brandVoice: BrandVoice;
    riskAssessment: RiskAssessment;
  }): Promise<{
    proposedText: string;
    model: string;
    tokenCount?: number;
  }>;
}
```

### AI Safety Enforcement Checklist
* **Delimited Inputs**: Wrap `reviewText` inside `<untrusted_review_content>` tags.
* **Temperature**: Max `0.2` for risk classification, max `0.5` for draft generation to suppress hallucinations.
* **Forbidden Output Validator**: Before returning `proposedText`, perform secondary programmatic string scans for prohibited commitment markers (e.g. "refund", "free voucher", "discount", "manager will call"). If detected, draft is flagged and blocked from auto-publishing.

---

## 2.1. Reply Guard Safety Layer Contract

All AI drafts must pass server-side validation through `ReplyGuardService` (`server/services/workflow/replyGuardService.ts`) prior to any automated dispatch or staging.

### Core Interface Definition
```typescript
export interface GuardInput {
  review: Review;
  generatedReply: string;
  businessContext?: BrandVoice['trustedBusinessContext'];
  brandVoice?: BrandVoice;
  recentReplies?: Array<{ proposedText: string; publishedText?: string }>;
  automationRules?: AutomationRule[];
  regenerationAttempts?: number;
}

export interface IReplyGuardService {
  validateReply(input: GuardInput): Promise<GuardResult>;
}
```

### Safety Gate Taxonomy
1. **Fact Check**: Blocks invented refunds, discounts, comped services, operational actions, or unverified claims.
2. **Risk Check**: Flags legal threats, injuries, discrimination, violence, and safety hazards.
3. **Tone Check**: Enforces configured brand voice; blocks aggression, sarcasm, or excessive apologies.
4. **Repetition Check**: Prevents identical verbatim sentences or >78% semantic similarity across recent location replies.
5. **Privacy Check**: Blocks unauthorized customer PII (emails, phone numbers, order IDs).
6. **Promise Check**: Blocks unauthorized guarantees or commitments.
7. **Legal Safety Check**: Blocks admissions of liability or accusations of reviewer dishonesty.
8. **Quality Check**: Rejects empty drafts, verbosity (>160 words), or model artifacts.

### Regeneration Bound
Fixable issues allow at most ONE regeneration cycle with targeted prompt feedback. Indefinite looping is mathematically prevented.

---

## 3. Stripe Subscription & Billing Contract

Managed via `IBillingProvider` in `server/services/billing/`.

### Core Interface Definition
```typescript
export interface IBillingProvider {
  createCheckoutSession(params: {
    saasCustomerId: string;
    customerEmail: string;
    plan: SubscriptionPlan;
    returnUrl: string;
  }): Promise<{ url: string }>;

  createCustomerPortalSession(params: {
    stripeCustomerId: string;
    returnUrl: string;
  }): Promise<{ url: string }>;

  handleWebhookEvent(
    rawBody: Buffer,
    signature: string
  ): Promise<{
    handled: boolean;
    eventType: string;
  }>;
}
```

### Handled Webhook Events
* `checkout.session.completed`: Provisions initial subscription and sets limits.
* `customer.subscription.updated`: Syncs tier upgrades/downgrades and billing period.
* `customer.subscription.deleted`: Downgrades SaaSCustomer to read-only mode, halts auto-publishing jobs.
* `invoice.payment_failed`: Sends high-priority payment warning notification.

---

## 4. Notifications Provider Contract

Managed via `INotificationProvider` in `server/services/notifications/`.

### Core Interface Definition
```typescript
export interface INotificationProvider {
  sendApprovalRequiredAlert(params: {
    recipientEmail: string;
    businessLocationName: string;
    reviewAuthorName: string;
    starRating: number;
    reviewSnippet: string;
    approvalUrl: string;
  }): Promise<void>;

  sendCriticalRiskAlert(params: {
    recipientEmail: string;
    businessLocationName: string;
    starRating: number;
    riskReason: string;
    reviewUrl: string;
  }): Promise<void>;
}
```
