# 📝 سیستم مدیریت محتوا (Content Management System)

## نمای کلی

سیستم مدیریت محتوای پیشرفته با قابلیت‌های زیر:
- مدیریت Tasks (وظایف کاربران)
- مدیریت Journals (ژورنال‌های روزانه)
- مدیریت Goals (اهداف کاربران)
- سیستم گزارش‌دهی محتوا (Content Reporting)
- آمارگیری و تحلیل محتوا

---

## 🚀 نصب و راه‌اندازی

### 1. اجرای Migration

Migration رو برای ایجاد جدول گزارش‌ها اجرا کنید:

```bash
docker exec -it bulletjournal-backend alembic upgrade head
```

**خروجی مورد انتظار:**
```
✅ Created reports table for content moderation
INFO  [alembic.runtime.migration] Running upgrade 009_add_userid_column -> 010_add_reports_table
```

### 2. بازنشانی Frontend (اختیاری)

اگر frontend در حال اجرا است، آن را restart کنید:

```bash
# اگر با npm run dev اجرا می‌کنید
Ctrl+C  # توقف
npm run dev  # شروع مجدد

# اگر Docker استفاده می‌کنید
docker restart bulletjournal-frontend
```

---

## 📊 ساختار Backend

### Models

#### Report Model (`app/models/report.py`)
```python
class Report(Base):
    id: str                    # شناسه یکتا
    reporter_id: str           # کاربری که گزارش داده
    reported_user_id: str      # صاحب محتوا
    content_type: str          # نوع محتوا: task, journal, goal, profile
    content_id: str            # ID محتوای گزارش‌شده
    reason: str                # دلیل: spam, inappropriate, harassment, other
    description: str           # توضیحات اضافی
    status: str                # وضعیت: pending, reviewed, dismissed, actioned
    admin_notes: str           # یادداشت ادمین
    reviewed_by: str           # ID ادمینی که بررسی کرده
    reviewed_at: datetime      # زمان بررسی
    created_at: datetime       # زمان ایجاد
```

### API Endpoints

همه endpointها نیاز به authentication و نقش ADMIN/SUPERUSER دارند.

#### `GET /admin/content/stats`
آمار کلی محتوا

**Response:**
```json
{
  "total_tasks": 1250,
  "total_journals": 850,
  "total_goals": 320,
  "total_reports": 15,
  "pending_reports": 3,
  "tasks_today": 45,
  "active_goals": 280,
  "completed_goals": 40
}
```

#### `GET /admin/content/tasks`
لیست تمام Taskها

**Query Parameters:**
- `page` (default: 1)
- `size` (default: 20, max: 100)
- `user_id` - فیلتر بر اساس کاربر
- `status` - فیلتر بر اساس وضعیت (todo, in-progress, done)
- `search` - جستجو در عنوان

**Response:**
```json
{
  "tasks": [
    {
      "id": "task-123",
      "userId": "user-456",
      "user_email": "user@example.com",
      "user_name": "نام کاربر",
      "date": "2025-12-30",
      "title": "عنوان وظیفه",
      "status": "done",
      "created_at": "2025-12-30T10:00:00Z",
      "spentTime": 45.5
    }
  ],
  "total": 1250,
  "page": 1,
  "size": 20
}
```

#### `GET /admin/content/journals`
لیست تمام Journalها

**Query Parameters:**
- `page`, `size`, `user_id`

#### `GET /admin/content/goals`
لیست تمام Goalها

**Query Parameters:**
- `page`, `size`, `user_id`
- `status` - active, completed, failed, paused
- `type` - yearly, quarterly, monthly, weekly

#### `DELETE /admin/content/tasks/{task_id}`
حذف (soft delete) یک Task

**Body:**
```json
{
  "reason": "محتوای نامناسب"
}
```

#### `DELETE /admin/content/journals/{journal_id}`
حذف یک Journal

#### `DELETE /admin/content/goals/{goal_id}`
حذف یک Goal (permanent delete)

#### `GET /admin/content/reports`
لیست گزارش‌های محتوا

**Query Parameters:**
- `page`, `size`
- `status` - pending, reviewed, dismissed, actioned
- `content_type` - task, journal, goal, profile

**Response:**
```json
{
  "reports": [
    {
      "id": "report-123",
      "reporter_id": "user-789",
      "reporter_email": "reporter@example.com",
      "reported_user_id": "user-456",
      "reported_user_email": "reported@example.com",
      "content_type": "task",
      "content_id": "task-123",
      "reason": "spam",
      "description": "این محتوا اسپم است",
      "status": "pending",
      "created_at": "2025-12-30T12:00:00Z"
    }
  ],
  "total": 15,
  "page": 1,
  "size": 20
}
```

#### `PATCH /admin/content/reports/{report_id}`
بررسی و تصمیم‌گیری درباره گزارش

**Body:**
```json
{
  "status": "actioned",
  "admin_notes": "محتوا حذف شد و کاربر اخطار گرفت"
}
```

**Status values:**
- `reviewed` - بررسی شده، مشکلی نبود
- `dismissed` - رد شد
- `actioned` - اقدام انجام شد

---

## 🎨 Frontend Structure

### صفحات

#### 1. Content Overview (`/admin/content`)
**مسیر**: `app/admin/content/page.tsx`

**ویژگی‌ها:**
- نمایش آمار کلی (4 ویجت اصلی)
- کارت‌های دسترسی سریع به:
  - مدیریت Tasks
  - مدیریت Journals
  - مدیریت Goals
  - گزارش‌های محتوا
- آمار سریع (Quick Stats)
- نمای کلی توزیع محتوا

**آمارهای نمایش‌داده‌شده:**
- تعداد کل Tasks
- تعداد Tasks امروز
- تعداد کل Journals
- تعداد کل Goals (با تفکیک active/completed)
- تعداد گزارش‌ها (با highlight برای pending)

#### 2. Tasks Management (`/admin/content/tasks`) ⚠️
این صفحه در این پیاده‌سازی نیست - برای آینده

**پیشنهادی:**
- جدول لیست Tasks
- فیلترها: user, status, search
- اقدامات: حذف, مشاهده جزئیات
- Pagination

#### 3. Journals Management (`/admin/content/journals`) ⚠️
این صفحه در این پیاده‌سازی نیست - برای آینده

#### 4. Goals Management (`/admin/content/goals`) ⚠️
این صفحه در این پیاده‌سازی نیست - برای آینده

#### 5. Reported Content (`/admin/content/reports`) ⚠️
این صفحه در این پیاده‌سازی نیست - برای آینده

### Services

#### Content Service (`services/content.ts`)

**توابع موجود:**

```typescript
// آمار
getContentStats(): Promise<ContentStats>

// Tasks
getTasks(params?: ContentListParams): Promise<ContentListResponse<TaskItem>>
deleteTask(taskId: string, reason: string): Promise<void>

// Journals
getJournals(params?: ContentListParams): Promise<ContentListResponse<JournalItem>>
deleteJournal(journalId: string, reason: string): Promise<void>

// Goals
getGoals(params?: ContentListParams): Promise<ContentListResponse<GoalItem>>
deleteGoal(goalId: string, reason: string): Promise<void>

// Reports
getReports(params?: ContentListParams): Promise<ContentListResponse<ReportItem>>
reviewReport(reportId: string, status: string, adminNotes?: string): Promise<void>

// Helpers
formatDate(dateString: string): string
getStatusBadgeColor(status: string): string
```

---

## 🔐 امنیت

### Backend Protection
✅ تمام endpointها نیاز به authentication دارند
✅ تمام endpointها نقش ADMIN یا SUPERUSER را چک می‌کنند
✅ Soft delete برای Tasks و Journals (قابل بازیابی)
✅ Hard delete برای Goals (حذف دائمی)
✅ لاگ کردن دلیل حذف

### Frontend Protection
✅ AdminGuard برای محافظت از route
✅ نمایش فقط برای کاربران ADMIN/SUPERUSER
✅ Error handling مناسب

---

## 📋 کارهای باقی‌مانده (TODO)

صفحات زیر هنوز ساخته نشده‌اند و می‌توانید آن‌ها را اضافه کنید:

### 1. Tasks Management Page
**مسیر**: `app/admin/content/tasks/page.tsx`

**ویژگی‌های پیشنهادی:**
```
- جدول با ستون‌ها:
  - عنوان Task
  - کاربر (email/name)
  - تاریخ
  - وضعیت (badge با رنگ)
  - زمان صرف‌شده
  - اقدامات (حذف، مشاهده)

- فیلترها:
  - جستجو در عنوان
  - فیلتر کاربر
  - فیلتر وضعیت (todo/in-progress/done)

- Pagination با page size قابل تنظیم
```

### 2. Journals Management Page
**مسیر**: `app/admin/content/journals/page.tsx`

### 3. Goals Management Page
**مسیر**: `app/admin/content/goals/page.tsx`

**فیلترهای اضافی:**
- نوع Goal (yearly, quarterly, monthly, weekly)
- وضعیت (active, completed, failed, paused)

### 4. Reported Content Page
**مسیر**: `app/admin/content/reports/page.tsx`

**ویژگی‌های مهم:**
```
- جدول گزارش‌ها با:
  - کاربر گزارش‌دهنده
  - کاربر گزارش‌شده
  - نوع محتوا
  - دلیل
  - وضعیت (با badge رنگی)

- مدال بررسی گزارش:
  - نمایش جزئیات کامل
  - انتخاب action (reviewed, dismissed, actioned)
  - فیلد یادداشت ادمین
  - دکمه‌های: View Content, Dismiss, Take Action

- فیلترها:
  - وضعیت (pending prioritized)
  - نوع محتوا
```

---

## 🎯 نمونه استفاده

### در کامپوننت React:

```tsx
import { useEffect, useState } from 'react';
import { getContentStats, getTasks, deleteTask } from '@/services/content';

function MyComponent() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function loadData() {
      // دریافت آمار
      const contentStats = await getContentStats();
      setStats(contentStats);

      // دریافت لیست Tasks
      const tasks = await getTasks({
        page: 1,
        size: 20,
        status: 'done'
      });

      // حذف یک Task
      await deleteTask('task-123', 'محتوای نامناسب');
    }
    loadData();
  }, []);
}
```

---

## 🧪 تست

### Test Checklist

#### Backend:
- [ ] آیا `/admin/content/stats` آمار صحیح برمی‌گرداند؟
- [ ] آیا USER می‌تواند به endpointها دسترسی داشته باشد؟ (باید 403 بگیرد)
- [ ] آیا pagination درست کار می‌کند؟
- [ ] آیا فیلترها درست اعمال می‌شوند؟
- [ ] آیا soft delete برای Tasks/Journals کار می‌کند؟
- [ ] آیا Review گزارش‌ها ذخیره می‌شود؟

#### Frontend:
- [ ] آیا صفحه `/admin/content` لود می‌شود؟
- [ ] آیا آمارها درست نمایش داده می‌شوند؟
- [ ] آیا کاربر USER می‌تواند وارد شود؟ (باید redirect شود)
- [ ] آیا navigation به Content active می‌شود؟
- [ ] آیا loading state درست کار می‌کند؟
- [ ] آیا error handling درست است؟

---

## 📞 پشتیبانی

اگر مشکلی پیش آمد:

1. لاگ‌های backend را بررسی کنید:
```bash
docker logs bulletjournal-backend
```

2. بررسی کنید migration اجرا شده باشد:
```bash
docker exec -it bulletjournal-backend alembic current
```

باید output شامل `010_add_reports_table` باشد.

3. DevTools مرورگر را چک کنید:
   - Network tab → API calls
   - Console → Error messages

---

## 🎉 خلاصه

شما الان دارید:
✅ سیستم کامل آمارگیری محتوا
✅ APIهای مدیریت Tasks, Journals, Goals
✅ سیستم گزارش‌دهی محتوا
✅ صفحه Overview با آمار و لینک‌های سریع
✅ Navigation به Content Management
✅ امنیت کامل در backend و frontend

برای اضافه کردن صفحات باقی‌مانده (Tasks list, Reports, etc.)، می‌توانید از همین pattern استفاده کنید! 🚀
