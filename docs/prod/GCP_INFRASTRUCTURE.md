# GCP Infrastructure Guide

> **Last Updated:** 2025-12-24  
> **Author:** Toonify Team

## Overview

Toonify 프로덕션 환경은 **Google Cloud Platform (GCP)** 에서 호스팅됩니다.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Internet                                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │    Global Load Balancer       │
            │    (34.160.25.49)             │
            │    toonify.workromancer.ai    │
            └───────────────┬───────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │    Cloud Run (Frontend)       │
            │    toonify-frontend           │
            │    asia-northeast3            │
            └───────────────┬───────────────┘
                            │ VPC Connector
                            ▼
            ┌───────────────────────────────┐
            │    Cloud Run (Backend)        │
            │    toonify-backend            │
            │    Internal Only              │
            └───────────────┬───────────────┘
                            │ Private IP
                            ▼
            ┌───────────────────────────────┐
            │    Cloud SQL (PostgreSQL)     │
            │    toonify-postgres           │
            │    10.223.0.3 (Private IP)    │
            └───────────────────────────────┘
```

---

## Project Information

| Item              | Value                     |
| ----------------- | ------------------------- |
| **Project ID**    | `toonify-prod`            |
| **Region**        | `asia-northeast3` (Seoul) |
| **VPC Connector** | `vpc-connector`           |

---

## 1. Cloud Run Services

### Frontend Service

| Property        | Value                                                      |
| --------------- | ---------------------------------------------------------- |
| Service Name    | `toonify-frontend`                                         |
| Region          | `asia-northeast3`                                          |
| Ingress         | Allow all traffic (Public)                                 |
| Service Account | `toonify-frontend-sa@toonify-prod.iam.gserviceaccount.com` |
| Service URL     | `https://toonify-frontend-biixcm5k6q-du.a.run.app`         |

**환경 변수:**

```
NEXT_PUBLIC_API_BASE_URL=/api/v1
INTERNAL_BACKEND_URL=https://toonify-backend-biixcm5k6q-du.a.run.app
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
```

### Backend Service

| Property               | Value                                                     |
| ---------------------- | --------------------------------------------------------- |
| Service Name           | `toonify-backend`                                         |
| Region                 | `asia-northeast3`                                         |
| Ingress                | Internal only                                             |
| Service Account        | `toonify-backend-sa@toonify-prod.iam.gserviceaccount.com` |
| VPC Connector          | `vpc-connector`                                           |
| Service URL (Internal) | `https://toonify-backend-biixcm5k6q-du.a.run.app`         |

**환경 변수:**

```
STORAGE_TYPE=gcs
MINIO_BUCKET=toonify-prod-assets
POSTGRES_SERVER=10.223.0.3
GOOGLE_CLOUD_PROJECT=toonify-prod
GOOGLE_CLOUD_LOCATION=asia-northeast1
```

---

## 2. Cloud SQL (PostgreSQL)

| Property         | Value                       |
| ---------------- | --------------------------- |
| Instance Name    | `toonify-postgres`          |
| Database Version | PostgreSQL 15               |
| Region           | `asia-northeast3`           |
| Public IP        | `34.158.203.146` (not used) |
| **Private IP**   | `10.223.0.3` ✅             |

**Connection (from Cloud Run):**

```python
DATABASE_URL = "postgresql://toonify:PASSWORD@10.223.0.3:5432/toonify_db"
```

> ⚠️ **Important:** Cloud Run에서 Cloud SQL 접속 시 반드시 **Private IP**를 사용해야 합니다. Public IP는 VPC Connector를 통해 접근할 수 없습니다.

---

## 3. Global HTTPS Load Balancer

커스텀 도메인 `toonify.workromancer.ai`를 위한 Load Balancer 구성

### Resources

| Resource        | Name                                     |
| --------------- | ---------------------------------------- |
| Static IP       | `toonify-frontend-ip` → **34.160.25.49** |
| Serverless NEG  | `toonify-frontend-neg`                   |
| Backend Service | `toonify-frontend-backend`               |
| URL Map         | `toonify-frontend-urlmap`                |
| SSL Certificate | `toonify-ssl-cert` (Managed)             |
| HTTPS Proxy     | `toonify-https-proxy`                    |
| Forwarding Rule | `toonify-https-rule`                     |

### DNS Configuration (Cloudflare)

```
Type: A
Name: toonify
Content: 34.160.25.49
Proxy: DNS only (gray cloud)
```

### SSL Certificate Provisioning

SSL 인증서는 Google-managed로, DNS가 올바르게 설정되면 자동 발급됩니다.

```bash
# 상태 확인
gcloud compute ssl-certificates describe toonify-ssl-cert --global --project=toonify-prod
```

---

## 4. Google Cloud Storage

| Property    | Value                       |
| ----------- | --------------------------- |
| Bucket Name | `toonify-prod-assets`       |
| Region      | `asia-northeast3`           |
| Access      | Uniform bucket-level access |

**Backend에서 사용:**

```python
# backend/app/services/storage.py
# STORAGE_TYPE=gcs 환경변수로 GCSStorage 클래스 사용
```

---

## 5. Vertex AI (Gemini)

| Property | Value                                                  |
| -------- | ------------------------------------------------------ |
| Location | `asia-northeast1`                                      |
| Model    | `gemini-3-flash-preview`, `gemini-3-pro-image-preview` |
| Auth     | ADC (Application Default Credentials)                  |

> Backend Service Account에 `Vertex AI User` 역할이 필요합니다.

---

## 6. IAM Service Accounts

### Frontend SA

- Name: `toonify-frontend-sa`
- Roles: `Cloud Run Invoker`

### Backend SA

- Name: `toonify-backend-sa`
- Roles:
  - `Cloud SQL Client`
  - `Vertex AI User`
  - `Storage Object Admin`

---

## 7. Deployment Commands

### Backend 배포

```bash
./scripts/deploy_backend.sh
```

### Frontend 배포

```bash
./scripts/deploy_frontend.sh
```

### Load Balancer 생성 (일회성)

```bash
# 1. Serverless NEG
gcloud compute network-endpoint-groups create toonify-frontend-neg \
    --region=asia-northeast3 \
    --network-endpoint-type=serverless \
    --cloud-run-service=toonify-frontend \
    --project=toonify-prod

# 2. Backend Service
gcloud compute backend-services create toonify-frontend-backend \
    --load-balancing-scheme=EXTERNAL_MANAGED \
    --global --project=toonify-prod

gcloud compute backend-services add-backend toonify-frontend-backend \
    --global \
    --network-endpoint-group=toonify-frontend-neg \
    --network-endpoint-group-region=asia-northeast3 \
    --project=toonify-prod

# 3. URL Map
gcloud compute url-maps create toonify-frontend-urlmap \
    --default-service=toonify-frontend-backend \
    --global --project=toonify-prod

# 4. SSL Certificate
gcloud compute ssl-certificates create toonify-ssl-cert \
    --domains=toonify.workromancer.ai \
    --global --project=toonify-prod

# 5. HTTPS Proxy
gcloud compute target-https-proxies create toonify-https-proxy \
    --url-map=toonify-frontend-urlmap \
    --ssl-certificates=toonify-ssl-cert \
    --global --project=toonify-prod

# 6. Static IP
gcloud compute addresses create toonify-frontend-ip \
    --ip-version=IPV4 \
    --global --project=toonify-prod

# 7. Forwarding Rule
gcloud compute forwarding-rules create toonify-https-rule \
    --load-balancing-scheme=EXTERNAL_MANAGED \
    --target-https-proxy=toonify-https-proxy \
    --address=toonify-frontend-ip \
    --ports=443 \
    --global --project=toonify-prod
```

---

## 8. Troubleshooting

### Cloud Run 로그 확인

```bash
# Backend
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=toonify-backend AND severity>=ERROR" \
    --project=toonify-prod --limit=10

# Frontend
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=toonify-frontend AND severity>=ERROR" \
    --project=toonify-prod --limit=10
```

### SSL 인증서 상태 확인

```bash
gcloud compute ssl-certificates describe toonify-ssl-cert --global --project=toonify-prod
```

### 환경 변수 확인

```bash
gcloud run services describe toonify-backend --region=asia-northeast3 --project=toonify-prod --format="json" | jq '.spec.template.spec.containers[0].env'
```

---

## 9. Cost Optimization

| Service       | Optimization              |
| ------------- | ------------------------- |
| Cloud Run     | Scale to zero when idle   |
| Cloud SQL     | Use `db-f1-micro` for dev |
| GCS           | Standard storage class    |
| Load Balancer | $0.025/hour base cost     |

---

## Change Log

| Date       | Changes                                         |
| ---------- | ----------------------------------------------- |
| 2025-12-24 | Initial infrastructure setup with Load Balancer |
