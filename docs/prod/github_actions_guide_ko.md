# GitHub Actions 배포 설정 가이드

GitHub Actions를 통해 `main` 브랜치에 코드가 푸시될 때마다 자동으로 프로덕션(GCP Cloud Run)에 배포하도록 설정합니다.

## 1. GCP 권한 설정 (최초 1회)

Workload Identity Federation(WIF)을 설정하여 GitHub이 GCP에 키 없이 안전하게 접근하게 합니다.

```bash
# 실행 시 GitHub 레포지토리 주소(Owner/Repo)를 물어봅니다.
./scripts/setup_github_actions_iam.sh
```

스크립트가 완료되면 **출력되는 `GCP_WORKLOAD_IDENTITY_PROVIDER`와 `GCP_SERVICE_ACCOUNT` 값을 복사**해두세요.

## 2. GitHub Secrets 등록

GitHub 레포지토리의 `Settings` > `Secrets and variables` > `Actions` > `New repository secret` 에 다음 환경변수와 비밀값들을 등록해야 합니다.

### 인증 관련 (스크립트 출력값)
| Secret 이름 | 값 설명 |
|---|---|
| `GCP_PROJECT_ID` | GCP 프로젝트 ID (예: `toonify-prod`) |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `setup_github_actions_iam.sh` 실행 결과 값 |
| `GCP_SERVICE_ACCOUNT` | `setup_github_actions_iam.sh` 실행 결과 값 (이메일) |

### 백엔드 설정 (`.env.prod` 참고)
| Secret 이름 | 값 설명 |
|---|---|
| `POSTGRES_SERVER` | Cloud SQL IP (Private IP 권장) |
| `POSTGRES_USER` | `toonify` |
| `POSTGRES_PASSWORD` | DB 비밀번호 |
| `POSTGRES_DB` | `toonify` |
| `SECRET_KEY` | 백엔드 시크릿 키 |
| `BACKEND_CORS_ORIGINS` | CORS 허용 도메인 (프론트엔드 URL 등) |
| `STORAGE_TYPE` | `gcs` |
| `MINIO_BUCKET` | GCS 버킷 이름 |
| `GEMINI_API_KEY` | Google Gemini API Key |

### 프론트엔드 설정 (`.env.prod` 참고)
| Secret 이름 | 값 설명 |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | 클라이언트에서 호출할 백엔드 주소 (현재는 placeholder로 두고 나중에 수정 가능, 또는 도메인 연결 후 설정) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Public Key |
| `CLERK_SECRET_KEY` | Clerk Secret Key |
| `MINIO_ENDPOINT` | `storage.googleapis.com` |

## 3. 배포 확인

`main` 브랜치에 커밋을 푸시하면 Actions 탭에서 배포 진행 상황을 확인할 수 있습니다.
- `deploy-backend`: 백엔드 빌드 및 배포
- `deploy-frontend`: 백엔드 완료 후 프론트엔드 빌드 및 배포 (백엔드 URL 자동 연결)
