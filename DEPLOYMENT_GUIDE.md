# راهنمای کامل Deploy و تنظیم Environment Variables

## 📌 خلاصه: کجا API Key رو بذاریم؟

| محیط | جایی که باید API Key بذاری | چطوری؟ |
|------|---------------------------|--------|
| **محلی (Local)** | `.env.local` | فایل محلی که commit نمیشه |
| **GitHub Actions** | Repository Variables | Settings → Secrets and variables → Actions → Variables |
| **Vercel** | Environment Variables | Project Settings → Environment Variables |
| **Netlify** | Environment Variables | Site Settings → Environment variables |

---

## 1️⃣ تنظیم برای Local Development

### فایل `.env` (در ریشه پروژه):

```bash
# AI Configuration
NEXT_PUBLIC_OPENROUTER_API_KEYS=your-key-1,your-key-2
NEXT_PUBLIC_DEFAULT_AI_PROVIDER=openrouter
NEXT_PUBLIC_DEFAULT_AI_MODEL=meta-llama/llama-3.1-8b-instruct:free
```

**نکته:** این فایل در `.gitignore` هست و به GitHub push نمیشه ✅

---

## 2️⃣ تنظیم برای GitHub Actions (CI/CD)

### مسیر: Repository → Settings → Secrets and variables → Actions → Variables

سه Variable اضافه کن:

1. **NEXT_PUBLIC_OPENROUTER_API_KEYS**
   - Value: `your-key-1,your-key-2`

2. **NEXT_PUBLIC_DEFAULT_AI_PROVIDER**
   - Value: `openrouter`

3. **NEXT_PUBLIC_DEFAULT_AI_MODEL**
   - Value: `meta-llama/llama-3.1-8b-instruct:free`

### نمونه GitHub Actions Workflow:

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [master]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Build
        env:
          NEXT_PUBLIC_OPENROUTER_API_KEYS: ${{ vars.NEXT_PUBLIC_OPENROUTER_API_KEYS }}
          NEXT_PUBLIC_DEFAULT_AI_PROVIDER: ${{ vars.NEXT_PUBLIC_DEFAULT_AI_PROVIDER }}
          NEXT_PUBLIC_DEFAULT_AI_MODEL: ${{ vars.NEXT_PUBLIC_DEFAULT_AI_MODEL }}
        run: npm run build
```

---

## 3️⃣ تنظیم برای Vercel

### روش 1: از Dashboard

1. برو به: `https://vercel.com/your-username/your-project/settings/environment-variables`
2. سه Variable اضافه کن (همون‌هایی که بالا گفتیم)
3. مطمئن شو که برای **Production**, **Preview**, و **Development** فعال باشن

### روش 2: از CLI

```bash
vercel env add NEXT_PUBLIC_OPENROUTER_API_KEYS production
# وقتی پرسید، مقدار رو بذار: your-key-1,your-key-2

vercel env add NEXT_PUBLIC_DEFAULT_AI_PROVIDER production
# مقدار: openrouter

vercel env add NEXT_PUBLIC_DEFAULT_AI_MODEL production
# مقدار: meta-llama/llama-3.1-8b-instruct:free
```

---

## 4️⃣ تنظیم برای Netlify

### روش 1: از Dashboard

1. Site Settings → Environment variables
2. Add a variable برای هر سه تا
3. Scopes: **All** رو انتخاب کن

### روش 2: از فایل `netlify.toml`

```toml
# netlify.toml
[build.environment]
  NEXT_PUBLIC_DEFAULT_AI_PROVIDER = "openrouter"
  NEXT_PUBLIC_DEFAULT_AI_MODEL = "meta-llama/llama-3.1-8b-instruct:free"

# نکته: API Keys رو از Dashboard اضافه کن، نه از این فایل!
```

---

## ❓ سوالات متداول

### چرا از GitHub Variables استفاده نمی‌کنه؟

GitHub Variables فقط در **GitHub Actions** کار می‌کنن، نه در:
- ❌ Local development (`npm run dev`)
- ❌ Production deployment (Vercel/Netlify)

### چرا `NEXT_PUBLIC_` لازمه؟

Next.js فقط متغیرهایی که با `NEXT_PUBLIC_` شروع میشن رو در کد client-side جایگذاری می‌کنه.

بدون این prefix، فقط در server-side (API routes) در دسترس هستن.

### آیا امن هست؟

⚠️ هر متغیری که با `NEXT_PUBLIC_` شروع میشه، در bundle JavaScript قابل مشاهده‌ست!

برای API keysهای حساس، بهتره از یکی از این روش‌ها استفاده کنی:
1. **Backend API**: یک API route بساز که از server-side key استفاده کنه
2. **Edge Functions**: در Vercel/Netlify از Edge Functions استفاده کن
3. **Rate Limiting**: محدودیت تعداد درخواست بذار

### چطوری امنیت رو بیشتر کنیم؟

برای آینده، می‌تونی:

1. **یک API Route بسازی** که API key رو در server نگه داره:

```typescript
// app/api/ai-chat/route.ts
export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY; // بدون NEXT_PUBLIC_
  // درخواست به OpenRouter
}
```

2. **Rate Limiting اضافه کنی** برای جلوگیری از سوء‌استفاده

3. **Authentication اضافه کنی** که فقط کاربران لاگین شده بتونن استفاده کنن

---

## 🎯 خلاصه برای شما الان:

✅ **Local**: `.env` رو دارید و کار می‌کنه
✅ **GitHub Variables**: تنظیم کردید (فقط برای GitHub Actions)
⏳ **Production**: وقتی deploy کنید، در Vercel/Netlify هم باید تنظیم کنید

---

نیاز به کمک بیشتر؟ بهم بگو کجا می‌خوای deploy کنی! 🚀
