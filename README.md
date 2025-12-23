# Bullet Journal - Offline PWA

**Version 1.1.0** | Offline-first Progressive Web Application built with Next.js, TypeScript, and TailwindCSS for personal daily journaling, task management, expense tracking, and habit formation.

[![PWA Ready](https://img.shields.io/badge/PWA-Ready-success)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Build Size](https://img.shields.io/badge/Build-1.7MB-informational)](package.json)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)

## Project Structure

```
/app          - Next.js App Router pages and layouts
/components   - Reusable React components
/domain       - Domain logic and business rules
/storage      - Data storage and persistence layer
/services     - Service layer and API interactions
/utils        - Utility functions and helpers
/backend      - FastAPI backend server
```

## Prerequisites

### Docker Setup (Recommended)
- Docker 20.10 or higher
- Docker Compose 2.0 or higher

### Manual Setup
- Node.js 20.9.0 or higher
- Python 3.11 or higher
- npm or yarn

## Getting Started

### Option 1: Docker Setup (Recommended)

The easiest way to run the entire application is using Docker. This automatically handles all dependencies and environment setup.

#### 1. Create Environment File

```bash
cp .env.example .env
```

Edit [.env](.env) if needed to customize configuration.

#### 2. Build and Run

```bash
# Build and start both frontend and backend
docker-compose up --build

# Or run in detached mode (background)
docker-compose up -d --build
```

#### 3. Access the Application

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:8000](http://localhost:8000)
- API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

#### 4. Stop the Application

```bash
# Stop containers
docker-compose down

# Stop and remove volumes (delete database)
docker-compose down -v
```

#### Docker Commands

```bash
# View logs
docker-compose logs -f

# View backend logs only
docker-compose logs -f backend

# View frontend logs only
docker-compose logs -f frontend

# Rebuild after code changes
docker-compose up --build

# Run backend migrations
docker-compose exec backend alembic upgrade head
```

### Option 2: Manual Setup

#### 1. Install Frontend Dependencies

```bash
npm install
```

#### 2. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
cd ..
```

#### 3. Setup Environment Variables

```bash
cp .env.example .env.local
```

Edit [.env.local](.env.local) to set your API URL and other configuration.

#### 4. Run Backend

```bash
cd backend
python run.py
# Or using uvicorn directly:
# uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### 5. Run Frontend (in a new terminal)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

#### 6. Build for Production

```bash
npm run build
npm start
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Features

### Core Functionality

- **Daily Task Management** - Create, edit, and track tasks with status (todo/in-progress/done)
- **Expense Tracking** - Log and manage daily expenses with real-time totals
- **Daily Inputs** - Track sleep times, mood, and day score
- **Habit Tracking** - Monitor water intake and study time with goal feedback
- **Daily Reflection** - Write daily notes and reflections
- **Date Navigation** - Intuitive calendar picker with visual indicators for past/future/today

### PWA Features

- **Installable** - Add to home screen on mobile and desktop
- **Offline Support** - Full functionality without internet connection
- **Service Worker** - Smart caching strategy for app shell and runtime assets
- **Web App Manifest** - Native app-like experience with custom icons and theme
- **Static Export** - Pre-rendered for optimal performance

### Technical Stack

- Next.js 15 with App Router and static export
- TypeScript for type safety
- TailwindCSS for styling
- IndexedDB for offline data persistence
- ESLint for code quality
- Prettier for code formatting
- Absolute imports with `@/` prefix

## Configuration

### Absolute Imports

Use `@/` prefix to import from project root:

```typescript
import { MyComponent } from "@/components/MyComponent";
import { myUtil } from "@/utils/myUtil";
```

### TypeScript

TypeScript configuration is in [tsconfig.json](tsconfig.json) with strict mode enabled.

### TailwindCSS

Tailwind configuration is in [tailwind.config.ts](tailwind.config.ts).

### ESLint & Prettier

- ESLint config: [.eslintrc.json](.eslintrc.json)
- Prettier config: [.prettierrc](.prettierrc)

## PWA Deployment

The app is configured for static export and can be deployed to any static hosting service.

### Build and Export

```bash
npm run build
```

This creates a static export in the `/out` directory with:

- `manifest.json` - Web app manifest for installation
- `sw.js` - Service worker for offline caching
- `icon-*.png` - App icons for different screen sizes
- Pre-rendered HTML and optimized assets

### Deployment Options

- **GitHub Pages**: Deploy the `/out` directory
- **Netlify/Vercel**: Configure build command as `npm run build` and publish directory as `out`
- **Any Static Host**: Upload contents of `/out` directory

### Testing PWA Features

1. Build the app: `npm run build`
2. Serve the `/out` directory with a static server (e.g., `npx serve out`)
3. Open in browser (HTTPS required for service worker in production)
4. Test install prompt and offline functionality

### Offline Functionality

The app uses IndexedDB for local data storage and a service worker for offline caching:

- All data is stored locally in the browser
- Works completely offline after first visit
- No backend or database server required
- Data persists across sessions

docker compose up --build