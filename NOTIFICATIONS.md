# 🔔 سیستم نوتیفیکیشن (Notification System)

## نمای کلی

سیستم نوتیفیکیشن پیشرفته با قابلیت‌های زیر:
- 🔔 نوتیفیکیشن در اپلیکیشن (In-App Notifications)
- 📱 نوتیفیکیشن Push با Service Worker
- 🔕 قابلیت Mute کردن نوتیفیکیشن‌ها
- ✅ علامت‌گذاری به عنوان خوانده‌شده
- 🎯 ارسال نوتیفیکیشن توسط ادمین برای:
  - همه کاربران
  - کاربران با نقش خاص (USER, ADMIN, SUPERUSER)
  - کاربران خاص (با ID)

---

## 🚀 نصب و راه‌اندازی

### 1. اجرای Migration

```bash
docker exec -it bulletjournal-backend alembic upgrade head
```

**خروجی مورد انتظار:**
```
✅ Created notifications and push_subscriptions tables
INFO  [alembic.runtime.migration] Running upgrade 010_add_reports_table -> 011_add_notifications
```

### 2. تنظیم VAPID Keys (برای Push Notifications)

برای استفاده از Push Notifications باید VAPID keys تنظیم شوند:

```bash
# نصب web-push
npm install -g web-push

# تولید VAPID keys
web-push generate-vapid-keys
```

سپس در فایل `.env.local` اضافه کنید:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-key-here
VAPID_PRIVATE_KEY=your-private-key-here
VAPID_SUBJECT=mailto:your-email@example.com
```

### 3. Restart کردن Frontend

```bash
# اگر با npm اجرا می‌کنید
Ctrl+C
npm run dev

# اگر Docker استفاده می‌کنید
docker restart bulletjournal-frontend
```

---

## 📊 ساختار Backend

### Models

#### Notification Model (`app/models/notification.py`)
```python
class Notification(Base):
    id: str                    # شناسه یکتا
    user_id: str               # کاربر هدف
    title: str                 # عنوان
    message: str               # پیام
    type: str                  # نوع: info, success, warning, error
    link: str                  # لینک اختیاری برای navigation
    is_read: bool              # خوانده شده؟
    is_muted: bool             # Mute شده؟
    sent_by: str               # ادمین/سوپریوزری که ارسال کرده
    created_at: datetime       # زمان ایجاد
    read_at: datetime          # زمان خواندن
```

#### PushSubscription Model
```python
class PushSubscription(Base):
    id: str                    # شناسه یکتا
    user_id: str               # کاربر
    endpoint: str              # Push endpoint
    p256dh: str                # Encryption key
    auth: str                  # Auth secret
    user_agent: str            # دستگاه کاربر
    created_at: datetime       # زمان ایجاد
    last_used: datetime        # آخرین استفاده
```

### API Endpoints

همه endpointها تحت `/api/notifications` هستند.

#### 🔹 User Endpoints

**`GET /api/notifications`**
دریافت نوتیفیکیشن‌های کاربر جاری

Query Parameters:
- `limit` (default: 50)
- `offset` (default: 0)
- `unread_only` (default: false)

Response:
```json
[
  {
    "id": "notif-123",
    "user_id": "user-456",
    "title": "Welcome!",
    "message": "Welcome to Bullet Journal",
    "type": "info",
    "link": "/profile",
    "is_read": false,
    "is_muted": false,
    "sent_by": "admin-789",
    "created_at": "2025-12-30T12:00:00Z",
    "read_at": null
  }
]
```

**`GET /api/notifications/stats`**
آمار نوتیفیکیشن‌های کاربر

Response:
```json
{
  "total": 25,
  "unread": 5,
  "muted": 2
}
```

**`PATCH /api/notifications/{id}/read`**
علامت‌گذاری به عنوان خوانده‌شده

**`PATCH /api/notifications/read-all`**
علامت‌گذاری همه به عنوان خوانده‌شده

**`PATCH /api/notifications/{id}/mute`**
Mute کردن یک نوتیفیکیشن

**`DELETE /api/notifications/{id}`**
حذف یک نوتیفیکیشن

**`POST /api/notifications/subscribe`**
Subscribe به Push Notifications

Body:
```json
{
  "endpoint": "https://...",
  "p256dh": "...",
  "auth": "..."
}
```

**`DELETE /api/notifications/unsubscribe`**
Unsubscribe از Push Notifications

#### 🔹 Admin Endpoints

**`POST /api/notifications/send`**
ارسال نوتیفیکیشن (ADMIN/SUPERUSER فقط)

Body:
```json
{
  "title": "System Update",
  "message": "The system will be under maintenance...",
  "type": "warning",
  "link": "/announcements",

  // یکی از موارد زیر:
  "user_ids": ["user-1", "user-2"],     // کاربران خاص
  "role": "USER",                        // نقش خاص
  // یا هیچ‌کدام برای همه کاربران
}
```

Response:
```json
{
  "message": "Notification sent to 150 users",
  "count": 150,
  "notification_ids": ["notif-1", "notif-2", ...]
}
```

**`GET /api/notifications/admin/all`**
دریافت همه نوتیفیکیشن‌ها (ADMIN/SUPERUSER فقط)

**`GET /api/notifications/admin/stats`**
آمار کلی نوتیفیکیشن‌ها

---

## 🎨 Frontend Structure

### 1. NotificationBell Component (`components/NotificationBell.tsx`)

کامپوننت زنگوله نوتیفیکیشن که در header نمایش داده می‌شود.

**ویژگی‌ها:**
- 🔴 Badge قرمز برای نوتیفیکیشن‌های خوانده‌نشده
- 📋 Dropdown با لیست نوتیفیکیشن‌ها
- ✅ Mark as read / Mark all as read
- 🔕 Mute notification
- 🗑️ Delete notification
- 🔄 Auto-refresh هر 30 ثانیه
- 🎯 کلیک روی نوتیفیکیشن → رفتن به لینک آن

### 2. Admin Notifications Page (`app/admin/notifications/page.tsx`)

صفحه ارسال نوتیفیکیشن برای ادمین‌ها.

**قسمت‌های صفحه:**

#### آمارها (Stats)
- تعداد کل نوتیفیکیشن‌ها
- تعداد خوانده‌نشده
- تعداد Mute شده
- تعداد Push Subscriptions

#### فرم ارسال
- عنوان (Title) *
- پیام (Message) *
- نوع (Type): info, success, warning, error
- لینک (optional)
- ارسال به:
  - همه کاربران
  - نقش خاص (USER/ADMIN/SUPERUSER)
  - کاربران خاص (با ID)

#### نوتیفیکیشن‌های اخیر
- لیست 10 نوتیفیکیشن آخر
- نمایش وضعیت (read/muted)
- نمایش ارسال‌کننده

### 3. Notification Service (`services/notifications.ts`)

سرویس کامل برای مدیریت نوتیفیکیشن‌ها.

**توابع User:**
```typescript
getNotifications(limit, offset, unreadOnly): Promise<Notification[]>
getNotificationStats(): Promise<NotificationStats>
markAsRead(notificationId): Promise<void>
markAllAsRead(): Promise<void>
muteNotification(notificationId): Promise<void>
deleteNotification(notificationId): Promise<void>
```

**توابع Push:**
```typescript
requestPushPermission(): Promise<NotificationPermission>
subscribeToPush(): Promise<boolean>
unsubscribeFromPush(): Promise<boolean>
isPushEnabled(): Promise<boolean>
```

**توابع Admin:**
```typescript
sendBulkNotification(notification): Promise<{count: number}>
getAllNotifications(limit, offset, userId?): Promise<{notifications, total}>
getAdminNotificationStats(): Promise<Stats>
```

**Helper Functions:**
```typescript
getNotificationTypeIcon(type): string  // 🔔, ✅, ⚠️, ❌
formatNotificationTime(date): string   // "5m ago", "2h ago", etc.
```

### 4. Service Worker (`public/sw.js`)

Service Worker با قابلیت Push Notifications.

**Event Handlers:**
- `push` - دریافت push notification
- `notificationclick` - کلیک روی notification
- `notificationclose` - بستن notification

---

## 🔐 امنیت

### Backend Protection
✅ تمام endpointهای کاربر نیاز به authentication دارند
✅ Endpointهای ادمین نقش ADMIN/SUPERUSER را چک می‌کنند
✅ هر کاربر فقط نوتیفیکیشن‌های خودش را می‌بیند
✅ Push subscriptions به user_id متصل هستند

### Frontend Protection
✅ NotificationBell فقط برای کاربران احراز هویت‌شده نمایش داده می‌شود
✅ AdminGuard برای محافظت از صفحه ادمین
✅ Error handling مناسب

---

## 📋 استفاده

### برای کاربران عادی

1. **مشاهده نوتیفیکیشن‌ها:**
   - کلیک روی آیکون زنگوله در header
   - نوتیفیکیشن‌های خوانده‌نشده با پس‌زمینه آبی نمایش داده می‌شوند

2. **فعال‌سازی Push Notifications:**
   ```typescript
   import { subscribeToPush } from '@/services/notifications';

   const enabled = await subscribeToPush();
   if (enabled) {
     alert('Push notifications enabled!');
   }
   ```

3. **غیرفعال‌سازی Push Notifications:**
   ```typescript
   import { unsubscribeFromPush } from '@/services/notifications';

   await unsubscribeFromPush();
   ```

### برای ادمین‌ها

1. **ارسال نوتیفیکیشن:**
   - رفتن به `/admin/notifications`
   - پر کردن فرم
   - انتخاب مخاطبان
   - کلیک روی "Send Notification"

2. **نمونه استفاده در کد:**
   ```typescript
   import { sendBulkNotification } from '@/services/notifications';

   // ارسال به همه کاربران
   await sendBulkNotification({
     title: 'System Maintenance',
     message: 'The system will be down for maintenance...',
     type: 'warning',
     link: '/announcements'
   });

   // ارسال به نقش خاص
   await sendBulkNotification({
     title: 'Admin Notice',
     message: 'New admin features available',
     type: 'info',
     role: 'ADMIN'
   });

   // ارسال به کاربران خاص
   await sendBulkNotification({
     title: 'Personal Message',
     message: 'You have been selected...',
     type: 'success',
     user_ids: ['user-1', 'user-2', 'user-3']
   });
   ```

---

## 🧪 تست

### Backend Testing

```bash
# تست ارسال نوتیفیکیشن
curl -X POST http://localhost:8000/api/notifications/send \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "message": "This is a test",
    "type": "info"
  }'

# تست دریافت نوتیفیکیشن‌ها
curl -X GET http://localhost:8000/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN"

# تست آمار
curl -X GET http://localhost:8000/api/notifications/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Frontend Testing

1. وارد شوید به عنوان کاربر
2. باز کردن DevTools → Console
3. تست توابع:
   ```javascript
   // در Console
   import { getNotifications } from '@/services/notifications';
   const notifs = await getNotifications();
   console.log(notifs);
   ```

### Push Notification Testing

1. باز کردن Chrome DevTools → Application tab
2. رفتن به "Service Workers"
3. چک کردن که service worker فعال است
4. رفتن به "Push Messaging"
5. ارسال تست push notification

---

## 🎯 نکات مهم

### 1. VAPID Keys
⚠️ **مهم**: برای استفاده از Push Notifications باید VAPID keys تنظیم شوند. بدون این keys، فقط نوتیفیکیشن in-app کار می‌کند.

### 2. HTTPS Requirement
Push Notifications فقط روی HTTPS کار می‌کنند (یا localhost برای development).

### 3. Browser Support
همه مرورگرها از Push Notifications پشتیبانی نمی‌کنند. کد به صورت اتوماتیک این را چک می‌کند.

### 4. Polling Interval
NotificationBell هر 30 ثانیه یکبار نوتیفیکیشن‌های جدید را می‌گیرد. می‌توانید این مقدار را تغییر دهید.

### 5. Service Worker Update
اگر service worker را تغییر دادید، باید مرورگر را refresh کنید یا service worker را unregister/register کنید.

---

## 🎉 ویژگی‌های پیشرفته

### Real-time Notifications با WebSocket (آینده)
می‌توانید WebSocket اضافه کنید برای دریافت real-time:
```python
# Backend
from fastapi import WebSocket

@app.websocket("/ws/notifications/{user_id}")
async def websocket_notifications(websocket: WebSocket, user_id: str):
    await websocket.accept()
    # Send notifications in real-time
```

### Notification Templates (آینده)
می‌توانید template برای نوتیفیکیشن‌های رایج بسازید:
```python
TEMPLATES = {
    "welcome": {
        "title": "Welcome to Bullet Journal!",
        "message": "Get started by creating your first task",
        "type": "success",
        "link": "/",
    },
    "goal_completed": {
        "title": "Goal Completed!",
        "message": "Congratulations on completing your goal: {goal_name}",
        "type": "success",
    }
}
```

### Notification Preferences (آینده)
اجازه دادن به کاربران برای تنظیم ترجیحات:
- کدام نوع نوتیفیکیشن‌ها را می‌خواهند؟
- Push یا فقط in-app؟
- چه ساعتی نوتیفیکیشن دریافت کنند؟

---

## 📞 پشتیبانی

اگر مشکلی پیش آمد:

1. **چک کردن migration:**
   ```bash
   docker exec -it bulletjournal-backend alembic current
   ```
   باید `011_add_notifications` را ببینید.

2. **چک کردن لاگ‌های backend:**
   ```bash
   docker logs bulletjournal-backend | grep notification
   ```

3. **چک کردن Service Worker:**
   - DevTools → Application → Service Workers
   - باید "activated and running" باشد

4. **چک کردن Push Subscription:**
   - DevTools → Application → Storage → IndexedDB → pushSubscription

---

## 🎊 خلاصه

شما الان دارید:
✅ سیستم کامل نوتیفیکیشن in-app
✅ Push Notifications با Service Worker
✅ کامپوننت زنگوله با dropdown
✅ صفحه ادمین برای ارسال نوتیفیکیشن
✅ قابلیت ارسال به همه/نقش‌خاص/کاربران‌خاص
✅ Mute و Delete نوتیفیکیشن‌ها
✅ آمارگیری کامل
✅ امنیت کامل در backend و frontend

سیستم نوتیفیکیشن شما آماده استفاده است! 🎉🔔
