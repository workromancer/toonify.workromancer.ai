#!/bin/bash
# scripts/deploy_frontend.sh
# 툰이파이(Toonify) 프론트엔드 전용 배포 스크립트

set -e

# 설정
PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-"toonify-prod"}
REGION=${GOOGLE_CLOUD_REGION:-"asia-northeast3"}
REPO_NAME="toonify-repo"
FRONTEND_SERVICE="toonify-frontend"
BACKEND_SERVICE="toonify-backend"
ENV_FILE=".env.prod"

echo "==================================================="
echo "   툰이파이(Toonify) 프론트엔드 배포"
echo "==================================================="
echo "프로젝트 ID: $PROJECT_ID"
echo "리전: $REGION"
echo "서비스명: $FRONTEND_SERVICE"
echo "==================================================="

# .env.prod 확인
if [ ! -f "$ENV_FILE" ]; then
    echo "오류: $ENV_FILE 파일을 찾을 수 없습니다. scripts/generate_prod_env_file.sh 를 먼저 실행해주세요."
    exit 1
fi

# 환경 변수 로드 (eval을 사용하여 특수문자 처리)
while IFS='=' read -r key value; do
    # 빈 줄이나 주석 스킵
    [[ -z "$key" || "$key" =~ ^# ]] && continue
    # 값에서 따옴표 제거하지 않고 export
    export "$key=$value"
done < <(grep -v '^#' "$ENV_FILE" | grep -v '^$')

# 백엔드 URL 가져오기
echo "백엔드 서비스 URL 조회 중..."
if ! gcloud run services describe $BACKEND_SERVICE --region $REGION &>/dev/null; then
    echo "오류: 백엔드 서비스($BACKEND_SERVICE)를 찾을 수 없습니다."
    echo "먼저 './scripts/deploy_backend.sh'를 실행하여 백엔드를 배포해주세요."
    exit 1
fi
BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE --region $REGION --format 'value(status.url)')
echo "백엔드 URL 확인됨: $BACKEND_URL"

# 프론트엔드 환경변수 추출 함수
get_frontend_env_vars() {
    local backend_url=$1
    local vars=(
        "NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL"
        "INTERNAL_BACKEND_URL=$backend_url"
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
        "CLERK_SECRET_KEY=$CLERK_SECRET_KEY"
        "MINIO_ENDPOINT=$MINIO_ENDPOINT"
        "MINIO_SECURE=$MINIO_SECURE"
        "MINIO_BUCKET=$MINIO_BUCKET"
        "STORAGE_TYPE=$STORAGE_TYPE"
        "NEXT_PUBLIC_AUTH_MODE=$NEXT_PUBLIC_AUTH_MODE"
        "NEXT_PUBLIC_PAYMENTS_ENABLED=$NEXT_PUBLIC_PAYMENTS_ENABLED"
    )
    echo "$(IFS=,; echo "${vars[*]}")"
}

# 1. Docker 인증
echo "[1/3] Docker 인증 중..."
gcloud auth configure-docker $REGION-docker.pkg.dev --quiet

# 2. 이미지 빌드 및 푸시
echo "[2/3] 프론트엔드 이미지 빌드 중..."
FRONTEND_IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/frontend:latest"

docker build --platform linux/amd64 \
    --build-arg NEXT_PUBLIC_APP_URL="$NEXT_PUBLIC_APP_URL" \
    --build-arg NEXT_PUBLIC_API_BASE_URL="$NEXT_PUBLIC_API_BASE_URL" \
    --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" \
    --build-arg NEXT_PUBLIC_AUTH_MODE="$NEXT_PUBLIC_AUTH_MODE" \
    --build-arg NEXT_PUBLIC_PAYMENTS_ENABLED="$NEXT_PUBLIC_PAYMENTS_ENABLED" \
    -t $FRONTEND_IMAGE ./frontend

echo "프론트엔드 이미지 푸시 중..."
docker push $FRONTEND_IMAGE

# 3. Cloud Run 배포
echo "[3/3] Cloud Run 서비스 배포 중..."
gcloud run deploy $FRONTEND_SERVICE \
    --image $FRONTEND_IMAGE \
    --region $REGION \
    --platform managed \
    --ingress all \
    --vpc-connector vpc-connector \
    --vpc-egress all-traffic \
    --set-env-vars "$(get_frontend_env_vars $BACKEND_URL)" \
    --allow-unauthenticated \
    --service-account "toonify-frontend-sa@$PROJECT_ID.iam.gserviceaccount.com"

# 배포 확인
FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE --region $REGION --format 'value(status.url)')
echo "==================================================="
echo "   프론트엔드 배포 완료!"
echo "==================================================="
echo "Public URL: $FRONTEND_URL"
echo "==================================================="
