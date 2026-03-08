# Database Schema Documentation

## Overview

The BRIBTE system uses **PostgreSQL** via Supabase with **Row-Level Security (RLS)** on every table. The schema contains **25 tables**, **3 custom enums**, and **10 database functions**.

---

## Entity-Relationship Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  auth.users  │────▶│  user_roles  │     │  departments │
│  (Supabase)  │     │  id, role    │     │  id, name    │
└──────┬───────┘     └──────────────┘     └──────┬───────┘
       │                                          │
       ├─────────────────────┐                    │
       ▼                     ▼                    │
┌──────────────┐     ┌──────────────┐             │
│   profiles   │     │   students   │◀────────────┤
│  full_name   │     │  course_id ──┼──┐          │
│  email       │     │  fee_balance │  │          │
│  avatar_url  │     │  study_mode  │  │          │
└──────────────┘     └──────┬───────┘  │    ┌─────┴────────┐
                            │          │    │   lecturers   │
                            │          │    │  department_id│
                            │          │    │  specialization
                            │          │    └──────┬────────┘
                            │          ▼           │
                            │   ┌──────────────┐   │
                            │   │   courses    │◀──┘
                            │   │  course_code │
                            │   │  tuition_day │
                            │   │  program_level│
                            │   └──────┬───────┘
                            │          │
          ┌─────────────────┼──────────┼────────────────┐
          ▼                 ▼          ▼                 ▼
   ┌─────────────┐  ┌────────────┐  ┌──────────────┐  ┌──────────────┐
   │ enrollments │  │   exams    │  │ timetable_   │  │course_modules│
   │ academic_yr │  │ exam_date  │  │  entries     │  │   title      │
   │ semester    │  │ max_marks  │  │ day_of_week  │  └──────┬───────┘
   └─────────────┘  └─────┬──────┘  └──────────────┘         │
                          │                                    ▼
                          ▼                            ┌──────────────┐
                   ┌──────────────┐                    │course_lessons│
                   │ exam_results │                    └──────────────┘
                   │  grade       │
                   │  marks       │
                   └──────────────┘
```

---

## Tables

### Core Identity

#### `profiles`
User profile data. One row per auth user.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | — | References auth.users.id |
| full_name | text | No | — | Display name |
| email | text | No | — | Email address |
| phone | text | Yes | — | Phone number |
| avatar_url | text | Yes | — | Profile photo URL |
| created_at | timestamptz | No | now() | — |
| updated_at | timestamptz | No | now() | — |

**RLS:** Users can view/update own. Admins can view/update all. Lecturers can view all.

#### `user_roles`
Role assignments. Stored separately from profiles to prevent privilege escalation.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | — | References auth.users.id |
| role | app_role | No | — | admin, lecturer, or student |

**Unique constraint:** (user_id, role)

---

### Academic

#### `departments`
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| name | text | Department name |
| created_at | timestamptz | — |

#### `courses`
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| course_code | text | e.g., "BBA-101" |
| course_name | text | Full course name |
| department_id | uuid | FK → departments |
| lecturer_id | uuid | FK → lecturers (nullable) |
| program_level | text | Diploma, National Diploma, etc. |
| duration_years | integer | Default: 2 |
| tuition_day | numeric | Tuition for day students |
| tuition_evening | numeric | Tuition for evening students |
| tuition_weekend | numeric | Tuition for weekend students |
| max_capacity | integer | Default: 50 |
| entry_requirement | text | Admission requirements |
| is_published | boolean | Default: true |

#### `course_modules`
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| course_id | uuid | FK → courses |
| title | text | Module title |
| description | text | Module description |
| sort_order | integer | Display order |

#### `course_lessons`
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| module_id | uuid | FK → course_modules |
| title | text | Lesson title |
| content | text | Lesson content |
| sort_order | integer | Display order |

#### `course_materials`
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| course_id | uuid | FK → courses |
| title | text | Material title |
| file_url | text | Storage URL |
| file_type | text | e.g., "pdf", "pptx" |
| uploaded_by | uuid | Uploader's user_id |

---

### Students

#### `students`
| Column | Type | Default | Description |
|---|---|---|---|
| id | uuid | gen_random_uuid() | Primary key |
| user_id | uuid | — | References auth.users.id |
| course_id | uuid | null | FK → courses |
| registration_number | text | null | e.g., "BRIBTE/2026/001" |
| status | text | 'pending' | pending, active, suspended, graduated |
| study_mode | text | 'Day' | Day, Evening, Weekend |
| year_of_study | integer | 1 | Current year |
| semester | integer | 1 | Current semester |
| fee_balance | numeric | 0 | Outstanding fees (auto-calculated) |
| admission_date | date | CURRENT_DATE | — |

#### `enrollments`
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| student_id | uuid | FK → students |
| course_id | uuid | FK → courses |
| academic_year | text | e.g., "2025/2026" |
| semester | integer | 1 or 2 |
| study_mode | text | Day, Evening, Weekend |
| status | text | Default: 'approved' |

---

### Financial

#### `fee_items`
Configurable fee structure.

| Column | Type | Default | Description |
|---|---|---|---|
| id | uuid | — | Primary key |
| name | text | — | e.g., "Registration Fee" |
| amount | numeric | 0 | Amount in UGX |
| category | text | 'general' | general, tuition, functional, etc. |
| applies_to | text | 'all' | all, diploma_only, semester_basis, term_basis |
| frequency | text | 'once' | once, yearly, per_semester, per_term |
| is_optional | boolean | false | Can student opt out? |

#### `student_fee_selections`
Tracks which optional fees a student has selected.

| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| student_id | uuid | FK → students |
| fee_item_id | uuid | FK → fee_items |

#### `payments`
| Column | Type | Default | Description |
|---|---|---|---|
| id | uuid | — | Primary key |
| student_id | uuid | — | FK → students |
| amount | numeric | — | Payment amount |
| payment_status | text | 'pending' | pending, approved, rejected |
| payment_date | timestamptz | now() | — |
| receipt_url | text | null | Link to receipt file |
| approved_by | uuid | null | Admin who approved |
| notes | text | null | — |
| academic_year | text | null | — |
| semester | text | null | — |

#### `receipt_uploads`
| Column | Type | Default | Description |
|---|---|---|---|
| id | uuid | — | Primary key |
| student_id | uuid | — | FK → students |
| file_url | text | — | Storage URL |
| file_hash | text | null | SHA-256 for dedup |
| status | text | 'processing' | processing, verified, rejected, review_required |
| course_id | uuid | null | FK → courses |
| reviewed_by | uuid | null | Admin reviewer |
| review_notes | text | null | — |

#### `receipt_extractions`
AI-extracted data from receipts.

| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| receipt_id | uuid | FK → receipt_uploads |
| amount | numeric | Extracted amount |
| transaction_id | text | Payment code |
| payment_date | date | — |
| sender_name | text | Name on receipt |
| student_class | text | Course on receipt |
| institution_name | text | Institution on receipt |
| payment_provider | text | e.g., "SchoolPay" |
| channel_depositor | text | Depositor info |
| channel_memo | text | Memo field |
| trans_type | text | Transaction type |
| amount_in_words | text | Amount in words |
| description | text | Receipt description |
| confidence_score | real | 0.0 – 1.0 |
| raw_text | text | Raw AI response |
| validation_flags | jsonb | Validation results |

#### `payment_transactions`
Tracks processed transaction codes for duplicate prevention.

| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| student_id | uuid | FK → students |
| course_id | uuid | FK → courses |
| transaction_id | text | Unique payment code |
| amount | numeric | — |
| receipt_id | uuid | FK → receipt_uploads |

---

### Scheduling & Attendance

#### `course_schedules`
Recurring weekly schedule templates.

| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| course_id | uuid | FK → courses |
| lecturer_id | uuid | FK → lecturers |
| day_of_week | integer | 0=Sunday, 6=Saturday |
| start_time | time | — |
| end_time | time | — |
| meeting_link_or_room | text | Room or meeting URL |

#### `class_sessions`
Individual class instances generated from schedules.

| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| course_id | uuid | FK → courses |
| schedule_id | uuid | FK → course_schedules |
| session_date | date | — |
| start_time | time | — |
| end_time | time | — |
| lecturer_id | uuid | FK → lecturers |
| status | session_status | scheduled, live, completed, cancelled |
| meeting_link | text | — |

#### `timetable_entries`
Admin-managed timetable (may overlap with course_schedules for different views).

| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| course_id | uuid | FK → courses |
| lecturer_id | uuid | FK → lecturers |
| module_id | uuid | FK → course_modules |
| day_of_week | integer | — |
| start_time | time | — |
| end_time | time | — |
| room_location | text | — |
| created_by | uuid | Admin user_id |

#### `attendance`
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| session_id | uuid | FK → class_sessions |
| student_id | uuid | FK → students |
| status | attendance_status | present, absent, late |
| time_joined | timestamptz | When student joined |

---

### Exams & Assignments

#### `exams`
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| title | text | Exam title |
| course_id | uuid | FK → courses |
| exam_type | text | final, midterm, quiz |
| exam_date | date | — |
| start_time | time | — |
| end_time | time | — |
| max_marks | numeric | Default: 100 |
| venue | text | — |
| status | text | scheduled, ongoing, completed |
| academic_year | text | — |
| semester | integer | — |
| created_by | uuid | Admin/lecturer user_id |

#### `exam_results`
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| exam_id | uuid | FK → exams |
| student_id | uuid | FK → students |
| marks_obtained | numeric | — |
| grade | text | A, B+, B, etc. |
| grade_points | numeric | — |
| remarks | text | — |
| entered_by | uuid | Lecturer/admin user_id |

#### `assignments`
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| course_id | uuid | FK → courses |
| lecturer_id | uuid | Creator's user_id |
| title | text | — |
| instructions | text | — |
| file_url | text | Instruction file |
| deadline | timestamptz | — |
| max_grade | numeric | Default: 100 |

#### `submissions`
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| assignment_id | uuid | FK → assignments |
| student_id | uuid | FK → students |
| file_url | text | Submission file |
| status | text | submitted, graded |
| grade | numeric | — |
| feedback | text | Lecturer feedback |
| submitted_at | timestamptz | — |

---

### Clearance

#### `clearance_requests`
| Column | Type | Default | Description |
|---|---|---|---|
| id | uuid | — | Primary key |
| student_id | uuid | — | FK → students |
| clearance_type | text | 'end_semester' | end_semester, graduation |
| academic_year | text | — | e.g., "2025/2026" |
| semester | integer | 1 | — |
| status | text | 'pending' | pending, in_progress, cleared, rejected |

#### `clearance_steps`
| Column | Type | Default | Description |
|---|---|---|---|
| id | uuid | — | Primary key |
| clearance_id | uuid | — | FK → clearance_requests |
| step_name | text | — | Finance Office, Library, Department Head, Final Admin Approval |
| step_order | integer | 0 | 0-3 |
| status | text | 'pending' | pending, approved, rejected |
| approved_by | uuid | null | Admin user_id |
| approved_at | timestamptz | null | — |
| notes | text | null | Approval/rejection notes |

---

### Other

#### `announcements`
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| author_id | uuid | Creator's user_id |
| title | text | — |
| message | text | — |
| target_group | text | all, student, lecturer, admin |
| target_course_id | uuid | FK → courses (optional) |
| priority | text | low, medium, high, urgent |

#### `academic_calendar`
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| title | text | Event title |
| start_date | date | — |
| end_date | date | — |
| event_type | text | general, exam, holiday, etc. |
| academic_year | text | — |
| semester | integer | — |
| description | text | — |
| created_by | uuid | Admin user_id |

#### `alumni`
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | References auth.users.id |
| student_id | uuid | FK → students (optional) |
| graduation_date | date | — |
| course_completed | text | — |
| degree_classification | text | — |
| final_gpa | numeric | — |
| current_employer | text | — |
| job_title | text | — |
| linkedin_url | text | — |
| bio | text | — |
| contact_email | text | — |
| contact_phone | text | — |

#### `audit_logs`
Append-only log of administrative actions.

| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Actor |
| user_email | text | Actor email |
| action | text | e.g., "approve_clearance_step" |
| table_name | text | Affected table |
| record_id | text | Affected record ID |
| description | text | Human-readable description |
| old_values | jsonb | Previous values |
| new_values | jsonb | New values |
| created_at | timestamptz | — |

**RLS:** Insert by any authenticated user. Select by admins only. No update/delete.

#### `system_settings`
Key-value store for application configuration.

| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| key | text | Setting key |
| value | text | Setting value |
| category | text | general, fees, etc. |

---

## Enums

```sql
CREATE TYPE app_role AS ENUM ('admin', 'lecturer', 'student');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late');
CREATE TYPE session_status AS ENUM ('scheduled', 'live', 'completed', 'cancelled');
```

---

## Database Functions

| Function | Type | Description |
|---|---|---|
| `handle_new_user()` | Trigger (SECURITY DEFINER) | Auto-creates profile, role, and student record on signup |
| `has_role(uuid, app_role)` | Query (SECURITY DEFINER) | Checks if user has a specific role (used in RLS policies) |
| `get_user_role(uuid)` | Query (SECURITY DEFINER) | Returns user's role |
| `submit_clearance_request(...)` | RPC (SECURITY DEFINER) | Atomically creates clearance request + 4 steps |
| `recalculate_fee_balance(uuid)` | RPC (SECURITY DEFINER) | Recalculates student's fee balance |
| `generate_class_sessions(...)` | RPC (SECURITY DEFINER) | Creates class sessions from schedule template |
| `check_schedule_conflicts(...)` | RPC (SECURITY DEFINER) | Checks for lecturer/room scheduling conflicts |
| `update_updated_at_column()` | Trigger | Auto-updates `updated_at` timestamp |
| `trigger_recalc_fee_on_payment()` | Trigger (SECURITY DEFINER) | Recalculates fees when payment changes |
| `trigger_recalc_fee_on_student_change()` | Trigger (SECURITY DEFINER) | Recalculates fees when student's course/mode changes |

---

## Performance Considerations

1. **Indexes** — PostgreSQL auto-creates indexes on primary keys and foreign keys. Additional indexes may be needed on `students.user_id`, `students.registration_number`, and `payment_transactions.transaction_id`.
2. **RLS overhead** — RLS policies add a WHERE clause to every query. The `has_role()` function is marked `STABLE` to allow PostgreSQL to cache results within a transaction.
3. **Fee recalculation** — Triggered only on payment/student changes, not on read operations. Writes to a denormalized `fee_balance` column to avoid expensive JOINs on every page load.
4. **Audit log growth** — Append-only table. For deployments >1 year, consider table partitioning by `created_at` month.
