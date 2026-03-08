# Subscription & Billing Logic

## Document Information
| Field | Value |
|---|---|
| **Document ID** | BRIBTE-BIZ-002 |
| **Version** | 1.0 |
| **Classification** | Internal — Tech4LYF Corporation |
| **Last Updated** | March 2026 |

---

## 1. Billing Model

BRIBTE operates on a **subscription + usage-based** billing model.

### 1.1 Subscription Tiers

| Tier | Monthly Price (UGX) | Included Students | AI Processing | Storage |
|---|---|---|---|---|
| **Basic** | 500,000 | 500 | 1,000 receipts | 5 GB |
| **Professional** | 2,000,000 | 5,000 | 10,000 receipts | 50 GB |
| **Enterprise** | Custom | Unlimited | Unlimited | 500 GB+ |

### 1.2 Usage-Based Overages

| Resource | Overage Rate |
|---|---|
| Additional students (beyond tier) | 1,000 UGX/student/month |
| AI receipt processing (beyond tier) | 500 UGX/receipt |
| Storage (beyond tier) | 50,000 UGX/GB/month |

---

## 2. Billing Cycle

```
Contract Start (e.g., Jan 1)
    │
    ├── Month 1: Base subscription charged
    │   └── End of month: Calculate overages
    │       └── Generate invoice (base + overages)
    │
    ├── Month 2: Base subscription charged
    │   └── End of month: Calculate overages
    │       └── Generate invoice
    │
    └── ... (recurring monthly)
```

### 2.1 Usage Tracking Metrics

| Metric | Source | Measurement |
|---|---|---|
| Active students | `students` table WHERE status = 'active' | Count at month-end |
| AI receipts processed | `receipt_uploads` table | Count created_at in billing period |
| Storage used | Supabase Storage API | Total bytes across all buckets |

---

## 3. Payment Integration (Planned — Stripe)

### 3.1 Architecture

```
Tenant signs up → Stripe Customer created
    │
    ├── Subscription created (recurring monthly)
    │   └── Stripe Invoice auto-generated
    │       └── Payment collected via:
    │           • Credit card
    │           • Mobile Money (via Stripe Africa)
    │           • Bank transfer
    │
    └── Usage reported monthly → Stripe metered billing
```

### 3.2 Stripe Objects

| Stripe Object | BRIBTE Mapping |
|---|---|
| Customer | Tenant (school) |
| Subscription | Monthly plan (Basic/Professional/Enterprise) |
| Price (recurring) | Base subscription fee |
| Price (metered) | Per-student overage, per-receipt overage |
| Invoice | Monthly bill (auto-generated) |
| Payment Intent | Individual payment transaction |

### 3.3 Webhook Events

| Event | Action |
|---|---|
| `invoice.paid` | Activate/maintain tenant access |
| `invoice.payment_failed` | Send warning email; retry 3x |
| `customer.subscription.deleted` | Initiate 30-day data export window |
| `customer.subscription.updated` | Update tenant tier/limits |

---

## 4. Dunning (Failed Payments)

```
Payment fails
    │
    ├── Day 0: Automatic retry
    ├── Day 3: Second retry + email warning
    ├── Day 7: Third retry + admin notification
    ├── Day 14: Account downgraded to read-only
    └── Day 30: Account suspended
        └── Day 60: Data deletion (after export window)
```

---

## 5. Invoicing

### 5.1 Invoice Line Items

```
Invoice #INV-2026-03-001
Tenant: Buganda Royal Institute

Line Items:
  1. Professional Plan (March 2026)     UGX 2,000,000
  2. Additional Students (127 over cap) UGX   127,000
  3. AI Processing Overage (230 extra)  UGX   115,000
  4. Storage Overage (2.3 GB extra)     UGX   115,000
                                        ─────────────
  Total:                                UGX 2,357,000
```

---

## 6. Free Trial

| Aspect | Detail |
|---|---|
| Duration | 14 days |
| Tier | Professional features |
| Limits | 50 students, 100 AI receipts, 1 GB storage |
| Credit card required | No |
| Conversion | Auto-downgrade to Basic or upgrade to paid |
