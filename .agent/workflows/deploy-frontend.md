---
description: Deploy frontend to toonify-prod and restore local gcloud project
---

# Deploy Frontend to Production

이 워크플로우는 프론트엔드를 toonify-prod에 배포하고 로컬 gcloud 설정을 원래 프로젝트로 복원합니다.

## Steps

1. 현재 gcloud 프로젝트 저장
   // turbo

```bash
ORIGINAL_PROJECT=$(gcloud config get-value project) && echo "Original project: $ORIGINAL_PROJECT"
```

2. toonify-prod 프로젝트로 전환
   // turbo

```bash
gcloud config set project toonify-prod
```

3. 프론트엔드 배포 스크립트 실행

```bash
./scripts/deploy_frontend.sh
```

4. 원래 프로젝트로 복원
   // turbo

```bash
gcloud config set project toonify-develop
```

5. 복원 확인
   // turbo

```bash
gcloud config get-value project
```

## Notes

- 배포 전에 `.env.prod` 파일이 있는지 확인하세요.
- 배포 전에 백엔드가 먼저 배포되어 있어야 합니다 (백엔드 URL 조회).
- 배포 스크립트는 Docker 이미지를 빌드하고 Cloud Run에 배포합니다.
- 배포 완료 후 Public URL이 출력됩니다.
