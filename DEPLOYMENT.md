# BulletJournal Deployment Guide

This guide explains three different methods for automated deployment of the project.

## 🎯 Method 1: Manual Deployment Script (Simplest)

### Initial Server Setup

Run this once on a new server:

```bash
# Download and run the setup script
curl -fsSL https://raw.githubusercontent.com/ali-derogar/BulletJournal/master/server-setup.sh -o server-setup.sh
chmod +x server-setup.sh
sudo ./server-setup.sh
```

This script installs everything:

- ✅ Git
- ✅ Docker & Docker Compose
- ✅ Node.js & npm
- ✅ tmux
- ✅ Clone project
- ✅ systemd service

### Subsequent Deployments (Every time you make changes)

After initial setup, just run this command:

```bash
sudo /opt/bulletjournal/deploy.sh
```

Or if you're in the project directory:

```bash
sudo ./deploy.sh
```

**This script automatically:**

- ✅ Pulls latest changes from GitHub
- ✅ Stops containers
- ✅ Builds new images
- ✅ Starts containers
- ✅ Shows status

---

## 🚀 Method 2: GitHub Actions (Fully Automated)

### Initial Setup

1. **Initial Server Setup** (same as Method 1):

```bash
curl -fsSL https://raw.githubusercontent.com/ali-derogar/BulletJournal/master/server-setup.sh -o server-setup.sh
chmod +x server-setup.sh
sudo ./server-setup.sh
```

2. **Configure SSH Keys in GitHub:**

   a) Generate SSH key (on your local computer):

   ```bash
   ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions
   ```

   b) Add public key to server:

   ```bash
   ssh-copy-id -i ~/.ssh/github_actions.pub -p 6922 root@45.89.244.24
   ```

   c) Copy private key:

   ```bash
   cat ~/.ssh/github_actions
   ```

3. **Add Secrets to GitHub:**

   Navigate to:

   ```
   GitHub Repository → Settings → Secrets and variables → Actions → New repository secret
   ```

   Add these Secrets:

   - `SERVER_HOST`: Server IP address (e.g., `45.89.244.24`)
   - `SERVER_USER`: SSH username (e.g., `root` or `ubuntu`)
   - `SSH_PRIVATE_KEY`: Private key you copied
   - `SERVER_PORT`: SSH port (e.g., `6922`)

### Usage

#### ✅ Auto Deploy

Every time you push to `master` branch, **automatic** Build and Deploy happens! 🎉

```bash
git add .
git commit -m "fix: some bug"
git push
# ← GitHub Actions automatically builds and deploys
```

#### 🎯 Manual Trigger

For more control, you can manually choose one of these options:

1. Go to GitHub → **Actions** → **CI/CD Pipeline** → **Run workflow**
2. Select one of the following options:
   - **build**: Only build and test code (no deploy)
   - **deploy**: Only deploy to server (no rebuild)
   - **build-and-deploy**: Build + Deploy (default)

---

## 🔄 Method 3: Systemd Service (Auto-start after restart)

If you used `server-setup.sh`, a systemd service is installed that:

- ✅ Automatically runs after server restart
- ✅ Manages Docker

### Service Commands:

```bash
# Start
sudo systemctl start bulletjournal

# Stop
sudo systemctl stop bulletjournal

# Restart
sudo systemctl restart bulletjournal

# Status
sudo systemctl status bulletjournal

# Enable auto-start after boot
sudo systemctl enable bulletjournal

# Disable
sudo systemctl disable bulletjournal
```

---

## 📝 Useful Commands

### View Logs

```bash
cd /opt/bulletjournal
sudo docker compose logs -f
```

### Check Container Status

```bash
cd /opt/bulletjournal
sudo docker compose ps
```

### Debug

```bash
# Frontend logs only
sudo docker compose logs -f frontend

# Backend logs only
sudo docker compose logs -f backend

# Enter container
sudo docker exec -it bulletjournal-frontend sh
sudo docker exec -it bulletjournal-backend sh
```

### Clean Up (Remove everything)

```bash
cd /opt/bulletjournal
sudo docker compose down -v  # Also remove volumes
sudo docker system prune -a  # Remove all unused images
```

---

## 🔧 Change Settings

### Edit Environment Variables

```bash
sudo nano /opt/bulletjournal/.env.local
sudo /opt/bulletjournal/deploy.sh
```

### Change Repository Address

```bash
sudo nano /opt/bulletjournal/deploy.sh
# Edit the REPO_URL line
```

---

## ⚡ FAQ

### How to rebuild only frontend?

```bash
cd /opt/bulletjournal
sudo docker compose up -d --build frontend
```

### How to rebuild only backend?

```bash
cd /opt/bulletjournal
sudo docker compose up -d --build backend
```

### How to restart containers without rebuild?

```bash
cd /opt/bulletjournal
sudo docker compose restart
```

### How to access database?

```bash
sudo docker exec -it bulletjournal-backend sh
cd data
sqlite3 bullet_journal.db
```

---

## 🎯 Summary: Which Method to Choose?

| Method | Setup Time | Simplicity | Automation | Recommended For |
|--------|-----------|-----------|-----------|-----------------|
| Manual Script | 5 minutes | ⭐⭐⭐⭐⭐ | Manual | Quick start, small teams |
| GitHub Actions | 15 minutes | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Team projects, CI/CD |
| Systemd | Automatic | ⭐⭐⭐⭐ | ⭐⭐⭐ | Auto-run after restart |

**Recommendation:** Use all three methods together! 🚀
