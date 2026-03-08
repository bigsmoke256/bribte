# Infrastructure & Deployment Guide

## 1. Architecture Overview

```
                    ┌──────────────────┐
                    │   CDN / Lovable  │
                    │   Static Hosting │
                    │   (Vite build)   │
                    └────────┬─────────┘
                             │ HTTPS
                             ▼
                    ┌──────────────────┐
                    │   Supabase       │
                    │   Platform       │
                    ├──────────────────┤
                    │ • PostgreSQL 15  │
                    │ • GoTrue (Auth)  │
                    │ • PostgREST API  │
                    │ • Storage (S3)   │
                    │ • Edge Functions │
                    │   (Deno runtime) │
                    │ • PgBouncer      │
                    │   (conn. pool)   │
                    └──────────────────┘
```

**Key point:** There is no custom server. The frontend is a static SPA. All backend logic runs on Supabase infrastructure.

---

## 2. Environments

| Environment | URL | Description |
|---|---|---|
| Development | `http://localhost:8080` | Local Vite dev server with HMR |
| Preview | `https://<id>-preview--<project>.lovable.app` | Auto-deployed on every commit |
| Production | Custom domain or Lovable published URL | Publish via Lovable dashboard |

---

## 3. Environment Variables

### Frontend (.env)

These are **automatically managed** by Lovable Cloud. Do NOT edit manually.

```env
VITE_SUPABASE_PROJECT_ID="<project-id>"
VITE_SUPABASE_PUBLISHABLE_KEY="<anon-key>"
VITE_SUPABASE_URL="https://<project-id>.supabase.co"
```

### Edge Function Secrets

Configured in Lovable Cloud backend settings. These are **server-side only** and never exposed to the browser.

| Secret | Required By | Description |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | create-admin, process-receipt | Full admin access to database |
| `SUPABASE_URL` | create-admin, process-receipt | Supabase project URL |
| `SUPABASE_ANON_KEY` | create-admin | For verifying caller identity |
| `LOVABLE_API_KEY` | process-receipt | Lovable AI Gateway access |
| `SUPABASE_DB_URL` | (reserved) | Direct database connection string |
| `SUPABASE_PUBLISHABLE_KEY` | (reserved) | Same as anon key |

---

## 4. Deployment Process

### Via Lovable (Recommended)

1. Make changes via Lovable chat or push to the connected Git repository.
2. Changes are automatically built and deployed to the preview URL.
3. To publish: **Lovable Dashboard → Share → Publish**.
4. Database migrations in `supabase/migrations/` are applied automatically.
5. Edge functions in `supabase/functions/` are deployed automatically.

### Manual Deployment

```bash
# 1. Build the frontend
npm run build
# Output: dist/ directory

# 2. Deploy dist/ to any static hosting:
#    - Netlify, Vercel, Cloudflare Pages
#    - Any web server serving static files
#    - Ensure SPA fallback: all routes → index.html

# 3. Set environment variables on the hosting platform:
#    VITE_SUPABASE_URL=https://<project-id>.supabase.co
#    VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
#    VITE_SUPABASE_PROJECT_ID=<project-id>
```

---

## 5. Database Migrations

Migrations are stored in `supabase/migrations/` and applied automatically by Lovable Cloud.

**Migration naming convention:** `<timestamp>_<uuid>.sql`

**To create a new migration manually:**
1. Write SQL in a new file under `supabase/migrations/`
2. Push to the repository
3. Lovable Cloud applies it automatically

**Important rules:**
- Never use `ALTER DATABASE postgres` (not allowed)
- Never modify `auth`, `storage`, `realtime`, or `supabase_functions` schemas
- Use validation triggers instead of CHECK constraints for time-based validations
- Always use `SECURITY DEFINER` with `SET search_path = public` for functions that bypass RLS

---

## 6. Edge Functions

### Configuration

Edge functions are configured in `supabase/config.toml`:

```toml
[functions.create-admin]
verify_jwt = false

[functions.process-receipt]
verify_jwt = false
```

`verify_jwt = false` means the function handles its own authentication (or is called from a trusted context).

### Directory Structure

```
supabase/functions/
├── create-admin/
│   └── index.ts          # Admin/lecturer user creation
└── process-receipt/
    └── index.ts          # AI-powered receipt OCR & validation
```

### Deployment

Edge functions are **automatically deployed** when pushed to the repository via Lovable. No manual deployment step is needed.

### Invoking Edge Functions

From the frontend:
```typescript
const { data, error } = await supabase.functions.invoke('process-receipt', {
  body: { receipt_id: 'uuid' }
});
```

Via cURL:
```bash
curl -X POST https://<project-id>.supabase.co/functions/v1/process-receipt \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"receipt_id": "uuid"}'
```

---

## 7. Storage Buckets

| Bucket | Max File Size | Allowed Types | Created Via |
|---|---|---|---|
| receipts | Default (50MB) | Images, PDFs | Auto-configured |
| course-materials | Default | All file types | Auto-configured |
| submissions | Default | All file types | Auto-configured |
| assignments | Default | All file types | Auto-configured |
| avatars | Default | Images | Auto-configured |

All buckets are **public** (no signed URLs needed). Access control is managed at the application level and via RLS on metadata tables.

---

## 8. Monitoring & Logging

### Edge Function Logs
Available in Lovable Cloud backend dashboard. Logs include:
- Request/response details
- `console.log` and `console.error` output
- Execution duration

### Audit Logs
All admin actions are logged to the `audit_logs` table. View via **Admin → Audit Logs** page.

### Database Metrics
Available in the Lovable Cloud backend dashboard:
- Query performance
- Connection count
- Storage usage

---

## 9. Backup & Recovery

Supabase provides:
- **Automatic daily backups** (included in all plans)
- **Point-in-time recovery** (Pro plan and above)

---

## 10. Security Checklist

- [x] RLS enabled on all 25 tables
- [x] Roles stored in separate `user_roles` table (not on profiles)
- [x] `has_role()` is SECURITY DEFINER to prevent recursive RLS
- [x] Service role key only used server-side (edge functions)
- [x] Anon key (publishable) used client-side
- [x] Email verification required for new accounts
- [x] Edge functions verify caller admin role before privileged operations
- [x] Receipt processing validates file hash for duplicate detection
- [x] AI fraud detection on all receipt uploads
- [x] Audit logging for all administrative actions

---

## 11. Scaling Recommendations

| Metric | Current Capacity | Scaling Action |
|---|---|---|
| Concurrent users | ~500 (free tier) | Upgrade Supabase plan for more connections |
| Database size | 500MB (free) | Upgrade plan; archive old audit logs |
| Storage | 1GB (free) | Upgrade plan |
| Edge function invocations | 500K/month (free) | Upgrade plan |
| AI processing | Rate-limited by Lovable Gateway | Contact Lovable support for higher limits |

### Performance Optimization Tips

1. **Add indexes** on frequently queried columns: `students.user_id`, `students.registration_number`, `payment_transactions.transaction_id`
2. **Pagination** on large tables (audit_logs, payments) — use `.range(from, to)` in Supabase queries
3. **Cache static data** (courses, departments, fee_items) with React Query's `staleTime` configuration
4. **Partition audit_logs** by month for deployments running >1 year
