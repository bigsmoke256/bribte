# BRIBTE Digital Campus Management System

> A comprehensive web-based campus management platform for **Buganda Royal Institute of Business and Technical Education (BRIBTE)**, Kampala, Uganda — designed to scale for 10,000+ students.

![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3-blue) ![Supabase](https://img.shields.io/badge/Backend-Supabase-green)

---

## Table of Contents

- [Project Objectives](#project-objectives)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Known Issues](#known-issues)
- [Related Documentation](#related-documentation)
- [License](#license)

---

## Project Objectives

1. **Digitize all campus operations** — admissions, enrollment, fee management, timetabling, exams, clearance, and alumni tracking.
2. **Role-based access control** — three distinct portals for **Admins**, **Lecturers**, and **Students**, each with tailored dashboards.
3. **AI-powered receipt verification** — automated OCR and fraud detection for SchoolPay payment receipts using Google Gemini 2.5 Flash.
4. **Scalability** — designed for 10,000+ concurrent students with Supabase (PostgreSQL) as the backend.
5. **Auditability** — full audit logging for all administrative actions.

---

## Features

| Module | Description |
|---|---|
| **Authentication** | Email/password signup & login with email verification. Role assignment via `user_roles` table. |
| **Student Portal** | Dashboard, course enrollment, fee breakdown, receipt upload, assignments, timetable, exam cards, clearance requests, results. |
| **Lecturer Portal** | Course management, assignment creation, grade entry, submissions review, timetable, announcements. |
| **Admin Portal** | Full CRUD for students, lecturers, courses, departments; fee item management; enrollment approval; timetable & scheduling; exam management; 4-step clearance workflow; receipt review; academic calendar; alumni management; audit logs; system settings. |
| **AI Receipt Processing** | 10-step validation pipeline: fraud detection → field extraction → institution check → duplicate detection → name matching → course validation → amount verification → auto-approve or flag for review. |
| **4-Step Clearance** | Finance Office → Library → Department Head → Final Admin Approval, with atomic step creation via database function. |
| **Fee Engine** | Dynamic fee calculation based on study mode (Day/Evening/Weekend), program level, mandatory + optional fee items, with automatic recalculation on payment approval. |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript 5, Vite 5, Tailwind CSS 3, shadcn/ui, Framer Motion, Recharts |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions, Row-Level Security) |
| AI/ML | Google Gemini 2.5 Flash via Lovable AI Gateway |
| State Management | TanStack React Query, React Context (Auth) |
| Forms | React Hook Form + Zod validation |

---

## Installation

### Prerequisites

- **Node.js** ≥ 18 — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- **npm** or **bun** package manager
- A Supabase project (or Lovable Cloud)

### Steps

```bash
# 1. Clone the repository
git clone <YOUR_GIT_URL>
cd bribte-campus

# 2. Install dependencies
npm install

# 3. Set up environment variables (see below)
cp .env.example .env

# 4. Start the development server
npm run dev
# App runs at http://localhost:8080
```

### Build for Production

```bash
npm run build       # Production build
npm run preview     # Preview production build locally
```

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL | ✅ |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key | ✅ |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID | ✅ |

### Edge Function Secrets (configured in Supabase)

| Secret | Description |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin operations |
| `SUPABASE_URL` | Supabase URL (server-side) |
| `SUPABASE_ANON_KEY` | Anon key for caller verification |
| `LOVABLE_API_KEY` | API key for Lovable AI Gateway (receipt OCR) |

---

## Usage

### Default Roles

After deployment, use the `create-admin` edge function to create the first admin user:

```bash
curl -X POST https://<project-id>.supabase.co/functions/v1/create-admin \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@bribte.ac.ug", "password": "securepass", "full_name": "System Admin", "role": "admin"}'
```

From the admin portal, you can then create lecturers and manage student registrations.

### Student Self-Registration

Students sign up at `/login` with their email. The `handle_new_user` trigger automatically:
1. Creates a profile in `profiles`
2. Assigns the `student` role in `user_roles`
3. Creates a student record in `students` with status `pending`

An admin must then approve and assign a course to the student.

---

## Project Structure

```
├── public/                     # Static assets
├── src/
│   ├── assets/                 # Images (crest, campus hero)
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── layout/             # DashboardLayout
│   │   ├── dashboard/          # Shared dashboard parts
│   │   └── fees/               # Fee-related components
│   ├── hooks/                  # Custom hooks (mobile, toast)
│   ├── integrations/supabase/  # Auto-generated client & types
│   ├── lib/                    # Auth context, mock data, utils
│   ├── pages/
│   │   ├── admin/              # 20+ admin pages
│   │   ├── lecturer/           # 8 lecturer pages
│   │   ├── student/            # 11 student pages
│   │   └── shared/             # Profile settings
│   └── test/                   # Test setup & examples
├── supabase/
│   ├── config.toml             # Edge function config
│   ├── functions/
│   │   ├── create-admin/       # Admin user creation
│   │   └── process-receipt/    # AI receipt processing
│   └── migrations/             # Database migrations
└── docs/                       # Extended documentation
```

---

## Known Issues

1. **Orphaned clearance requests** — Clearance requests created before the `submit_clearance_request` RPC function was deployed may lack associated steps. These must be manually deleted from the database.
2. **PDF preview CORS** — Embedded PDF iframes are blocked by browser CORS policies. Documents open in new tabs as a workaround.
3. **Supabase 1000-row limit** — Default query limit of 1,000 rows. Pagination is needed for tables exceeding this (e.g., audit logs in large deployments).
4. **Email verification** — Students must verify their email before signing in. If emails are not being delivered, admins can use the `create-admin` edge function which auto-confirms emails.
5. **Receipt processing** — The AI model may occasionally flag genuine receipts as suspicious. Admins can manually approve flagged receipts from the receipt review page.

---

## Related Documentation

- [Architecture & Design Document](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)
- [Infrastructure & Deployment Guide](docs/DEPLOYMENT.md)

---

## License

This project is proprietary software developed for Buganda Royal Institute of Business and Technical Education (BRIBTE). All rights reserved.
