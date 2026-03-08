# Multi-Tenancy Blueprint

## Document Information

| Field | Value |
|---|---|
| **Document ID** | BRIBTE-DEV-001 |
| **Version** | 1.0 |
| **Classification** | Internal — Tech4LYF Corporation |
| **Last Updated** | March 2026 |
| **Author** | Tech4LYF Engineering Team |

---

## 1. Executive Summary

BRIBTE Digital Campus employs a **single-database, shared-schema** multi-tenancy model using **PostgreSQL Row-Level Security (RLS)** for data isolation. All tenant (school) data resides in a single Supabase PostgreSQL instance, with access control enforced at the database level rather than the application layer.

This approach was chosen for:
- **Cost efficiency** — One database instance serves all tenants
- **Operational simplicity** — Single migration path, single backup strategy
- **Security rigor** — RLS enforces isolation at the query planner level, making data leaks architecturally impossible

---

## 2. Tenancy Model Comparison

| Model | Description | Pros | Cons | Selected? |
|---|---|---|---|---|
| **Separate Databases** | One DB per school | Maximum isolation | Expensive, complex migrations | ❌ |
| **Separate Schemas** | One schema per school in same DB | Good isolation | Schema drift, complex queries | ❌ |
| **Shared Schema + RLS** | All schools in same tables, RLS filters | Cost-effective, simple ops | Requires careful policy design | ✅ |

---

## 3. Current Architecture (Single-Tenant)

BRIBTE is currently deployed as a **single-tenant system** for Buganda Royal Institute. The architecture is designed to evolve into multi-tenancy with minimal refactoring.

### Current Data Isolation

```
┌─────────────────────────────────────────────────┐
│              Single Supabase Instance            │
│                                                   │
│  ┌─────────────┐  ┌──────────┐  ┌────────────┐  │
│  │  user_roles  │  │ students │  │  courses    │  │
│  │  (RLS: own)  │  │(RLS:own) │  │(RLS: role) │  │
│  └─────────────┘  └──────────┘  └────────────┘  │
│                                                   │
│  RLS Policy Pattern:                              │
│  • Admins  → Full CRUD (has_role = admin)        │
│  • Teachers → Read + own records                  │
│  • Students → Own records only                    │
└─────────────────────────────────────────────────┘
```

---

## 4. Multi-Tenant Evolution Plan

### Phase 1: Tenant Identifier Introduction

Add a `tenant_id` column to all data tables:

```sql
-- New table for tenant registry
CREATE TABLE public.tenants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,                    -- "Buganda Royal Institute"
    slug text UNIQUE NOT NULL,             -- "bribte"
    domain text UNIQUE,                    -- "bribte.campus.tech4lyf.com"
    subscription_tier text DEFAULT 'basic', -- basic, professional, enterprise
    is_active boolean DEFAULT true,
    settings jsonb DEFAULT '{}',           -- Custom branding, config
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add tenant_id to all data tables
ALTER TABLE public.students ADD COLUMN tenant_id uuid REFERENCES tenants(id);
ALTER TABLE public.courses ADD COLUMN tenant_id uuid REFERENCES tenants(id);
ALTER TABLE public.payments ADD COLUMN tenant_id uuid REFERENCES tenants(id);
-- ... (all 25 tables)
```

### Phase 2: User-Tenant Mapping

```sql
-- Users can belong to multiple tenants (e.g., a teacher at two schools)
CREATE TABLE public.user_tenants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    tenant_id uuid REFERENCES tenants(id) NOT NULL,
    role app_role NOT NULL,
    is_primary boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    UNIQUE (user_id, tenant_id)
);
```

### Phase 3: RLS Policy Updates

```sql
-- Helper function to get current user's tenant
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT tenant_id FROM public.user_tenants
    WHERE user_id = auth.uid()
    AND is_primary = true
    LIMIT 1
$$;

-- Updated RLS policy pattern
CREATE POLICY "Tenant isolation" ON public.students
    USING (tenant_id = current_tenant_id());

CREATE POLICY "Admin full access within tenant" ON public.students
    FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND has_role(auth.uid(), 'admin')
    );
```

### Phase 4: Tenant-Aware Queries

```typescript
// Frontend: Supabase client automatically filtered by RLS
// No code changes needed — RLS handles isolation transparently

// Edge Functions: Use service role but always filter by tenant
const { data } = await supabase
    .from('students')
    .select('*')
    .eq('tenant_id', tenantId);  // Explicit filter for safety
```

---

## 5. Data Isolation Matrix

| Data Type | Isolation Level | Strategy |
|---|---|---|
| **User credentials** | Global | `auth.users` (Supabase managed) |
| **User profiles** | Tenant-scoped | RLS on `tenant_id` |
| **Student records** | Tenant-scoped | RLS on `tenant_id` |
| **Course data** | Tenant-scoped | RLS on `tenant_id` |
| **Financial data** | Tenant-scoped | RLS on `tenant_id` |
| **File storage** | Tenant-scoped | Bucket prefix: `{tenant_id}/receipts/` |
| **Audit logs** | Tenant-scoped | `tenant_id` column + RLS |
| **System settings** | Tenant-scoped | `tenant_id` on `system_settings` |
| **Subscription/billing** | Platform-level | Managed by platform admin |

---

## 6. Cross-Tenant Concerns

### 6.1 Super Admin Access

Platform administrators (Tech4LYF staff) need cross-tenant visibility:

```sql
CREATE TYPE platform_role AS ENUM ('platform_admin', 'support_agent');

-- Platform admins bypass tenant RLS
CREATE POLICY "Platform admin access" ON public.students
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM platform_users
            WHERE user_id = auth.uid()
            AND role = 'platform_admin'
        )
    );
```

### 6.2 Shared Reference Data

Some data is shared across tenants:
- **Fee item templates** — Default fee structures that tenants can customize
- **Academic calendar templates** — National holidays, exam periods
- **Course templates** — Standard curriculum offerings

```sql
-- Shared templates with tenant overrides
CREATE TABLE public.fee_item_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    amount numeric DEFAULT 0,
    category text DEFAULT 'general',
    is_global boolean DEFAULT true  -- true = shared, false = tenant-specific
);
```

### 6.3 Noisy Neighbor Prevention

| Concern | Mitigation |
|---|---|
| **Query overload** | Supabase connection pooling (PgBouncer) distributes load |
| **Storage abuse** | Per-tenant storage quotas enforced at application level |
| **API rate limits** | Edge function rate limiting per tenant (planned) |
| **Large data sets** | Pagination enforced; Supabase 1000-row default limit |

---

## 7. Migration Strategy

### From Single-Tenant to Multi-Tenant

```
Step 1: Create tenants table
Step 2: Insert BRIBTE as first tenant
Step 3: Add tenant_id to all tables (nullable initially)
Step 4: Backfill tenant_id for all existing records
Step 5: Make tenant_id NOT NULL
Step 6: Update all RLS policies to include tenant_id check
Step 7: Update SECURITY DEFINER functions to accept tenant context
Step 8: Update frontend to include tenant context in auth
```

**Estimated effort:** 2-3 sprints (4-6 weeks)  
**Risk:** Low — additive changes only, no destructive migrations

---

## 8. Tenant Provisioning Flow

```
New School Signs Up
        │
        ▼
┌──────────────────┐
│ Create tenant    │
│ record           │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│ Create admin     │────▶│ Configure        │
│ account          │     │ branding/settings│
└────────┬─────────┘     └────────┬─────────┘
         │                         │
         ▼                         ▼
┌──────────────────┐     ┌──────────────────┐
│ Seed default     │     │ Set up storage   │
│ fee items &      │     │ buckets with     │
│ templates        │     │ tenant prefix    │
└────────┬─────────┘     └──────────────────┘
         │
         ▼
┌──────────────────┐
│ Activate         │
│ subscription     │
└──────────────────┘
```

---

## 9. Testing Strategy

| Test Type | Description |
|---|---|
| **Unit tests** | Verify `current_tenant_id()` returns correct tenant |
| **Integration tests** | Ensure Tenant A cannot see Tenant B's students |
| **RLS audit** | Quarterly review of all RLS policies for tenant_id inclusion |
| **Penetration test** | Annual third-party test of tenant isolation |
| **Load test** | Simulate 50+ tenants with concurrent queries |
