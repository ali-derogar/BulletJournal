# 🔄 سیستم هوشمند چرخش API Key | Smart API Key Rotation

## نمای کلی | Overview

سیستم هوشمند چرخش کلیدهای API برای جلوگیری از محدودیت درخواست (Rate Limit) و افزایش قابلیت اطمینان.

Smart API key rotation system to prevent rate limits and increase reliability.

---

## ✨ ویژگی‌ها | Features

### 🔄 چرخش خودکار
- **چرخش هوشمند** بین چندین API Key
- **رد کردن کلیدهای محدود شده** و استفاده از کلید بعدی
- **تشخیص خودکار Rate Limit** از HTTP status و پیام خطا

### 🎯 تلاش مجدد خودکار
- **تا 3 بار** با کلیدهای مختلف امتحان می‌کند
- اگر یک کلید رت لیمیت خورد، **بلافاصله** کلید بعدی را امتحان می‌کند
- اگر همه کلیدها محدود شدند، **پیام دوزبانه** نمایش می‌دهد

### 📊 ردیابی وضعیت کلیدها
- **Map از کلیدهای محدود شده** با زمان انقضا
- **شمارش خطاهای متوالی** برای هر کلید
- **غیرفعال‌سازی موقت** کلیدهای پرمشکل

### 🧹 پاکسازی خودکار
- **حذف خودکار** کلیدها از لیست محدود بعد از انقضا
- **بازیابی خودکار** کلیدهای معیوب بعد از 5 دقیقه

---

## 🛠️ نحوه کار | How It Works

### 1. دریافت کلید API

```typescript
const apiKey = getNextAPIKey('openrouter');
```

**فرآیند:**
1. لیست کلیدها را بررسی می‌کند
2. کلیدهای محدود شده را رد می‌کند
3. اولین کلید معتبر را برمی‌گرداند
4. Index را برای دفعه بعد به‌روز می‌کند

### 2. ارسال درخواست با Retry

```typescript
// تا 3 بار امتحان می‌کند
for (let attempt = 0; attempt < 3; attempt++) {
  const apiKey = getNextAPIKey(provider);
  const result = await sendChatMessageWithKey(...);

  if (!result.error) {
    return result; // موفق!
  }

  if (isRateLimitError(result.error)) {
    continue; // امتحان کلید بعدی
  }

  return result; // خطای دیگری، بلافاصله برگردان
}
```

### 3. تشخیص Rate Limit

**از دو روش:**

**الف) HTTP Status Code:**
```typescript
if (response.status === 429) {
  const retryAfter = response.headers.get('retry-after') || 60;
  markKeyAsRateLimited(provider, keyIndex, retryAfter);
}
```

**ب) متن پیام خطا:**
```typescript
if (errorMessage.includes('rate limit') ||
    errorMessage.includes('too many requests')) {
  markKeyAsRateLimited(provider, keyIndex, 60);
}
```

### 4. علامت‌گذاری کلیدها

**موفق ✅:**
```typescript
markKeyAsSuccess(provider, keyIndex);
// شمارش خطا را صفر می‌کند
```

**شکست ❌:**
```typescript
markKeyAsFailed(provider, keyIndex);
// شمارش خطا +1
// اگر 3 بار شکست خورد → غیرفعال برای 5 دقیقه
```

**محدود شده 🚫:**
```typescript
markKeyAsRateLimited(provider, keyIndex, 60);
// کلید را برای 60 ثانیه غیرفعال می‌کند
```

---

## ⚙️ پیکربندی | Configuration

### تنظیم API Keys در `.env.local`:

```bash
# چندین کلید با کاما جدا کنید
NEXT_PUBLIC_OPENROUTER_API_KEYS=sk-key1,sk-key2,sk-key3
```

**مثال:**
```bash
NEXT_PUBLIC_OPENROUTER_API_KEYS=sk-or-v1-xxxxx,sk-or-v1-yyyyy,sk-or-v1-zzzzz
```

### تنظیمات پیشرفته:

```typescript
// حداکثر تعداد تلاش با کلیدهای مختلف
const maxRetries = 3;

// زمان غیرفعالی بعد از 3 شکست
const disableTime = 300; // 5 دقیقه

// زمان پیش‌فرض برای rate limit
const defaultRetryAfter = 60; // 1 دقیقه
```

---

## 📊 نمودار جریان | Flow Diagram

```
┌─────────────────────────┐
│  کاربر پیام می‌فرستد    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ دریافت کلید API #1     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   ارسال به OpenRouter   │
└───────────┬─────────────┘
            │
      ┌─────┴─────┐
      │           │
      ▼           ▼
   موفق؟       429 Error
      │           │
      │           ▼
      │     ┌─────────────────┐
      │     │ علامت‌گذاری     │
      │     │ کلید محدود       │
      │     └────────┬────────┘
      │              │
      │              ▼
      │     ┌─────────────────┐
      │     │ امتحان کلید #2  │
      │     └────────┬────────┘
      │              │
      │        ┌─────┴─────┐
      │        │           │
      │        ▼           ▼
      │     موفق؟      429 Error
      │        │           │
      │        │           ▼
      │        │     ┌─────────────┐
      │        │     │ کلید #3     │
      │        │     └─────┬───────┘
      │        │           │
      ▼        ▼           ▼
   ┌──────────────────────────┐
   │   پاسخ به کاربر         │
   └──────────────────────────┘
```

---

## 🎯 سناریوهای مختلف | Scenarios

### سناریو 1: همه چیز نرمال ✅

```
👤 کاربر: "سلام!"
🔑 Key #1 → ✅ موفق
🤖 AI: "سلام! چطور می‌تونم کمکتون کنم؟"
```

### سناریو 2: یک کلید رت لیمیت خورد 🔄

```
👤 کاربر: "چه کارهایی انجام بدم؟"
🔑 Key #1 → ❌ 429 Rate Limited
   ↓ علامت‌گذاری محدود (60s)
🔑 Key #2 → ✅ موفق
🤖 AI: "با توجه به تسک‌هاتون..."
```

### سناریو 3: دو کلید محدود شد 🔄🔄

```
👤 کاربر: "یه برنامه بساز"
🔑 Key #1 → ❌ 429 Rate Limited
🔑 Key #2 → ❌ 429 Rate Limited
🔑 Key #3 → ✅ موفق
🤖 AI: "برنامه روزانه شما..."
```

### سناریو 4: همه کلیدها محدود شدند 🚫

```
👤 کاربر: "کمکم کن"
🔑 Key #1 → ❌ محدود تا 14:30
🔑 Key #2 → ❌ محدود تا 14:32
🔑 Key #3 → ❌ محدود تا 14:35
🤖 خطا: "All API keys are rate limited.
         Please try again later.
         (تمام کلیدها محدود شدند.
         لطفاً بعداً امتحان کنید.)"
```

### سناریو 5: یک کلید 3 بار شکست خورد ⚠️

```
🔑 Key #2:
   Request #1 → ❌ Error (failures: 1)
   Request #2 → ❌ Error (failures: 2)
   Request #3 → ❌ Error (failures: 3)
   ↓
   🚫 غیرفعال برای 5 دقیقه

   بعد از 5 دقیقه:
   ✅ فعال مجدد
```

---

## 🔍 لاگ‌های سیستم | System Logs

### لاگ‌های عادی:

```javascript
[AI Config] Found 3 API keys for openrouter
[API Key Rotation] Using key 1/3 for openrouter
[AI Service] Attempt 1/3 with key 1
✅ Success!
```

### وقتی رت لیمیت خورد:

```javascript
[AI Config] Found 3 API keys for openrouter
[API Key Rotation] Using key 1/3 for openrouter
[AI Service] Attempt 1/3 with key 1
⚠️ [AI Service] Rate limited! Retry after 60s
⚠️ [API Key Rotation] Marked key 1 as rate limited for 60s
[API Key Rotation] Using key 2/3 for openrouter
[AI Service] Attempt 2/3 with key 2
✅ Success!
```

### وقتی کلید غیرفعال می‌شود:

```javascript
[API Key Rotation] Key 2/3 is rate limited until 14:35:00
❌ [API Key Rotation] Key 2 failed 3 times, temporarily disabled
[API Key Rotation] Using key 3/3 for openrouter
```

### وقتی همه محدود شدند:

```javascript
[API Key Rotation] Key 1/3 is rate limited until 14:30:00
[API Key Rotation] Key 2/3 is rate limited until 14:32:00
[API Key Rotation] Key 3/3 is rate limited until 14:35:00
⚠️ [API Key Rotation] All 3 API keys are rate limited!
```

---

## 📈 مزایا | Benefits

### 1. قابلیت اطمینان بالاتر 🛡️
- اگر یک کلید مشکل داشته باشد، کلیدهای دیگر کار می‌کنند
- **99% uptime** با 3 کلید

### 2. محدودیت کمتر ⚡
- هر کلید محدودیت جداگانه دارد
- با 3 کلید، **3 برابر** ظرفیت

### 3. هوشمند و خودکار 🤖
- نیازی به دخالت کاربر نیست
- **خودکار** بهترین کلید را انتخاب می‌کند

### 4. بهبود تجربه کاربر 😊
- **کمتر خطا** می‌بیند
- **سریع‌تر** پاسخ می‌گیرد
- **پیام‌های دوزبانه** واضح

---

## 🧪 تست کردن | Testing

### تست دستی:

1. **تنظیم یک کلید:**
   ```bash
   NEXT_PUBLIC_OPENROUTER_API_KEYS=sk-key1
   ```
   - ارسال چند پیام تا رت لیمیت بخورد
   - باید خطا ببینید

2. **تنظیم سه کلید:**
   ```bash
   NEXT_PUBLIC_OPENROUTER_API_KEYS=sk-key1,sk-key2,sk-key3
   ```
   - ارسال پیام‌های زیاد
   - باید **بدون خطا** کار کند

3. **بررسی Console:**
   - F12 → Console
   - ببینید کدام کلید استفاده می‌شود
   - ببینید چه موقع switch می‌شود

### تست خودکار:

```typescript
// تست چرخش
test('should rotate through keys', () => {
  const key1 = getNextAPIKey('openrouter');
  const key2 = getNextAPIKey('openrouter');
  const key3 = getNextAPIKey('openrouter');
  const key4 = getNextAPIKey('openrouter');

  expect(key4).toBe(key1); // برگشت به اول
});

// تست رد کردن کلید محدود
test('should skip rate limited keys', () => {
  markKeyAsRateLimited('openrouter', 0, 60);
  const key = getNextAPIKey('openrouter');

  expect(key).not.toBe(keys[0]); // کلید اول را رد کرد
});
```

---

## 🐛 عیب‌یابی | Troubleshooting

### مشکل: همیشه کلید اول استفاده می‌شود

**راه‌حل:**
```javascript
// بررسی کنید کلیدها درست تنظیم شده‌اند
console.log(getAPIKeys('openrouter'));
// باید آرایه‌ای با چند عضو ببینید
```

### مشکل: خطای "All keys are rate limited"

**راه‌حل:**
1. صبر کنید تا محدودیت‌ها منقضی شوند
2. یا کلیدهای بیشتری اضافه کنید

### مشکل: کلید غیرفعال شده بدون دلیل

**راه‌حل:**
```javascript
// بررسی لاگ‌ها
// اگر 3 بار شکست خورد، 5 دقیقه غیرفعال می‌شود
// بعد از 5 دقیقه خودکار فعال می‌شود
```

---

## 📚 API Reference

### `getNextAPIKey(provider: string): string | null`
دریافت کلید API بعدی (کلیدهای محدود شده را رد می‌کند)

### `markKeyAsRateLimited(provider: string, keyIndex: number, retryAfterSeconds: number)`
علامت‌گذاری یک کلید به عنوان محدود شده

### `markKeyAsFailed(provider: string, keyIndex: number)`
ثبت یک شکست برای کلید (بعد از 3 بار → غیرفعال)

### `markKeyAsSuccess(provider: string, keyIndex: number)`
ثبت موفقیت و صفر کردن شمارنده خطا

### `getCurrentKeyIndex(): number`
دریافت index کلید فعلی

---

## 💡 نکات بهینه‌سازی | Optimization Tips

### 1. تعداد کلید مناسب
```
1 کلید  → خطر rate limit بالا
3 کلید  → ✅ تعادل خوب (پیشنهاد می‌شود)
5+ کلید → برای ترافیک بسیار بالا
```

### 2. توزیع بار
```typescript
// کلیدها را بین چند سرویس تقسیم کنید
const chatKeys = [key1, key2];
const analyticsKeys = [key3, key4];
```

### 3. مانیتورینگ
```typescript
// اضافه کردن متریک‌ها
window.aiKeyStats = {
  totalRequests: 0,
  rateLimitHits: 0,
  keySwitches: 0
};
```

---

**با این سیستم، دیگر نگران Rate Limit نباشید! 🎉**

**Last Updated**: 2025-12-28
**Version**: 2.0.0
