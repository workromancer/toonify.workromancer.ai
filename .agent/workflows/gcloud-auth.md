---
description: Switch GCP project and authenticate with gcloud for local development
---

# GCloud Authentication Workflow

이 워크플로우는 로컬 개발 환경에서 GCP 프로젝트를 전환하고 인증을 설정합니다.

## Steps

1. 현재 gcloud 설정 확인

```bash
gcloud config list
```

2. 프로젝트 전환 (toonify-develop)
   // turbo

```bash
gcloud config set project toonify-develop
```

3. Application Default Credentials 로그인

```bash
gcloud auth application-default login
```

4. (선택) Vertex AI API 활성화 확인
   // turbo

```bash
gcloud services list --enabled | grep aiplatform
```

5. 인증 확인
   // turbo

```bash
gcloud auth application-default print-access-token | head -c 20 && echo "..."
```

## Notes

- `gcloud auth application-default login` 명령은 브라우저가 열리고 Google 계정으로 로그인해야 합니다.
- 이 인증은 Vertex AI, Cloud Storage 등 GCP 서비스에 접근할 때 사용됩니다.
- 백엔드에서 `GEMINI_API_KEY`가 설정되지 않으면 자동으로 이 ADC 인증을 사용합니다.
