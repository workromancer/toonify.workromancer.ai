#!/bin/bash
set -e

# 설정
PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-"toonify-prod"}
REGION=${GOOGLE_CLOUD_REGION:-"asia-northeast3"}
REPO_NAME="toonify-repo"
BACKEND_SERVICE="toonify-backend"
FRONTEND_SERVICE="toonify-frontend"
ENV_FILE=".env.prod"

echo "==================================================="
echo "   투니파이(Toonify) 프로덕션 배포 스크립트"
echo "==================================================="
echo "프로젝트 ID: $PROJECT_ID"
echo "리전: $REGION"
echo "==================================================="

# .env.prod 확인
if [ ! -f "$ENV_FILE" ]; then
    echo "오류: $ENV_FILE 파일을 찾을 수 없습니다. scripts/generate_prod_env_file.sh 를 먼저 실행해주세요."
    exit 1
fi

# 쉘에서 사용할 수 있도록 환경 변수 로드 (주석 무시)
set -a
source <(grep -v '^#' $ENV_FILE | grep -v '^$')
set +a

# gcloud용 환경 변수 포맷팅 헬퍼 (빈 값 무시)
# 백엔드 비밀이 프론트엔드 환경으로 유출되지 않도록 각 서비스에 필요한 변수만 엄격하게 선별합니다.
get_backend_env_vars() {
    local vars=(
        "POSTGRES_SERVER=$POSTGRES_SERVER"
        "POSTGRES_USER=$POSTGRES_USER"
        "POSTGRES_PASSWORD=$POSTGRES_PASSWORD"
        "POSTGRES_DB=$POSTGRES_DB"
        "POSTGRES_PORT=${POSTGRES_PORT:-5432}"
        "SECRET_KEY=$SECRET_KEY"
        "BACKEND_CORS_ORIGINS=$BACKEND_CORS_ORIGINS"
        "STORAGE_TYPE=$STORAGE_TYPE"
        "MINIO_BUCKET=$MINIO_BUCKET"
        "GOOGLE_CLOUD_PROJECT=$PROJECT_ID"
        "GEMINI_API_KEY=$GEMINI_API_KEY"
        "GOOGLE_CLOUD_LOCATION=$GOOGLE_CLOUD_LOCATION"
        "DEBUG=$DEBUG"
        "API_V1_STR=$API_V1_STR"
    )
    echo "$(IFS=,; echo "${vars[*]}")"
}

get_frontend_env_vars() {
    local backend_url=$1
    local vars=(
        "NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL"
        "INTERNAL_BACKEND_URL=$backend_url"
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
        "CLERK_SECRET_KEY=$CLERK_SECRET_KEY"
        "MINIO_ENDPOINT=$MINIO_ENDPOINT"
        "MINIO_SECURE=$MINIO_SECURE"
    )
    echo "$(IFS=,; echo "${vars[*]}")"
}

# 1. Docker 인증 (Artifact Registry)
echo "[1/4] Docker 인증 중..."
gcloud auth configure-docker $REGION-docker.pkg.dev --quiet

# 2. 백엔드 배포
echo "[2/4] 백엔드 배포 중..."
BACKEND_IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/backend:latest"

echo "백엔드 이미지 빌드 중..."
# Cloud Run 호환성을 위해 --platform linux/amd64 사용
docker build --platform linux/amd64 -t $BACKEND_IMAGE ./backend

echo "백엔드 이미지 푸시 중..."
docker push $BACKEND_IMAGE

echo "Cloud Run에 백엔드 서비스 배포 중..."
# 참고: 'internal' ingress(내부 유입)는 외부 접근을 차단하므로 --allow-unauthenticated를 사용해도 안전합니다.
# 이는 VPC 내부에서의 접근을 허용한다는 의미로 간주됩니다.
# 전략에 따르면: "Frontend(Next.js) ... 내부 DNS ... 알더라도 접근 불가 (403 Forbidden)." -> ingress=internal 과 일치.
# IAM 토큰 없이 네트워크 도달 가능성(VPC)만으로 통신하기 위해 --allow-unauthenticated 사용.
gcloud run deploy $BACKEND_SERVICE \
    --image $BACKEND_IMAGE \
    --region $REGION \
    --platform managed \
    --ingress internal \
    --vpc-connector vpc-connector \
    --set-env-vars "$(get_backend_env_vars)" \
    --allow-unauthenticated \
    --service-account "toonify-backend-sa@$PROJECT_ID.iam.gserviceaccount.com"

# 백엔드 URL 캡처
BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE --region $REGION --format 'value(status.url)')
echo "백엔드 배포 완료: $BACKEND_URL"


# 3. 프론트엔드 배포
echo "[3/4] 프론트엔드 배포 중..."
FRONTEND_IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/frontend:latest"

echo "프론트엔드 이미지 빌드 중..."
# Next.js 빌드 시점에 일부 public 변수가 필요할 수 있습니다.
# Standalone 빌드는 보통 PUBLIC 변수를 구워서 나옵니다.
docker build --platform linux/amd64 \
    --build-arg NEXT_PUBLIC_API_BASE_URL="$NEXT_PUBLIC_API_BASE_URL" \
    --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" \
    -t $FRONTEND_IMAGE ./frontend

echo "프론트엔드 이미지 푸시 중..."
docker push $FRONTEND_IMAGE

echo "Cloud Run에 프론트엔드 서비스 배포 중..."
# 프론트엔드는 백엔드와 통신하기 위해 Direct VPC egress가 필요합니다.
# 전략에 따르면: "Direct VPC Egress를 설정하여 VPC 내부의 Backend 서비스를 호출"
gcloud run deploy $FRONTEND_SERVICE \
    --image $FRONTEND_IMAGE \
    --region $REGION \
    --platform managed \
    --ingress all \
    --vpc-connector vpc-connector \
    --set-env-vars "$(get_frontend_env_vars $BACKEND_URL)" \
    --allow-unauthenticated \
    --service-account "toonify-frontend-sa@$PROJECT_ID.iam.gserviceaccount.com"

# 4. 요약
FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE --region $REGION --format 'value(status.url)')
echo "==================================================="
echo "   배포 완료!"
echo "==================================================="
echo "Frontend URL: $FRONTEND_URL"
echo "Backend URL (Internal): $BACKEND_URL"
echo "==================================================="
