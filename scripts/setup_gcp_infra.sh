#!/bin/bash

# ==============================================================================
# GCP Secure Serverless Infrastructure Setup Script
# Based on: docs/prod/prod_deploy_strategy.md
#
# Usage:
#   chmod +x setup_gcp_infra.sh
#   ./setup_gcp_infra.sh
#
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - A GCP Project created
# ==============================================================================

set -e  # Exit immediately if a command exits with a non-zero status.

# --- Configuration Variables ---
# Modify these or export them before running the script
PROJECT_ID=${PROJECT_ID:-"your-project-id"}
REGION=${REGION:-"asia-northeast3"} # Seoul
ZONE=${ZONE:-"asia-northeast3-a"}
VPC_NAME=${VPC_NAME:-"main-vpc"}
SUBNET_NAME=${SUBNET_NAME:-"backend-subnet"}
SUBNET_RANGE=${SUBNET_RANGE:-"10.0.0.0/24"}
DB_INSTANCE_NAME=${DB_INSTANCE_NAME:-"toonify-db"}
DB_NAME=${DB_NAME:-"toonify"}
DB_USER=${DB_USER:-"toonify-user"}
DB_PASSWORD=${DB_PASSWORD:-"secure-password-change-me"} # PLEASE CHANGE THIS
BUCKET_NAME=${BUCKET_NAME:-"toonify-storage-${PROJECT_ID}"}
REPO_FRONTEND=${REPO_FRONTEND:-"toonify-frontend"}
REPO_BACKEND=${REPO_BACKEND:-"toonify-backend"}

# Service Account Names
SA_BACKEND="backend-sa"
SA_FRONTEND="frontend-sa"

echo "=============================================================================="
echo "Starting GCP Infrastructure Setup"
echo "Project ID: $PROJECT_ID"
echo "Region:     $REGION"
echo "=============================================================================="

# 1. Set Project
echo "[1/9] Setting GCP Project..."
gcloud config set project "$PROJECT_ID"

# 2. Enable Required APIs
echo "[2/9] Enabling Required APIs..."
gcloud services enable \
    compute.googleapis.com \
    servicenetworking.googleapis.com \
    sqladmin.googleapis.com \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    storage.googleapis.com \
    aiplatform.googleapis.com \
    secretmanager.googleapis.com

# 3. Network Setup (VPC & Subnet)
echo "[3/9] Setting up Network (VPC & Subnet)..."
if ! gcloud compute networks describe "$VPC_NAME" &>/dev/null; then
    gcloud compute networks create "$VPC_NAME" \
        --subnet-mode=custom \
        --description="VPC for Toonify Application"
    echo "  - VPC '$VPC_NAME' created."
else
    echo "  - VPC '$VPC_NAME' already exists."
fi

if ! gcloud compute networks subnets describe "$SUBNET_NAME" --region="$REGION" &>/dev/null; then
    gcloud compute networks subnets create "$SUBNET_NAME" \
        --network="$VPC_NAME" \
        --region="$REGION" \
        --range="$SUBNET_RANGE"
    echo "  - Subnet '$SUBNET_NAME' created."
else
    echo "  - Subnet '$SUBNET_NAME' already exists."
fi

# 4. Private Service Access for Cloud SQL
echo "[4/9] Configuring Private Service Access..."
# Create an IP range for internal services
RESERVED_IP_NAME="google-managed-services-$VPC_NAME"
if ! gcloud compute addresses describe "$RESERVED_IP_NAME" --global &>/dev/null; then
    gcloud compute addresses create "$RESERVED_IP_NAME" \
        --global \
        --purpose=VPC_PEERING \
        --prefix-length=16 \
        --description="Peering for Google Managed Services" \
        --network="$VPC_NAME"
    echo "  - Reserved IP range created."
else
    echo "  - Reserved IP range already exists."
fi

# Create the VPC connection
if ! gcloud services vpc-peerings list --network="$VPC_NAME" | grep -q "servicenetworking-googleapis-com"; then
    gcloud services vpc-peerings connect \
        --service=servicenetworking.googleapis.com \
        --ranges="$RESERVED_IP_NAME" \
        --network="$VPC_NAME"
    echo "  - VPC Peering established."
else
    echo "  - VPC Peering already exists."
fi

# 5. Cloud SQL (PostgreSQL)
echo "[5/9] Setting up Cloud SQL (PostgreSQL)..."
# Check if instance exists
if ! gcloud sql instances describe "$DB_INSTANCE_NAME" &>/dev/null; then
    echo "  - Creating Cloud SQL instance '$DB_INSTANCE_NAME' (This may take several minutes)..."
    gcloud sql instances create "$DB_INSTANCE_NAME" \
        --database-version=POSTGRES_15 \
        --cpu=1 \
        --memory=3840MiB \
        --region="$REGION" \
        --network="projects/$PROJECT_ID/global/networks/$VPC_NAME" \
        --no-assign-ip \
        --root-password="$DB_PASSWORD" # You should probably change root password separately
    echo "  - Instance created."
else
    echo "  - Cloud SQL instance '$DB_INSTANCE_NAME' already exists."
fi

# Create Database
if ! gcloud sql databases list --instance="$DB_INSTANCE_NAME" | grep -q "$DB_NAME"; then
    gcloud sql databases create "$DB_NAME" --instance="$DB_INSTANCE_NAME"
    echo "  - Database '$DB_NAME' created."
fi

# Create User
if ! gcloud sql users list --instance="$DB_INSTANCE_NAME" | grep -q "$DB_USER"; then
    gcloud sql users create "$DB_USER" \
        --instance="$DB_INSTANCE_NAME" \
        --password="$DB_PASSWORD"
    echo "  - User '$DB_USER' created."
fi

# 6. GCS Bucket (Storage)
echo "[6/9] Setting up GCS Bucket..."
if ! gsutil ls -b "gs://$BUCKET_NAME" &>/dev/null; then
    gcloud storage buckets create "gs://$BUCKET_NAME" --location="$REGION"
    echo "  - Bucket '$BUCKET_NAME' created."
    
    # Configure CORS for the bucket (Optional, but usually needed for frontend uploads)
    echo '[
      {
        "origin": ["*"],
        "method": ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
        "responseHeader": ["Content-Type", "Authorization", "Content-Length", "User-Agent", "x-goog-resumable"],
        "maxAgeSeconds": 3600
      }
    ]' > cors-config.json
    gcloud storage buckets update "gs://$BUCKET_NAME" --cors-file=cors-config.json
    rm cors-config.json
    echo "  - CORS configured."
else
    echo "  - Bucket '$BUCKET_NAME' already exists."
fi

# 7. Artifact Registry
echo "[7/9] Setting up Artifact Registry..."
for REPO in "$REPO_FRONTEND" "$REPO_BACKEND"; do
    if ! gcloud artifacts repositories describe "$REPO" --location="$REGION" &>/dev/null; then
        gcloud artifacts repositories create "$REPO" \
            --repository-format=docker \
            --location="$REGION" \
            --description="Docker repository for $REPO"
        echo "  - Repository '$REPO' created."
    else
        echo "  - Repository '$REPO' already exists."
    fi
done

# 8. Service Accounts & IAM
echo "[8/9] Setting up Service Accounts & IAM..."

# Backend Service Account
if ! gcloud iam service-accounts describe "$SA_BACKEND@$PROJECT_ID.iam.gserviceaccount.com" &>/dev/null; then
    gcloud iam service-accounts create "$SA_BACKEND" \
        --display-name="Backend Service Account"
    echo "  - Service Account '$SA_BACKEND' created."
fi

# Grant Roles to Backend SA
# - Vertex AI User
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SA_BACKEND@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user" > /dev/null
# - Cloud SQL Client
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SA_BACKEND@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudsql.client" > /dev/null
# - Storage Object Admin
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SA_BACKEND@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.objectAdmin" > /dev/null

echo "  - Roles granted to '$SA_BACKEND'."

# Frontend Service Account (Cloud Run Invoker - Optional if using specific logic, 
# usually Frontend just needs to be public, but if it calls other secured services it needs an identity)
if ! gcloud iam service-accounts describe "$SA_FRONTEND@$PROJECT_ID.iam.gserviceaccount.com" &>/dev/null; then
    gcloud iam service-accounts create "$SA_FRONTEND" \
        --display-name="Frontend Service Account"
    echo "  - Service Account '$SA_FRONTEND' created."
fi

# Grant Cloud Run Invoker to Frontend SA (if it needs to invoke backend securely)
# This part is usually configured on the Backend Cloud Run service *allowing* the Frontend SA.
# Here we just ensure the SA exists.

# 9. Summary
echo "=============================================================================="
echo "Infrastructure Setup Complete!"
echo "=============================================================================="
echo "Environment Variables for Deployment:"
echo ""
echo "PROJECT_ID=$PROJECT_ID"
echo "REGION=$REGION"
echo "DB_HOST=$(gcloud sql instances describe $DB_INSTANCE_NAME --format='value(ipAddresses[0].ipAddress)') (Private IP)"
echo "DB_USER=$DB_USER"
echo "DB_PASSWORD=$DB_PASSWORD"
echo "DB_NAME=$DB_NAME"
echo "BUCKET_NAME=$BUCKET_NAME"
echo "BACKEND_SA_EMAIL=$SA_BACKEND@$PROJECT_ID.iam.gserviceaccount.com"
echo "FRONTEND_SA_EMAIL=$SA_FRONTEND@$PROJECT_ID.iam.gserviceaccount.com"
echo "=============================================================================="
echo "Next Steps:"
echo "1. Build and push Docker images to Artifact Registry."
echo "2. Deploy Backend Cloud Run service using '$SA_BACKEND' service account and VPC Connector (or Direct VPC Egress)."
echo "3. Deploy Frontend Cloud Run service."
echo "=============================================================================="
