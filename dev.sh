#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Toonify Development Environment...${NC}"

# Backend Setup
echo -e "${GREEN}Setting up Backend...${NC}"
cd backend

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

echo "Installing backend requirements..."
./venv/bin/pip install -r requirements.txt

# Frontend Setup
echo -e "${GREEN}Setting up Frontend...${NC}"
cd ../frontend
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Start Docker Services
echo -e "${BLUE}Restarting Docker Services...${NC}"
cd ..
docker compose down
docker compose up &
DOCKER_PID=$!

# Wait for services to be ready
echo "Waiting for services to initialize..."
sleep 5

# Start Services
echo -e "${BLUE}Starting Servers...${NC}"

# Start Backend in background
cd backend

# Setup Google Cloud Credentials
GCLOUD_CRED_PATH="$HOME/.config/gcloud/application_default_credentials.json"
TARGET_CRED_PATH="application_default_credentials.json"
if [ -f "$GCLOUD_CRED_PATH" ]; then
    echo "Copying gcloud credentials..."
    cp "$GCLOUD_CRED_PATH" "$TARGET_CRED_PATH"
    export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/$TARGET_CRED_PATH"
    echo "GOOGLE_APPLICATION_CREDENTIALS set to $(pwd)/$TARGET_CRED_PATH"
else
    echo "WARNING: gcloud credentials not found at $GCLOUD_CRED_PATH"
fi

./venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo "Backend started (PID: $BACKEND_PID)"

# Start Frontend
cd ../frontend
npm run dev &
FRONTEND_PID=$!
echo "Frontend started (PID: $FRONTEND_PID)"

# Handle Shutdown
trap "kill $BACKEND_PID $FRONTEND_PID $DOCKER_PID; exit" SIGINT SIGTERM

wait
