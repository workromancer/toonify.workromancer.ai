#!/bin/bash
set -e

# 설정 정의 - 환경 변수로 덮어쓸 수 있음
PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-"toonify-develop"} # 설정되지 않은 경우 기본값: toonify-develop
REGION=${GOOGLE_CLOUD_REGION:-"asia-northeast3"}
REPO_NAME="toonify-repo"
SQL_INSTANCE_NAME="toonify-postgres"
DB_NAME="toonify_db"
DB_USER="toonify"
GCS_BUCKET_NAME="${PROJECT_ID}-assets"
VPC_NAME="main-vpc"
SUBNET_NAME="backend-subnet"
CONNECTOR_NAME="vpc-connector"

echo "==================================================="
echo "   툰이파이(Toonify) 프로덕션 환경 설정 스크립트"
echo "==================================================="
echo "프로젝트 ID: $PROJECT_ID"
echo "리전: $REGION"
echo "==================================================="

# 0. gcloud 인증 확인
echo "[0/7] gcloud 인증 상태 확인 중..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
  echo "오류: gcloud에 로그인되어 있지 않습니다. 'gcloud auth login'을 먼저 실행해주세요."
  exit 1
fi
gcloud config set project $PROJECT_ID

# 1. API 활성화
echo "[1/7] 필요한 Google Cloud API 활성화 중..."
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  compute.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  aiplatform.googleapis.com \
  vpcaccess.googleapis.com \
  servicenetworking.googleapis.com \
  storage.googleapis.com

# 2. 네트워크 설정 (VPC)
echo "[2/7] VPC 및 네트워크 설정 중..."
if ! gcloud compute networks describe $VPC_NAME --format="value(name)" &>/dev/null; then
    echo "VPC $VPC_NAME 생성 중..."
    gcloud compute networks create $VPC_NAME --subnet-mode=custom
else
    echo "VPC $VPC_NAME 가 이미 존재합니다."
fi

if ! gcloud compute networks subnets describe $SUBNET_NAME --region=$REGION --format="value(name)" &>/dev/null; then
    echo "서브넷 $SUBNET_NAME 생성 중..."
    gcloud compute networks subnets create $SUBNET_NAME \
        --network=$VPC_NAME \
        --region=$REGION \
        --range=10.0.0.0/24 
else
    echo "서브넷 $SUBNET_NAME 이 이미 존재합니다."
fi

# Cloud Run용 VPC 커넥터 (Serverless VPC Access)
if ! gcloud compute networks vpc-access connectors describe $CONNECTOR_NAME --region=$REGION --format="value(name)" &>/dev/null; then
    echo "VPC 커넥터 $CONNECTOR_NAME 생성 중..."
    gcloud compute networks vpc-access connectors create $CONNECTOR_NAME \
        --network=$VPC_NAME \
        --region=$REGION \
        --range=10.8.0.0/28
else
    echo "VPC 커넥터 $CONNECTOR_NAME 가 이미 존재합니다."
fi

# Cloud SQL용 Private Service Access 설정
echo "Private Service Access 구성 중..."
if ! gcloud compute addresses describe google-managed-services-$VPC_NAME --global --format="value(name)" &>/dev/null; then
    gcloud compute addresses create google-managed-services-$VPC_NAME \
        --global \
        --purpose=VPC_PEERING \
        --prefix-length=16 \
        --description="Peering for Google Managed Services" \
        --network=$VPC_NAME
    
    gcloud services vpc-peerings connect \
        --service=servicenetworking.googleapis.com \
        --ranges=google-managed-services-$VPC_NAME \
        --network=$VPC_NAME
else
    echo "Private Service Access 구성이 이미 존재합니다."
fi


# 3. Artifact Registry
echo "[3/7] Artifact Registry 설정 중..."
if ! gcloud artifacts repositories describe $REPO_NAME --location=$REGION --format="value(name)" &>/dev/null; then
    gcloud artifacts repositories create $REPO_NAME \
        --repository-format=docker \
        --location=$REGION \
        --description="Docker repository for Toonify"
else
    echo "Artifact Registry $REPO_NAME 가 이미 존재합니다."
fi

# 4. Cloud Storage
echo "[4/7] Cloud Storage 설정 중..."
if ! gsutil ls -b gs://$GCS_BUCKET_NAME &>/dev/null; then
    gsutil mb -l $REGION gs://$GCS_BUCKET_NAME
    # 기본적으로 비공개지만, 앱 로직에 따라 공개 읽기가 필요할 수 있음
    # 프론트엔드 접근을 위한 CORS 설정
    cat > gcs-cors.json <<EOF
[
    {
      "origin": ["*"],
      "method": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "responseHeader": ["*"],
      "maxAgeSeconds": 3600
    }
]
EOF
    gsutil cors set gcs-cors.json gs://$GCS_BUCKET_NAME
    rm gcs-cors.json
else
    echo "버킷 gs://$GCS_BUCKET_NAME 이 이미 존재합니다."
fi

# 5. Cloud SQL (PostgreSQL)
echo "[5/7] Cloud SQL 설정 중..."
if ! gcloud sql instances describe $SQL_INSTANCE_NAME --format="value(name)" &>/dev/null; then
    echo "Cloud SQL 인스턴스 $SQL_INSTANCE_NAME 생성 중 (몇 분 정도 소요됩니다)..."
    # 참고: --no-assign-ip는 공인 IP를 막고, --network는 사설 VPC에 연결함
    gcloud sql instances create $SQL_INSTANCE_NAME \
        --database-version=POSTGRES_15 \
        --tier=db-f1-micro \
        --region=$REGION \
        --network=$VPC_NAME \
        --no-assign-ip \
        --root-password="temp-root-password-change-me" 
        
    echo "데이터베이스 $DB_NAME 생성 중..."
    gcloud sql databases create $DB_NAME \
        --instance=$SQL_INSTANCE_NAME \
        --charset=UTF8 \
        --collation=ko_KR.UTF8
    
    echo "사용자 $DB_USER 생성 중..."
    # 실제로는 비밀번호를 묻거나 생성해야 함. 스크립트 단순화를 위해 플레이스홀더 사용.
    DB_PASS=${DB_PASSWORD:-"db-password-change-me"}
    gcloud sql users create $DB_USER --instance=$SQL_INSTANCE_NAME --password="$DB_PASS"
else
    echo "Cloud SQL 인스턴스 $SQL_INSTANCE_NAME 가 이미 존재합니다."
fi

# Cloud SQL Private IP 가져오기
DB_IP=$(gcloud sql instances describe $SQL_INSTANCE_NAME --format="value(ipAddresses[0].ipAddress)")
echo "Cloud SQL 사설 IP: $DB_IP"


# 6. Service Accounts
echo "[6/7] 서비스 계정(Service Accounts) 설정 중..."

# Backend SA
BACKEND_SA="toonify-backend-sa"
if ! gcloud iam service-accounts describe $BACKEND_SA@$PROJECT_ID.iam.gserviceaccount.com &>/dev/null; then
    gcloud iam service-accounts create $BACKEND_SA --display-name="Toonify Backend Service Account"
fi
# Backend SA에 권한 부여
# - Storage Object Admin (GCS용)
# - Vertex AI User (Gemini용)
# - Cloud SQL Client
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$BACKEND_SA@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$BACKEND_SA@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$BACKEND_SA@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudsql.client"

# Frontend SA (주로 호출자 역할)
FRONTEND_SA="toonify-frontend-sa"
if ! gcloud iam service-accounts describe $FRONTEND_SA@$PROJECT_ID.iam.gserviceaccount.com &>/dev/null; then
    gcloud iam service-accounts create $FRONTEND_SA --display-name="Toonify Frontend Service Account"
fi
# 만약 백엔드에 내부 인증(IAM)을 적용한다면 Invoker 권한이 필요함.
# 현재는 internal ingress와 네트워크 도달 가능성에 의존하지만, 
# 만약을 위해(그리고 향후 IAM 인증 활성화를 위해) Invoker 권한 부여.
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$FRONTEND_SA@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.invoker"


# 7. 최종 요약
echo "==================================================="
echo "   인프라 설정 완료"
echo "==================================================="
echo "Repository: $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME"
echo "SQL Instance Private IP: $DB_IP"
echo "Bucket: gs://$GCS_BUCKET_NAME"
echo "VPC Connector: projects/$PROJECT_ID/locations/$REGION/connectors/$CONNECTOR_NAME"
echo "Backend Service Account: $BACKEND_SA@$PROJECT_ID.iam.gserviceaccount.com"
echo "Frontend Service Account: $FRONTEND_SA@$PROJECT_ID.iam.gserviceaccount.com"
echo "==================================================="
echo "다음 단계: scripts/generate_prod_env_file.sh 를 실행하여 .env.prod 파일을 생성하세요."

# 다음 스크립트가 쉽게 읽을 수 있도록 주요 정보를 임시 파일에 저장
echo "DB_IP=$DB_IP" > .infra_output
echo "REPO_URL=$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME" >> .infra_output
echo "GCS_BUCKET=$GCS_BUCKET_NAME" >> .infra_output
echo "CONNECTOR=projects/$PROJECT_ID/locations/$REGION/connectors/$CONNECTOR_NAME" >> .infra_output
echo "BACKEND_SA=$BACKEND_SA@$PROJECT_ID.iam.gserviceaccount.com" >> .infra_output
echo "FRONTEND_SA=$FRONTEND_SA@$PROJECT_ID.iam.gserviceaccount.com" >> .infra_output
