# API Reference

## Document Information

| Field | Value |
|---|---|
| **Document ID** | BRIBTE-DEV-003 |
| **Version** | 1.0 |
| **Classification** | Internal — Tech4LYF Corporation |
| **Last Updated** | March 2026 |
| **Base URL** | `https://gllyuhhjatswhuundqrn.supabase.co` |

---

## 1. Authentication

### 1.1 Overview

BRIBTE uses **JWT-based authentication** via Supabase GoTrue. Tokens are issued on login and automatically refreshed by the Supabase client SDK.

### 1.2 Auth Headers

Every API request requires two headers:

```http
Authorization: Bearer <access_token>
apikey: <anon_key>
```

The `apikey` header uses the **publishable anon key** (safe to expose in frontend code). The `Authorization` header contains the user's **JWT access token** issued at login.

### 1.3 Token Lifecycle

| Event | Token Type | Lifetime |
|---|---|---|
| Login | Access Token | 1 hour |
| Login | Refresh Token | 7 days |
| Auto-refresh | New Access Token | 1 hour |
| Logout | Both invalidated | — |

### 1.4 Authentication Endpoints

#### Sign Up (Student Self-Registration)

```http
POST /auth/v1/signup
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "MinimumEightChars",
  "data": {
    "full_name": "John Doe",
    "role": "student"
  }
}
```

| Response Code | Description |
|---|---|
| 200 | Success — confirmation email sent |
| 422 | Invalid email or weak password |
| 429 | Rate limited (max 5 signups/hour per IP) |

**Trigger Side Effects:**
1. `profiles` record created (full_name, email)
2. `user_roles` record created (role: student)
3. `students` record created (status: pending)

#### Sign In

```http
POST /auth/v1/token?grant_type=password
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "MinimumEightChars"
}
```

| Response Code | Description |
|---|---|
| 200 | Success — returns access_token, refresh_token |
| 400 | Invalid credentials or email not confirmed |
| 429 | Rate limited |

**Response Body:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "abc...",
  "user": {
    "id": "uuid",
    "email": "student@example.com",
    "role": "authenticated"
  }
}
```

#### Refresh Token

```http
POST /auth/v1/token?grant_type=refresh_token
Content-Type: application/json

{
  "refresh_token": "abc..."
}
```

#### Sign Out

```http
POST /auth/v1/logout
Authorization: Bearer <access_token>
```

#### Get Current User

```http
GET /auth/v1/user
Authorization: Bearer <access_token>
```

---

## 2. Edge Functions

### 2.1 Create Admin / Lecturer

Creates a new user account with admin or lecturer role. Bypasses the normal signup flow (auto-confirms email).

```http
POST /functions/v1/create-admin
Content-Type: application/json
Authorization: Bearer <admin_token>  (optional for first admin)

{
  "email": "lecturer@bribte.ac.ug",
  "password": "securePassword123",
  "full_name": "Dr. Jane Smith",
  "role": "lecturer"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| email | string | ✅ | User email address |
| password | string | ✅ | Minimum 6 characters |
| full_name | string | ✅ | Display name |
| role | string | ✅ | "admin" or "lecturer" |

**Response Codes:**

| Code | Body | Description |
|---|---|---|
| 200 | `{"success": true, "user_id": "uuid"}` | User created |
| 400 | `{"error": "Missing fields"}` | Incomplete request |
| 400 | `{"error": "User already registered"}` | Email exists |
| 403 | `{"error": "Unauthorized"}` | Caller is not admin |
| 405 | `{"error": "Method not allowed"}` | Not POST |

**Side Effects:**
- Auth user created with email auto-confirmed
- Profile record created
- Role record created
- Lecturer record created (if role = lecturer)

---

### 2.2 Process Receipt

AI-powered receipt OCR extraction and 10-step fraud validation pipeline.

```http
POST /functions/v1/process-receipt
Content-Type: application/json

{
  "receipt_id": "uuid"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| receipt_id | uuid | ✅ | ID from receipt_uploads table |

**Response — Auto-Approved (200):**
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

**Response — Flagged for Review (200):**
```json
{
  "status": "review_required",
  "reason": "name_partial_match"
}
```

**Response — Rejected (200):**
```json
{
  "status": "rejected",
  "reason": "fake_receipt",
  "details": "AI detected this is NOT a genuine SchoolPay receipt.",
  "indicators": ["Plain text in document editor", "Missing SchoolPay branding"]
}
```

**Validation Pipeline:**

| Check | Rejection Reason | Severity |
|---|---|---|
| 0. File hash duplicate | `duplicate_file` | Hard reject |
| 1. AI fraud detection | `fake_receipt` | Hard reject |
| 2. Mandatory fields | `missing_fields` | Hard reject |
| 3. Institution match | `wrong_institution` | Hard reject |
| 4. OCR confidence | `low_confidence` | Review required |
| 5. Transaction code duplicate | `duplicate_transaction` | Hard reject |
| 6. Payment provider known | `unknown_provider` | Review required |
| 7. Student name match | `name_mismatch` / `name_partial_match` | Hard reject / Review |
| 8. Course match | `course_mismatch` | Review required |
| 9. Amount in words cross-check | (informational) | Logged |
| 10. Amount validation | `amount_suspicious` | Review required |
| 11. Fraud indicators present | `fraud_indicators` | Review required |

**Error (500):**
```json
{
  "error": "LOVABLE_API_KEY not configured"
}
```

---

## 3. Database RPC Functions

All RPC functions are called via:
```http
POST /rest/v1/rpc/{function_name}
Authorization: Bearer <token>
apikey: <anon_key>
Content-Type: application/json
```

### 3.1 submit_clearance_request

Atomically creates a clearance request and its 4 approval steps.

```json
{
  "p_student_id": "uuid",
  "p_clearance_type": "end_semester",
  "p_academic_year": "2025/2026",
  "p_semester": 1
}
```

| Param | Type | Required | Values |
|---|---|---|---|
| p_student_id | uuid | ✅ | Student's ID (not user_id) |
| p_clearance_type | text | ✅ | "end_semester", "graduation" |
| p_academic_year | text | ✅ | e.g., "2025/2026" |
| p_semester | integer | ✅ | 1 or 2 |

**Returns:** `uuid` — The new clearance request ID

**Errors:**
- `Unauthorized` — student_id doesn't belong to caller

**Created Steps:**
1. Finance Office (step_order: 0)
2. Library (step_order: 1)
3. Department Head (step_order: 2)
4. Final Admin Approval (step_order: 3)

### 3.2 recalculate_fee_balance

Recalculates a student's outstanding fee balance based on tuition, mandatory fees, optional fees, and approved payments.

```json
{ "p_student_id": "uuid" }
```

**Returns:** `void` (updates `students.fee_balance` in place)

**Calculation:**
```
fee_balance = (tuition[study_mode] + mandatory_fees + selected_optional_fees) - approved_payments
```

### 3.3 generate_class_sessions

Creates individual class session records from recurring schedule templates.

```json
{
  "p_course_id": "uuid",
  "p_start_date": "2026-01-13",
  "p_weeks": 12
}
```

**Returns:** `integer` — Number of sessions created

### 3.4 check_schedule_conflicts

Checks for lecturer time conflicts and room double-bookings.

```json
{
  "p_course_id": "uuid",
  "p_day_of_week": 1,
  "p_start_time": "09:00",
  "p_end_time": "11:00",
  "p_lecturer_id": "uuid",
  "p_meeting_room": "Room 101",
  "p_exclude_id": null
}
```

**Returns:** Array of conflicts:
```json
[
  { "conflict_type": "lecturer", "conflict_details": "Lecturer already has a class: BBA 101" }
]
```

### 3.5 get_user_role

```json
{ "_user_id": "uuid" }
```
**Returns:** `"admin"` | `"lecturer"` | `"student"`

### 3.6 has_role

```json
{ "_user_id": "uuid", "_role": "admin" }
```
**Returns:** `true` | `false`

---

## 4. PostgREST API (CRUD Endpoints)

All 25 tables are accessible via PostgREST at `/rest/v1/{table_name}`. Access is controlled by RLS policies.

### 4.1 Common Query Patterns

```http
# SELECT with filters
GET /rest/v1/students?status=eq.active&order=created_at.desc&limit=50

# SELECT with joins
GET /rest/v1/students?select=*,profiles:profiles(full_name,email),courses(course_name)

# INSERT
POST /rest/v1/payments
Content-Type: application/json
{ "student_id": "uuid", "amount": 500000, "payment_status": "pending" }

# UPDATE
PATCH /rest/v1/students?id=eq.<uuid>
Content-Type: application/json
{ "status": "active", "course_id": "uuid" }

# DELETE
DELETE /rest/v1/clearance_requests?id=eq.<uuid>

# UPSERT
POST /rest/v1/system_settings
Content-Type: application/json
Prefer: resolution=merge-duplicates
{ "key": "institution_name", "value": "BRIBTE", "category": "general" }
```

### 4.2 Pagination

```http
# Range-based pagination (recommended)
GET /rest/v1/audit_logs?order=created_at.desc
Range: 0-49

# Offset-based
GET /rest/v1/students?offset=50&limit=50
```

### 4.3 Full-Text Search

```http
GET /rest/v1/profiles?full_name=ilike.*john*
```

---

## 5. Storage API

**Base:** `https://gllyuhhjatswhuundqrn.supabase.co/storage/v1`

### Upload

```http
POST /object/{bucket}/{path}
Authorization: Bearer <token>
Content-Type: image/jpeg

<binary data>
```

### Download (Public)

```http
GET /object/public/{bucket}/{path}
```

### List Files

```http
POST /object/list/{bucket}
Authorization: Bearer <token>
Content-Type: application/json

{ "prefix": "student-id/", "limit": 100 }
```

---

## 6. Rate Limits & Quotas

| Resource | Limit | Scope |
|---|---|---|
| Auth signups | 5/hour | Per IP |
| Auth logins | 30/hour | Per IP |
| PostgREST queries | 1000/second | Global |
| Edge function invocations | 500K/month | Project |
| Storage uploads | 50MB per file | Per upload |
| Query result size | 1000 rows | Per query (default) |
| Database connections | ~60 | Via PgBouncer |

### Noisy Neighbor Mitigation (Multi-Tenant)

For future multi-tenant deployment:
- Per-tenant API rate limits via Kong Gateway configuration
- Per-tenant storage quotas tracked in `tenants` table
- Database connection limits distributed across tenants

---

## 7. Error Codes

### Standard HTTP Errors

| Code | Description | Common Cause |
|---|---|---|
| 400 | Bad Request | Invalid JSON, missing fields |
| 401 | Unauthorized | Expired or missing JWT |
| 403 | Forbidden | RLS policy denied access |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Unique constraint violation |
| 422 | Unprocessable Entity | Validation failed |
| 429 | Too Many Requests | Rate limited |
| 500 | Internal Server Error | Edge function crash |

### Supabase-Specific Errors

| Error | Description | Resolution |
|---|---|---|
| `PGRST116` | Not exactly one row | Use `.maybeSingle()` instead of `.single()` |
| `PGRST301` | RLS violation | Check user role and table policies |
| `23505` | Unique violation | Duplicate key (e.g., duplicate enrollment) |
| `23503` | Foreign key violation | Referenced record doesn't exist |
| `42501` | Insufficient privilege | RLS policy blocking operation |
