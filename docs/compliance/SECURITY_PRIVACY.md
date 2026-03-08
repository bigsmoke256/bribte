# Security & Data Privacy Policy

## Document Information

| Field | Value |
|---|---|
| **Document ID** | BRIBTE-COMP-001 |
| **Version** | 1.0 |
| **Classification** | Public — Tech4LYF Corporation |
| **Last Updated** | March 2026 |
| **Compliance Officer** | Tech4LYF Legal Department |
| **Review Cycle** | Annually or after major incidents |

---

## 1. Overview

BRIBTE Digital Campus Management System processes sensitive educational data including student personal information, financial records, academic performance, and institutional operations. This document outlines our security architecture, data privacy practices, and regulatory compliance measures.

---

## 2. Regulatory Compliance

### 2.1 Applicable Regulations

| Regulation | Jurisdiction | Applicability |
|---|---|---|
| **Uganda Data Protection and Privacy Act, 2019** | Uganda | Primary — All user data |
| **GDPR (General Data Protection Regulation)** | EU | If any EU students/staff enrolled |
| **FERPA (Family Educational Rights and Privacy Act)** | USA | If any US exchange students |
| **NITA-U Guidelines** | Uganda | ICT systems in education |
| **Uganda Computer Misuse Act, 2011** | Uganda | Cybersecurity requirements |

### 2.2 Compliance Status

| Requirement | Status | Implementation |
|---|---|---|
| Data processing consent | ✅ Implemented | Consent captured at signup |
| Right to access | ✅ Implemented | Student portal shows all personal data |
| Right to rectification | ✅ Implemented | Profile editing capability |
| Right to erasure | ⚠️ Partial | Account deletion requires admin action |
| Data portability | ⚠️ Partial | Export available for financial records |
| Data breach notification | ✅ Documented | Incident response plan below |
| Data Protection Officer | ✅ Designated | Tech4LYF Legal Department |
| Data processing register | ✅ Maintained | Section 5 of this document |

---

## 3. Data Classification

### 3.1 Classification Levels

| Level | Label | Examples | Protection |
|---|---|---|---|
| **C1** | Public | Course catalog, academic calendar | Standard access controls |
| **C2** | Internal | Announcements, timetables | Authentication required |
| **C3** | Confidential | Student grades, fee balances, personal info | RLS + role-based access |
| **C4** | Restricted | Payment receipts, financial transactions | RLS + encryption + audit logging |

### 3.2 Data Inventory

| Data Category | Classification | Storage Location | Retention |
|---|---|---|---|
| User credentials (passwords) | C4 | Supabase Auth (bcrypt hashed) | Account lifetime |
| Student personal info | C3 | `profiles`, `students` tables | 7 years post-graduation |
| Academic records (grades, exams) | C3 | `exam_results`, `submissions` | Permanent |
| Financial records (payments) | C4 | `payments`, `payment_transactions` | 7 years (regulatory) |
| Payment receipts (images) | C4 | Supabase Storage (S3) | 5 years |
| AI-extracted receipt data | C4 | `receipt_extractions` | 5 years |
| Audit logs | C3 | `audit_logs` | 3 years active |
| Session tokens (JWT) | C4 | Browser localStorage | 1 hour (access) / 7 days (refresh) |

---

## 4. Encryption & Data Protection

### 4.1 Encryption at Rest

| Component | Encryption | Standard |
|---|---|---|
| Database (PostgreSQL) | ✅ AES-256 | Supabase manages disk encryption |
| File Storage (S3) | ✅ AES-256 | AWS S3 server-side encryption |
| Backups | ✅ AES-256 | Encrypted at rest |
| Secrets/API Keys | ✅ Vault | Supabase Vault (encrypted storage) |

### 4.2 Encryption in Transit

| Connection | Protocol | Certificate |
|---|---|---|
| Browser → CDN | TLS 1.3 | Managed by hosting provider |
| Browser → Supabase API | TLS 1.3 | Supabase-managed SSL |
| Edge Function → AI Gateway | TLS 1.3 | Lovable AI Gateway cert |
| Edge Function → Database | TLS 1.3 | Internal Supabase network |

### 4.3 Password Security

| Measure | Implementation |
|---|---|
| Hashing algorithm | bcrypt (Supabase GoTrue default) |
| Salt rounds | 10 (Supabase default) |
| Minimum password length | 6 characters (configurable) |
| Password storage | Never stored in plaintext anywhere |
| Password transmission | Over TLS only |

---

## 5. Access Control

### 5.1 Authentication

| Method | Implementation | Strength |
|---|---|---|
| Email + Password | Supabase GoTrue | Standard |
| Email Verification | Required before first login | Anti-fraud |
| JWT Tokens | 1-hour access, 7-day refresh | Industry standard |
| Session Management | Browser localStorage + auto-refresh | Persistent sessions |

### 5.2 Authorization (Row-Level Security)

Every database table has RLS policies enforcing:

```
Admins   → Full CRUD within their tenant
Lecturers → Read access to academic data; write to own courses/grades
Students  → Read/write only their own records
```

**Key security function:**
```sql
-- SECURITY DEFINER prevents recursive RLS checks
CREATE FUNCTION has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role) $$;
```

### 5.3 Role Storage Security

> **CRITICAL:** Roles are stored in a **separate `user_roles` table**, NOT on the profiles table. This prevents privilege escalation attacks where a user could modify their own profile to gain admin access.

### 5.4 Edge Function Security

| Function | JWT Verification | Additional Auth |
|---|---|---|
| create-admin | Disabled (first-use bootstrap) | Checks caller admin role via Authorization header |
| process-receipt | Disabled (server-side context) | Uses service role key internally |

---

## 6. Data Processing Activities

### 6.1 Register of Processing Activities

| Activity | Legal Basis | Data Subjects | Data Types | Retention |
|---|---|---|---|---|
| Student registration | Contractual necessity | Students | Name, email, phone | Account lifetime |
| Academic records | Legal obligation | Students | Grades, attendance | Permanent |
| Fee management | Contractual necessity | Students | Payment amounts, dates | 7 years |
| Receipt processing (AI) | Legitimate interest | Students | Receipt images, extracted text | 5 years |
| Audit logging | Legal obligation | All users | Actions, timestamps | 3 years |
| Alumni tracking | Consent | Graduates | Employment info, contact | Until consent withdrawn |

### 6.2 AI Data Processing

The receipt processing pipeline uses Google Gemini 2.5 Flash via Lovable AI Gateway:

| Aspect | Detail |
|---|---|
| **Purpose** | OCR extraction and fraud detection on payment receipts |
| **Data sent** | Receipt image (base64 encoded) |
| **Data received** | Structured JSON with extracted fields |
| **Data retention by AI** | No persistent storage (stateless inference) |
| **Human review** | All flagged receipts reviewed by admin |

---

## 7. Incident Response Plan

### 7.1 Incident Classification

| Severity | Description | Response Time | Notification |
|---|---|---|---|
| **P1 — Critical** | Data breach, unauthorized access to PII | 1 hour | Regulatory body within 72 hours |
| **P2 — High** | Service outage, privilege escalation attempt | 4 hours | Affected users within 24 hours |
| **P3 — Medium** | Failed login attacks, suspicious activity | 24 hours | Internal team |
| **P4 — Low** | Minor bugs, non-sensitive data issues | 72 hours | Internal log |

### 7.2 Response Procedure

```
1. DETECT    → Automated monitoring + audit logs + user reports
2. CONTAIN   → Revoke compromised credentials, isolate affected systems
3. ASSESS    → Determine scope of breach, affected data subjects
4. NOTIFY    → Regulatory authority (72h), affected individuals (without delay)
5. REMEDIATE → Patch vulnerability, update policies
6. REVIEW    → Post-incident report, update procedures
```

### 7.3 Contact Information

| Role | Contact | Response Time |
|---|---|---|
| Security Team Lead | security@tech4lyf.com | 1 hour |
| Data Protection Officer | dpo@tech4lyf.com | 4 hours |
| Uganda NITA-U | Report via nita.go.ug | 72 hours (regulatory) |

---

## 8. Third-Party Data Processors

| Processor | Purpose | Data Shared | DPA Signed |
|---|---|---|---|
| Supabase (AWS) | Database, auth, storage | All application data | ✅ |
| Lovable AI Gateway | Receipt OCR | Receipt images only | ✅ |
| Google Cloud (Gemini) | AI inference | Receipt images (stateless) | ✅ (via Lovable) |
| SchoolPay | Payment processing | Transaction references | N/A (student-initiated) |

---

## 9. Security Audit Checklist

### Quarterly Review

- [ ] Review all RLS policies for completeness
- [ ] Verify no direct access to `auth` schema
- [ ] Check edge function secrets haven't been exposed
- [ ] Review audit logs for suspicious patterns
- [ ] Test role isolation (student cannot access admin data)
- [ ] Verify file upload restrictions
- [ ] Check for unpatched dependencies (`npm audit`)

### Annual Review

- [ ] Full penetration test by third party
- [ ] Update this privacy policy
- [ ] Review data retention compliance
- [ ] Test incident response procedure
- [ ] Review and update consent forms
- [ ] Verify backup restoration procedure

---

## 10. User Rights & Requests

### How to Exercise Data Rights

| Right | How to Request | Response Time |
|---|---|---|
| Access your data | Login to student/lecturer portal | Immediate |
| Correct your data | Edit profile in portal | Immediate |
| Delete your data | Email dpo@tech4lyf.com | 30 days |
| Data portability | Email dpo@tech4lyf.com | 30 days |
| Withdraw consent | Email dpo@tech4lyf.com | 30 days |
| Lodge a complaint | Uganda NITA-U | Per regulatory timeline |
