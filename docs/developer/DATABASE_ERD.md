# Database Entity-Relationship Diagram (ERD)

## Document Information

| Field | Value |
|---|---|
| **Document ID** | BRIBTE-DEV-004 |
| **Version** | 1.0 |
| **Classification** | Internal — Tech4LYF Corporation |
| **Last Updated** | March 2026 |
| **Database** | PostgreSQL 15 (Supabase) |
| **Total Tables** | 25 |
| **Total Functions** | 10 |
| **Custom Enums** | 3 |

---

## 1. High-Level Domain Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         BRIBTE DATABASE SCHEMA                          │
│                                                                         │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────┐                │
│  │  IDENTITY   │   │  ACADEMIC    │   │  FINANCIAL   │                │
│  │             │   │              │   │              │                │
│  │ profiles    │   │ departments  │   │ fee_items    │                │
│  │ user_roles  │   │ courses      │   │ payments     │                │
│  │ students    │   │ course_mods  │   │ receipt_up   │                │
│  │ lecturers   │   │ course_less  │   │ receipt_ext  │                │
│  │ alumni      │   │ course_mats  │   │ pay_trans    │                │
│  └─────────────┘   │ enrollments  │   │ student_fees │                │
│                     │ assignments  │   └──────────────┘                │
│  ┌─────────────┐   │ submissions  │                                    │
│  │ SCHEDULING  │   │ exams        │   ┌──────────────┐                │
│  │             │   │ exam_results │   │  OPERATIONS  │                │
│  │ schedules   │   └──────────────┘   │              │                │
│  │ sessions    │                       │ announce.    │                │
│  │ timetable   │   ┌──────────────┐   │ calendar     │                │
│  │ attendance  │   │  CLEARANCE   │   │ audit_logs   │                │
│  └─────────────┘   │              │   │ sys_settings │                │
│                     │ clear_req    │   └──────────────┘                │
│                     │ clear_steps  │                                    │
│                     └──────────────┘                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Detailed ERD

### 2.1 Identity & Roles Domain

```
                    ┌──────────────────┐
                    │   auth.users     │  (Supabase-managed)
                    │──────────────────│
                    │ id (PK)          │
                    │ email            │
                    │ encrypted_pass   │
                    │ raw_user_meta    │
                    └────────┬─────────┘
                             │ 1
                             │
              ┌──────────────┼───────────────┐
              │ 1            │ 1             │ 1
              ▼              ▼               ▼
   ┌──────────────┐  ┌────────────┐  ┌──────────────┐
   │   profiles   │  │ user_roles │  │   students   │
   │──────────────│  │────────────│  │──────────────│
   │ id (PK)      │  │ id (PK)    │  │ id (PK)      │
   │ user_id (FK) │  │ user_id    │  │ user_id (FK) │
   │ full_name    │  │ role       │  │ course_id (FK)──┐
   │ email        │  │ (enum)     │  │ reg_number   │  │
   │ phone        │  └────────────┘  │ status       │  │
   │ avatar_url   │                  │ study_mode   │  │
   └──────────────┘                  │ year_of_study│  │
                                     │ semester     │  │
                      ┌──────────┐   │ fee_balance  │  │
                      │ lecturers│   │ admission_dt │  │
                      │──────────│   └──────┬───────┘  │
                      │ id (PK)  │          │          │
                      │ user_id  │          │          │
                      │ dept_id──┼──┐       │          │
                      │ special. │  │       │          │
                      └──────────┘  │       │          │
                                    │       │          │
                      ┌─────────┐   │       │          │
                      │ alumni  │   │       │          │
                      │─────────│   │       │          │
                      │ id (PK) │   │       │          │
                      │ user_id │   │       │          │
                      │ stud_id─┼───┼───────┘          │
                      │ grad_dt │   │                   │
                      │ course  │   │                   │
                      │ gpa     │   │                   │
                      │ employer│   │                   │
                      └─────────┘   │                   │
                                    ▼                   │
                           ┌──────────────┐            │
                           │ departments  │            │
                           │──────────────│            │
                           │ id (PK)      │            │
                           │ name         │            │
                           └──────────────┘            │
                                                       ▼
```

### 2.2 Academic Domain

```
   ┌──────────────────┐
   │     courses       │◀─────── students.course_id
   │──────────────────│◀─────── lecturers (via courses.lecturer_id)
   │ id (PK)          │
   │ course_code      │
   │ course_name      │
   │ department_id (FK)│──▶ departments
   │ lecturer_id      │
   │ program_level    │
   │ duration_years   │
   │ tuition_day      │
   │ tuition_evening  │
   │ tuition_weekend  │
   │ max_capacity     │
   │ is_published     │
   └────────┬─────────┘
            │ 1
            │
    ┌───────┼────────┬──────────┬──────────┬────────────┐
    │       │        │          │          │            │
    ▼ N     ▼ N      ▼ N        ▼ N        ▼ N          ▼ N
┌────────┐┌──────┐┌────────┐┌────────┐┌──────────┐┌──────────────┐
│course_ ││enroll││assign- ││ exams  ││timetable ││course_       │
│modules ││ments ││ments   ││        ││_entries  ││schedules     │
│────────││──────││────────││────────││──────────││──────────────│
│id (PK) ││id    ││id (PK) ││id (PK) ││id (PK)   ││id (PK)       │
│course_ ││stud_ ││course_ ││course_ ││course_   ││course_id(FK) │
│  id(FK)││  id  ││  id(FK)││  id(FK)││  id(FK)  ││lecturer_id   │
│title   ││course││lect_id ││exam_dt ││lecturer_ ││day_of_week   │
│sort_ord││  _id ││title   ││start_t ││  id(FK)  ││start_time    │
└───┬────┘│acad_ ││deadline││end_t   ││day_of_wk ││end_time      │
    │     │ year ││max_grd ││max_mrk ││start_t   ││room          │
    ▼ N   │semes.││instruct││venue   ││end_t     │└──────┬───────┘
┌────────┐│status││file_url││status  ││room_loc  │       │
│course_ │└──────┘└───┬────┘└───┬────┘└──────────┘       │
│lessons │            │         │                          ▼ N
│────────│            ▼ N       ▼ N               ┌──────────────┐
│id (PK) │     ┌──────────┐ ┌────────────┐       │class_sessions│
│module_ │     │submiss-  │ │exam_results│       │──────────────│
│  id(FK)│     │ions      │ │────────────│       │id (PK)       │
│title   │     │──────────│ │id (PK)     │       │course_id(FK) │
│content │     │id (PK)   │ │exam_id(FK) │       │schedule_id   │
│sort_ord│     │assign_id │ │student_id  │       │session_date  │
└────────┘     │student_id│ │marks       │       │start/end_time│
               │file_url  │ │grade       │       │lecturer_id   │
               │grade     │ │grade_pts   │       │status (enum) │
               │feedback  │ │entered_by  │       │meeting_link  │
               │status    │ └────────────┘       └──────┬───────┘
               └──────────┘                              │
                                                         ▼ N
                                                  ┌──────────────┐
                                                  │  attendance  │
                                                  │──────────────│
                                                  │ id (PK)      │
                                                  │ session_id   │
                                                  │ student_id   │
                                                  │ status (enum)│
                                                  │ time_joined  │
                                                  └──────────────┘
```

### 2.3 Financial Domain

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────────────┐
│  fee_items   │     │ student_fee_      │     │     payments         │
│──────────────│     │ selections        │     │──────────────────────│
│ id (PK)      │◀────│───────────────────│     │ id (PK)              │
│ name         │     │ id (PK)           │     │ student_id (FK)──▶students
│ amount       │     │ student_id (FK)───┼─▶   │ amount               │
│ category     │     │ fee_item_id (FK)  │     │ payment_status       │
│ applies_to   │     └───────────────────┘     │ payment_date         │
│ frequency    │                                │ receipt_url          │
│ is_optional  │                                │ approved_by          │
└──────────────┘                                │ notes                │
                                                │ academic_year        │
                                                │ semester             │
                                                └──────────────────────┘

┌────────────────────┐     ┌─────────────────────┐
│  receipt_uploads   │     │ receipt_extractions  │
│────────────────────│     │─────────────────────│
│ id (PK)            │◀────│ receipt_id (FK)      │
│ student_id (FK)    │     │ amount               │
│ file_url           │     │ transaction_id       │
│ file_hash          │     │ payment_date         │
│ status             │     │ sender_name          │
│ course_id (FK)     │     │ student_class        │
│ reviewed_by        │     │ institution_name     │
│ review_notes       │     │ payment_provider     │
└────────┬───────────┘     │ confidence_score     │
         │                  │ validation_flags     │
         │                  │ raw_text             │
         ▼                  └─────────────────────┘
┌────────────────────┐
│payment_transactions│
│────────────────────│
│ id (PK)            │
│ student_id (FK)    │
│ course_id (FK)     │
│ transaction_id     │  ◀── Unique; prevents duplicate receipts
│ amount             │
│ receipt_id (FK)    │
└────────────────────┘
```

### 2.4 Clearance Domain

```
┌───────────────────────┐          ┌────────────────────────┐
│  clearance_requests   │          │   clearance_steps      │
│───────────────────────│    1:N   │────────────────────────│
│ id (PK)               │◀────────│ clearance_id (FK)      │
│ student_id (FK)───▶students      │ id (PK)                │
│ clearance_type        │          │ step_name              │
│ academic_year         │          │ step_order (0-3)       │
│ semester              │          │ status                 │
│ status                │          │ approved_by            │
│ created_at            │          │ approved_at            │
│ updated_at            │          │ notes                  │
└───────────────────────┘          └────────────────────────┘

Steps created atomically by submit_clearance_request():
  Step 0: Finance Office
  Step 1: Library
  Step 2: Department Head
  Step 3: Final Admin Approval
```

### 2.5 Operations Domain

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  announcements   │  │ academic_calendar│  │   audit_logs     │
│──────────────────│  │──────────────────│  │──────────────────│
│ id (PK)          │  │ id (PK)          │  │ id (PK)          │
│ author_id        │  │ title            │  │ user_id          │
│ title            │  │ start_date       │  │ user_email       │
│ message          │  │ end_date         │  │ action           │
│ target_group     │  │ event_type       │  │ table_name       │
│ target_course_id │  │ academic_year    │  │ record_id        │
│ priority         │  │ semester         │  │ description      │
└──────────────────┘  │ created_by       │  │ old_values (JSON)│
                      └──────────────────┘  │ new_values (JSON)│
                                            └──────────────────┘
┌──────────────────┐  ┌──────────────────┐
│ system_settings  │  │ course_materials │
│──────────────────│  │──────────────────│
│ id (PK)          │  │ id (PK)          │
│ key              │  │ course_id (FK)   │
│ value            │  │ title            │
│ category         │  │ file_url         │
└──────────────────┘  │ file_type        │
                      │ uploaded_by      │
                      └──────────────────┘
```

---

## 3. Custom Enums

```sql
CREATE TYPE app_role AS ENUM ('admin', 'lecturer', 'student');

CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late');

CREATE TYPE session_status AS ENUM ('scheduled', 'live', 'completed', 'cancelled');
```

---

## 4. Foreign Key Summary

| From Table | Column | To Table | Column | On Delete |
|---|---|---|---|---|
| students | course_id | courses | id | — |
| lecturers | department_id | departments | id | — |
| courses | department_id | departments | id | — |
| enrollments | student_id | students | id | — |
| enrollments | course_id | courses | id | — |
| assignments | course_id | courses | id | — |
| submissions | assignment_id | assignments | id | — |
| submissions | student_id | students | id | — |
| exams | course_id | courses | id | — |
| exam_results | exam_id | exams | id | — |
| exam_results | student_id | students | id | — |
| course_modules | course_id | courses | id | — |
| course_lessons | module_id | course_modules | id | — |
| course_materials | course_id | courses | id | — |
| course_schedules | course_id | courses | id | — |
| course_schedules | lecturer_id | lecturers | id | — |
| class_sessions | course_id | courses | id | — |
| class_sessions | schedule_id | course_schedules | id | — |
| class_sessions | lecturer_id | lecturers | id | — |
| attendance | session_id | class_sessions | id | — |
| attendance | student_id | students | id | — |
| timetable_entries | course_id | courses | id | — |
| timetable_entries | lecturer_id | lecturers | id | — |
| timetable_entries | module_id | course_modules | id | — |
| clearance_requests | student_id | students | id | — |
| clearance_steps | clearance_id | clearance_requests | id | — |
| payments | student_id | students | id | — |
| receipt_uploads | student_id | students | id | — |
| receipt_uploads | course_id | courses | id | — |
| receipt_extractions | receipt_id | receipt_uploads | id | — |
| payment_transactions | student_id | students | id | — |
| payment_transactions | course_id | courses | id | — |
| payment_transactions | receipt_id | receipt_uploads | id | — |
| student_fee_selections | student_id | students | id | — |
| student_fee_selections | fee_item_id | fee_items | id | — |
| alumni | student_id | students | id | — |
| announcements | target_course_id | courses | id | — |

---

## 5. Data Partitioning Strategy (School-Specific)

### Current (Single School)

All data belongs to BRIBTE. No partitioning required.

### Future (Multi-Tenant)

Every data table will include a `tenant_id` column:

```sql
-- Partition key for school-specific data
ALTER TABLE students ADD COLUMN tenant_id uuid REFERENCES tenants(id);
-- Index for efficient tenant-scoped queries
CREATE INDEX idx_students_tenant ON students(tenant_id);
```

**Partitioned by tenant_id:**
- students, lecturers, courses, enrollments
- payments, receipt_uploads, fee_items
- exams, exam_results, assignments, submissions
- clearance_requests, clearance_steps
- announcements, audit_logs

**NOT partitioned (global):**
- auth.users (Supabase-managed)
- tenants (platform-level)
- user_tenants (cross-reference)

---

## 6. Performance Indexes

### Existing (Auto-created by PostgreSQL)

All primary keys and foreign keys have automatic B-tree indexes.

### Recommended Additional Indexes

```sql
-- High-frequency lookups
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_reg_number ON students(registration_number);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- Duplicate prevention
CREATE UNIQUE INDEX idx_payment_tx_id ON payment_transactions(transaction_id);

-- Audit log queries
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);

-- Fee calculations
CREATE INDEX idx_payments_student_status ON payments(student_id, payment_status);
```

---

## 7. Data Retention & Archival

| Data Category | Retention | Archival Strategy |
|---|---|---|
| Student records | Permanent | — |
| Financial records | 7 years (regulatory) | Move to archive table after 7 years |
| Audit logs | 3 years active | Partition by month; archive to cold storage |
| Receipt files | 5 years | Move to archive storage bucket |
| Class sessions | 2 years | Delete completed sessions older than 2 years |
| Announcements | 1 year | Auto-delete expired announcements |
