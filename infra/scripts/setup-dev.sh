#!/bin/bash

# SLMS Development Environment Setup Script
# This script sets up the local development environment

set -e

echo "🚀 Setting up SLMS Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker is running${NC}"

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}pnpm not found. Installing pnpm...${NC}"
    npm install -g pnpm
fi

echo -e "${GREEN}✓ pnpm is available${NC}"

# Navigate to project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/../.."

# Start infrastructure services
echo -e "${YELLOW}Starting infrastructure services...${NC}"
cd infra
docker-compose up -d postgres redis mailhog
cd ..

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}Waiting for databases to be ready...${NC}"
sleep 5

# Check if database is ready
until docker exec slms-postgres pg_isready -U slms > /dev/null 2>&1; do
    echo "Waiting for API database..."
    sleep 2
done
echo -e "${GREEN}✓ API database is ready${NC}"

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
pnpm install

# Build shared package
echo -e "${YELLOW}Building shared package...${NC}"
pnpm --filter @slms/shared build

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Development environment is ready!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Available services:"
echo "  - PostgreSQL (API):    localhost:5432"
echo "  - Redis:               localhost:6379"
echo "  - Mailhog UI:          http://localhost:8025"
echo ""
echo "Run the applications:"
echo "  pnpm dev:web    - Start Next.js (port 3000)"
echo "  pnpm dev:api    - Start NestJS API (port 4000)"
echo "  pnpm dev        - Start API + Web"
echo ""
