# API Documentation

## Overview

BRIBTE uses **Supabase PostgREST** as its API layer. All data access goes through the auto-generated REST API with Row-Level Security (RLS) enforcing authorization. Additionally, two **Edge Functions** handle operations requiring elevated privileges or external integrations.

**Base URL:** `https://<project-id>.supabase.co`

**Authentication:** All requests require a JWT bearer token in the `Authorization` header (except edge functions with `verify_jwt = false`).

```
Authorization: Bearer <access_token>
apikey: <anon_key>
```

---

## 1. Authentication Endpoints

### Sign Up
```
POST /auth/v1/signup
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "password123",
  "data": {
    "full_name": "John Doe",
    "role": "student"
  }
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "student@example.com",
  "confirmation_sent_at": "2026-03-08T..."
}
```

**Side Effects (via `handle_new_user` trigger):**
- Creates `profiles` record
- Creates `user_roles` record with role `student`
- Creates `students` record with status `pending`

### Sign In
```
POST /auth/v1/token?grant_type=password
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "...",
  "expires_in": 3600,
  "user": { "id": "uuid", "email": "..." }
}
```

**Error (400):** `{ "error": "Email not confirmed" }`

### Sign Out
```
POST /auth/v1/logout
Authorization: Bearer <token>
```

---

## 2. Edge Functions

### 2.1 Create Admin / Lecturer

**Endpoint:** `POST /functions/v1/create-admin`
**Auth:** Optional (first call can be unauthenticated; subsequent calls verified as admin)

**Request:**
```json
{
  "email": "lecturer@bribte.ac.ug",
  "password": "securepass",
  "full_name": "Dr. Jane Smith",
  "role": "lecturer"
}
```

**Response (200):**
```json
{
  "success": true,
  "user_id": "uuid"
}
```

**Error Codes:**
| Status | Error | Description |
|---|---|---|
| 400 | `Missing fields` | One or more of email, password, full_name, role missing |
| 400 | `User already registered` | Email already exists |
| 403 | `Unauthorized` | Caller is not an admin (when Authorization header provided) |
| 405 | `Method not allowed` | Not a POST request |

**Side Effects:**
- Creates auth user with `email_confirm: true`
- Creates `profiles` record
- Creates `user_roles` record
- If role is `lecturer`, creates `lecturers` record

---

### 2.2 Process Receipt

**Endpoint:** `POST /functions/v1/process-receipt`
**Auth:** None required (uses service role key internally)

**Request:**
```json
{
  "receipt_id": "uuid"
}
```

**Response (200) — Auto-Approved:**
```json
{
  "status": "verified",
  "extracted": {
    "amount": 500000,
    "transaction_id": "PAY-123456"
  },
  "new_balance": 250000
}
```

**Response (200) — Flagged for Review:**
```json
{
  "status": "review_required",
  "reason": "name_partial_match"
}
```

**Response (200) — Rejected:**
```json
{
  "status": "rejected",
  "reason": "fake_receipt",
  "details": "AI detected this is NOT a genuine SchoolPay receipt.",
  "indicators": ["Plain text typed in a document editor"]
}
```

**Rejection Reasons:**
| Reason | Description |
|---|---|
| `duplicate_file` | Same file hash already uploaded |
| `fake_receipt` | AI fraud detection flagged as non-genuine |
| `missing_fields` | Required fields (payment_code, student_name, amount, etc.) not found |
| `wrong_institution` | Institution name doesn't match BRIBTE |
| `duplicate_transaction` | Transaction code already processed |
| `name_mismatch` | Student name similarity < 30% |

**Review Required Reasons:**
| Reason | Description |
|---|---|
| `extraction_failed` | AI could not parse content |
| `low_confidence` | OCR confidence < 50% |
| `unknown_provider` | Payment channel not recognized |
| `name_partial_match` | Name similarity 30-70% |
| `course_mismatch` | Receipt course doesn't match enrollment |
| `amount_suspicious` | Amount > 10M UGX or > 3x balance |
| `fraud_indicators` | AI flagged potential issues |

---

## 3. Database RPC Functions

### 3.1 Submit Clearance Request

```
POST /rest/v1/rpc/submit_clearance_request
Authorization: Bearer <student_token>

{
  "p_student_id": "uuid",
  "p_clearance_type": "end_semester",
  "p_academic_year": "2025/2026",
  "p_semester": 1
}
```

**Response (200):** `"uuid"` (the new clearance request ID)

**Error:** `Unauthorized` if student_id doesn't belong to the authenticated user.

### 3.2 Recalculate Fee Balance

```
POST /rest/v1/rpc/recalculate_fee_balance
Authorization: Bearer <admin_token>

{
  "p_student_id": "uuid"
}
```

**Response (200):** `null` (void function, updates `students.fee_balance` in place)

### 3.3 Generate Class Sessions

```
POST /rest/v1/rpc/generate_class_sessions

{
  "p_course_id": "uuid",
  "p_start_date": "2026-01-13",
  "p_weeks": 12
}
```

**Response (200):** `12` (number of sessions generated)

### 3.4 Check Schedule Conflicts

```
POST /rest/v1/rpc/check_schedule_conflicts

{
  "p_course_id": "uuid",
  "p_day_of_week": 1,
  "p_start_time": "09:00",
  "p_end_time": "11:00",
  "p_lecturer_id": "uuid",
  "p_meeting_room": "Room 101"
}
```

**Response (200):**
```json
[
  { "conflict_type": "lecturer", "conflict_details": "Lecturer already has a class: BBA 101" },
  { "conflict_type": "room", "conflict_details": "Room is already booked: ICT 201" }
]
```

### 3.5 Get User Role

```
POST /rest/v1/rpc/get_user_role
{ "p_user_id": "uuid" }
```

**Response (200):** `"admin"` | `"lecturer"` | `"student"`

### 3.6 Has Role

```
POST /rest/v1/rpc/has_role
{ "p_user_id": "uuid", "p_role": "admin" }
```

**Response (200):** `true` | `false`

---

## 4. PostgREST API (Data Tables)

All tables follow the standard PostgREST conventions. Below are common query patterns used in the application.

### Students

```
# List all students (admin only)
GET /rest/v1/students?select=*,profiles:profiles(full_name,email)&order=created_at.desc

# Get student by user_id
GET /rest/v1/students?user_id=eq.<uuid>&select=*

# Update student
PATCH /rest/v1/students?id=eq.<uuid>
{ "course_id": "uuid", "status": "active", "study_mode": "Day" }
```

### Courses

```
# List all published courses
GET /rest/v1/courses?is_published=eq.true&select=*,departments(name)

# Get course with modules and lessons
GET /rest/v1/courses?id=eq.<uuid>&select=*,course_modules(id,title,sort_order,course_lessons(id,title,sort_order))
```

### Payments

```
# Student's payment history
GET /rest/v1/payments?student_id=eq.<uuid>&order=payment_date.desc

# Approve payment (admin)
PATCH /rest/v1/payments?id=eq.<uuid>
{ "payment_status": "approved", "approved_by": "<admin_uuid>" }
```

### Announcements

```
# Get all announcements for target group
GET /rest/v1/announcements?or=(target_group.eq.all,target_group.eq.student)&order=created_at.desc

# Create announcement (admin/lecturer)
POST /rest/v1/announcements
{ "title": "...", "message": "...", "author_id": "uuid", "target_group": "all", "priority": "medium" }
```

---

## 5. Storage API

**Base URL:** `https://<project-id>.supabase.co/storage/v1`

### Upload File
```
POST /object/receipts/<student_id>/<timestamp>_<filename>
Authorization: Bearer <token>
Content-Type: image/jpeg

<binary data>
```

### Get Public URL
```
GET /object/public/receipts/<path>
```

### Buckets
| Bucket | Purpose | Public |
|---|---|---|
| `receipts` | Payment receipt images/PDFs | Yes |
| `course-materials` | Lecture materials | Yes |
| `submissions` | Student assignment submissions | Yes |
| `assignments` | Assignment instruction files | Yes |
| `avatars` | User profile photos | Yes |
