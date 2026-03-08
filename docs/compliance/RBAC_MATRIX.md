# Role-Based Access Control (RBAC) Matrix

## Document Information

| Field | Value |
|---|---|
| **Document ID** | BRIBTE-COMP-002 |
| **Version** | 1.0 |
| **Classification** | Internal — Tech4LYF Corporation |
| **Last Updated** | March 2026 |
| **Implementation** | PostgreSQL Row-Level Security (RLS) |

---

## 1. Role Definitions

| Role | Code | Description | Provisioning |
|---|---|---|---|
| **Super Admin** | `admin` | Full system access. Manages all modules, users, and settings. | Created via `create-admin` edge function |
| **Lecturer** | `lecturer` | Academic staff. Manages own courses, grades, and assignments. | Created by admin via `create-admin` edge function |
| **Student** | `student` | Enrolled learner. Views own data, submits work, pays fees. | Self-registration (email signup) + admin approval |
| **Parent** *(Planned)* | `parent` | Read-only access to linked student's data. | Future feature |
| **Platform Admin** *(Planned)* | `platform_admin` | Tech4LYF staff. Cross-tenant access for support. | Future feature |

---

## 2. Access Control Matrix

### 2.1 Identity & User Management

| Resource | Super Admin | Lecturer | Student | Parent* |
|---|---|---|---|---|
| **profiles** — View all | ✅ | ✅ (read-only) | ❌ | ❌ |
| **profiles** — View own | ✅ | ✅ | ✅ | ✅ |
| **profiles** — Edit own | ✅ | ✅ | ✅ | ✅ |
| **profiles** — Edit any | ✅ | ❌ | ❌ | ❌ |
| **user_roles** — View own | ✅ | ✅ | ✅ | ✅ |
| **user_roles** — Manage all | ✅ | ❌ | ❌ | ❌ |
| **Create admin account** | ✅ | ❌ | ❌ | ❌ |
| **Create lecturer account** | ✅ | ❌ | ❌ | ❌ |

### 2.2 Student Management

| Resource | Super Admin | Lecturer | Student | Parent* |
|---|---|---|---|---|
| **students** — View all | ✅ | ✅ (read-only) | ❌ | ❌ |
| **students** — View own | ✅ | N/A | ✅ | ✅ (linked) |
| **students** — Create | ✅ (via edge fn) | ❌ | ✅ (self-reg) | ❌ |
| **students** — Edit any | ✅ | ❌ | ❌ | ❌ |
| **students** — Edit own | ✅ | N/A | ✅ (limited) | ❌ |
| **students** — Approve/Activate | ✅ | ❌ | ❌ | ❌ |
| **students** — Assign course | ✅ | ❌ | ❌ | ❌ |

### 2.3 Academic — Courses & Departments

| Resource | Super Admin | Lecturer | Student | Parent* |
|---|---|---|---|---|
| **departments** — View | ✅ | ✅ | ✅ | ✅ |
| **departments** — Manage | ✅ | ❌ | ❌ | ❌ |
| **courses** — View all | ✅ | ✅ | ✅ | ✅ |
| **courses** — Create/Edit/Delete | ✅ | ❌ | ❌ | ❌ |
| **course_modules** — View | ✅ | ✅ | ✅ | ✅ |
| **course_modules** — Manage | ✅ | ❌ | ❌ | ❌ |
| **course_lessons** — View | ✅ | ✅ | ✅ | ✅ |
| **course_lessons** — Manage | ✅ | ❌ | ❌ | ❌ |
| **course_materials** — View | ✅ | ✅ | ✅ | ❌ |
| **course_materials** — Manage | ✅ | ❌ | ❌ | ❌ |

### 2.4 Academic — Enrollment

| Resource | Super Admin | Lecturer | Student | Parent* |
|---|---|---|---|---|
| **enrollments** — View all | ✅ | ✅ (read-only) | ❌ | ❌ |
| **enrollments** — View own | N/A | N/A | ✅ | ✅ (linked) |
| **enrollments** — Manage | ✅ | ❌ | ❌ | ❌ |

### 2.5 Academic — Assignments & Submissions

| Resource | Super Admin | Lecturer | Student | Parent* |
|---|---|---|---|---|
| **assignments** — View all | ✅ | ✅ | ✅ | ❌ |
| **assignments** — Create | ✅ | ✅ (own courses) | ❌ | ❌ |
| **assignments** — Edit own | ✅ | ✅ | ❌ | ❌ |
| **assignments** — Delete own | ✅ | ✅ | ❌ | ❌ |
| **submissions** — View all | ✅ | ✅ | ❌ | ❌ |
| **submissions** — View own | N/A | N/A | ✅ | ✅ (linked) |
| **submissions** — Submit | ❌ | ❌ | ✅ | ❌ |
| **submissions** — Grade | ✅ | ✅ | ❌ | ❌ |

### 2.6 Academic — Exams & Results

| Resource | Super Admin | Lecturer | Student | Parent* |
|---|---|---|---|---|
| **exams** — View | ✅ | ✅ | ✅ | ✅ |
| **exams** — Create/Manage | ✅ | ✅ (own exams) | ❌ | ❌ |
| **exam_results** — View all | ✅ | ✅ | ❌ | ❌ |
| **exam_results** — View own | N/A | N/A | ✅ | ✅ (linked) |
| **exam_results** — Enter/Edit | ✅ | ✅ | ❌ | ❌ |

### 2.7 Scheduling & Attendance

| Resource | Super Admin | Lecturer | Student | Parent* |
|---|---|---|---|---|
| **course_schedules** — View | ✅ | ✅ | ✅ (enrolled) | ❌ |
| **course_schedules** — Manage | ✅ | ❌ | ❌ | ❌ |
| **class_sessions** — View | ✅ | ✅ | ✅ (enrolled) | ❌ |
| **class_sessions** — Manage | ✅ | ✅ (own sessions) | ❌ | ❌ |
| **timetable_entries** — View | ✅ | ✅ | ✅ (enrolled) | ❌ |
| **timetable_entries** — Manage | ✅ | ✅ (own courses) | ❌ | ❌ |
| **attendance** — View all | ✅ | ✅ | ❌ | ❌ |
| **attendance** — View own | N/A | N/A | ✅ | ✅ (linked) |
| **attendance** — Record | ✅ | ✅ | ✅ (own) | ❌ |

### 2.8 Financial

| Resource | Super Admin | Lecturer | Student | Parent* |
|---|---|---|---|---|
| **fee_items** — View | ✅ | ✅ | ✅ | ✅ |
| **fee_items** — Manage | ✅ | ❌ | ❌ | ❌ |
| **payments** — View all | ✅ | ❌ | ❌ | ❌ |
| **payments** — View own | N/A | N/A | ✅ | ✅ (linked) |
| **payments** — Create own | ❌ | ❌ | ✅ | ❌ |
| **payments** — Approve | ✅ | ❌ | ❌ | ❌ |
| **receipt_uploads** — View all | ✅ | ❌ | ❌ | ❌ |
| **receipt_uploads** — View own | N/A | N/A | ✅ | ❌ |
| **receipt_uploads** — Upload | ❌ | ❌ | ✅ | ❌ |
| **receipt_uploads** — Review | ✅ | ❌ | ❌ | ❌ |
| **receipt_extractions** — View | ✅ | ❌ | ✅ (own) | ❌ |
| **payment_transactions** — View all | ✅ | ❌ | ❌ | ❌ |
| **payment_transactions** — View own | N/A | N/A | ✅ | ❌ |
| **student_fee_selections** — View/Manage own | ✅ | ❌ | ✅ | ❌ |

### 2.9 Clearance

| Resource | Super Admin | Lecturer | Student | Parent* |
|---|---|---|---|---|
| **clearance_requests** — View all | ✅ | ❌ | ❌ | ❌ |
| **clearance_requests** — View own | N/A | N/A | ✅ | ✅ (linked) |
| **clearance_requests** — Submit | ❌ | ❌ | ✅ (via RPC) | ❌ |
| **clearance_requests** — Manage | ✅ | ❌ | ❌ | ❌ |
| **clearance_steps** — View all | ✅ | ✅ (read-only) | ✅ (read-only) | ❌ |
| **clearance_steps** — Approve/Reject | ✅ | ❌ | ❌ | ❌ |

### 2.10 Operations & Administration

| Resource | Super Admin | Lecturer | Student | Parent* |
|---|---|---|---|---|
| **announcements** — View (targeted) | ✅ | ✅ | ✅ | ✅ |
| **announcements** — Create/Edit | ✅ | ✅ (own) | ❌ | ❌ |
| **announcements** — Delete any | ✅ | ❌ | ❌ | ❌ |
| **academic_calendar** — View | ✅ | ✅ | ✅ | ✅ |
| **academic_calendar** — Manage | ✅ | ❌ | ❌ | ❌ |
| **audit_logs** — View | ✅ | ❌ | ❌ | ❌ |
| **audit_logs** — Create entry | ✅ | ✅ | ✅ | ❌ |
| **system_settings** — View | ✅ | ✅ | ✅ | ✅ |
| **system_settings** — Manage | ✅ | ❌ | ❌ | ❌ |
| **alumni** — View all | ✅ | ✅ | ✅ | ✅ |
| **alumni** — Manage all | ✅ | ❌ | ❌ | ❌ |
| **alumni** — Edit own | N/A | N/A | ✅ (own record) | ❌ |

---

## 3. RLS Implementation Details

### 3.1 Policy Pattern

Every table follows this pattern:

```sql
-- 1. Enable RLS
ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY;

-- 2. Admin full access
CREATE POLICY "Admins can manage {table}"
ON public.{table} FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- 3. Role-specific access
CREATE POLICY "Students can view own {table}"
ON public.{table} FOR SELECT
USING (EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = {table}.student_id AND s.user_id = auth.uid()
));
```

### 3.2 Security Functions

| Function | Purpose | Security |
|---|---|---|
| `has_role(uuid, app_role)` | Check user role | SECURITY DEFINER (bypasses RLS) |
| `get_user_role(uuid)` | Get user's role | SECURITY DEFINER |
| `submit_clearance_request(...)` | Atomic clearance creation | SECURITY DEFINER + ownership check |
| `recalculate_fee_balance(uuid)` | Fee recalculation | SECURITY DEFINER |

---

## 4. Privilege Escalation Prevention

| Attack Vector | Mitigation |
|---|---|
| User edits own role in profiles | Roles stored in separate `user_roles` table, not editable by non-admins |
| User guesses another student's ID | RLS checks `students.user_id = auth.uid()` on every query |
| User calls admin-only endpoint | RLS policy with `has_role()` check rejects at database level |
| User modifies JWT claims | JWT signed by Supabase; `auth.uid()` extracted server-side |
| User accesses edge function directly | `create-admin` verifies caller admin role via Authorization header |
| SQL injection via PostgREST | PostgREST uses parameterized queries |

---

## 5. Future Role Additions

### Parent Role (Planned)

```sql
-- Parent-student linking table
CREATE TABLE parent_student_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_user_id uuid NOT NULL,
    student_id uuid REFERENCES students(id),
    verified boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- RLS policy for parent access
CREATE POLICY "Parents can view linked student data"
ON public.students FOR SELECT
USING (EXISTS (
    SELECT 1 FROM parent_student_links psl
    WHERE psl.student_id = students.id
    AND psl.parent_user_id = auth.uid()
    AND psl.verified = true
));
```

### Platform Admin Role (Planned for Multi-Tenant)

```sql
CREATE TYPE platform_role AS ENUM ('platform_admin', 'support_agent');

CREATE TABLE platform_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role platform_role NOT NULL,
    created_at timestamptz DEFAULT now()
);
```
