# Toonify (툰이파이)

Google Gemini Pro를 활용한 웹툰 창작 보조 AI 플랫폼입니다. 사용자의 아이디어를 바탕으로 캐릭터 시트, 세계관 설정, 시나리오, 컷 구성 등을 도와줍니다.

## 📂 프로젝트 구조

- **backend/**: FastAPI 기반의 AI 서비스 서버 (Python)
- **frontend/**: Next.js 기반의 사용자 인터페이스 (TypeScript)
- **scripts/**: 배포 및 인프라 설정 스크립트

## 🚀 시작하기 (Development)

로컬 개발 환경을 실행하려면:

```bash
# 통합 개발 환경 실행 (백엔드 + 프론트엔드)
./dev.sh
```

## ☁️ 배포 (Deployment)

Toonify는 Google Cloud Platform (Cloud Run, Cloud SQL) 환경에 배포됩니다.

> 상세한 배포 가이드는 [배포 가이드 문서](docs/prod/deployment_guide_ko.md)를 참고하세요.

### 1단계: 인프라 설정
```bash
./scripts/setup_prod_env.sh
./scripts/generate_prod_env_file.sh
```

### 2단계: 서비스 배포
백엔드와 프론트엔드를 독립적으로 배포할 수 있습니다.

**백엔드 배포**
```bash
./scripts/deploy_backend.sh
```
*   `toonify-backend` 서비스가 Cloud Run에 배포됩니다. (내부 접속 전용)

**프론트엔드 배포**
```bash
./scripts/deploy_frontend.sh
```
*   `toonify-frontend` 서비스가 배포되며, 자동으로 백엔드와 연결됩니다.

---

## 🛠 기술 스택

- **Backend**: FastAPI, LangChain, Google Gemini API, PostgreSQL (Cloud SQL)
- **Frontend**: Next.js 14, TailwindCSS, Clerk (Auth)
- **Infra**: Google Cloud Platform (Cloud Run, Artifact Registry, Cloud Storage)
