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

# Auto-detect server IP and create/update .env file
print_info "Configuring environment variables..."
SERVER_IP=$(hostname -I | awk '{print $1}')
if [ -z "$SERVER_IP" ]; then
    # Fallback: try to get public IP
    SERVER_IP=$(curl -s ifconfig.me || echo "localhost")
fi

# Create or update .env file
if [ ! -f .env ]; then
    print_info "Creating .env file with server IP: $SERVER_IP"
    cp .env.example .env
else
    print_info "Updating .env file with server IP: $SERVER_IP"
fi

# Set NEXT_PUBLIC_API_URL in .env
if grep -q "^NEXT_PUBLIC_API_URL=" .env; then
    sed -i "s|^NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=http://$SERVER_IP:8000|" .env
else
    echo "NEXT_PUBLIC_API_URL=http://$SERVER_IP:8000" >> .env
fi

# Set AI Configuration in .env if provided
update_env_var() {
    local var_name=$1
    local var_value=$2
    if [ -n "$var_value" ]; then
        if grep -q "^$var_name=" .env; then
            sed -i "s|^$var_name=.*|$var_name=$var_value|" .env
        else
            echo "$var_name=$var_value" >> .env
        fi
    fi
}

update_env_var "NEXT_PUBLIC_OPENROUTER_API_KEYS" "$NEXT_PUBLIC_OPENROUTER_API_KEYS"
update_env_var "NEXT_PUBLIC_DEFAULT_AI_PROVIDER" "$NEXT_PUBLIC_DEFAULT_AI_PROVIDER"
update_env_var "NEXT_PUBLIC_DEFAULT_AI_MODEL" "$NEXT_PUBLIC_DEFAULT_AI_MODEL"

# Set backend OPENROUTER_API_KEY from the first available key in the public list
if [ -n "$NEXT_PUBLIC_OPENROUTER_API_KEYS" ]; then
    FIRST_KEY=$(echo "$NEXT_PUBLIC_OPENROUTER_API_KEYS" | cut -d',' -f1)
    update_env_var "OPENROUTER_API_KEY" "$FIRST_KEY"
fi

print_success "Environment configured with API URL: http://$SERVER_IP:8000 and AI settings"

# Stop existing containers
print_info "Stopping existing containers..."
docker compose down
print_success "Containers stopped"

# Build and start containers
print_info "Cleaning docker build cache..."
docker builder prune -f

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
