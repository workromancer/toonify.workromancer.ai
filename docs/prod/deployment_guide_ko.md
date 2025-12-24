# Toonify 프로덕션 배포 가이드

이 문서는 Toonify 애플리케이션을 GCP Cloud Run에 배포하는 방법을 설명합니다.

> **상세 인프라 정보**: [GCP_INFRASTRUCTURE.md](./GCP_INFRASTRUCTURE.md) 참조

---

## 사전 준비

1. **gcloud CLI 인증**

   ```bash
   gcloud auth login
   gcloud config set project toonify-prod
   ```

2. **환경 변수 파일 확인**
   - `.env.prod` 파일이 프로젝트 루트에 있어야 합니다.

---

## 🚀 배포

### Backend 배포

```bash
./scripts/deploy_backend.sh
```

- Docker 이미지 빌드 → Artifact Registry 푸시 → Cloud Run 배포
- `ingress=internal`로 설정 (외부 직접 접근 불가)

### Frontend 배포

```bash
./scripts/deploy_frontend.sh
```

- 백엔드 URL 자동 감지
- `ingress=all`로 설정 (Public 접근 가능)

---

## ⚠️ 문제 해결

### 로그 확인

```bash
# Backend
gcloud logging read "resource.labels.service_name=toonify-backend" --project=toonify-prod --limit=10

# Frontend
gcloud logging read "resource.labels.service_name=toonify-frontend" --project=toonify-prod --limit=10
```

### 환경 변수 확인

```bash
gcloud run services describe toonify-backend --region=asia-northeast3 --format="json" | jq '.spec.template.spec.containers[0].env'
```

---

## 관련 문서

- [GCP Infrastructure](./GCP_INFRASTRUCTURE.md) - 전체 인프라 설정
- [Clerk Production](./prod_clerk.md) - 인증 설정
- [GitHub Actions Guide](./github_actions_guide_ko.md) - CI/CD 설정
