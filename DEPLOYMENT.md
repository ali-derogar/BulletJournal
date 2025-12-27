# راهنمای دیپلوی BulletJournal

این راهنما سه روش مختلف برای دیپلوی خودکار پروژه را توضیح می‌دهد.

## 🎯 روش ۱: اسکریپت دیپلوی دستی (ساده‌ترین)

### راه‌اندازی اولیه سرور

فقط یک بار در سرور جدید اجرا کنید:

```bash
# دانلود و اجرای اسکریپت راه‌اندازی
curl -fsSL https://raw.githubusercontent.com/ali-derogar/BulletJournal/master/server-setup.sh -o server-setup.sh
chmod +x server-setup.sh
sudo ./server-setup.sh
```

این اسکریپت همه چیز را نصب می‌کند:
- ✅ Git
- ✅ Docker & Docker Compose
- ✅ Node.js & npm
- ✅ tmux
- ✅ کلون پروژه
- ✅ سرویس systemd

### دیپلوی بعدی (هر بار که تغییر دادید)

بعد از راه‌اندازی اولیه، فقط این دستور را اجرا کنید:

```bash
sudo /opt/bulletjournal/deploy.sh
```

یا اگر در پوشه پروژه هستید:

```bash
sudo ./deploy.sh
```

**این اسکریپت خودکار:**
- ✅ آخرین تغییرات را از GitHub می‌گیرد
- ✅ کانتینرها را متوقف می‌کند
- ✅ ایمیج‌های جدید را می‌سازد
- ✅ کانتینرها را راه‌اندازی می‌کند
- ✅ وضعیت را نشان می‌دهد

---

## 🚀 روش ۲: GitHub Actions (کاملاً خودکار)

### تنظیمات اولیه

1. **راه‌اندازی اولیه سرور** (مثل روش ۱):
```bash
curl -fsSL https://raw.githubusercontent.com/ali-derogar/BulletJournal/master/server-setup.sh -o server-setup.sh
chmod +x server-setup.sh
sudo ./server-setup.sh
```

2. **تنظیم SSH Keys در GitHub:**

   الف) کلید SSH ایجاد کنید (در کامپیوتر محلی):
   ```bash
   ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions
   ```

   ب) کلید عمومی را به سرور اضافه کنید:
   ```bash
   ssh-copy-id -i ~/.ssh/github_actions.pub your-user@your-server
   ```

   ج) کلید خصوصی را کپی کنید:
   ```bash
   cat ~/.ssh/github_actions
   ```

3. **اضافه کردن Secrets به GitHub:**

   به مسیر زیر بروید:
   ```
   GitHub Repository → Settings → Secrets and variables → Actions → New repository secret
   ```

   این Secrets را اضافه کنید:
   - `SERVER_HOST`: آدرس IP سرور (مثلاً: `45.89.244.24`)
   - `SERVER_USER`: نام کاربری SSH (مثلاً: `root` یا `ubuntu`)
   - `SSH_PRIVATE_KEY`: کلید خصوصی که کپی کردید
   - `SERVER_PORT`: پورت SSH (معمولاً: `22`)

### استفاده

حالا هر بار که به برنچ `master` پوش می‌کنید، **خودکار** دیپلوی می‌شود! 🎉

```bash
git add .
git commit -m "fix: some bug"
git push
# ← GitHub Actions خودکار دیپلوی می‌کند
```

برای دیپلوی دستی:
- به GitHub بروید → Actions → Deploy to Server → Run workflow

---

## 🔄 روش ۳: Systemd Service (اتوماتیک بعد از ریستارت)

اگر از `server-setup.sh` استفاده کردید، یک سرویس systemd نصب شده که:
- ✅ بعد از ریستارت سرور، خودکار اجرا می‌شود
- ✅ Docker را مدیریت می‌کند

### دستورات سرویس:

```bash
# شروع
sudo systemctl start bulletjournal

# توقف
sudo systemctl stop bulletjournal

# ریستارت
sudo systemctl restart bulletjournal

# وضعیت
sudo systemctl status bulletjournal

# فعال‌سازی برای اجرای خودکار بعد از بوت
sudo systemctl enable bulletjournal

# غیرفعال‌سازی
sudo systemctl disable bulletjournal
```

---

## 📝 دستورات مفید

### مشاهده لاگ‌ها
```bash
cd /opt/bulletjournal
sudo docker compose logs -f
```

### مشاهده وضعیت کانتینرها
```bash
cd /opt/bulletjournal
sudo docker compose ps
```

### دیباگ
```bash
# لاگ فقط frontend
sudo docker compose logs -f frontend

# لاگ فقط backend
sudo docker compose logs -f backend

# ورود به کانتینر
sudo docker exec -it bulletjournal-frontend sh
sudo docker exec -it bulletjournal-backend sh
```

### تمیز کردن (پاک کردن همه چیز)
```bash
cd /opt/bulletjournal
sudo docker compose down -v  # حذف volumes هم
sudo docker system prune -a  # حذف تمام ایمیج‌های استفاده نشده
```

---

## 🔧 تغییر تنظیمات

### ویرایش environment variables
```bash
sudo nano /opt/bulletjournal/.env.local
sudo /opt/bulletjournal/deploy.sh
```

### تغییر آدرس repository
```bash
sudo nano /opt/bulletjournal/deploy.sh
# خط REPO_URL را ویرایش کنید
```

---

## ⚡ سوالات متداول

### چطور فقط frontend را rebuild کنم؟
```bash
cd /opt/bulletjournal
sudo docker compose up -d --build frontend
```

### چطور فقط backend را rebuild کنم؟
```bash
cd /opt/bulletjournal
sudo docker compose up -d --build backend
```

### چطور کانتینرها را بدون rebuild ریستارت کنم؟
```bash
cd /opt/bulletjournal
sudo docker compose restart
```

### چطور به دیتابیس دسترسی پیدا کنم؟
```bash
sudo docker exec -it bulletjournal-backend sh
cd data
sqlite3 bullet_journal.db
```

---

## 🎯 خلاصه: کدام روش را انتخاب کنم؟

| روش | زمان راه‌اندازی | سادگی | خودکار بودن | توصیه برای |
|-----|-----------------|--------|-------------|-----------|
| اسکریپت دستی | ۵ دقیقه | ⭐⭐⭐⭐⭐ | دستی | شروع سریع، تیم‌های کوچک |
| GitHub Actions | ۱۵ دقیقه | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | پروژه‌های تیمی، CI/CD |
| Systemd | خودکار | ⭐⭐⭐⭐ | ⭐⭐⭐ | اجرای خودکار بعد از ریستارت |

**توصیه:** از هر سه روش با هم استفاده کنید! 🚀
