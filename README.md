# Bullet Journal - Offline PWA

**Version 1.0.0** | Offline-first Progressive Web Application built with Next.js, TypeScript, and TailwindCSS for personal daily journaling, task management, expense tracking, and habit formation.

[![PWA Ready](https://img.shields.io/badge/PWA-Ready-success)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Build Size](https://img.shields.io/badge/Build-1.7MB-informational)](package.json)

## Project Structure

```
/app          - Next.js App Router pages and layouts
/components   - Reusable React components
/domain       - Domain logic and business rules
/storage      - Data storage and persistence layer
/services     - Service layer and API interactions
/utils        - Utility functions and helpers
```

## Prerequisites

- Node.js 20.9.0 or higher
- npm or yarn

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production

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
