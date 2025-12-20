# 툰이파이(Toonify) 프로덕션 배포 가이드

이 문서는 GCP(Google Cloud Platform) 환경에 Toonify 서비스를 배포하기 위한 단계별 가이드입니다.

## 📋 개요

배포 프로세스는 총 3단계의 스크립트로 자동화되어 있습니다.

| 단계 | 스크립트 | 설명 |
| :--- | :--- | :--- |
| **1단계** | `scripts/setup_prod_env.sh` | GCP 인프라(VPC, DB, Storage 등)를 자동으로 생성하고 설정합니다. |
| **2단계** | `scripts/generate_prod_env_file.sh` | 구축된 인프라 정보를 바탕으로 배포용 환경설정 파일(`.env.prod`)을 생성합니다. |
| **3단계** | `scripts/deploy_prod.sh` | Docker 이미지를 빌드하고 Cloud Run에 서비스를 배포합니다. |

---

## ✅ 사전 준비 사항

스크립트를 실행하기 전에 다음 사항들이 준비되어 있어야 합니다.

1.  **Google Cloud CLI (gcloud) 설치 및 인증**
    ```bash
    gcloud auth login
    gcloud config set project [YOUR_PROJECT_ID]
    ```
2.  **권한 확인**
    *   실행 계정은 프로젝트에 대해 `Editor` 또는 그에 준하는 인프라 생성 권한(VPC, Cloud SQL, IAM 등)을 가지고 있어야 합니다.

---

## 🚀 배포 진행 (Step-by-Step)

### 1단계: 인프라 구축 (Infrastructure Setup)

GCP 리소스를 프로비저닝하는 단계입니다. 이 스크립트는 멱등성(Idempotent)을 가지므로 여러 번 실행해도 안전합니다(이미 존재하는 리소스는 건너뜀).

```bash
./scripts/setup_prod_env.sh
```

**주요 작업:**
*   필수 API 활성화 (Cloud Run, SQL Admin, Vertex AI 등)
*   **VPC 네트워크** 및 **Serverless VPC Connector** 생성
*   **Cloud SQL (PostgreSQL)** 인스턴스 및 데이터베이스 생성 (Private IP)
*   **Google Cloud Storage (GCS)** 버킷 생성
*   **Artifact Registry** Docker 저장소 생성
*   **Service Account** 생성 및 권한 부여

**결과물:**
*   `.infra_output` 파일 생성 (주요 리소스 정보가 저장됨)

### 2단계: 환경 변수 생성 (Environment Configuration)

1단계에서 생성된 리소스 정보와 사용자가 입력하는 보안 키를 조합하여 `.env.prod` 파일을 생성합니다.

```bash
./scripts/generate_prod_env_file.sh
```

**입력항목:**
스크립트 실행 시 다음 정보를 입력해야 합니다:
1.  **Database Password**: `setup_prod_env.sh` 실행 시 설정한 비밀번호 (또는 스크립트 내 기본값)
2.  **Gemini API Key**: AI 기능을 위한 키
3.  **Clerk Publishable Key**: 운영 환경용 Clerk 공개 키
4.  **Clerk Secret Key**: 운영 환경용 Clerk 비밀 키

**결과물:**
*   `.env.prod` 파일 생성 (이 파일은 **절대로** Git에 커밋하지 마세요)

### 3단계: 서비스 배포 (Deployment)

Backend와 Frontend를 빌드하여 Cloud Run에 배포합니다.

```bash
./scripts/deploy_prod.sh
```

**주요 작업:**
*   **Backend**: `ingress=internal`로 배포되어 외부 인터넷 직접 접근이 차단됩니다. VPC 내부에서만 접근 가능합니다.
*   **Frontend**: `ingress=all`로 배포되어 사용자가 접근 가능합니다. Backend와 통신 시 VPC Connector를 사용합니다.

---

## ⚠️ 배포 후 확인 및 추가 설정

### 1. Internal Backend URL 업데이트 (최초 1회)
배포 스크립트가 완료되면 화면에 **Backend URL (Internal)**이 출력됩니다.
하지만 `.env.prod` 파일이 생성되는 시점에는 이 URL을 알 수 없어 **PLACEHOLDER**로 설정되어 있습니다.

1.  배포 완료 후 출력된 `Backend URL`을 복사합니다.
2.  `.env.prod` 파일을 열어 `INTERNAL_BACKEND_URL` 값을 수정합니다.
    ```bash
    # .env.prod
    INTERNAL_BACKEND_URL=https://toonify-backend-xyz-an.a.run.app
    ```
3.  **Frontend만 다시 배포**하여 변경 사항을 적용합니다.
    ```bash
    # deploy_prod.sh를 다시 실행하면 됨 (Backend는 변경 없으면 캐시 사용됨)
    ./scripts/deploy_prod.sh
    ```

### 2. Clerk 설정 (Production)
`docs/prod/prod_clerk.md` 정책에 따라 프로덕션 환경에서는 Clerk만 사용하도록 설정되어 있습니다.
Clerk Dashboard에서 운영(Production) 인스턴스의 API Key가 올바르게 `.env.prod`에 입력되었는지 확인하세요.

### 3. 마이그레이션 (DB Schema)
Cloud SQL에 테이블이 생성되었는지 확인해야 합니다. 필요한 경우 별도의 마이그레이션 파드나 로컬에서 Cloud SQL Proxy를 통해 마이그레이션을 수행해야 할 수 있습니다. (현재 배포 스크립트에는 자동 마이그레이션 명령이 포함되어 있지 않습니다.)
