#!/bin/bash
set -e

# 파일 경로
ENV_PROD_FILE=".env.prod"
INFRA_OUTPUT_FILE=".infra_output"

echo "==================================================="
echo "   투니파이(Toonify) 프로덕션 환경 파일 생성기"
echo "==================================================="

# 1. 인프라 상세 정보 읽기
DB_IP=""
GCS_BUCKET=""

if [ -f "$INFRA_OUTPUT_FILE" ]; then
    echo "$INFRA_OUTPUT_FILE 에서 인프라 정보를 읽는 중..."
    source "$INFRA_OUTPUT_FILE"
    echo "DB IP 발견: $DB_IP"
    echo "GCS 버킷 발견: $GCS_BUCKET"
    echo "백엔드 SA 발견: $BACKEND_SA"
else
    echo "경고: $INFRA_OUTPUT_FILE 파일을 찾을 수 없습니다."
    read -p "Cloud SQL 사설 IP를 입력하세요: " DB_IP
    read -p "GCS 버킷 이름을 입력하세요: " GCS_BUCKET
fi

# 2. 비밀 키 수집 (입력)
echo "---------------------------------------------------"
echo "프로덕션 환경을 위한 다음 정보를 입력해주세요:"
echo "---------------------------------------------------"

read -p "데이터베이스 비밀번호 ('toonify' 사용자용): " DB_PASS
read -p "Gemini API 키 입력: " GEMINI_API_KEY
read -p "Clerk 공개 키 입력 (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY): " CLERK_PUB_KEY
read -p "Clerk 비밀 키 입력 (CLERK_SECRET_KEY): " CLERK_SECRET_KEY

# 내부 보안용 랜덤 키 생성
SECRET_KEY=$(openssl rand -hex 32)

# 3. .env.prod 내용 생성
echo "$ENV_PROD_FILE 생성 중..."

cat > "$ENV_PROD_FILE" <<EOF
# --- 공통 ---
PROJECT_NAME=Toonify
# 프로덕션에서 백엔드는 특정 내부 포트나 URL에서 실행됩니다.
# Next.js의 서버 사이드 백엔드 호출(필요한 경우)은 내부 URL을 사용하고,
# 클라이언트 사이드 호출은 공개 URL을 사용합니다.
# 하지만 현재 아키텍처는 Client -> Next.js API Route -> Internal Backend 방식이므로,
# 프론트엔드 서버가 접근 가능한 URL은 내부 백엔드 URL입니다.

# --- 백엔드 설정 ---
# Cloud SQL 연결
POSTGRES_SERVER=$DB_IP
POSTGRES_USER=toonify
POSTGRES_PASSWORD=$DB_PASS
POSTGRES_DB=toonify_db
POSTGRES_PORT=5432

# FastAPI 보안
SECRET_KEY=$SECRET_KEY
BACKEND_CORS_ORIGINS=["*"] 
# (엄밀히 말하면 프론트엔드 URL이어야 하지만, 사설 백엔드이거나 Ingress에서 처리한다면 '*'도 허용 가능)

# 스토리지 (GCS)
STORAGE_TYPE=gcs
MINIO_BUCKET=$GCS_BUCKET
# Workload Identity / Service Account를 사용하므로 GCS용 액세스 키는 필요 없습니다.
# 코드가 키를 요구할 경우를 대비해 빈 값이나 더미 값을 설정할 수 있습니다.
# 일반적인 사용 기준:
GOOGLE_CLOUD_PROJECT=${GOOGLE_CLOUD_PROJECT:-"toonify-prod"}

# AI 서비스
GEMINI_API_KEY=$GEMINI_API_KEY
GOOGLE_CLOUD_LOCATION=global

# 앱 설정
DEBUG=False
API_V1_STR=/api/v1


# --- 프론트엔드 설정 ---
# Next.js 공개 변수
NEXT_PUBLIC_API_BASE_URL=/api/v1
# 프로덕션에서 프론트엔드는 /api/v1 리라이트/프록시를 통해 자기 자신 또는 서버 액션을 통해 통신합니다.
# 전략에 따르면: Client -> Next.js API Route -> Backend
# 따라서 NEXT_PUBLIC_API_BASE_URL은 브라우저 기준 상대 경로인 /api/v1으로 충분합니다.

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$CLERK_PUB_KEY

# Next.js 서버 사이드 변수
CLERK_SECRET_KEY=$CLERK_SECRET_KEY

# 사설 Cloud Run 백엔드 인스턴스를 가리키는 URL
# 백엔드 배포가 완료된 후에 이 값을 업데이트해야 합니다.
# 또는 Cloud Run Service Directory / Private DNS를 사용하는 경우 내부 DNS 이름을 사용할 수 있습니다.
# 지금은 플레이스홀더로 두고 나중에 업데이트하거나, VPC 기능을 활용하면 직접 URL을 쓸 수 있습니다.
# 일반적 패턴: https://backend-service-hash-region.run.app
INTERNAL_BACKEND_URL=PLACEHOLDER_UPDATE_AFTER_DEPLOY

# 기타/레거시
MINIO_ENDPOINT=storage.googleapis.com
MINIO_SECURE=True

EOF

echo "==================================================="
echo "   $ENV_PROD_FILE 생성 완료!"
echo "==================================================="
echo "참고: INTERNAL_BACKEND_URL 은 현재 'PLACEHOLDER'로 설정되어 있습니다."
echo "백엔드 서비스를 배포한 후에 반드시 이 값을 실제 URL로 업데이트해주어야 합니다."
