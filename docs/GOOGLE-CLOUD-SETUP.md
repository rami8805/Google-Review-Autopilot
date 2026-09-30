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

## 2. Google Cloud SQL (PostgreSQL)

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

## 4. Google Cloud Tasks (Background Queue)

1. **Create Queue**:
   ```bash
   gcloud tasks queues create review-processing-queue \
     --location=us-central1 \
     --max-dispatches-per-second=50 \
     --max-concurrent-dispatches=20 \
     --max-attempts=5 \
     --min-backoff=2s \
     --max-backoff=60s
   ```
2. **IAM Invoker**:
   Grant the Cloud Tasks Service Account the `roles/run.invoker` role to trigger `POST /api/tasks/worker`.

---

## 5. Secret Manager

Store all sensitive runtime credentials in Secret Manager:
```bash
gcloud secrets create cloudsql-pass --replication-policy="automatic"
gcloud secrets create gemini-api-key --replication-policy="automatic"
gcloud secrets create paddle-api-key --replication-policy="automatic"
gcloud secrets create paddle-webhook-secret --replication-policy="automatic"
```
Cloud Run mounts these directly as environment variables at runtime without exposing them to code or Git.
