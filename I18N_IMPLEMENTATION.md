# Internationalization (i18n) Implementation Guide

## Overview
The Bullet Journal app is now fully internationalized with support for English (en) and Persian/Farsi (fa).

## Architecture

### Technology Stack
- **Framework**: Next.js 15 with next-intl
- **Languages**: English (en), Persian/Farsi (fa)
- **RTL Support**: Automatic RTL for Persian, LTR for English
- **Storage**: localStorage for language preference persistence

### Directory Structure
```
/i18n/
  ├── config.ts          # i18n configuration
  └── request.ts         # next-intl request configuration
/messages/
  ├── en.json           # English translations
  └── fa.json           # Persian translations
/app/[locale]/
  ├── layout.tsx        # Locale-aware root layout
  └── page.tsx          # Main page with language switcher
/components/
  └── LanguageSwitcher.tsx  # Language selection component
/middleware.ts          # Locale routing middleware
```

## Features

### 1. Language Switching
- **Component**: `LanguageSwitcher.tsx`
- **Location**: Header (top-right)
- **Behavior**: 
  - Instant language switching
  - Automatic RTL/LTR layout adjustment
  - Persistent language preference in localStorage
  - Visual indicator of current language

### 2. RTL/LTR Support
- Persian (fa): Automatic RTL layout
- English (en): Automatic LTR layout
- Applied at HTML element level: `<html dir="rtl|ltr">`
- Tailwind CSS respects direction automatically

### 3. Translation Files
All UI text is organized in JSON files:
- **en.json**: 1000+ English translations
- **fa.json**: 1000+ Persian translations

Categories include:
- Common UI elements
- Authentication screens
- Navigation labels
- Task management
- Goals and analytics
- Finance tracking
- Profile management
- Error messages
- Validation messages

### 4. Language Persistence
- User's language preference is saved to localStorage
- Preference is restored on next visit
- Backend can also store preference in user profile

## Usage

### For Developers

#### Adding New Translations
1. Add key-value pairs to both `messages/en.json` and `messages/fa.json`
2. Use in components with next-intl hooks

#### In Client Components
```tsx
'use client';
import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const t = useTranslations();
  return <h1>{t('common.appName')}</h1>;
}
```

#### In Server Components
```tsx
import { getTranslations } from 'next-intl/server';

export default async function MyComponent() {
  const t = await getTranslations();
  return <h1>{t('common.appName')}</h1>;
}
```

#### Getting Current Locale
```tsx
import { useLocale } from 'next-intl';

export default function MyComponent() {
  const locale = useLocale();
  // locale will be 'en' or 'fa'
}
```

### For Users

#### Switching Language
1. Click the language button in the header (top-right)
2. Select your preferred language (English 🇺🇸 or فارسی 🇮🇷)
3. The app instantly switches to the selected language
4. Your preference is saved automatically

#### Supported Languages
- **English** (en) - LTR layout
- **Persian/Farsi** (fa) - RTL layout

## Routing

### URL Structure
- English: `/en/...` or `/...` (default)
- Persian: `/fa/...`

### Automatic Locale Detection
- Middleware automatically detects and routes to appropriate locale
- Default locale is English (en)
- User preference is respected on return visits

## Localization Features

### 1. Text Translations
All UI text is translated including:
- Page titles and headings
- Button labels
- Form placeholders
- Error messages
- Success messages
- Empty states
- Loading states

### 2. Date/Time Formatting
- Dates respect locale conventions
- Time zones are set to Asia/Tehran
- Can be extended for locale-specific formatting

### 3. Number Formatting
- Numbers can be formatted per locale
- Currency symbols respect locale
- Decimal separators follow locale conventions

### 4. RTL/LTR Layout
- Automatic direction switching
- Flexbox and Grid layouts adapt automatically
- Margin/padding directions respect text direction
- Tailwind CSS handles direction-aware utilities

## Configuration Files

### i18n/config.ts
```typescript
export const i18n = {
  defaultLocale: 'en',
  locales: ['en', 'fa'],
} as const;
```

### i18n/request.ts
Configures next-intl to load messages and settings per request.

### middleware.ts
Handles locale routing and detection.

### next.config.ts
Includes next-intl plugin for build-time optimizations.

## Production Deployment

### Build
```bash
npm run build
```

The build includes:
- Static pre-rendering for both locales
- Optimized message loading
- Middleware for locale routing
- Service Worker with cache versioning

### Environment Variables
No additional environment variables required for i18n.

## Testing

### Manual Testing Checklist
- [ ] Switch between English and Persian
- [ ] Verify RTL layout in Persian
- [ ] Verify LTR layout in English
- [ ] Check language persistence (reload page)
- [ ] Test all screens in both languages
- [ ] Verify responsive design in both directions
- [ ] Check form inputs and validation messages
- [ ] Test error messages in both languages

### Screens to Test
- Login/Register
- Daily view
- Tasks
- Goals
- Analytics
- Finance
- Profile
- Settings
- Admin panel (if applicable)

## Future Enhancements

### Potential Improvements
1. Add more languages (Arabic, Turkish, etc.)
2. Implement locale-specific date formatting
3. Add number/currency formatting per locale
4. Implement locale-specific keyboard layouts
5. Add language-specific fonts
6. Implement locale-specific validation rules
7. Add locale-specific content variations

### Backend Integration
- Store user language preference in database
- Return localized error messages from API
- Support Accept-Language header
- Implement locale-specific API responses

## Troubleshooting

### Language Not Switching
- Clear browser cache and localStorage
- Check if localStorage is enabled
- Verify language code is correct (en or fa)

### RTL Not Working
- Check HTML dir attribute
- Verify Tailwind CSS is properly configured
- Check for hardcoded margin/padding directions

### Translations Missing
- Check message keys match exactly
- Verify JSON syntax in translation files
- Check for typos in key names

## Support

For issues or questions about i18n implementation:
1. Check this documentation
2. Review next-intl documentation: https://next-intl-docs.vercel.app/
3. Check translation files for missing keys
4. Verify locale routing in middleware

## Version History

### v1.1.0 - Initial i18n Implementation
- Added next-intl integration
- Created English and Persian translation files
- Implemented language switcher component
- Added RTL/LTR support
- Configured locale routing
- Set up middleware for locale detection
- Implemented language persistence

---

**Last Updated**: February 9, 2026
**Status**: Production Ready
