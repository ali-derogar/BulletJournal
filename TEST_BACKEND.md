# تست Backend

## مرحله 1: بررسی کن Backend اجرا شده؟

```bash
# در terminal جداگانه
cd backend
uvicorn main:app --reload
```

باید ببینی:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
```

---

## مرحله 2: تست کن API کار می‌کنه

با مرورگر برو به:
```
http://localhost:8000/docs
```

باید Swagger UI رو ببینی با endpoint‌های جدید:
- POST /api/actions/create-task
- POST /api/actions/create-goal
- POST /api/actions/create-calendar-note
و غیره

---

## مرحله 3: تست دستی

باز کن browser console (F12) و اجرا کن:

```javascript
// تست 1: چک کن backend در دسترسه
fetch('http://localhost:8000/health')
  .then(r => r.json())
  .then(console.log)

// تست 2: چک کن token داری
console.log('Token:', localStorage.getItem('auth_token'))

// تست 3: تست endpoint
const token = localStorage.getItem('auth_token');
fetch('http://localhost:8000/api/actions/create-task', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    title: 'تست',
    date: '1404/10/08',
    status: 'todo'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

---

## اگه Network tab خالی بود:

یعنی **frontend اصلاً request نفرستاده!**

احتمال‌ها:
1. ❌ Token نداری (login نکردی)
2. ❌ Entity extraction fail شده
3. ❌ ActionResult undefined برگشته

---

## Debug بیشتر:

توی browser console دقت کن به این لاگ‌ها:

```
[Intent] Extracting entities from user message: ...
[Intent] AI Response: ...
[Intent] Extracted entities: ...
[AI Actions] Create task ...
```

اگه هیچکدوم از لاگ‌های بالا رو ندیدی، یعنی کد اصلاً اون قسمت نرسیده!
