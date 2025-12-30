# Admin System Documentation

## Overview

This is a **production-grade Super Admin Dashboard** with strict **Role-Based Access Control (RBAC)**. The system implements comprehensive security measures at both backend and frontend levels.

---

## 🛡️ Security Model

### Roles Hierarchy

1. **USER** (default)
   - Standard application access
   - NO admin privileges
   - Cannot access `/admin` routes

2. **ADMIN**
   - Can access admin dashboard
   - Can view statistics
   - Can ban/unban users
   - Can edit user XP and levels
   - **CANNOT** change user roles
   - **CANNOT** delete system data

3. **SUPERUSER**
   - Full system authority
   - Can promote/demote users (including to ADMIN)
   - Can manage other admins
   - All ADMIN permissions plus role management

### Security Principles

- ✅ **Backend validation is authoritative** - Frontend checks are UI-only
- ✅ **Denied by default** - Explicit permission required for admin access
- ✅ **Cannot self-demote** - Superusers cannot downgrade their own role
- ✅ **Protected endpoints** - All admin APIs require authentication + role validation
- ✅ **Banned users blocked** - Authentication fails for banned users
- ✅ **No client-side role trust** - Backend always validates from database

---

## 🚀 Setup & Bootstrapping

### 1. Run Database Migrations

```bash
cd backend
source venv/bin/activate
alembic upgrade head
```

This creates:
- `role` column (USER, ADMIN, SUPERUSER)
- `is_banned` column (boolean)
- `userId` column (for consistency)

### 2. Create First Superuser

**Method 1: Create new user as SUPERUSER**

```bash
cd backend
source venv/bin/activate
python3 create_superuser.py --create admin@example.com "Admin Name" "adminuser" "SecurePassword123"
```

**Method 2: Promote existing user**

```bash
python3 create_superuser.py existing@user.com
```

### 3. Start Backend Server

```bash
# Development
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000

# Production
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 4. Start Frontend

```bash
npm run dev
```

---

## 📡 Backend API Reference

### Admin Endpoints

All endpoints require `Authorization: Bearer <token>` header.

#### GET `/admin/stats`

**Access**: ADMIN, SUPERUSER

Returns dashboard statistics:

```json
{
  "totalUsers": 150,
  "activeToday": 23,
  "bannedUsers": 5,
  "newUsers7d": 12,
  "distribution": {
    "superusers": 2,
    "admins": 5,
    "users": 143
  }
}
```

#### GET `/admin/users`

**Access**: ADMIN, SUPERUSER

Query parameters:
- `page` (default: 1)
- `size` (default: 10, max: 100)
- `search` (searches email, name, username)
- `role` (USER, ADMIN, SUPERUSER)
- `is_banned` (true/false)

Returns:

```json
{
  "users": [...],
  "total": 150,
  "page": 1,
  "size": 10
}
```

#### PATCH `/admin/users/{user_id}/role`

**Access**: SUPERUSER ONLY

Body:

```json
{
  "role": "ADMIN"
}
```

**Rules:**
- Cannot change own role
- Only SUPERUSER can use this endpoint
- Valid roles: USER, ADMIN, SUPERUSER

#### PATCH `/admin/users/{user_id}/status`

**Access**: ADMIN, SUPERUSER

Body:

```json
{
  "is_banned": true
}
```

**Rules:**
- Cannot ban yourself
- ADMINs cannot ban SUPERUSERs
- Banned users cannot authenticate

#### PATCH `/admin/users/{user_id}/gamification`

**Access**: ADMIN, SUPERUSER

Body:

```json
{
  "xp": 5000,
  "level": "Gold"
}
```

Valid levels: Iron, Bronze, Silver, Gold, Platinum, Diamond

---

## 🎨 Frontend Components

### 1. AdminGuard

**Location**: `/components/AdminGuard.tsx`

Route protection component:

```tsx
<AdminGuard>
  <YourAdminComponent />
</AdminGuard>

// For superuser-only pages
<AdminGuard requireSuperuser>
  <SuperuserOnlyComponent />
</AdminGuard>
```

**Behavior:**
- Redirects non-authenticated users to `/login`
- Redirects non-admin users to `/`
- Shows loading state during auth check

### 2. AdminLayout

**Location**: `/components/AdminLayout.tsx`

Premium admin layout with:
- Collapsible sidebar navigation
- User info display
- Role badge (Admin/Superuser)
- Quick links (Back to App, Logout)

### 3. Admin Dashboard

**Route**: `/admin`

Displays:
- Total users widget
- Active today widget
- New users (7d) widget
- Banned users widget
- Role distribution breakdown

### 4. User Management

**Route**: `/admin/users`

Features:
- Advanced filtering (search, role, banned status)
- Pagination
- User avatar/initial display
- Role badges
- Status badges (Active/Banned)
- XP and Level display

**Actions:**
- Ban/Unban (all admins)
- Edit XP/Level (all admins)
- Change Role (superuser only)

### 5. Admin Panel Access

The "Admin Panel" button appears in the user dropdown menu (AuthButton) only for users with ADMIN or SUPERUSER roles.

---

## 🧪 Testing Instructions

### Manual Testing Checklist

#### Test 1: USER Cannot Access Admin

1. Register as normal user
2. Try to visit `/admin` directly
3. **Expected**: Redirected to home page
4. Check user dropdown
5. **Expected**: No "Admin Panel" button visible

#### Test 2: USER Cannot Call Admin APIs

1. Login as USER
2. Open browser DevTools
3. Try: `GET /admin/stats` with user token
4. **Expected**: 403 Forbidden

#### Test 3: ADMIN Can Access Dashboard

1. Create user and promote to ADMIN (as superuser)
2. Login as ADMIN
3. Click "Admin Panel" in user menu
4. **Expected**: Dashboard loads with stats
5. Navigate to Users page
6. **Expected**: User list loads

#### Test 4: ADMIN Cannot Change Roles

1. Login as ADMIN
2. Go to `/admin/users`
3. **Expected**: No "Change Role" button visible
4. Try API: `PATCH /admin/users/{id}/role`
5. **Expected**: 403 Forbidden

#### Test 5: SUPERUSER Can Promote Users

1. Login as SUPERUSER
2. Go to `/admin/users`
3. Click "Change Role" on a USER
4. Select ADMIN
5. **Expected**: User promoted successfully
6. Verify: User now has ADMIN access

#### Test 6: Cannot Self-Demote

1. Login as SUPERUSER
2. Try to change own role to USER/ADMIN
3. **Expected**: Error "Cannot demote yourself"

#### Test 7: Banned User Cannot Login

1. As ADMIN, ban a user
2. Try to login as banned user
3. **Expected**: Error "User is banned" (403)

#### Test 8: Gamification Edit Works

1. As ADMIN, click "Edit XP" on a user
2. Change XP and Level
3. **Expected**: Changes saved successfully
4. Verify in user list

---

## 🔐 Security Best Practices

### DO ✅

- Always validate roles on backend
- Log unauthorized access attempts
- Use HTTPS in production
- Rotate JWT secret keys regularly
- Implement rate limiting on admin endpoints
- Monitor superuser actions
- Require 2FA for superuser accounts (future enhancement)

### DON'T ❌

- Trust frontend role checks for security
- Expose superuser creation via API
- Allow role changes without validation
- Skip authentication checks
- Log sensitive data (passwords, tokens)
- Allow multiple superuser accounts without oversight

---

## 🗂️ File Structure

```
backend/
├── app/
│   ├── auth/
│   │   └── dependencies.py        # get_current_admin, get_current_superuser
│   ├── core/
│   │   └── roles.py                # Role enum
│   ├── routers/
│   │   └── admin.py                # All admin endpoints
│   └── models/
│       └── user.py                 # User model with role + is_banned
├── alembic/versions/
│   ├── 008_add_role_is_banned.py   # Role migration
│   └── 009_add_userid_column.py    # UserId migration
└── create_superuser.py             # CLI bootstrapping tool

frontend/
├── app/
│   └── admin/
│       ├── page.tsx                # Dashboard
│       └── users/
│           └── page.tsx            # User management
├── components/
│   ├── AdminGuard.tsx              # Route protection
│   ├── AdminLayout.tsx             # Admin UI layout
│   └── AuthButton.tsx              # Modified with admin access button
└── services/
    └── admin.ts                    # Admin API client
```

---

## 🐛 Troubleshooting

### Issue: "User doesn't have sufficient privileges"

**Cause**: User role is USER, not ADMIN/SUPERUSER

**Solution**: Promote user via CLI:
```bash
python3 create_superuser.py user@email.com
```

### Issue: "Authentication required"

**Cause**: Token expired or invalid

**Solution**: Logout and login again

### Issue: "Cannot ban yourself"

**Cause**: Attempting to ban your own account

**Solution**: Use different admin account or don't ban yourself

### Issue: Database migration errors

**Cause**: Database schema out of sync

**Solution**:
```bash
cd backend
source venv/bin/activate
alembic upgrade head
```

---

## 📊 Permissions Matrix

| Feature                 | USER | ADMIN | SUPERUSER |
|-------------------------|------|-------|-----------|
| Access /admin          | ❌   | ✅    | ✅        |
| View stats             | ❌   | ✅    | ✅        |
| View user list         | ❌   | ✅    | ✅        |
| Ban/unban users        | ❌   | ✅    | ✅        |
| Edit XP/Level          | ❌   | ✅    | ✅        |
| Change user roles      | ❌   | ❌    | ✅        |
| Promote to ADMIN       | ❌   | ❌    | ✅        |
| Demote ADMIN           | ❌   | ❌    | ✅        |
| Ban SUPERUSER          | ❌   | ❌    | ✅*       |
| Self-role change       | ❌   | ❌    | ❌        |

*\* Not recommended*

---

## 🔮 Future Enhancements

- [ ] Two-Factor Authentication for SUPERUSER
- [ ] Audit log for all admin actions
- [ ] IP whitelisting for admin access
- [ ] Role-based dashboard customization
- [ ] Bulk user operations
- [ ] Export user data (CSV/Excel)
- [ ] Advanced analytics charts
- [ ] Email notifications for role changes
- [ ] Session management (force logout)
- [ ] API rate limit configuration UI

---

## ⚖️ License & Responsibility

This admin system is designed for production use. Implementers are responsible for:

- Securing superuser credentials
- Monitoring admin actions
- Complying with data protection regulations (GDPR, CCPA, etc.)
- Implementing additional security measures as needed
- Regular security audits
- Incident response planning

**This system protects real users and real data. Treat it accordingly.**

---

## 📞 Support

For issues or questions:

1. Check this documentation
2. Review error logs in browser DevTools
3. Check backend logs (uvicorn output)
4. Verify database schema with `alembic current`
5. Test with a fresh database if needed

---

**Built with security-first principles. Every admin action must be justified and authorized.**
