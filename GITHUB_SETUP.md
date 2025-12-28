# راهنمای تنظیم GitHub Variables برای AI Chat

این راهنما به شما کمک می‌کند تا API keyهای OpenRouter را در GitHub تنظیم کنید.

## مراحل تنظیم در GitHub:

### 1. رفتن به تنظیمات Repository

1. به repository خود در GitHub بروید
2. روی **Settings** کلیک کنید
3. در منوی سمت چپ، روی **Secrets and variables** کلیک کنید
4. روی **Actions** کلیک کنید

### 2. اضافه کردن Variables

روی دکمه **New repository variable** کلیک کنید و این متغیرها را اضافه کنید:

#### Variable 1: API Keys
- **Name**: `NEXT_PUBLIC_OPENROUTER_API_KEYS`
- **Value**:
  ```
  YOUR_OPENROUTER_API_KEY_1,YOUR_OPENROUTER_API_KEY_2
  ```
  (کلیدهای OpenRouter خود را با کاما از هم جدا کنید)

#### Variable 2: Default Provider
- **Name**: `NEXT_PUBLIC_DEFAULT_AI_PROVIDER`
- **Value**: `openrouter`

#### Variable 3: Default Model
- **Name**: `NEXT_PUBLIC_DEFAULT_AI_MODEL`
- **Value**: `meta-llama/llama-3.1-8b-instruct:free`

### 3. استفاده در GitHub Actions

Variables تنظیم شده به صورت خودکار در GitHub Actions در دسترس خواهند بود.

### 4. استفاده در Vercel/Netlify

همین متغیرها را در Environment Variables پلتفرم deploy خود اضافه کنید:

#### Vercel:
1. Project Settings → Environment Variables
2. همان 3 متغیر بالا را اضافه کنید

#### Netlify:
1. Site Settings → Environment variables
2. همان 3 متغیر بالا را اضافه کنید

---

## تست کردن

بعد از تنظیم، برای تست:

```bash
npm run build
npm start
```

سپس برنامه را باز کنید و AI Chat را امتحان کنید!

## امنیت

✅ API Keys در GitHub Variables امن هستند
✅ در کد منبع قرار نمی‌گیرند
✅ فقط در زمان build در دسترس هستند
✅ قابل تغییر بدون نیاز به تغییر کد
