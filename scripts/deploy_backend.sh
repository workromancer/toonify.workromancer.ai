#!/bin/bash
# scripts/deploy_backend.sh
# 툰이파이(Toonify) 백엔드 전용 배포 스크립트

set -e

# 설정
PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-"toonify-prod"}
REGION=${GOOGLE_CLOUD_REGION:-"asia-northeast3"}
REPO_NAME="toonify-repo"
BACKEND_SERVICE="toonify-backend"
ENV_FILE=".env.prod"

echo "==================================================="
echo "   툰이파이(Toonify) 백엔드 배포"
echo "==================================================="
echo "프로젝트 ID: $PROJECT_ID"
echo "리전: $REGION"
echo "서비스명: $BACKEND_SERVICE"
echo "==================================================="

# .env.prod 확인
if [ ! -f "$ENV_FILE" ]; then
    echo "오류: $ENV_FILE 파일을 찾을 수 없습니다. scripts/generate_prod_env_file.sh 를 먼저 실행해주세요."
    exit 1
fi

# 환경 변수 로드
set -a
source <(grep -v '^#' $ENV_FILE | grep -v '^$')
set +a

# 백엔드 환경변수 추출 함수
get_backend_env_vars() {
    local vars=(
        "PROJECT_NAME=${PROJECT_NAME:-Toonify}"
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
        "DEBUG=${DEBUG:-False}"
        "API_V1_STR=${API_V1_STR:-/api/v1}"
    )
    echo "$(IFS=,; echo "${vars[*]}")"
}

# 1. Docker 인증
echo "[1/3] Docker 인증 중..."
gcloud auth configure-docker $REGION-docker.pkg.dev --quiet

# 2. 이미지 빌드 및 푸시
echo "[2/3] 백엔드 이미지 빌드 중..."
BACKEND_IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/backend:latest"

# Cloud Run 호환성을 위해 --platform linux/amd64 사용
docker build --platform linux/amd64 -t $BACKEND_IMAGE ./backend

echo "백엔드 이미지 푸시 중..."
docker push $BACKEND_IMAGE

# 3. Cloud Run 배포
echo "[3/3] Cloud Run 서비스 배포 중..."
gcloud run deploy $BACKEND_SERVICE \
    --image $BACKEND_IMAGE \
    --region $REGION \
    --platform managed \
    --ingress internal \
    --vpc-connector vpc-connector \
    --set-env-vars "$(get_backend_env_vars)" \
    --allow-unauthenticated \
    --service-account "toonify-backend-sa@$PROJECT_ID.iam.gserviceaccount.com"

# 배포 확인
BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE --region $REGION --format 'value(status.url)')
echo "==================================================="
echo "   백엔드 배포 완료!"
echo "==================================================="
echo "Internal URL: $BACKEND_URL"
echo "==================================================="
