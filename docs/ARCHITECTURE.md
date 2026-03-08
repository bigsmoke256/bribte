# Architecture & Design Document

## 1. System Overview

BRIBTE Digital Campus is a **single-page application (SPA)** with a **serverless backend**. The frontend is a React application served as static files. All business logic runs either client-side or in Supabase Edge Functions (Deno runtime). Data persistence, authentication, and file storage are handled by Supabase (PostgreSQL).

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (SPA)                        │
│  React 18 + TypeScript + Tailwind + shadcn/ui           │
│                                                          │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ AuthCtx  │  │ React Query  │  │ Supabase Client   │  │
│  │ (Context)│  │ (Cache/Fetch)│  │ (REST + Realtime) │  │
│  └──────────┘  └──────────────┘  └───────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS (PostgREST API)
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   Supabase Platform                      │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │PostgreSQL│  │   Auth   │  │ Storage  │  │  Edge   │ │
│  │ + RLS    │  │(GoTrue)  │  │ (S3)     │  │Functions│ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
│                                                │         │
│                                    ┌───────────┘         │
│                                    ▼                     │
│                          ┌──────────────────┐            │
│                          │ Lovable AI       │            │
│                          │ Gateway          │            │
│                          │ (Gemini 2.5)     │            │
│                          └──────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Architectural Decisions

### 2.1 Why SPA + Supabase (No Custom Backend)

**Decision:** Use Supabase as the sole backend instead of building a custom Node.js/Express server.

**Rationale:**
- **Speed of development** — Supabase provides auth, database, storage, and edge functions out of the box.
- **Row-Level Security (RLS)** — Security is enforced at the database level, not in application code. This eliminates entire classes of authorization bugs.
- **Scalability** — PostgreSQL handles 10,000+ students. Supabase auto-scales connection pooling.
- **Cost** — No servers to manage. Pay-per-usage model.

**Trade-offs:**
- Complex business logic must be in SQL functions or Edge Functions (Deno), not a traditional API framework.
- No middleware layer for request transformation.

### 2.2 Why SECURITY DEFINER Functions

**Decision:** Use PostgreSQL `SECURITY DEFINER` functions for operations that span multiple tables with different RLS policies.

**Examples:**
- `submit_clearance_request` — Inserts into both `clearance_requests` and `clearance_steps` atomically.
- `recalculate_fee_balance` — Reads from `courses`, `fee_items`, `payments`, `student_fee_selections` and writes to `students`.
- `handle_new_user` — Trigger that creates profile, role, and student records on signup.

**Rationale:** Students have INSERT on `clearance_requests` but NOT on `clearance_steps`. A SECURITY DEFINER function bypasses RLS to perform the multi-table transaction, while still validating ownership (`auth.uid()` check).

### 2.3 Why Role-Based Architecture with Separate Dashboards

**Decision:** Three completely separate dashboard layouts (`/student/*`, `/lecturer/*`, `/admin/*`) instead of a unified dashboard with conditional rendering.

**Rationale:**
- **Security** — Route-level protection via `ProtectedRoute` component that checks role before rendering.
- **Performance** — Each role only loads its own pages (code-splitting at route level).
- **UX** — Each role has fundamentally different navigation and workflows.

### 2.4 Why AI-Powered Receipt Processing

**Decision:** Use Google Gemini 2.5 Flash for OCR and fraud detection on payment receipts instead of manual data entry.

**Rationale:**
- **Fraud prevention** — AI detects manipulated images, fake receipts, and screenshot-based forgeries.
- **Speed** — Auto-approval for valid receipts reduces admin workload by ~80%.
- **10-step validation pipeline** — Multiple independent checks (institution match, name match, duplicate detection, amount validation) provide defense-in-depth.

**Trade-offs:**
- False positives require manual admin review (~5-10% of legitimate receipts).
- Requires LOVABLE_API_KEY secret for AI Gateway access.

---

## 3. Component Architecture

### 3.1 Authentication Flow

```
User → LoginPage → supabase.auth.signInWithPassword()
                                    │
                                    ▼
                        AuthProvider (Context)
                        ├── Listens to onAuthStateChange
                        ├── Fetches user_roles → role
                        ├── Fetches profiles → fullName, avatar
                        └── Sets AppUser in context
                                    │
                                    ▼
                        ProtectedRoute (role check)
                        └── Renders role-specific dashboard
```

### 3.2 Fee Calculation Engine

```
Student record changes (course, study_mode)
    OR Payment approved/deleted
        │
        ▼
    recalculate_fee_balance(student_id)
        │
        ├── Get tuition from courses (based on study_mode)
        ├── Sum mandatory fee_items (filtered by applies_to, frequency, year/semester)
        ├── Sum optional fee_items (from student_fee_selections)
        ├── Sum approved payments
        └── UPDATE students SET fee_balance = (tuition + fees) - paid
```

### 3.3 Receipt Processing Pipeline

```
Student uploads receipt → receipt_uploads (status: processing)
    │
    ▼
process-receipt Edge Function
    │
    ├── Check 0: File hash duplicate
    ├── Check 1: AI fraud detection (is_genuine_receipt?)
    ├── Check 2: Mandatory fields present?
    ├── Check 3: Institution name matches BRIBTE?
    ├── Check 4: OCR confidence ≥ 50%?
    ├── Check 5: Transaction code not duplicate?
    ├── Check 6: Payment provider is known?
    ├── Check 7: Student name matches (≥70% similarity)?
    ├── Check 8: Course matches enrollment?
    ├── Check 9: Amount in words cross-check
    └── Check 10: Amount within reasonable range?
        │
        ├── ALL PASS → Auto-approve → Create payment → Recalculate balance
        ├── SOFT FAIL → status: review_required (admin reviews)
        └── HARD FAIL → status: rejected (admin notified via announcement)
```

### 3.4 Clearance Workflow

```
Student submits request → submit_clearance_request RPC
    │
    ├── Creates clearance_requests (status: pending)
    └── Creates 4 clearance_steps:
        Step 0: Finance Office (pending)
        Step 1: Library (pending)
        Step 2: Department Head (pending)
        Step 3: Final Admin Approval (pending)
            │
            ▼
    Admin reviews each step independently
        ├── Approve → step.status = approved
        │   └── All 4 approved? → request.status = cleared
        └── Reject → step.status = rejected
            └── request.status = rejected
```

---

## 4. Security Model

### 4.1 Authentication
- Supabase GoTrue (bcrypt password hashing, JWT tokens)
- Email verification required before login
- Session persisted in localStorage with auto-refresh

### 4.2 Authorization (RLS)
Every table has Row-Level Security policies. The pattern is:
- **Admins**: Full CRUD via `has_role(auth.uid(), 'admin')`
- **Lecturers**: Read access to most tables; write access to own courses/assignments
- **Students**: Read/write access to own records only (verified via `students.user_id = auth.uid()`)

### 4.3 Role Storage
Roles are stored in a **separate `user_roles` table** (not on the profiles table) to prevent privilege escalation. The `has_role()` function is `SECURITY DEFINER` to avoid recursive RLS checks.

### 4.4 Edge Function Security
- `create-admin`: `verify_jwt = false` (allows initial admin creation), but verifies caller is admin via Authorization header for subsequent calls.
- `process-receipt`: `verify_jwt = false` (called server-side), uses service role key internally.

---

## 5. Data Flow Patterns

### 5.1 Client-Side Data Fetching
- **Direct Supabase queries** via `supabase.from('table').select()` — most common pattern.
- **RPC calls** via `supabase.rpc('function_name', params)` — for complex multi-table operations.
- **React Query** is available but most pages use `useState` + `useEffect` for simplicity.

### 5.2 File Storage
Five public storage buckets:
- `receipts` — Payment receipt images/PDFs
- `course-materials` — Lecture notes, slides
- `submissions` — Student assignment submissions
- `assignments` — Assignment instruction files
- `avatars` — User profile photos

All buckets are public (signed URLs not required) for simplified access. Security relies on the upload path and RLS on the metadata tables.

---

## 6. Scalability Considerations

| Concern | Mitigation |
|---|---|
| 10K+ students querying simultaneously | Supabase connection pooling (PgBouncer); RLS-filtered queries are index-friendly |
| Large file uploads | Supabase Storage (S3-backed); chunked uploads for receipts |
| AI processing bottleneck | Edge function is stateless; Gemini 2.5 Flash is optimized for speed |
| Audit log growth | Append-only table; consider partitioning by date for deployments >1 year |
| Fee recalculation | Triggered only on payment/student changes, not on every page load |
