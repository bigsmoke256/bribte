# Tenant Onboarding Guide

## Document Information
| Field | Value |
|---|---|
| **Document ID** | BRIBTE-BIZ-001 |
| **Version** | 1.0 |
| **Classification** | Internal — Tech4LYF Corporation |
| **Last Updated** | March 2026 |

---

## 1. Onboarding Checklist

| Step | Action | Owner | Duration |
|---|---|---|---|
| 1 | Sign contract & select subscription tier | Sales | 1-2 days |
| 2 | Collect institution details (name, logo, domain) | Onboarding Team | 1 day |
| 3 | Create tenant record in platform | Engineering | 30 min |
| 4 | Create first admin account via `create-admin` edge function | Engineering | 5 min |
| 5 | Configure branding (logo, institution name in system_settings) | Onboarding Team | 1 hour |
| 6 | Set up fee structure (fee_items) | Client + Onboarding | 2-4 hours |
| 7 | Import departments and courses | Client + Onboarding | 2-4 hours |
| 8 | Create lecturer accounts | Client Admin | 1-2 hours |
| 9 | Configure academic calendar | Client Admin | 1 hour |
| 10 | Open student self-registration | Client Admin | 5 min |
| 11 | Conduct admin training session | Onboarding Team | 2 hours |
| 12 | Go-live confirmation | Both parties | — |

---

## 2. Subscription Tiers

| Feature | Basic | Professional | Enterprise |
|---|---|---|---|
| **Students** | Up to 500 | Up to 5,000 | Unlimited |
| **Storage** | 5 GB | 50 GB | 500 GB+ |
| **AI Receipt Processing** | 1,000/month | 10,000/month | Unlimited |
| **Custom Domain** | ❌ | ✅ | ✅ |
| **Custom Branding** | Logo only | Full theme | White-label |
| **Support** | Email (48h) | Email + Phone (8h) | Dedicated manager |
| **SLA Uptime** | 99.5% | 99.9% | 99.95% |
| **Backups** | Daily (7-day) | Daily (30-day) + PITR | Custom retention |

---

## 3. Admin Account Creation

```bash
# First admin for new tenant
curl -X POST https://<project-id>.supabase.co/functions/v1/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@newschool.ac.ug",
    "password": "TempPassword123!",
    "full_name": "School Administrator",
    "role": "admin"
  }'
```

**Post-creation:** Instruct the client admin to change their password immediately via Profile Settings.

---

## 4. Custom Branding Setup

Configure via `system_settings` table:

| Key | Example Value | Description |
|---|---|---|
| `institution_name` | "New School Academy" | Displayed in headers |
| `institution_short_name` | "NSA" | Abbreviated name |
| `institution_motto` | "Excellence in Education" | Tagline |
| `currency` | "UGX" | Fee display currency |
| `academic_year` | "2025/2026" | Current academic year |
| `current_semester` | "1" | Active semester |

---

## 5. Data Migration

For schools migrating from existing systems:

| Data Type | Format | Import Method |
|---|---|---|
| Student records | CSV | Bulk insert via admin panel |
| Course catalog | CSV | Admin → Courses → Import |
| Payment history | CSV | Database migration script |
| Staff accounts | List | `create-admin` edge function (per user) |

---

## 6. Training Deliverables

| Session | Audience | Duration | Content |
|---|---|---|---|
| Admin Training | School admins | 2 hours | Full system walkthrough, settings, user management |
| Lecturer Orientation | Teaching staff | 1 hour | Assignment creation, grading, announcements |
| Student Orientation | Student body | 30 min | Registration, fee payment, receipt upload |
| IT Staff Handover | School IT | 1 hour | Troubleshooting, audit logs, system settings |
