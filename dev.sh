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
