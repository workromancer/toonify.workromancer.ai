#!/bin/bash
# scripts/setup_github_actions_iam.sh
# GitHub Actions를 위한 GCP Workload Identity Federation (WIF) 설정 스크립트

set -e

# 기본 설정
PROJECT_ID=${GOOGLE_CLOUD_PROJECT}
POOL_NAME="github-actions-pool"
PROVIDER_NAME="github-provider"
SA_NAME="github-actions-sa"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
# GitHub 리포지토리 정보 (사용자 입력 필요)
GITHUB_REPO=${GITHUB_REPO_NAME}

echo "==================================================="
echo "   GitHub Actions WIF 설정 (Keyless Auth)"
echo "==================================================="

# 1. GitHub Repo 입력 받기
if [ -z "$1" ]; then
    echo -n "GitHub 리포지토리(Owner/Repo, 예: thedevluffy/toonify): "
    read GITHUB_REPO
else
    GITHUB_REPO=$1
fi

if [ -z "$GITHUB_REPO" ]; then
    echo "오류: 리포지토리 정보가 입력되지 않았습니다."
    exit 1
fi

echo "설정 대상:"
echo "Project: $PROJECT_ID"
echo "Repo: $GITHUB_REPO"
echo "Service Account: $SA_EMAIL"
echo "==================================================="

# 2. 서비스 계정 생성
if ! gcloud iam service-accounts describe $SA_EMAIL --project=$PROJECT_ID &>/dev/null; then
    echo "서비스 계정($SA_NAME) 생성 중..."
    gcloud iam service-accounts create $SA_NAME \
        --display-name="GitHub Actions Service Account" \
        --project=$PROJECT_ID
else
    echo "서비스 계정($SA_NAME)이 이미 존재합니다."
fi

# 3. 권한 부여 (Artifact Registry, Cloud Run, Service Account User)
echo "권한 부여 중..."
ROLES=(
    "roles/artifactregistry.writer"
    "roles/run.developer"
    "roles/iam.serviceAccountUser"
    "roles/storage.objectViewer" # GCS (필요시)
)

for role in "${ROLES[@]}"; do
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SA_EMAIL" \
        --role="$role" \
        --condition=None \
        --quiet &>/dev/null
    echo "- $role 부여 완료"
done

# 4. Workload Identity Pool 생성
if ! gcloud iam workload-identity-pools describe $POOL_NAME --project=$PROJECT_ID --location="global" &>/dev/null; then
    echo "Workload Identity Pool($POOL_NAME) 생성 중..."
    gcloud iam workload-identity-pools create $POOL_NAME \
        --project=$PROJECT_ID \
        --location="global" \
        --display-name="GitHub Actions Pool"
else
    echo "Workload Identity Pool($POOL_NAME)이 이미 존재합니다."
fi

# 5. Workload Identity Provider 생성
if ! gcloud iam workload-identity-pools providers describe $PROVIDER_NAME --project=$PROJECT_ID --location="global" --workload-identity-pool=$POOL_NAME &>/dev/null; then
    echo "Provider($PROVIDER_NAME) 생성 중..."
    gcloud iam workload-identity-pools providers create-oidc $PROVIDER_NAME \
        --project=$PROJECT_ID \
        --location="global" \
        --workload-identity-pool=$POOL_NAME \
        --display-name="GitHub Provider" \
        --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
        --issuer-uri="https://token.actions.githubusercontent.com"
else
    echo "Provider($PROVIDER_NAME)가 이미 존재합니다."
fi

# 6. Repository 바인딩 (Service Account Impersonation 허용)
echo "GitHub Repo($GITHUB_REPO) 바인딩 중..."
# 기존 바인딩이 있으면 중복되므로, member가 없으면 추가하는 식으로 해야하지만, binding 생성은 멱등성이 있어 덮어씌거나 추가됨.
# 여기서는 add-iam-policy-binding-member 로 처리.
WORKLOAD_IDENTITY_POOL_ID=$(gcloud iam workload-identity-pools describe $POOL_NAME --project=$PROJECT_ID --location="global" --format="value(name)")

gcloud iam service-accounts add-iam-policy-binding $SA_EMAIL \
    --project=$PROJECT_ID \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/${WORKLOAD_IDENTITY_POOL_ID}/attribute.repository/${GITHUB_REPO}" \
    --quiet &>/dev/null

echo "==================================================="
echo "   설정 완료!"
echo "==================================================="
echo "GitHub Repository > Settings > Secrets and variables > Actions 에 다음 위변수를 추가하세요:"
echo ""
echo "GCP_PROJECT_ID: $PROJECT_ID"
echo "GCP_WORKLOAD_IDENTITY_PROVIDER: projects/$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")/locations/global/workloadIdentityPools/$POOL_NAME/providers/$PROVIDER_NAME"
echo "GCP_SERVICE_ACCOUNT: $SA_EMAIL"
echo "==================================================="
