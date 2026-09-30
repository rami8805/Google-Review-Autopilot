# Paddle Billing Sandbox Setup — Google Review Autopilot

This document specifies the exact configuration and testing procedures for Paddle Billing Sandbox.

---

## 1. Sandbox Environment Overview
- **Base URL**: `https://sandbox-api.paddle.com`
- **Dashboard URL**: `https://sandbox-vendors.paddle.com`
- **Checkout Script**: `https://cdn.paddle.com/paddle/v2/paddle.js`

---

## 2. Product & Catalog Configuration

In the Paddle Sandbox Dashboard (Catalog -> Products & Prices):

### Product: Google Review Autopilot
Create three subscription plans with monthly billing intervals:

1. **Starter Plan**:
   - Price ID: `pri_sandbox_starter_01`
   - Price: $29.00 USD / month
   - Entitlements: 1 location, 50 AI replies/month
2. **Growth Plan**:
   - Price ID: `pri_sandbox_growth_01`
   - Price: $69.00 USD / month
   - Entitlements: 3 locations, 200 AI replies/month
3. **Pro Plan**:
   - Price ID: `pri_sandbox_pro_01`
   - Price: $149.00 USD / month
   - Entitlements: 10 locations, unlimited AI replies/month

---

## 3. Webhook Destination Setup

1. Navigate to **Developer Tools -> Notifications -> New Notification Setting**.
2. **Destination Type**: URL (`POST`).
3. **Notification URL**: `https://your-domain.run.app/api/webhooks/paddle`.
4. **Subscribed Events**:
   - `customer.created`
   - `transaction.paid`
   - `transaction.completed`
   - `subscription.created`
   - `subscription.updated`
   - `subscription.canceled`
5. Copy the generated **Secret Key** and store it as `PADDLE_WEBHOOK_SECRET`.

---

## 4. Webhook Security Verification Flow

Paddle sends `Paddle-Signature: ts=TIMESTAMP;h1=SIGNATURE`.
Our backend (`server/services/billing/paddleService.ts`) validates:
```typescript
const signedPayload = `${ts}:${rawBody}`;
const expectedH1 = crypto.createHmac('sha256', PADDLE_WEBHOOK_SECRET).update(signedPayload).digest('hex');
crypto.timingSafeEqual(Buffer.from(h1), Buffer.from(expectedH1));
```
- Replays older than 5 minutes are discarded.
- `event_id` is recorded in `paddle_webhook_events` to enforce strict idempotency.
- Duplicate event deliveries return HTTP 200 with `{ success: true, error: 'DUPLICATE_EVENT_IGNORED' }`.
