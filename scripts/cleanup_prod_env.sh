#!/bin/bash
# scripts/cleanup_prod_env.sh
# 툰이파이(Toonify) 프로덕션 환경 리소스 정리(삭제) 스크립트

set -e

# 설정 정의 (setup_prod_env.sh와 동일하게)
PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-"toonify-prod"}
REGION=${GOOGLE_CLOUD_REGION:-"asia-northeast3"}
REPO_NAME="toonify-repo"
SQL_INSTANCE_NAME="toonify-postgres"
GCS_BUCKET_NAME="${PROJECT_ID}-assets"
VPC_NAME="main-vpc"
SUBNET_NAME="backend-subnet"
CONNECTOR_NAME="vpc-connector"
BACKEND_SA="toonify-backend-sa"
FRONTEND_SA="toonify-frontend-sa"

echo "==================================================="
echo "   ⚠️  툰이파이(Toonify) 리소스 정리/초기화 경고  ⚠️"
echo "==================================================="
echo "프로젝트 ID: $PROJECT_ID"
echo "리전: $REGION"
echo ""
echo "이 스크립트는 setup_prod_env.sh 로 생성된 다음 리소스를 영구적으로 삭제합니다:"
echo " 1. Service Accounts ($BACKEND_SA, $FRONTEND_SA)"
echo " 2. Cloud SQL Instance ($SQL_INSTANCE_NAME) 및 모든 데이터"
echo " 3. GCS Bucket ($GCS_BUCKET_NAME) 및 모든 파일"
echo " 4. Artifact Registry ($REPO_NAME) 및 모든 이미지"
echo " 5. VPC Connector ($CONNECTOR_NAME)"
echo " 6. VPC Network & Subnets ($VPC_NAME)"
echo "==================================================="
echo "정말로 진행하시겠습니까? (삭제된 데이터는 복구할 수 없습니다)"
read -p "진행하려면 'DELETE' 를 대문자로 입력하세요: " CONFIRM

if [ "$CONFIRM" != "DELETE" ]; then
    echo "입력값이 일치하지 않아 작업을 취소합니다."
    exit 1
fi

echo ""
echo "리소스 삭제를 시작합니다..."

# 1. Service Accounts 삭제
echo "[1/6] Service Accounts 삭제 중..."
BACKEND_SA_EMAIL="$BACKEND_SA@$PROJECT_ID.iam.gserviceaccount.com"
FRONTEND_SA_EMAIL="$FRONTEND_SA@$PROJECT_ID.iam.gserviceaccount.com"

if gcloud iam service-accounts describe $BACKEND_SA_EMAIL &>/dev/null; then
    gcloud iam service-accounts delete $BACKEND_SA_EMAIL --quiet
    echo "Service Account 삭제됨: $BACKEND_SA_EMAIL"
else
    echo "Service Account 없음: $BACKEND_SA_EMAIL"
fi

if gcloud iam service-accounts describe $FRONTEND_SA_EMAIL &>/dev/null; then
    gcloud iam service-accounts delete $FRONTEND_SA_EMAIL --quiet
    echo "Service Account 삭제됨: $FRONTEND_SA_EMAIL"
else
    echo "Service Account 없음: $FRONTEND_SA_EMAIL"
fi

# 2. Cloud SQL 삭제
echo "[2/6] Cloud SQL 인스턴스 삭제 중..."
if gcloud sql instances describe $SQL_INSTANCE_NAME &>/dev/null; then
    gcloud sql instances delete $SQL_INSTANCE_NAME --quiet
    echo "Cloud SQL 인스턴스 삭제됨: $SQL_INSTANCE_NAME"
else
    echo "Cloud SQL 인스턴스 없음: $SQL_INSTANCE_NAME"
fi

# 3. GCS Bucket 삭제
echo "[3/6] Cloud Storage 버킷 삭제 중..."
if gsutil ls -b gs://$GCS_BUCKET_NAME &>/dev/null; then
    gsutil rm -r gs://$GCS_BUCKET_NAME
    echo "GCS 버킷 삭제됨: gs://$GCS_BUCKET_NAME"
else
    echo "GCS 버킷 없음: gs://$GCS_BUCKET_NAME"
fi

# 4. Artifact Registry 삭제
echo "[4/6] Artifact Registry 삭제 중..."
if gcloud artifacts repositories describe $REPO_NAME --location=$REGION &>/dev/null; then
    gcloud artifacts repositories delete $REPO_NAME --location=$REGION --quiet
    echo "Artifact Registry 삭제됨: $REPO_NAME"
else
    echo "Artifact Registry 없음: $REPO_NAME"
fi

# 5. VPC Connector 삭제
echo "[5/6] VPC Connector 삭제 중..."
if gcloud compute networks vpc-access connectors describe $CONNECTOR_NAME --region=$REGION &>/dev/null; then
    gcloud compute networks vpc-access connectors delete $CONNECTOR_NAME --region=$REGION --quiet
    echo "VPC Connector 삭제됨: $CONNECTOR_NAME"
else
    echo "VPC Connector 없음: $CONNECTOR_NAME"
fi

# 6. VPC & Network 삭제
echo "[6/6] VPC 및 네트워크 리소스 삭제 중..."

# 6-1. Private Service Access (Reserved IP Range) 삭제
PEERING_RANGE_NAME="google-managed-services-$VPC_NAME"
if gcloud compute addresses describe $PEERING_RANGE_NAME --global &>/dev/null; then
    # 피어링 연결을 먼저 해제해야 할 수도 있음 (보통 IP 삭제 시 자동 처리되거나 경고)
    # 안전하게 VPC Peering 업데이트로 범위 제거 시도 (선택적)
    echo "Private Service Access IP 범위 해제 중..."
    gcloud compute addresses delete $PEERING_RANGE_NAME --global --quiet || echo "IP 범위 삭제 실패 (이미 사용 중이거나 의존성 있음, 무시하고 진행)"
else
    echo "Reserved IP Range 없음: $PEERING_RANGE_NAME"
fi

# 6-2. Subnet 삭제
if gcloud compute networks subnets describe $SUBNET_NAME --region=$REGION &>/dev/null; then
    gcloud compute networks subnets delete $SUBNET_NAME --region=$REGION --quiet
    echo "Subnet 삭제됨: $SUBNET_NAME"
else
    echo "Subnet 없음: $SUBNET_NAME"
fi

# 6-3. VPC 삭제
if gcloud compute networks describe $VPC_NAME &>/dev/null; then
    # 의존성(방화벽 규칙 등)은 VPC 삭제 시 --quiet로 자동 삭제될 수 있으나, 
    # 명시적으로 방화벽 규칙을 지워야 할 수도 있음. 기본 자동 생성 규칙 외 사용자 규칙이 있다면.
    # setup_prod_env.sh 에서는 별도 방화벽 규칙을 생성하지 않았음.
    gcloud compute networks delete $VPC_NAME --quiet
    echo "VPC 삭제됨: $VPC_NAME"
else
    echo "VPC 없음: $VPC_NAME"
fi

# 관련 파일 정리
rm -f .infra_output
rm -f .env.prod

echo ""
echo "==================================================="
echo "   초기화 완료"
echo "==================================================="
