# Toonify 프로덕션 배포 가이드

이 문서는 Toonify 애플리케이션을 Google Cloud Platform(GCP) 프로덕션 환경에 배포하는 방법을 설명합니다.

## 사전 준비 (Setup)

배포 전에 인프라(Cloud SQL, GCS, VPC 등)가 생성되어 있어야 합니다.

1.  **인프라 설정**:
    ```bash
    ./scripts/setup_prod_env.sh
    ```
    *   Cloud SQL, Cloud Storage, Artifact Registry 등을 생성합니다.

2.  **환경 변수 생성**:
    ```bash
    ./scripts/generate_prod_env_file.sh
    ```
    *   `.env.prod` 파일을 생성합니다. (비밀번호 및 API 키 입력 필요)

---

## 🚀 배포 (Deployment)

백엔드와 프론트엔드를 독립적으로 배포할 수 있습니다.

### 1. 백엔드 배포 (Backend)

데이터베이스 스키마 변경이나 API 로직 수정 시 배포합니다.

```bash
./scripts/deploy_backend.sh
```

*   **동작**:
    *   Docker 이미지를 빌드하고 Artifact Registry에 푸시합니다.
    *   Cloud Run에 `toonify-backend` 서비스를 배포합니다.
    *   `ingress=internal`로 설정되어 외부(Public Internet)에서는 직접 접근할 수 없습니다.

### 2. 프론트엔드 배포 (Frontend)

UI 변경이나 Next.js 로직 수정 시 배포합니다.

```bash
./scripts/deploy_frontend.sh
```

*   **동작**:
    *   **자동 연결**: 이미 배포된 백엔드의 URL을 자동으로 찾아 연결합니다.
    *   Docker 이미지를 빌드하고 Artifact Registry에 푸시합니다.
    *   Cloud Run에 `toonify-frontend` 서비스를 배포합니다.
    *   `ingress=all`로 설정되어 외부에서 접속 가능합니다.

---

## ⚠️ 문제 해결 (Troubleshooting)

### Q. 백엔드를 먼저 배포해야 하나요?
**Yes.** 프론트엔드는 백엔드 URL을 알아야 통신할 수 있습니다. 처음 배포할 때는 반드시 **백엔드 배포 후 프론트엔드 배포** 순서를 지켜주세요.

### Q. "백엔드 서비스를 찾을 수 없습니다" 오류가 나요.
프론트엔드 배포 시 백엔드가 Cloud Run에 없으면 발생합니다. `./scripts/deploy_backend.sh`를 먼저 성공적으로 실행했는지 확인하세요.

### Q. 배포 후 500 에러가 나요.
Cloud Run 콘솔의 '로그(Logs)' 탭을 확인하세요. 보통 DB 연결 실패나 환경 변수 누락이 원인입니다.

### Q. 로컬에서 DB에 접속하고 싶어요.
`setup_prod_env.sh`를 다시 실행하면 현재 IP를 화이트리스트에 추가해줍니다.
```bash
./scripts/setup_prod_env.sh
```
