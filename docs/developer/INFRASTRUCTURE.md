# Infrastructure & Deployment Guide

## Document Information

| Field | Value |
|---|---|
| **Document ID** | BRIBTE-DEV-002 |
| **Version** | 1.0 |
| **Classification** | Internal — Tech4LYF Corporation |
| **Last Updated** | March 2026 |
| **Author** | Tech4LYF Engineering Team |

---

## 1. Cloud Architecture Diagram

```
                         ┌─────────────────────────────┐
                         │       DNS / CDN Layer        │
                         │  ┌───────────────────────┐   │
                         │  │  Lovable Static Host  │   │
                         │  │  (or Cloudflare/Vercel)│  │
                         │  │  *.lovable.app         │   │
                         │  │  OR custom domain      │   │
                         │  └───────────┬───────────┘   │
                         └──────────────┼───────────────┘
                                        │ HTTPS (TLS 1.3)
                                        ▼
┌───────────────────────────────────────────────────────────────────┐
│                    Supabase Platform (AWS)                         │
│                                                                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │   Kong Gateway    │  │   GoTrue Auth    │  │  PostgREST     │  │
│  │   (API Router)    │  │   (JWT/Sessions) │  │  (REST API)    │  │
│  │   Rate limiting   │  │   Email verify   │  │  Auto-generated│  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬───────┘  │
│           │                      │                      │          │
│           ▼                      ▼                      ▼          │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    PgBouncer (Connection Pooler)             │  │
│  │                    Transaction mode, 200 connections         │  │
│  └──────────────────────────┬──────────────────────────────────┘  │
│                              │                                     │
│                              ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              PostgreSQL 15 (Primary)                         │  │
│  │              • 25 tables with RLS                            │  │
│  │              • 10 database functions                         │  │
│  │              • 3 custom enums                                │  │
│  │              • Automated daily backups                       │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │  Supabase Storage│  │  Edge Functions   │  │   Realtime     │  │
│  │  (S3-backed)     │  │  (Deno runtime)   │  │   (WebSocket)  │  │
│  │                   │  │                    │  │   (Available)  │  │
│  │  5 public buckets│  │  • create-admin   │  │                │  │
│  │  • receipts      │  │  • process-receipt│  │                │  │
│  │  • materials     │  │                    │  │                │  │
│  │  • submissions   │  │                    │  │                │  │
│  │  • assignments   │  │                    │  │                │  │
│  │  • avatars       │  │                    │  │                │  │
│  └──────────────────┘  └────────┬─────────┘  └────────────────┘  │
│                                  │                                  │
└──────────────────────────────────┼──────────────────────────────────┘
                                   │ HTTPS
                                   ▼
                         ┌──────────────────┐
                         │  Lovable AI      │
                         │  Gateway         │
                         │  (Gemini 2.5     │
                         │   Flash)         │
                         │  Receipt OCR &   │
                         │  Fraud Detection │
                         └──────────────────┘
```

---

## 2. Technology Stack Summary

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend** | React | 18.3 | UI framework |
| | TypeScript | 5.8 | Type safety |
| | Vite | 5.4 | Build tool & dev server |
| | Tailwind CSS | 3.4 | Styling |
| | shadcn/ui | Latest | Component library |
| | Framer Motion | 12.x | Animations |
| | Recharts | 2.15 | Data visualization |
| | React Router | 6.30 | Client-side routing |
| | TanStack React Query | 5.83 | Server state management |
| | React Hook Form + Zod | 7.x + 3.x | Form handling & validation |
| **Backend** | Supabase | Latest | BaaS platform |
| | PostgreSQL | 15 | Database |
| | Deno | Latest | Edge function runtime |
| **AI** | Google Gemini 2.5 Flash | Latest | Receipt OCR & fraud detection |
| **Auth** | GoTrue (Supabase Auth) | Latest | JWT-based authentication |

---

## 3. Local Development Setup

### Prerequisites

| Tool | Version | Installation |
|---|---|---|
| Node.js | ≥ 18.0 | `nvm install 18` |
| npm | ≥ 9.0 | Included with Node.js |
| Git | ≥ 2.0 | `brew install git` or OS package manager |

### Step-by-Step Setup

```bash
# 1. Clone the repository
git clone <YOUR_GIT_URL>
cd bribte-campus

# 2. Install dependencies
npm install

# 3. Environment variables are auto-configured by Lovable Cloud
# The .env file is automatically generated and should NOT be edited manually
# It contains:
#   VITE_SUPABASE_URL
#   VITE_SUPABASE_PUBLISHABLE_KEY
#   VITE_SUPABASE_PROJECT_ID

# 4. Start the development server
npm run dev
# App available at http://localhost:8080

# 5. Run tests
npm run test          # Single run
npm run test:watch    # Watch mode

# 6. Build for production
npm run build         # Output: dist/
npm run preview       # Preview production build
```

### Development Server Configuration

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    host: "::",          // Listen on all interfaces
    port: 8080,          // Default port
    hmr: {
      overlay: false,    // Disable error overlay
    },
  },
});
```

### Available npm Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `vite` | Start dev server with HMR |
| `build` | `vite build` | Production build |
| `build:dev` | `vite build --mode development` | Dev build with source maps |
| `preview` | `vite preview` | Preview production build |
| `lint` | `eslint .` | Lint all files |
| `test` | `vitest run` | Run tests once |
| `test:watch` | `vitest` | Run tests in watch mode |

---

## 4. Deployment Environments

### Environment Matrix

| Environment | URL Pattern | Trigger | Database |
|---|---|---|---|
| **Local Dev** | `localhost:8080` | Manual (`npm run dev`) | Shared Supabase project |
| **Preview** | `*-preview--*.lovable.app` | Auto on commit | Shared Supabase project |
| **Production** | Custom domain or `*.lovable.app` | Manual publish | Shared Supabase project |

### Deployment Flow

```
Developer pushes code
        │
        ▼
┌──────────────────┐
│ Lovable CI/CD    │
│ • Vite build     │
│ • Type checking  │
│ • Deploy static  │
└────────┬─────────┘
         │
         ├──── Frontend ──── Static files → CDN (manual publish to go live)
         │
         ├──── Edge Functions ──── Auto-deployed immediately
         │
         └──── Migrations ──── Auto-applied to database immediately
```

### Critical Deployment Note

> **Frontend** changes require clicking "Update" in the Lovable publish dialog.  
> **Backend** changes (edge functions, migrations) deploy **immediately and automatically**.

---

## 5. Edge Function Deployment

### Configuration (`supabase/config.toml`)

```toml
project_id = "gllyuhhjatswhuundqrn"

[functions.create-admin]
verify_jwt = false    # Handles own auth verification

[functions.process-receipt]
verify_jwt = false    # Called from trusted context
```

### Function Directory Structure

```
supabase/functions/
├── create-admin/
│   └── index.ts          # 88 lines — Admin/lecturer provisioning
└── process-receipt/
    └── index.ts          # 522 lines — AI receipt OCR & 10-step validation
```

### Secrets Required

| Secret | Used By | Description |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Both functions | Full database access |
| `SUPABASE_URL` | Both functions | Supabase project URL |
| `SUPABASE_ANON_KEY` | create-admin | Caller identity verification |
| `LOVABLE_API_KEY` | process-receipt | AI Gateway access for OCR |

### Invoking Edge Functions

```typescript
// From frontend
const { data, error } = await supabase.functions.invoke('process-receipt', {
  body: { receipt_id: receiptId }
});

// Via cURL
curl -X POST \
  https://gllyuhhjatswhuundqrn.supabase.co/functions/v1/create-admin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_jwt>" \
  -d '{"email":"new@school.ug","password":"pass","full_name":"Name","role":"admin"}'
```

---

## 6. Database Migrations

### Migration Files

Located in `supabase/migrations/` with naming convention: `<timestamp>_<uuid>.sql`

### Important Rules

| Rule | Reason |
|---|---|
| Never `ALTER DATABASE postgres` | Not allowed by Supabase |
| Never modify `auth`, `storage`, `realtime` schemas | Supabase-reserved |
| Use validation triggers, not CHECK constraints | Immutability requirement |
| Always `SET search_path = public` in functions | Security best practice |
| Use `SECURITY DEFINER` for cross-table operations | RLS bypass for atomic transactions |

---

## 7. Storage Configuration

| Bucket | Purpose | Public | Typical File Types |
|---|---|---|---|
| `receipts` | Payment receipt images | Yes | JPEG, PNG, PDF |
| `course-materials` | Lecture notes, slides | Yes | PDF, PPTX, DOCX |
| `submissions` | Student assignments | Yes | PDF, DOCX, ZIP |
| `assignments` | Assignment instructions | Yes | PDF, DOCX |
| `avatars` | User profile photos | Yes | JPEG, PNG |

### File Path Convention

```
{bucket}/{student_id}/{timestamp}_{filename}
```

---

## 8. Monitoring & Observability

### Available Monitoring

| Metric | Source | Access |
|---|---|---|
| Edge function logs | Lovable Cloud backend | Backend dashboard |
| Database queries | Supabase analytics | Backend dashboard |
| Application audit trail | `audit_logs` table | Admin → Audit Logs page |
| Error tracking | Browser console | Lovable preview console |

### Health Check Endpoints

| Check | Method | Expected |
|---|---|---|
| Frontend | `GET /` | 200 OK (SPA loads) |
| API | `GET /rest/v1/` | 200 OK (PostgREST) |
| Auth | `POST /auth/v1/token` | 400 (no credentials) = healthy |

---

## 9. Disaster Recovery

| Scenario | Recovery Method | RTO | RPO |
|---|---|---|---|
| Frontend down | Redeploy from Git | 5 min | 0 (Git is source of truth) |
| Database corruption | Supabase auto-backup restore | 1 hour | 24 hours (daily backups) |
| Edge function failure | Auto-redeploy from Git | 2 min | 0 |
| Storage file loss | S3 durability (99.999999999%) | N/A | N/A |
| Complete platform outage | Supabase incident response | Per Supabase SLA | Per backup schedule |

---

## 10. Scaling Recommendations

### Current Capacity (Free/Starter Tier)

| Resource | Limit | Upgrade Path |
|---|---|---|
| Database connections | ~60 (via PgBouncer) | Upgrade Supabase plan |
| Database size | 500MB | Upgrade plan |
| Storage | 1GB | Upgrade plan |
| Edge function invocations | 500K/month | Upgrade plan |
| Bandwidth | 5GB/month | Upgrade plan |

### Scaling for 10,000+ Students

```
Recommended Supabase Plan: Pro ($25/month)
  • 8GB database
  • 100GB storage
  • Unlimited API requests
  • Daily backups + PITR
  • Custom domains

Performance Optimizations:
  • Add indexes on students.user_id, students.registration_number
  • Add index on payment_transactions.transaction_id
  • Implement pagination on audit_logs, payments (>.range())
  • Consider partitioning audit_logs by month after year 1
  • Cache static data (courses, departments) with React Query staleTime
```
