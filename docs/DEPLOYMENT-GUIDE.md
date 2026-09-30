# Deployment Guide — Google Review Autopilot

## 1. Production Architecture Overview
Google Review Autopilot is deployed as a containerized full-stack application on Google Cloud Run, backed by Google Cloud SQL for PostgreSQL, Google Identity Platform for tenant authentication, Google Cloud Tasks for background workers, Google Gemini 3.8 Flash for AI drafting, and Paddle Sandbox for subscription billing.

```
[Client (React 19 SPA + Paddle.js)]
                │
                ▼ HTTPS
[Google Cloud Load Balancing / Cloud Run]
        ├── Node.js 22 + Express API Gateway
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

## 3. Deployment Steps

### Step 3.1: Build Container Image
```bash
# Authenticate with Google Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build production container image
docker build -t us-central1-docker.pkg.dev/$PROJECT_ID/applet-repo/google-review-autopilot:latest .

# Push image to Artifact Registry
docker push us-central1-docker.pkg.dev/$PROJECT_ID/applet-repo/google-review-autopilot:latest
```

### Step 3.2: Run Database Migrations
```bash
# Run Drizzle migrations against Cloud SQL
npx drizzle-kit migrate
```

### Step 3.3: Deploy to Cloud Run
```bash
gcloud run deploy google-review-autopilot \
  --image us-central1-docker.pkg.dev/$PROJECT_ID/applet-repo/google-review-autopilot:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,PORT=3000,GEMINI_MODEL=gemini-3.8-flash,PADDLE_BASE_URL=https://sandbox-api.paddle.com" \
  --set-secrets "SQL_HOST=cloudsql-host:latest,SQL_USER=cloudsql-user:latest,SQL_PASSWORD=cloudsql-pass:latest,SQL_DB_NAME=cloudsql-db:latest,PADDLE_API_KEY=paddle-api-key:latest,PADDLE_WEBHOOK_SECRET=paddle-webhook-secret:latest,GEMINI_API_KEY=gemini-api-key:latest" \
  --add-cloudsql-instances $PROJECT_ID:us-central1:review-autopilot-db
```

### Step 3.4: Register Paddle Webhook
In the Paddle Sandbox Dashboard (Developer Tools -> Notifications):
1. Add Webhook Destination: `https://your-cloud-run-domain.run.app/api/webhooks/paddle`.
2. Subscribe to events:
   - `customer.created`
   - `transaction.paid`
   - `transaction.completed`
   - `subscription.created`
   - `subscription.updated`
   - `subscription.canceled`
3. Copy the **Notification Secret Key** and store in Secret Manager as `paddle-webhook-secret`.
