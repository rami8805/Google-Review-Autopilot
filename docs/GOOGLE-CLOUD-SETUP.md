# Google Cloud Setup Guide — Google Review Autopilot

This document outlines the exact Google Cloud Platform (GCP) resources, APIs, IAM permissions, and configuration required to run Google Review Autopilot in production.

---

## 1. Required Google Cloud APIs

Enable the required GCP APIs:
```bash
gcloud services enable \
  sqladmin.googleapis.com \
  identitytoolkit.googleapis.com \
  cloudtasks.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  aiplatform.googleapis.com
```

---

## 2. Google Cloud SQL (PostgreSQL 15+)

1. **Instance Creation**:
   ```bash
   gcloud sql instances create review-autopilot-db \
     --database-version=POSTGRES_15 \
     --tier=db-custom-2-7680 \
     --region=us-central1 \
     --storage-auto-increase \
     --backup-start-time=02:00
   ```
2. **Database & User**:
   ```bash
   gcloud sql databases create google_review_autopilot --instance=review-autopilot-db
   gcloud sql users create app_user --instance=review-autopilot-db --password=$DB_PASSWORD
   ```
3. **Cloud Run Connection**:
   Cloud Run connects via Unix Domain Socket (`/cloudsql/PROJECT:REGION:INSTANCE`) automatically when `--add-cloudsql-instances` is specified.

---

## 3. Google Identity Platform (Authentication)

1. In Google Cloud Console, navigate to **Identity Platform**.
2. Configure **Sign-in Providers**:
   - Enable **Google Provider** with your Web Client ID and Web Client Secret.
3. Configure **Authorized Domains**:
   - Add your Cloud Run domain (e.g. `your-service.run.app`).
4. Client SDK retrieves the ID Token via `await auth.currentUser.getIdToken()`. The token is passed as `Authorization: Bearer <idToken>` on all API calls.

---

## 4. Google Cloud Tasks (Background Processing Queues)

Three dedicated task queues isolate workloads:

1. **Review Sync Queue**:
   ```bash
   gcloud tasks queues create review-sync \
     --location=us-central1 \
     --max-dispatches-per-second=50 \
     --max-concurrent-dispatches=20 \
     --max-attempts=5 \
     --min-backoff=2s \
     --max-backoff=60s
   ```

2. **Reply Publication Queue**:
   ```bash
   gcloud tasks queues create reply-publication \
     --location=us-central1 \
     --max-dispatches-per-second=20 \
     --max-concurrent-dispatches=10 \
     --max-attempts=5 \
     --min-backoff=5s \
     --max-backoff=120s
   ```

3. **Notifications Queue**:
   ```bash
   gcloud tasks queues create notifications \
     --location=us-central1 \
     --max-dispatches-per-second=100 \
     --max-concurrent-dispatches=50 \
     --max-attempts=3 \
     --min-backoff=1s \
     --max-backoff=30s
   ```

4. **Service Account & IAM Invoker**:
   ```bash
   # Create worker invoker service account
   gcloud iam service-accounts create cloud-tasks-invoker \
     --display-name="Cloud Tasks Invoker Service Account"

   # Grant Cloud Run invoker permission
   gcloud run services add-iam-policy-binding google-review-autopilot \
     --region=us-central1 \
     --member="serviceAccount:cloud-tasks-invoker@${PROJECT_ID}.iam.gserviceaccount.com" \
     --role="roles/run.invoker"
   ```

---

## 5. Google Artifact Registry

Create the Docker repository for container images:
```bash
gcloud artifacts repositories create applet-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Container repository for Google Review Autopilot"
```

---

## 6. Secret Manager (Zero Source-Code Secrets)

All production secrets are stored in Google Secret Manager and mounted as environment variables at runtime in Cloud Run:

```bash
# Database Password
gcloud secrets create cloudsql-pass --replication-policy="automatic"
echo -n "$DB_PASSWORD" | gcloud secrets versions add cloudsql-pass --data-file=-

# Gemini API Key
gcloud secrets create gemini-api-key --replication-policy="automatic"
echo -n "$GEMINI_API_KEY" | gcloud secrets versions add gemini-api-key --data-file=-

# Google Business Profile OAuth Client Secret
gcloud secrets create google-client-secret --replication-policy="automatic"
echo -n "$GOOGLE_CLIENT_SECRET" | gcloud secrets versions add google-client-secret --data-file=-

# Paddle Sandbox API Key
gcloud secrets create paddle-api-key --replication-policy="automatic"
echo -n "$PADDLE_API_KEY" | gcloud secrets versions add paddle-api-key --data-file=-

# Paddle Webhook Secret
gcloud secrets create paddle-webhook-secret --replication-policy="automatic"
echo -n "$PADDLE_WEBHOOK_SECRET" | gcloud secrets versions add paddle-webhook-secret --data-file=-
```

Grant Cloud Run runtime service account access to secrets:
```bash
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 7. Structured Logging & Correlation IDs

Every background task, webhook event, and API gateway request logs in standard JSON with correlation IDs (`correlationId`, `jobId`, `tenantId`, `event`, `timestamp`). Cloud Logging automatically groups and indexes logs by `correlationId`.
