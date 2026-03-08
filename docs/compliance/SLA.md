# Service Level Agreement (SLA)

## Document Information

| Field | Value |
|---|---|
| **Document ID** | BRIBTE-COMP-003 |
| **Version** | 1.0 |
| **Classification** | Client-Facing — Tech4LYF Corporation |
| **Effective Date** | March 2026 |
| **Review Cycle** | Annually |

---

## 1. Service Description

BRIBTE Digital Campus Management System is a cloud-based Software-as-a-Service (SaaS) platform providing comprehensive campus operations management including student enrollment, academic records, fee management, timetabling, examination management, and clearance processing.

---

## 2. Service Availability

### 2.1 Uptime Commitment

| Tier | Target Uptime | Max Monthly Downtime | Applicable Plan |
|---|---|---|---|
| **Standard** | 99.5% | 3 hours 39 minutes | Basic |
| **Professional** | 99.9% | 43 minutes | Professional |
| **Enterprise** | 99.95% | 21 minutes | Enterprise |

### 2.2 Measurement

- **Uptime** is measured as the percentage of time the service is operational in a calendar month.
- **Downtime** is defined as the period when users cannot access the application login page or core features (dashboard, student records, fee management).
- **Scheduled maintenance** windows are excluded from downtime calculations when communicated ≥ 48 hours in advance.

### 2.3 Exclusions

The following are NOT counted as downtime:
- Scheduled maintenance (communicated in advance)
- Force majeure events (natural disasters, government actions)
- Client-side issues (browser, internet connectivity)
- Third-party service outages beyond our control
- Issues caused by unauthorized modifications to the system

---

## 3. Service Credits

If uptime falls below the committed SLA, the following credits apply:

| Actual Uptime | Service Credit |
|---|---|
| 99.0% – 99.5% | 10% of monthly fee |
| 98.0% – 99.0% | 25% of monthly fee |
| 95.0% – 98.0% | 50% of monthly fee |
| Below 95.0% | 100% of monthly fee |

**Credit Request Process:**
1. Client submits credit request within 30 days of the affected month
2. Tech4LYF validates the claim against monitoring data
3. Credits applied to next billing cycle (not refundable as cash)

---

## 4. Support Levels

### 4.1 Support Channels

| Channel | Availability | Response Method |
|---|---|---|
| Email (support@tech4lyf.com) | 24/7 | Email response |
| In-App Help Center | 24/7 | Self-service + ticket |
| Phone Support | Mon-Fri, 8:00-18:00 EAT | Call back |
| Dedicated Account Manager | Enterprise only | Direct line |

### 4.2 Response Times

| Severity | Description | First Response | Resolution Target |
|---|---|---|---|
| **P1 — Critical** | System completely down, data loss risk | 1 hour | 4 hours |
| **P2 — High** | Major feature unavailable (e.g., fee processing broken) | 4 hours | 24 hours |
| **P3 — Medium** | Feature degraded but workaround exists | 8 hours (business) | 72 hours |
| **P4 — Low** | Minor issue, cosmetic defect, feature request | 24 hours (business) | Next release |

### 4.3 Escalation Path

```
Level 1: Support Agent     → Initial triage, known issues
Level 2: Senior Engineer   → Technical investigation
Level 3: Engineering Lead  → Architecture-level fixes
Level 4: CTO              → Critical incidents, executive communication
```

---

## 5. Data Management

### 5.1 Backups

| Backup Type | Frequency | Retention | Recovery Time |
|---|---|---|---|
| **Automated daily backup** | Every 24 hours | 7 days (Standard), 30 days (Pro+) | 1-4 hours |
| **Point-in-Time Recovery** | Continuous (WAL) | 7 days (Pro plan and above) | 30 minutes |
| **File storage backup** | S3 cross-region replication | Continuous | Near-instant |

### 5.2 Data Recovery

| Scenario | Recovery Method | RTO | RPO |
|---|---|---|---|
| Accidental data deletion | Point-in-Time Recovery | 30 min | Seconds |
| Database corruption | Daily backup restore | 1-4 hours | Up to 24 hours |
| Complete infrastructure failure | Full backup + redeploy | 4-8 hours | Up to 24 hours |
| File storage loss | S3 11-9s durability | Near-instant | Near-zero |

**RTO** = Recovery Time Objective (how long to restore)  
**RPO** = Recovery Point Objective (maximum data loss window)

### 5.3 Data Ownership

- All data entered by the client remains the **property of the client**.
- Upon contract termination, data export will be provided within **30 days** in standard formats (CSV, JSON).
- After the 30-day export window, client data is permanently deleted within **90 days**.

---

## 6. Security Commitments

### 6.1 Security Measures

| Measure | Implementation |
|---|---|
| Encryption at rest | AES-256 on all databases and storage |
| Encryption in transit | TLS 1.3 on all connections |
| Authentication | JWT-based with email verification |
| Authorization | PostgreSQL Row-Level Security on all 25 tables |
| Audit logging | All administrative actions logged with user ID and timestamp |
| Vulnerability scanning | Quarterly automated scans |
| Penetration testing | Annual third-party assessment |
| Dependency updates | Monthly security patch reviews |

### 6.2 Incident Notification

| Incident Type | Notification Timeline | Method |
|---|---|---|
| Data breach (confirmed) | Within 72 hours | Email to designated contact + phone |
| Security vulnerability (critical) | Within 24 hours of discovery | Email notification |
| Planned maintenance | 48 hours advance notice | In-app banner + email |
| Emergency maintenance | As soon as possible | In-app banner + email |

---

## 7. Performance Standards

### 7.1 Application Performance

| Metric | Target | Measurement |
|---|---|---|
| Page load time | < 3 seconds | 95th percentile |
| API response time | < 500ms | 95th percentile |
| Receipt processing (AI) | < 30 seconds | Average |
| File upload | < 10 seconds (50MB) | Average |
| Database query | < 200ms | 95th percentile |

### 7.2 Capacity Guarantees

| Resource | Standard | Professional | Enterprise |
|---|---|---|---|
| Concurrent users | 100 | 500 | 2,000+ |
| Database storage | 1 GB | 8 GB | 100 GB+ |
| File storage | 5 GB | 50 GB | 500 GB+ |
| AI processing | 1,000/month | 10,000/month | Unlimited |

---

## 8. Change Management

### 8.1 Update Policy

| Update Type | Frequency | Client Notification | Downtime |
|---|---|---|---|
| **Security patches** | As needed | 24 hours notice | Zero (backend auto-deploy) |
| **Bug fixes** | Weekly | Changelog update | Zero |
| **Feature updates** | Monthly | Email + changelog | Zero (frontend publish) |
| **Major releases** | Quarterly | 2 weeks notice | Scheduled maintenance window |
| **Database migrations** | As needed | Included in release notes | Zero (auto-applied) |

### 8.2 Breaking Changes

- Breaking API changes will be communicated **30 days** in advance.
- Deprecated features will have a **90-day** sunset period.
- Clients on Enterprise plans receive **personalized migration support**.

---

## 9. Governance

### 9.1 SLA Review

- This SLA is reviewed **annually** or when significant changes to the service occur.
- Both parties may request a review with **30 days** written notice.

### 9.2 Dispute Resolution

1. **Informal resolution** — Direct communication between account managers (5 business days)
2. **Formal escalation** — Written complaint to Tech4LYF management (10 business days)
3. **Mediation** — Third-party mediator if unresolved (30 days)
4. **Arbitration** — Per Uganda Arbitration and Conciliation Act

### 9.3 Governing Law

This SLA is governed by the laws of the **Republic of Uganda**.

---

## 10. Contact Information

| Role | Contact | Hours |
|---|---|---|
| General Support | support@tech4lyf.com | 24/7 (email) |
| Account Management | accounts@tech4lyf.com | Mon-Fri 8:00-18:00 EAT |
| Security Incidents | security@tech4lyf.com | 24/7 |
| Billing Inquiries | billing@tech4lyf.com | Mon-Fri 8:00-18:00 EAT |
| Executive Escalation | cto@tech4lyf.com | P1 incidents only |
