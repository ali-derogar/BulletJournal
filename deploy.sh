#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting BulletJournal Deployment...${NC}"

# Configuration
REPO_URL="https://github.com/ali-derogar/BulletJournal.git"
DEPLOY_DIR="/opt/bulletjournal"
BRANCH="master"

# Function to print colored messages
print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    print_error "Please run with sudo"
    exit 1
fi

# Update repository
print_info "Updating repository..."
if [ ! -d "$DEPLOY_DIR" ]; then
    print_info "Cloning repository for the first time..."
    git clone -b $BRANCH $REPO_URL $DEPLOY_DIR
else
    print_info "Pulling latest changes..."
    cd $DEPLOY_DIR
    git fetch origin
    git reset --hard origin/$BRANCH
fi

cd $DEPLOY_DIR
print_success "Repository updated"

# Stop existing containers
print_info "Stopping existing containers..."
docker compose down
print_success "Containers stopped"

# Build and start containers
print_info "Building and starting containers..."
docker compose up -d --build

# Wait for services to be healthy
print_info "Waiting for services to become healthy..."
sleep 10

# Check container status
print_info "Checking container status..."
docker compose ps

# Check logs for any errors
print_info "Recent logs:"
docker compose logs --tail=50

print_success "Deployment completed! 🎉"
print_info "Frontend: http://localhost:3000"
print_info "Backend: http://localhost:8000"
print_info "To view logs: docker compose logs -f"
