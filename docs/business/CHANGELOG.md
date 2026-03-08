# Changelog & Release Notes

## Document Information
| Field | Value |
|---|---|
| **Document ID** | BRIBTE-BIZ-003 |
| **Version** | 1.0 |
| **Classification** | Public — Tech4LYF Corporation |
| **Last Updated** | March 2026 |

---

## Version History

### v1.5.0 — March 8, 2026
**Clearance System Fix & Documentation**

#### 🐛 Bug Fixes
- **Fixed:** Clearance steps not created when student submits request (RLS permission issue)
- **Fixed:** Orphaned clearance requests cleaned up from database

#### ✨ New Features
- Added `submit_clearance_request` SECURITY DEFINER function for atomic clearance creation
- 4-step clearance workflow now fully operational (Finance → Library → Department → Admin)

#### 📚 Documentation
- Created comprehensive documentation suite (11 documents)
- Developer: Multi-tenancy blueprint, infrastructure guide, API reference, database ERD
- Compliance: Security policy, RBAC matrix, SLA, user manual
- Business: Tenant onboarding, billing logic, changelog

---

### v1.4.0 — March 2026
**AI Receipt Processing & Fraud Detection**

#### ✨ New Features
- 10-step AI-powered receipt validation pipeline
- Google Gemini 2.5 Flash integration for OCR
- Fraud detection: fake receipt identification, duplicate prevention
- Auto-approval for valid receipts with confidence scoring
- Admin notification system for rejected receipts
- Student name matching with fuzzy similarity algorithm
- Institution name validation against BRIBTE variants
- Course/enrollment cross-validation

#### 🔒 Security
- File hash deduplication to prevent re-upload of same receipt
- Transaction code uniqueness enforcement
- Amount validation with suspicious threshold detection

---

### v1.3.0 — March 2026
**Fee Management Engine**

#### ✨ New Features
- Dynamic fee calculation based on study mode (Day/Evening/Weekend)
- Configurable fee items (mandatory + optional)
- Fee frequency support: once, yearly, per-semester, per-term
- Program-level filtering (diploma, certificate, etc.)
- `recalculate_fee_balance` function with automatic triggers
- Student fee selection for optional items
- Payment recording and approval workflow

---

### v1.2.0 — February 2026
**Academic Module**

#### ✨ New Features
- Course management with modules and lessons
- Assignment creation and submission workflow
- Exam scheduling and result entry
- Grade calculation with grade points
- Timetable management with conflict detection
- Class session generation from schedule templates
- Attendance tracking (present, absent, late)
- Course material uploads

---

### v1.1.0 — February 2026
**Core Admin & Enrollment**

#### ✨ New Features
- Admin dashboard with statistics
- Student registration and approval workflow
- Lecturer account provisioning via edge function
- Department and course CRUD
- Enrollment management
- Announcement system (targeted by role/course)
- Academic calendar management
- Audit logging for all admin actions
- System settings configuration

---

### v1.0.0 — January 2026
**Initial Release**

#### ✨ Features
- Authentication system (email + password with verification)
- Role-based access control (admin, lecturer, student)
- Three separate dashboard portals
- Profile management with avatar upload
- Row-Level Security on all database tables
- Responsive design for mobile and desktop

---

## Release Process

| Step | Description | Timing |
|---|---|---|
| Development | Feature built and tested | Ongoing |
| Code Review | Peer review of changes | Before merge |
| Preview Deploy | Auto-deployed to preview URL | On commit |
| QA Testing | Functional and regression testing | 1-2 days |
| Release Notes | Changelog updated | Before publish |
| Production Deploy | Frontend published via Lovable | Manual trigger |
| Client Notification | Email to affected tenants | Within 24 hours |

---

## Versioning Convention

```
MAJOR.MINOR.PATCH

MAJOR — Breaking changes or major feature overhauls
MINOR — New features, non-breaking
PATCH — Bug fixes, security patches
```

---

## Automated Compliance Evidence

### Security Audit Log

| Date | Activity | Result |
|---|---|---|
| 2026-03-08 | RLS policy review (all 25 tables) | ✅ Pass |
| 2026-03-08 | Edge function secret audit | ✅ All secrets configured |
| 2026-03-01 | Dependency vulnerability scan | ✅ No critical issues |
| 2026-02-15 | Database backup verification | ✅ Restore tested |
| 2026-02-01 | Role isolation test | ✅ Student cannot access admin data |

### Backup Verification Log

| Date | Backup Type | Size | Restore Tested |
|---|---|---|---|
| 2026-03-08 | Daily automated | ~50 MB | — |
| 2026-03-01 | Monthly verification | ~45 MB | ✅ Successful |
| 2026-02-15 | Point-in-time test | ~40 MB | ✅ Successful |
