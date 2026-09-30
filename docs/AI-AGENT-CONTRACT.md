# Google Review Autopilot — AI Agent Contract & Engineering Laws

This document is the binding engineering standard for any AI agent, automated pipeline, or human engineer modifying this repository. Violation of these principles will cause automated build rejections, security vulnerabilities, or legal liability.

---

## 1. The Twelve Cardinal Engineering Rules

1. **NEVER WRITE SECRETS INTO SOURCE CODE**: API keys, client secrets, JWT private keys, and tokens belong exclusively in `.env` and environment variables.
2. **NEVER EXPOSE SERVER CREDENTIALS TO THE BROWSER**: Client components under `src/` must only receive sanitized, public data. `GEMINI_API_KEY`, `GOOGLE_CLIENT_SECRET`, and `STRIPE_SECRET_KEY` must never be referenced in browser bundles.
3. **NEVER DUPLICATE SHARED DOMAIN MODELS**: All entities live in `shared/types/domain.ts` and `shared/types/api.ts`. Never declare private variants of `User`, `Review`, `SaaSCustomer`, etc.
4. **NEVER CREATE A SECOND DATABASE LAYER**: Database queries, schema migrations, and ORM abstractions must be unified in one persistence layer. Never introduce competing storage engines.
5. **NEVER INTRODUCE UNNECESSARY DEPENDENCIES**: Evaluate native TypeScript/JavaScript solutions first before running `npm install`. Do not add bulky state libraries or heavy utility monoliths without explicit consensus.
6. **NEVER RENAME SHARED TYPES CASUALLY**: Breaking changes to shared types cascade across frontend, backend, and background jobs. Modifications must be additive or versioned.
7. **PREFER ADAPTERS / INTERFACES FOR EXTERNAL PROVIDERS**: All interactions with Google Business Profile, Gemini, Stripe, and Email services must be encapsulated behind provider interfaces located in `server/services/`.
8. **REVIEW TEXT IS UNTRUSTED USER-GENERATED CONTENT**: Treat all incoming review titles, bodies, and author names as potential attack vectors. Sanitize, escape, and wrap them with injection shields.
9. **NEVER ALLOW REVIEW TEXT TO OVERRIDE SYSTEM INSTRUCTIONS**: Gemini prompts must strictly delimit review text and explicitly command the model to ignore any instruction embedded in the user review.
10. **TENANT ISOLATION IS MANDATORY**: Every operational entity must enforce foreign key integrity with `saasCustomerId`. Multi-tenant leaks are critical defects.
11. **SAASCUSTOMER A MUST NEVER ACCESS SAASCUSTOMER B DATA**: All database queries and API route controllers must filter by the authenticated `saasCustomerId`.
12. **ADMIN ACCESS MUST BE EXPLICITLY ROLE-PROTECTED**: Routes, endpoints, and UI views under `admin/` require verified `SUPER_ADMIN` privileges.

---

## 2. Mandatory Domain Terminology

Never use generic or ambiguous terminology. Every file must adhere to:

```
┌──────────────┐         ┌─────────────────────────┐
│     User     │ ──owns─▶│       SaaSCustomer      │ (The paying tenant)
└──────────────┘         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │        Business         │
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │    BusinessLocation     │ (Google Business Profile)
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │         Review          │
                         └────────────┬────────────┘
                                      │ written by
                                      ▼
                         ┌─────────────────────────┐
                         │      ReviewAuthor       │ (Public reviewer - NOT our customer)
                         └─────────────────────────┘
```

* **SaaSCustomer**: The paying customer of our SaaS.
* **ReviewAuthor**: The public end-consumer writing the review. **Never refer to ReviewAuthor as Customer.**

---

## 3. Strict AI Reply Guardrails (Forbidden Inventions)

When generating responses via Gemini, the prompt and post-generation safety validators must enforce that the AI **NEVER** invents:

* **Refunds**: Never offer full, partial, or discretionary monetary refunds.
* **Discounts**: Never offer discounts, coupons, promos, or rate cuts.
* **Compensation**: Never offer free meals, gift cards, replacement services, or settlements.
* **Employees**: Never fabricate or mention employee names, managers, or personnel not provided in verified context.
* **Policies**: Never invent return policies, warranty rules, or SLA commitments.
* **Promises**: Never promise immediate actions ("I will personally call you tomorrow at 9 AM").
* **Events**: Never acknowledge past interactions or visits unless verified in trusted customer context.
* **Actions not present in trusted context**: Stick solely to verified business facts provided in `BrandVoice.trustedBusinessContext`.

---

## 4. Default Automation Rules

Every business location initializes with this baseline rule engine:

* **5 Stars + LOW Risk**: `AUTO_PUBLISH` (default 15-minute grace period).
* **4 Stars + LOW Risk**: `AUTO_PUBLISH` (default 30-minute grace period).
* **3 Stars**: `REQUIRE_APPROVAL` (never auto-published).
* **1–2 Stars**: `REQUIRE_APPROVAL` (never auto-published).
* **HIGH or CRITICAL Risk**: `REQUIRE_APPROVAL` (regardless of star rating).

---

## 5. Scope Boundary Compliance

Agents must reject requests or prompts that drift into:
* Email marketing / newsletter campaigns.
* SMS / text message blasts.
* CRM / contact management for reviewer contacts.
* Social media posting / Twitter / Facebook / Instagram.
* Non-Google directory listings sync.
* Website builders or landing page creators.
* Customer loyalty / referral reward platforms.
