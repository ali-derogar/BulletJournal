#!/bin/bash

# BulletJournal Server Setup Script
# This script sets up a fresh server with all required dependencies

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════╗"
echo "║  BulletJournal Server Setup Script    ║"
echo "╔════════════════════════════════════════╗"
echo -e "${NC}"

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

print_step() {
    echo -e "${BLUE}▶️  $1${NC}"
}

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    print_error "Please run with sudo"
    exit 1
fi

# Update system
print_step "Step 1/8: Updating system packages..."
apt update && apt upgrade -y
print_success "System updated"

# Install Git
print_step "Step 2/8: Installing Git..."
if ! command -v git &> /dev/null; then
    apt install -y git
    print_success "Git installed"
else
    print_info "Git already installed"
fi

# Install Docker
print_step "Step 3/8: Installing Docker..."
if ! command -v docker &> /dev/null; then
    # Install dependencies
    apt install -y ca-certificates curl gnupg lsb-release

    # Add Docker's official GPG key
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

    # Set up repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker Engine
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Start and enable Docker
    systemctl start docker
    systemctl enable docker

    print_success "Docker installed"
else
    print_info "Docker already installed"
fi

# Install tmux (optional but useful)
print_step "Step 4/8: Installing tmux..."
if ! command -v tmux &> /dev/null; then
    apt install -y tmux
    print_success "tmux installed"
else
    print_info "tmux already installed"
fi

# Install Node.js and npm (for development, optional)
print_step "Step 5/8: Installing Node.js and npm..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    print_success "Node.js and npm installed"
else
    print_info "Node.js already installed (version: $(node -v))"
fi

# Clone repository
print_step "Step 6/8: Cloning repository..."
if [ ! -d "$DEPLOY_DIR" ]; then
    git clone -b $BRANCH $REPO_URL $DEPLOY_DIR
    print_success "Repository cloned to $DEPLOY_DIR"
else
    print_info "Repository already exists at $DEPLOY_DIR"
fi

# Create .env file if it doesn't exist
print_step "Step 7/8: Setting up environment variables..."
cd $DEPLOY_DIR

if [ ! -f ".env.local" ]; then
    cp .env.local.example .env.local
    print_info "Created .env.local from example. Please update with your values!"
fi

# Set up deploy script
print_step "Step 8/8: Setting up deployment script..."
chmod +x $DEPLOY_DIR/deploy.sh
print_success "Deploy script is ready"

# Create systemd service (optional)
print_info "Creating systemd service for auto-restart..."
cat > /etc/systemd/system/bulletjournal.service <<EOF
[Unit]
Description=BulletJournal Docker Compose Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$DEPLOY_DIR
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable bulletjournal.service
print_success "Systemd service created and enabled"

# Summary
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Server setup completed successfully!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
print_info "Next steps:"
echo "  1. Edit $DEPLOY_DIR/.env.local with your configuration"
echo "  2. Run: sudo $DEPLOY_DIR/deploy.sh"
echo "  3. Or use: sudo systemctl start bulletjournal"
echo ""
print_info "Useful commands:"
echo "  • Deploy: sudo $DEPLOY_DIR/deploy.sh"
echo "  • View logs: cd $DEPLOY_DIR && sudo docker compose logs -f"
echo "  • Restart: sudo systemctl restart bulletjournal"
echo "  • Status: cd $DEPLOY_DIR && sudo docker compose ps"
echo ""
print_success "Happy journaling! 📔"
