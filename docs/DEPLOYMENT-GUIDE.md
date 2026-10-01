# Deployment Guide — Google Review Autopilot

## 1. Production Architecture Overview
Google Review Autopilot is deployed as a containerized full-stack application on Google Cloud Run, backed by Google Cloud SQL for PostgreSQL, Google Identity Platform for tenant authentication, Google Cloud Tasks for background workers, Google Gemini for AI drafting, and Paddle Sandbox for subscription billing.

```
[Client (React 19 SPA + Paddle.js)]
                │
                ▼ HTTPS
[Google Cloud Load Balancing / Cloud Run]
        ├── Node.js 22 + Express API Gateway (tsx runtime)
        ├── Drizzle ORM Repository Layer
        └── Reply Guard Safety Pipeline
                │
    ┌───────────┼───────────┬──────────────┐
    ▼           ▼           ▼              ▼
[Cloud SQL] [Cloud Tasks] [Gemini] [Paddle Sandbox]
 (Postgres)  (Background)  (AI)     (Webhooks)
```

## 2. Prerequisites
1. **Google Cloud Project** with active billing.
2. **gcloud CLI** configured and authenticated.
3. **Paddle Sandbox Account** with an active vendor API key.
4. **Google Cloud SQL PostgreSQL 15+** instance.
5. **Docker** installed for building container images.
6. **Secret Manager** secrets for: SQL credentials, Paddle keys, Gemini key, `TOKEN_ENCRYPTION_KEY`.

## 3. Required Secrets (Secret Manager)
| Secret name | Purpose |
| :--- | :--- |
| `cloudsql-host` / `INSTANCE_CONNECTION_NAME` | Cloud SQL connection |
| `cloudsql-user` / `SQL_USER` | DB user |
| `cloudsql-pass` / `SQL_PASSWORD` | DB password |
| `cloudsql-db` / `SQL_DB_NAME` | Database name |
| `paddle-api-key` | Paddle vendor API key |
| `paddle-webhook-secret` | Paddle webhook HMAC secret |
| `gemini-api-key` | Google Gemini API key |
| `token-encryption-key` | AES-256 key for Google OAuth tokens (≥32 chars) |
| `google-client-secret` | Google OAuth client secret |

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

### Step 4.2: Run Database Migrations
```bash
# Against Cloud SQL (via Auth Proxy or Cloud Run job)
npm run db:migrate
# or: npx drizzle-kit migrate
```

### Step 4.3: Deploy to Cloud Run
```bash
gcloud run deploy google-review-autopilot \
  --image us-central1-docker.pkg.dev/$PROJECT_ID/applet-repo/google-review-autopilot:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,PORT=3000,GEMINI_MODEL=gemini-2.0-flash,PADDLE_BASE_URL=https://sandbox-api.paddle.com" \
  --set-secrets "SQL_HOST=cloudsql-host:latest,SQL_USER=cloudsql-user:latest,SQL_PASSWORD=cloudsql-pass:latest,SQL_DB_NAME=cloudsql-db:latest,PADDLE_API_KEY=paddle-api-key:latest,PADDLE_WEBHOOK_SECRET=paddle-webhook-secret:latest,GEMINI_API_KEY=gemini-api-key:latest,TOKEN_ENCRYPTION_KEY=token-encryption-key:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest" \
  --add-cloudsql-instances $PROJECT_ID:us-central1:review-autopilot-db \
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
# Fill TOKEN_ENCRYPTION_KEY, SQL_*, GEMINI_API_KEY, etc.
npm install
npm run build
NODE_ENV=production npm start
```
