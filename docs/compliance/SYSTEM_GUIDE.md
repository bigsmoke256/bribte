# BRIBTE Digital Campus Management System — Full System Guide

## Document Information

| Field | Value |
|---|---|
| **Document ID** | BRIBTE-GUIDE-001 |
| **Version** | 1.0 |
| **Classification** | Internal — Tech4LYF Corporation |
| **Last Updated** | March 2026 |
| **Author** | Tech4LYF Development Team |

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [User Roles & Access](#2-user-roles--access)
3. [Authentication & Registration](#3-authentication--registration)
4. [Admin Portal Guide](#4-admin-portal-guide)
5. [Lecturer Portal Guide](#5-lecturer-portal-guide)
6. [Student Portal Guide](#6-student-portal-guide)
7. [Fee Management System](#7-fee-management-system)
8. [AI Receipt Processing](#8-ai-receipt-processing)
9. [Clearance Workflow](#9-clearance-workflow)
10. [Timetable & Scheduling](#10-timetable--scheduling)
11. [Exam Management](#11-exam-management)
12. [Assignment & Submission System](#12-assignment--submission-system)
13. [Announcements](#13-announcements)
14. [Database Architecture](#14-database-architecture)
15. [Security Architecture](#15-security-architecture)
16. [Edge Functions](#16-edge-functions)
17. [Troubleshooting](#17-troubleshooting)

---

## 1. System Overview

BRIBTE Digital Campus Management System is a web-based platform built for **Buganda Royal Institute of Business and Technical Education** (Kampala, Uganda). It digitizes all campus operations including admissions, enrollment, fee management, timetabling, exams, clearance, and alumni tracking.

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions, RLS) |
| AI/ML | Google Gemini 2.5 Flash via Lovable AI Gateway |
| State Management | TanStack React Query, React Context (Auth) |

### Design Capacity

- **10,000+ concurrent students**
- Multi-role support (Admin, Lecturer, Student)
- Real-time data with Supabase Realtime (where enabled)

---

## 2. User Roles & Access

### Role Hierarchy

```
Admin (Full System Access)
  └── Lecturer (Academic Management)
       └── Student (Self-Service Portal)
```

### Role Storage

Roles are stored in a **separate `user_roles` table** — NOT on the profiles table. This prevents privilege escalation attacks.

```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'lecturer', 'student');

CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);
```

### Role Checking Function

```sql
CREATE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

This function uses `SECURITY DEFINER` to bypass RLS and prevent recursive policy checks.

### Access Matrix Summary

| Feature | Admin | Lecturer | Student |
|---|---|---|---|
| Manage students | ✅ Full CRUD | ✅ View only | ❌ Own record only |
| Manage courses | ✅ Full CRUD | ✅ View assigned | ✅ View enrolled |
| Manage fees | ✅ Full CRUD | ❌ | ✅ View own |
| Upload receipts | ❌ | ❌ | ✅ Own only |
| Review receipts | ✅ | ❌ | ❌ |
| Create assignments | ❌ | ✅ Own courses | ❌ |
| Submit assignments | ❌ | ❌ | ✅ Own only |
| Grade submissions | ❌ | ✅ Own courses | ❌ |
| Manage timetable | ✅ Full CRUD | ✅ Own courses | ✅ View enrolled |
| Create exams | ✅ | ✅ Own courses | ❌ |
| Enter exam results | ✅ | ✅ | ❌ |
| View exam results | ✅ | ✅ | ✅ Own only |
| Manage clearance | ✅ Approve/Reject | ❌ | ✅ Submit/View own |
| Announcements | ✅ Full CRUD | ✅ Own only | ✅ View only |
| Audit logs | ✅ View | ❌ | ❌ |
| System settings | ✅ | ❌ | ❌ |
| Academic calendar | ✅ Full CRUD | ✅ View | ✅ View |
| Alumni management | ✅ Full CRUD | ✅ View | ✅ Own record |

---

## 3. Authentication & Registration

### Student Self-Registration Flow

```
1. Student visits /login → clicks "Sign Up"
2. Enters: full name, email, password
3. System creates auth.users record
4. Database trigger `handle_new_user` fires:
   a. Creates profile in `profiles` table
   b. Assigns 'student' role in `user_roles`
   c. Creates student record in `students` (status: 'pending')
5. Student receives email verification link
6. Student verifies email → can now log in
7. Admin approves student and assigns a course
```

### Admin Bootstrap

The first admin is created via the `create-admin` edge function:

```bash
curl -X POST https://<project>.supabase.co/functions/v1/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@bribte.ac.ug",
    "password": "securepassword",
    "full_name": "System Admin",
    "role": "admin"
  }'
```

This function auto-confirms the email and creates:
- Auth user
- Profile record
- Admin role in `user_roles`

### Lecturer Creation

Lecturers are created by admins from the Admin Portal:

```
Admin Dashboard → Lecturers → Add Lecturer
  → Enter: name, email, password, department, specialization
  → System creates: auth user + profile + user_role (lecturer) + lecturers record
```

### Session Management

| Parameter | Value |
|---|---|
| Access token lifetime | 1 hour |
| Refresh token lifetime | 7 days |
| Storage | Browser localStorage |
| Auto-refresh | Yes (via Supabase client) |

---

## 4. Admin Portal Guide

**Route:** `/admin/*`

### 4.1 Dashboard Home (`/admin`)

Displays summary statistics:
- Total students, active students, pending approvals
- Total lecturers, courses, departments
- Fee collection overview
- Recent activity feed

### 4.2 Student Management (`/admin/students`)

- **View all students** with search, filter by status/course/study mode
- **Approve pending students** — assign course, registration number, study mode
- **Edit student records** — change course, year, semester, status
- **View student fee balance** and payment history

### 4.3 Lecturer Management (`/admin/lecturers`)

- **Add new lecturers** with department and specialization
- **View/edit lecturer profiles**
- **Assign lecturers to courses**

### 4.4 Course Management (`/admin/courses`)

- **Create courses** with: code, name, department, program level, duration, tuition rates, capacity
- **Edit/delete courses**
- **Manage course modules and lessons** (curriculum structure)
- **Publish/unpublish courses**

### 4.5 Fee Management (`/admin/fees`)

- **Manage fee items**: name, amount, category, frequency (once/yearly/per-semester), applies_to, optional flag
- **View all student fee balances**
- **Approve/reject payments**

### 4.6 Receipt Review (`/admin/receipt-review`)

- **View all uploaded receipts** with AI extraction results
- **See validation flags** (fraud indicators, confidence scores)
- **Approve or reject** receipts with notes
- Approved receipts trigger automatic fee balance recalculation

### 4.7 Enrollment Management (`/admin/enrollment`)

- **View all enrollments** by academic year and semester
- **Approve/reject enrollment requests**
- **Manage study modes** (Day/Evening/Weekend)

### 4.8 Exam Management (`/admin/exams`)

- **Create exams** with: course, type (midterm/final), date, time, venue, max marks
- **Manage exam schedules** across academic year and semester
- **View exam results** entered by lecturers

### 4.9 Timetable Management (`/admin/timetable`)

- **Create timetable entries** with conflict detection
- **Assign rooms and time slots** per course per day
- **View weekly timetable grid**

### 4.10 Scheduling (`/admin/scheduling`)

- **Manage course schedules** (recurring weekly slots)
- **Generate class sessions** from schedules (batch creation)
- **Detect scheduling conflicts** (room, lecturer, time overlaps)

### 4.11 Clearance Management (`/admin/clearance`)

4-step clearance workflow:
1. **Finance Office** — Verify fee balance
2. **Library** — Verify no outstanding books
3. **Department Head** — Academic clearance
4. **Final Admin Approval** — Release clearance certificate

Each step can be approved/rejected independently with notes.

### 4.12 Academic Calendar (`/admin/academic-calendar`)

- **Create events**: registration periods, exam weeks, holidays, graduation
- **Set academic year and semester** context
- **Visible to all authenticated users**

### 4.13 Announcements (`/admin/announcements`)

- **Create system-wide announcements**
- **Target specific groups**: all, students, lecturers, specific course
- **Set priority**: low, medium, high, urgent

### 4.14 Documents (`/admin/documents`)

- **Manage course materials and documents**
- **Upload and organize files** by course

### 4.15 Reports (`/admin/reports`)

- **Enrollment statistics**
- **Fee collection reports**
- **Attendance summaries**

### 4.16 Alumni Management (`/admin/alumni`)

- **Track graduates**: employment, employer, GPA, degree classification
- **Manage alumni records** and contact information

### 4.17 Audit Logs (`/admin/audit-log`)

- **View all system actions** with timestamp, user, action, table, old/new values
- **Immutable** — cannot be edited or deleted
- **Admins only** — not visible to other roles

### 4.18 System Settings (`/admin/settings`)

- **Configure system-wide settings** stored in `system_settings` table
- **Manage institution details**, academic year, semester

### 4.19 Attendance (`/admin/attendance`)

- **View attendance records** across all courses and sessions
- **Generate attendance reports**

### 4.20 Records (`/admin/records`)

- **Central records management** for academic transcripts and documents

### 4.21 Policies (`/admin/policies`)

- **Manage institutional policies** visible to users

---

## 5. Lecturer Portal Guide

**Route:** `/lecturer/*`

### 5.1 Dashboard Home (`/lecturer`)

- Courses assigned to lecturer
- Upcoming sessions
- Pending submissions to grade
- Recent announcements

### 5.2 My Courses (`/lecturer/courses`)

- **View assigned courses** with student enrollment counts
- **Manage course materials** — upload lecture notes, slides, resources
- **View enrolled students** per course

### 5.3 Assignments (`/lecturer/assignments`)

- **Create assignments** with: title, instructions, file attachment, deadline, max grade
- **Edit/delete own assignments**
- **View submission status** per assignment

### 5.4 Submissions (`/lecturer/submissions`)

- **View all student submissions** for assigned courses
- **Download submission files** (all formats supported, up to 100MB)
- **Grade submissions** with marks and written feedback
- **Direct download strategy** for viewing files in local applications

### 5.5 Grades (`/lecturer/grades`)

- **Enter exam results**: marks, grade, grade points, remarks
- **View grade distribution** per exam
- **Edit grades** before finalization

### 5.6 Timetable (`/lecturer/timetable`)

- **View personal timetable** — all assigned course sessions
- **Weekly grid view** with room locations

### 5.7 Announcements (`/lecturer/announcements`)

- **Create announcements** for own courses or target groups
- **Edit/delete own announcements**
- **View all announcements** (system-wide + own)

---

## 6. Student Portal Guide

**Route:** `/student/*`

### 6.1 Dashboard Home (`/student`)

- Current enrollment status and course info
- Fee balance summary
- Upcoming assignments and deadlines
- Next class sessions
- Recent announcements

### 6.2 My Courses (`/student/courses`)

- **View enrolled courses** with details
- **Access course materials** uploaded by lecturers
- **View course modules and lessons**

### 6.3 Assignments (`/student/assignments`)

- **View all assignments** for enrolled courses
- **Submit assignments** — upload files (all formats, max 100MB)
- **View grades and feedback** on submitted work
- **Track deadline status** (upcoming, overdue, submitted)

### 6.4 Fees (`/student/fees`)

- **View fee breakdown**: tuition + mandatory fees + optional fees
- **See total owed vs. total paid vs. balance**
- **Upload payment receipts** for AI processing
- **Select optional fee items** (e.g., accommodation)
- **View payment history** with status (pending/approved/rejected)

### 6.5 Results (`/student/results`)

- **View exam results** by semester and academic year
- **See grades, marks, grade points** per exam
- **GPA calculation** where available

### 6.6 Timetable (`/student/timetable`)

- **View personal timetable** for enrolled courses
- **Weekly grid view** with rooms and lecturers

### 6.7 Schedule (`/student/schedule`)

- **View upcoming class sessions** with dates and times
- **See session status** (scheduled, live, completed, cancelled)

### 6.8 Announcements (`/student/announcements`)

- **View all announcements** targeted to students or all users
- **Course-specific announcements** for enrolled courses

### 6.9 Exam Card (`/student/exam-card`)

- **Generate exam card** for current semester
- **Shows**: student info, enrolled courses, exam schedule
- **Requires fee clearance** in some configurations

### 6.10 Clearance (`/student/clearance`)

- **Submit clearance request** for end-of-semester or graduation
- **Track 4-step approval progress**:
  1. Finance Office ✓/✗
  2. Library ✓/✗
  3. Department Head ✓/✗
  4. Final Admin ✓/✗
- **View clearance history**

### 6.11 Profile Settings (`/student/profile`)

- **Edit personal information**: name, phone, avatar
- **View registration number and enrollment details**
- **Change password**

---

## 7. Fee Management System

### 7.1 Fee Structure

| Component | Description |
|---|---|
| **Tuition** | Per-course, varies by study mode (Day/Evening/Weekend) |
| **Mandatory fees** | Applied to all students (e.g., registration, library, exam fees) |
| **Optional fees** | Student-selected (e.g., accommodation, transport) |

### 7.2 Fee Calculation Formula

```
Total Fees = Tuition (based on study mode) 
           + SUM(Mandatory fee items based on frequency)
           + SUM(Selected optional fee items)

Fee Balance = Total Fees - SUM(Approved payments)
```

### 7.3 Fee Item Properties

| Property | Options |
|---|---|
| `frequency` | `once` (one-time), `yearly`, `per_semester` |
| `applies_to` | `all`, specific program level |
| `is_optional` | `true` (student selects) / `false` (mandatory) |
| `category` | `tuition`, `registration`, `library`, `exam`, `accommodation`, `general` |

### 7.4 Payment Flow

```
Student uploads receipt → AI processes receipt → 
  If auto-approved → Payment created → Fee balance recalculated
  If flagged → Admin reviews → Approve/Reject → Fee balance updated
```

### 7.5 Fee Balance Recalculation

The `recalculate_fee_balance` database function:
1. Calculates total tuition based on student's course and study mode
2. Adds all applicable mandatory fee items
3. Adds selected optional fee items
4. Subtracts total approved payments
5. Updates `students.fee_balance`

Triggers fire on: payment approval, payment rejection, student course change, fee item changes.

---

## 8. AI Receipt Processing

### 8.1 Pipeline Overview

The `process-receipt` edge function runs a 10-step validation:

```
1. Receive receipt image (base64)
2. Send to Google Gemini 2.5 Flash for OCR
3. Extract structured fields:
   - transaction_id, amount, payment_date
   - sender_name, institution_name
   - payment_provider, description
   - channel_depositor, channel_memo
4. Validate institution name (must contain "BRIBTE" or similar)
5. Check for duplicate transaction IDs
6. Match sender name against student profile
7. Validate course/class information
8. Verify amount against expected fees
9. Calculate confidence score (0-1)
10. Auto-approve (score ≥ 0.8) or flag for review
```

### 8.2 Validation Flags

| Flag | Meaning |
|---|---|
| `institution_mismatch` | Receipt not for BRIBTE |
| `duplicate_transaction` | Transaction ID already processed |
| `name_mismatch` | Sender name doesn't match student |
| `amount_suspicious` | Amount doesn't match expected fees |
| `low_confidence` | OCR confidence below threshold |
| `possible_fraud` | Multiple fraud indicators detected |

### 8.3 Data Flow

```
receipt_uploads (file_url, status) 
  → process-receipt edge function
    → receipt_extractions (extracted fields, confidence, flags)
      → If approved: payments + payment_transactions created
        → recalculate_fee_balance trigger fires
```

---

## 9. Clearance Workflow

### 9.1 Four-Step Process

```
Step 1: Finance Office
  └── Verifies student has zero or negative fee balance
  
Step 2: Library
  └── Verifies no outstanding borrowed items
  
Step 3: Department Head
  └── Confirms academic requirements met
  
Step 4: Final Admin Approval
  └── Issues final clearance
```

### 9.2 Database Function

The `submit_clearance_request` RPC function atomically:
1. Creates a `clearance_requests` record
2. Creates 4 `clearance_steps` records (one per step, in order)
3. Returns the clearance request ID

### 9.3 Step Status Flow

```
pending → approved (with approved_by, approved_at, notes)
       → rejected (with notes explaining reason)
```

Overall clearance status:
- `pending` — at least one step not yet reviewed
- `approved` — all 4 steps approved
- `rejected` — any step rejected

---

## 10. Timetable & Scheduling

### 10.1 Two-Layer System

| Layer | Table | Purpose |
|---|---|---|
| **Timetable** | `timetable_entries` | Static weekly grid (admin-managed) |
| **Schedules** | `course_schedules` | Recurring weekly slots per course |
| **Sessions** | `class_sessions` | Individual class instances (generated from schedules) |

### 10.2 Conflict Detection

The `check_schedule_conflicts` function checks for:
- **Lecturer conflicts** — same lecturer, same time slot, different course
- **Room conflicts** — same room, same time slot, different course
- **Time overlaps** — partial overlaps detected, not just exact matches

### 10.3 Session Generation

The `generate_class_sessions` function:
1. Takes a course ID, start date, and number of weeks
2. Reads all `course_schedules` for that course
3. Creates individual `class_sessions` for each week
4. Returns count of sessions created

---

## 11. Exam Management

### 11.1 Exam Lifecycle

```
Created (scheduled) → Published → Conducted → Results entered → Finalized
```

### 11.2 Exam Properties

| Field | Description |
|---|---|
| `exam_type` | midterm, final, supplementary |
| `academic_year` | e.g., "2025/2026" |
| `semester` | 1 or 2 |
| `max_marks` | Maximum obtainable marks |
| `venue` | Physical location |
| `status` | scheduled, published, completed |

### 11.3 Results Entry

Lecturers enter results with:
- `marks_obtained` — numeric score
- `grade` — letter grade (A, B+, B, C, etc.)
- `grade_points` — numeric GPA equivalent
- `remarks` — optional notes

---

## 12. Assignment & Submission System

### 12.1 Assignment Creation (Lecturer)

| Field | Description |
|---|---|
| `title` | Assignment name |
| `instructions` | Detailed instructions (text) |
| `file_url` | Attached reference file (optional) |
| `deadline` | Due date and time |
| `max_grade` | Maximum marks (default: 100) |
| `course_id` | Associated course |

### 12.2 Submission (Student)

- Students upload files via the portal
- **All file formats accepted** (documents, media, design files)
- **Max file size: 100MB**
- Status tracking: `submitted` → `graded`

### 12.3 Grading (Lecturer)

- **Direct download** of submission files for viewing in local apps
- Enter grade (numeric) and written feedback
- Student sees results in real-time

---

## 13. Announcements

### 13.1 Targeting

| Target | Who Sees It |
|---|---|
| `all` | Everyone (students, lecturers, admins) |
| `students` | All students |
| `lecturers` | All lecturers |
| Specific `course_id` | Only students/lecturers of that course |

### 13.2 Priority Levels

| Priority | Display |
|---|---|
| `low` | Normal text |
| `medium` | Standard visibility |
| `high` | Highlighted |
| `urgent` | Prominent alert styling |

---

## 14. Database Architecture

### 14.1 Core Tables (25 total)

**User Management:**
- `profiles` — User personal information
- `user_roles` — Role assignments (admin/lecturer/student)

**Academic:**
- `departments` — Academic departments
- `courses` — Course catalog with tuition rates
- `course_modules` — Curriculum modules per course
- `course_lessons` — Lessons within modules
- `course_materials` — Uploaded course files
- `course_schedules` — Recurring weekly schedule slots
- `enrollments` — Student-course enrollment records

**Student Records:**
- `students` — Student academic records (year, semester, status, fee balance)
- `assignments` — Created by lecturers
- `submissions` — Student assignment submissions
- `exams` — Exam scheduling
- `exam_results` — Student exam scores
- `attendance` — Per-session attendance
- `class_sessions` — Individual class instances

**Finance:**
- `fee_items` — Fee catalog (mandatory + optional items)
- `student_fee_selections` — Optional fee opt-ins
- `payments` — Payment records
- `payment_transactions` — Detailed transaction records
- `receipt_uploads` — Uploaded receipt files
- `receipt_extractions` — AI-extracted receipt data

**Administrative:**
- `clearance_requests` — Student clearance applications
- `clearance_steps` — 4-step clearance progress
- `timetable_entries` — Master timetable grid
- `academic_calendar` — Institutional events
- `announcements` — System announcements
- `alumni` — Graduate tracking
- `audit_logs` — Immutable action log
- `system_settings` — Key-value system configuration

### 14.2 Key Database Functions

| Function | Purpose |
|---|---|
| `has_role(user_id, role)` | Check user role (SECURITY DEFINER) |
| `get_user_role(user_id)` | Get primary role for a user |
| `recalculate_fee_balance(student_id)` | Recalculate student fee balance |
| `submit_clearance_request(...)` | Atomically create clearance + 4 steps |
| `check_schedule_conflicts(...)` | Detect timetable conflicts |
| `generate_class_sessions(...)` | Batch create class sessions from schedule |

### 14.3 Database Triggers

| Trigger | Table | Action |
|---|---|---|
| `handle_new_user` | `auth.users` (INSERT) | Creates profile + role + student record |
| Fee recalculation | `payments` (UPDATE) | Recalculates balance on approval |

---

## 15. Security Architecture

### 15.1 Row-Level Security (RLS)

**Every table** has RLS enabled with policies following this pattern:

```
Admins  → Full CRUD (via has_role check)
Lecturers → Read academic data + write own content
Students  → Read/write only own records
```

### 15.2 Policy Types

| Policy Pattern | Example |
|---|---|
| Admin full access | `has_role(auth.uid(), 'admin')` |
| Own record access | `auth.uid() = user_id` |
| Related record access | Subquery joining through student/enrollment tables |
| Public read | `USING (true)` for SELECT only |

### 15.3 Encryption

| Layer | Method |
|---|---|
| At rest | AES-256 (Supabase/AWS managed) |
| In transit | TLS 1.3 on all connections |
| Passwords | bcrypt (10 rounds) |
| Secrets | Supabase Vault |

### 15.4 Audit Trail

All administrative actions are logged to `audit_logs` with:
- User ID and email
- Action performed
- Table affected
- Record ID
- Old and new values (JSON)
- Timestamp

Audit logs are **immutable** — no UPDATE or DELETE policies exist.

---

## 16. Edge Functions

### 16.1 `create-admin`

**Purpose:** Bootstrap the first admin account.

**Input:**
```json
{
  "email": "admin@bribte.ac.ug",
  "password": "password",
  "full_name": "Admin Name",
  "role": "admin"
}
```

**Process:**
1. Creates auth user with auto-confirmed email
2. Creates profile record
3. Assigns admin role in user_roles

**Security:** No JWT verification (bootstrap function). Should be disabled after first use.

### 16.2 `process-receipt`

**Purpose:** AI-powered receipt OCR and validation.

**Input:** Receipt upload ID (triggered after file upload)

**Process:** 10-step validation pipeline (see Section 8)

**Required Secrets:**
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`
- `LOVABLE_API_KEY`

---

## 17. Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|---|---|---|
| Student can't log in | Email not verified | Check email inbox for verification link |
| Student sees no courses | Not yet approved by admin | Admin must approve and assign course |
| Fee balance incorrect | Recalculation not triggered | Run `recalculate_fee_balance` for the student |
| Receipt stuck on "processing" | Edge function error | Check edge function logs; manually review |
| Timetable empty | No entries for enrolled course | Admin must create timetable entries |
| Clearance has no steps | Created before RPC function | Delete orphaned request; resubmit |
| Query returns partial data | Supabase 1000-row limit | Implement pagination for large datasets |
| PDF won't preview inline | Browser CORS policy | Opens in new tab (by design) |
| Lecturer can't see students | No students enrolled in their course | Verify enrollments exist |

### Edge Function Debugging

1. Check edge function logs in the backend dashboard
2. Verify all required secrets are configured
3. Test with curl to isolate frontend vs backend issues

### Database Debugging

1. Check RLS policies — most "permission denied" errors are RLS
2. Verify user has correct role in `user_roles`
3. Check foreign key relationships are intact
4. Monitor `audit_logs` for unexpected changes

---

*End of System Guide — BRIBTE Digital Campus Management System v1.0*
