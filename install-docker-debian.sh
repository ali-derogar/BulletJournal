#!/bin/bash

# Docker Installation Script for Debian
# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🐋 Installing Docker on Debian...${NC}"

# Remove old Docker packages
echo -e "${YELLOW}Removing old Docker packages...${NC}"
apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Update package index
echo -e "${YELLOW}Updating package index...${NC}"
apt-get update

# Install prerequisites
echo -e "${YELLOW}Installing prerequisites...${NC}"
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
echo -e "${YELLOW}Adding Docker GPG key...${NC}"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Set up the repository for Debian
echo -e "${YELLOW}Setting up Docker repository for Debian...${NC}"
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update package index again
echo -e "${YELLOW}Updating package index...${NC}"
apt-get update

# Install Docker Engine
echo -e "${YELLOW}Installing Docker Engine...${NC}"
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
echo -e "${YELLOW}Starting Docker service...${NC}"
systemctl start docker
systemctl enable docker

# Verify installation
echo -e "${YELLOW}Verifying Docker installation...${NC}"
docker --version
docker compose version

echo -e "${GREEN}✅ Docker installed successfully!${NC}"

# Test Docker
echo -e "${YELLOW}Testing Docker with hello-world...${NC}"
docker run --rm hello-world

echo -e "${GREEN}🎉 Docker is ready to use!${NC}"
