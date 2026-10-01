# Deployment Guide — Google Review Autopilot

## 1. Production Architecture Overview
Google Review Autopilot is deployed as a containerized full-stack application on Google Cloud Run, backed by Google Cloud Firestore for persistent data storage, Firebase Authentication / Google Identity Platform for tenant authentication, Google Cloud Tasks for background workers, Google Gemini for AI drafting, and Paddle for subscription billing.

```
[Client (React 19 SPA + Paddle.js)]
                │
                ▼ HTTPS
[Google Cloud Load Balancing / Cloud Run]
        ├── Node.js 22 + Express API Gateway (tsx runtime)
        ├── Firebase Admin SDK / Firestore Repository Layer
        └── Reply Guard Safety Pipeline
                │
    ┌───────────┼───────────┬──────────────┐
    ▼           ▼           ▼              ▼
[Cloud Firestore] [Cloud Tasks] [Gemini] [Paddle Billing]
  (Database)      (Background)   (AI)     (Webhooks)
```

## 2. Prerequisites
1. **Google Cloud Project** with active billing and Cloud Run API enabled.
2. **gcloud CLI** configured and authenticated.
3. **Cloud Firestore** provisioned in Native mode.
4. **Google Business Profile OAuth Client** created in Google Cloud Console.
5. **Paddle Account** (Sandbox or Live) with an active vendor API key.
6. **Docker** installed for building container images.
7. **Secret Manager** secrets for: Paddle keys, Gemini key, `TOKEN_ENCRYPTION_KEY`, and Google OAuth client secret.

## 3. Required Secrets (Secret Manager)
| Secret name | Environment Variable | Purpose |
| :--- | :--- | :--- |
| `paddle-api-key` | `PADDLE_API_KEY` | Paddle vendor API key |
| `paddle-webhook-secret` | `PADDLE_WEBHOOK_SECRET` | Paddle webhook HMAC-SHA256 signature verification |
| `gemini-api-key` | `GEMINI_API_KEY` | Google Gemini API key for review reply generation |
| `token-encryption-key` | `TOKEN_ENCRYPTION_KEY` | AES-256 key for Google OAuth tokens at rest (≥32 chars) |
| `google-client-secret` | `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret |

## 4. Deployment Steps

### Step 4.1: Build Container Image
```bash
# Authenticate with Google Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build production container image
docker build -t us-central1-docker.pkg.dev/$PROJECT_ID/applet-repo/google-review-autopilot:latest .

# Push image to Artifact Registry
docker push us-central1-docker.pkg.dev/$PROJECT_ID/applet-repo/google-review-autopilot:latest
```

### Step 4.2: Deploy to Cloud Run
```bash
gcloud run deploy google-review-autopilot \
  --image us-central1-docker.pkg.dev/$PROJECT_ID/applet-repo/google-review-autopilot:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,PORT=3000,APP_BASE_URL=https://your-service.run.app,GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID,GOOGLE_REDIRECT_URI=https://your-service.run.app/onboarding,GEMINI_MODEL=gemini-3.8-flash,PADDLE_BASE_URL=https://sandbox-api.paddle.com" \
  --set-secrets "PADDLE_API_KEY=paddle-api-key:latest,PADDLE_WEBHOOK_SECRET=paddle-webhook-secret:latest,GEMINI_API_KEY=gemini-api-key:latest,TOKEN_ENCRYPTION_KEY=token-encryption-key:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest" \
  --min-instances 0 \
  --max-instances 10 \
  --cpu 1 \
  --memory 512Mi \
  --timeout 60
```

### Step 4.4: Register Paddle Webhook
In the Paddle Sandbox Dashboard (Developer Tools → Notifications):
1. Add Webhook Destination: `https://your-cloud-run-domain.run.app/api/webhooks/paddle`.
2. Subscribe to events:
   - `customer.created`
   - `transaction.paid`
   - `transaction.completed`
   - `subscription.created`
   - `subscription.updated`
   - `subscription.canceled`
3. Copy the **Notification Secret Key** and store in Secret Manager as `paddle-webhook-secret`.

### Step 4.5: Verify
```bash
curl -s https://your-cloud-run-domain.run.app/health | jq
# Expect: { "status": "ok", "checks": { "database": { "healthy": true, ... } } }
```

## 5. Local Production-Like Run
```bash
cp .env.example .env
# Fill TOKEN_ENCRYPTION_KEY, GEMINI_API_KEY, GOOGLE_CLIENT_*, PADDLE_*, etc.
npm install
npm run build
NODE_ENV=production npm start
```
