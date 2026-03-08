import { useState, useRef } from "react";
import { FileText, Download, Eye, ChevronRight, Shield, BookOpen, Server, Database, Users, Receipt, Clock, HelpCircle, Folder } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import html2canvas from "html2canvas";

interface PolicyDoc {
  id: string;
  title: string;
  description: string;
  category: "developer" | "compliance" | "business";
  icon: React.ElementType;
  content: string;
}

const categoryLabels: Record<string, { label: string; color: string }> = {
  developer: { label: "Developer", color: "bg-info/10 text-info border-info/20" },
  compliance: { label: "Compliance", color: "bg-warning/10 text-warning border-warning/20" },
  business: { label: "Business", color: "bg-success/10 text-success border-success/20" },
};

const policyDocs: PolicyDoc[] = [
  {
    id: "multi-tenancy",
    title: "Multi-Tenancy Blueprint",
    description: "Data isolation strategy using Row-Level Security, tenant evolution plan, and partition patterns.",
    category: "developer",
    icon: Database,
    content: `MULTI-TENANCY BLUEPRINT — BRIBTE Digital Campus

1. CURRENT ARCHITECTURE
   • Single-tenant PostgreSQL with Row-Level Security (RLS)
   • Every table protected by RLS policies scoped to auth.uid()
   • SECURITY DEFINER functions for cross-table atomic operations

2. DATA ISOLATION STRATEGY
   • All student data filtered by user_id through RLS
   • Admin access granted via has_role() security definer function
   • Lecturers see only courses assigned to them
   • No direct table access — all queries pass through RLS

3. MULTI-TENANT EVOLUTION PLAN
   Phase 1 (Current): Single institution, RLS per user
   Phase 2: Add tenant_id column to all tables, RLS scoped to tenant
   Phase 3: Shared Supabase project with tenant-isolated schemas
   Phase 4: Dedicated Supabase projects per large tenant

4. ROW-LEVEL SECURITY PATTERNS
   • Students: WHERE user_id = auth.uid()
   • Lecturers: WHERE lecturer_id IN (SELECT id FROM lecturers WHERE user_id = auth.uid())
   • Admins: WHERE has_role(auth.uid(), 'admin')
   • Public reads: Courses, departments (published only)

5. CROSS-TENANT DATA SHARING
   • System settings shared across all users
   • Announcements filtered by target_group and target_course_id
   • Fee items shared but enrollment-specific`,
  },
  {
    id: "infrastructure",
    title: "Infrastructure & Deployment",
    description: "Cloud architecture, local development setup, deployment workflows, and edge function configuration.",
    category: "developer",
    icon: Server,
    content: `INFRASTRUCTURE & DEPLOYMENT — BRIBTE Digital Campus

1. CLOUD ARCHITECTURE
   ┌─────────────────────────────────────┐
   │         Lovable Cloud (Supabase)    │
   ├──────────┬──────────┬──────────────┤
   │ PostgreSQL│ Auth     │ Storage      │
   │ Database  │ (JWT)    │ (Receipts)   │
   ├──────────┼──────────┼──────────────┤
   │ Edge Fns  │ Realtime │ RLS Policies │
   └──────────┴──────────┴──────────────┘
           ↕ HTTPS/WSS
   ┌─────────────────────────────────────┐
   │    React SPA (Vite + TypeScript)    │
   │    Hosted on Lovable CDN            │
   └─────────────────────────────────────┘

2. ENVIRONMENT VARIABLES
   • VITE_SUPABASE_URL — Backend URL
   • VITE_SUPABASE_PUBLISHABLE_KEY — Anon key
   • SUPABASE_SERVICE_ROLE_KEY — Edge functions only

3. LOCAL DEVELOPMENT
   npm install → npm run dev → http://localhost:8080

4. DEPLOYMENT FLOW
   • Frontend: Publish via Lovable (manual trigger)
   • Edge Functions: Auto-deploy on code push
   • Migrations: Applied via Lovable Cloud

5. EDGE FUNCTIONS
   • create-admin: Provisions admin accounts
   • process-receipt: AI-powered receipt OCR & validation`,
  },
  {
    id: "api-reference",
    title: "API Reference",
    description: "Complete guide to all endpoints, authentication (JWT), RPCs, edge functions, and error codes.",
    category: "developer",
    icon: BookOpen,
    content: `API REFERENCE — BRIBTE Digital Campus

1. AUTHENTICATION
   • Method: JWT via Supabase Auth
   • Sign Up: supabase.auth.signUp({ email, password })
   • Sign In: supabase.auth.signInWithPassword({ email, password })
   • Token refresh: Automatic via Supabase client

2. EDGE FUNCTIONS
   POST /functions/v1/create-admin
   Body: { email, password, full_name, role }
   Auth: Service role key
   Response: { user_id, message }

   POST /functions/v1/process-receipt
   Body: { receiptId }
   Auth: User JWT
   Response: { status, extraction, validationFlags }

3. DATABASE RPCs
   • submit_clearance_request(p_student_id, p_academic_year, p_semester, p_clearance_type)
     Returns: clearance_request_id
   • recalculate_fee_balance(p_student_id)
     Returns: void (updates students.fee_balance)
   • check_schedule_conflicts(p_course_id, p_day_of_week, p_start_time, p_end_time, ...)
     Returns: { conflict_type, conflict_details }[]
   • generate_class_sessions(p_course_id, p_start_date, p_weeks)
     Returns: number of sessions created

4. ERROR CODES
   401 — Not authenticated
   403 — Insufficient permissions (RLS violation)
   404 — Resource not found
   409 — Conflict (duplicate entry)
   422 — Validation error
   500 — Server error`,
  },
  {
    id: "database-erd",
    title: "Database Schema (ERD)",
    description: "25 tables, entity relationships, custom enums, triggers, and indexing strategies.",
    category: "developer",
    icon: Database,
    content: `DATABASE SCHEMA (ERD) — BRIBTE Digital Campus

25 TABLES ORGANIZED IN 7 DOMAINS:

1. IDENTITY (3 tables)
   profiles ←→ user_roles ←→ auth.users

2. ACADEMIC (7 tables)
   departments → courses → course_modules → course_lessons
   courses → course_materials
   courses → course_schedules → class_sessions

3. ENROLLMENT (2 tables)
   students → enrollments ← courses

4. ASSESSMENT (4 tables)
   assignments → submissions ← students
   exams → exam_results ← students

5. FINANCE (5 tables)
   fee_items → student_fee_selections ← students
   payments ← students
   receipt_uploads → receipt_extractions
   receipt_uploads → payment_transactions

6. OPERATIONS (4 tables)
   timetable_entries, attendance ← class_sessions
   clearance_requests → clearance_steps
   announcements, academic_calendar

7. SYSTEM (2 tables)
   system_settings, audit_logs

CUSTOM ENUMS:
   • app_role: admin | lecturer | student
   • attendance_status: present | absent | late
   • session_status: scheduled | live | completed | cancelled

KEY TRIGGERS:
   • handle_new_user: Auto-creates profile + student + role on signup
   • recalculate_fee_balance: Fires on payment approval`,
  },
  {
    id: "security-privacy",
    title: "Security & Data Privacy Policy",
    description: "Encryption standards, GDPR/FERPA compliance, incident response, and data protection measures.",
    category: "compliance",
    icon: Shield,
    content: `SECURITY & DATA PRIVACY POLICY — BRIBTE Digital Campus
Document ID: BRIBTE-SEC-001 | Classification: Confidential

1. DATA CLASSIFICATION
   • Public: Course catalog, academic calendar
   • Internal: Announcements, timetables
   • Confidential: Student records, grades, financial data
   • Restricted: Authentication credentials, API keys

2. ENCRYPTION
   • At Rest: AES-256 (Supabase managed PostgreSQL)
   • In Transit: TLS 1.3 for all connections
   • Secrets: Stored in Supabase Vault, never in code

3. ACCESS CONTROL
   • Authentication: Email + password with email verification
   • Authorization: Row-Level Security on all 25 tables
   • Role separation: Admin, Lecturer, Student
   • Session management: JWT with automatic refresh

4. COMPLIANCE FRAMEWORK
   • Uganda Data Protection Act 2019
   • GDPR (for international students)
   • FERPA (academic records protection)

5. INCIDENT RESPONSE
   • Detection: Audit logs monitor all admin actions
   • Response: 4-hour acknowledgment, 24-hour resolution target
   • Communication: Affected users notified within 72 hours
   • Post-incident: Root cause analysis within 7 days

6. DATA RETENTION
   • Active student data: Duration of enrollment + 5 years
   • Alumni records: Indefinite
   • Audit logs: 7 years
   • Deleted accounts: 30-day grace period`,
  },
  {
    id: "rbac-matrix",
    title: "Role-Based Access Control (RBAC)",
    description: "Permission matrix for Admin, Lecturer, Student roles across all system resources.",
    category: "compliance",
    icon: Users,
    content: `RBAC MATRIX — BRIBTE Digital Campus
Document ID: BRIBTE-SEC-002

PERMISSION LEVELS: C=Create, R=Read, U=Update, D=Delete, —=No Access

RESOURCE                  | ADMIN  | LECTURER | STUDENT
─────────────────────────┼────────┼──────────┼────────
Students                  | CRUD   | R (own)  | R (self)
Lecturers                 | CRUD   | R (self) | —
Courses                   | CRUD   | R (own)  | R (enrolled)
Departments               | CRUD   | R        | R
Enrollments               | CRUD   | R (own)  | R (self)
Fee Items                 | CRUD   | —        | R
Payments                  | CRUD   | —        | CR (self)
Receipt Uploads           | RUD    | —        | CR (self)
Assignments               | R      | CRUD     | R (enrolled)
Submissions               | R      | RU       | CR (self)
Exams                     | CRUD   | R (own)  | R (enrolled)
Exam Results              | RU     | CRU      | R (self)
Timetable                 | CRUD   | R        | R (enrolled)
Attendance                | R      | CRU      | R (self)
Clearance Requests        | RU     | —        | CR (self)
Clearance Steps           | RU     | —        | R (self)
Announcements             | CRUD   | CR       | R
Academic Calendar         | CRUD   | R        | R
System Settings           | CRUD   | —        | —
Audit Logs                | R      | —        | —
Alumni                    | CRUD   | R        | —
Profiles                  | R      | RU(self) | RU(self)`,
  },
  {
    id: "sla",
    title: "Service Level Agreement (SLA)",
    description: "Uptime commitments, support tiers, incident response times, and service credits.",
    category: "compliance",
    icon: Clock,
    content: `SERVICE LEVEL AGREEMENT — BRIBTE Digital Campus
Document ID: BRIBTE-SLA-001

1. UPTIME COMMITMENTS
   • Basic tier: 99.5% monthly uptime
   • Professional tier: 99.9% monthly uptime
   • Enterprise tier: 99.95% monthly uptime

   Excluded: Scheduled maintenance (max 4 hours/month, announced 48h ahead)

2. SUPPORT RESPONSE TIMES
   Severity | Basic    | Professional | Enterprise
   ─────────┼──────────┼──────────────┼───────────
   Critical | 24 hours | 4 hours      | 1 hour
   High     | 48 hours | 8 hours      | 4 hours
   Medium   | 72 hours | 24 hours     | 8 hours
   Low      | 5 days   | 48 hours     | 24 hours

3. DATA RECOVERY
   • Recovery Point Objective (RPO): 24 hours (Basic), 1 hour (Pro/Enterprise)
   • Recovery Time Objective (RTO): 8 hours (Basic), 2 hours (Pro), 30 min (Enterprise)

4. SERVICE CREDITS
   Uptime        | Credit
   ──────────────┼────────
   99.0%–99.5%   | 10%
   95.0%–99.0%   | 25%
   Below 95.0%   | 50%

5. ESCALATION PATH
   Level 1: Support team (automated ticket)
   Level 2: Engineering lead (2 hours)
   Level 3: CTO notification (4 hours)`,
  },
  {
    id: "user-manual",
    title: "User Manual & Onboarding",
    description: "Step-by-step guides for students, lecturers, and administrators across all modules.",
    category: "compliance",
    icon: HelpCircle,
    content: `USER MANUAL — BRIBTE Digital Campus
Document ID: BRIBTE-USR-001

STUDENT GUIDE:

1. REGISTRATION
   • Visit login page → Click "Sign Up"
   • Enter full name, email, password → Verify email
   • Wait for admin approval and course assignment

2. FEE PAYMENT
   • Dashboard → Fees & Payments → View breakdown
   • Pay via SchoolPay → Download receipt
   • Upload receipt → AI processes automatically
   • Track payment status (pending/approved/rejected)

3. CLEARANCE
   • Dashboard → Clearance → Submit Request
   • 4 steps: Finance → Library → Department → Admin
   • Track progress in real-time

LECTURER GUIDE:

1. COURSE MANAGEMENT
   • View assigned courses → Add modules & lessons
   • Upload course materials

2. ASSIGNMENTS & GRADING
   • Create assignments with deadlines
   • Review submissions → Enter grades
   • Grade automatically calculated with GPA

ADMIN GUIDE:

1. STUDENT MANAGEMENT
   • Approve pending registrations
   • Assign courses and study modes
   • Manage enrollments

2. FEE MANAGEMENT
   • Configure fee items (mandatory/optional)
   • Review uploaded receipts
   • Approve/reject payments

3. SYSTEM SETTINGS
   • Institution name, academic year, semester
   • Currency and branding configuration`,
  },
  {
    id: "tenant-onboarding",
    title: "Tenant Onboarding Guide",
    description: "12-step checklist for new school setup, branding, fee structure, and staff training.",
    category: "business",
    icon: Folder,
    content: `TENANT ONBOARDING GUIDE — BRIBTE Digital Campus
Document ID: BRIBTE-BIZ-001

12-STEP ONBOARDING CHECKLIST:

Step  | Action                              | Owner           | Duration
──────┼─────────────────────────────────────┼─────────────────┼─────────
  1   | Sign contract & select tier         | Sales           | 1-2 days
  2   | Collect institution details          | Onboarding      | 1 day
  3   | Create tenant record                | Engineering     | 30 min
  4   | Create first admin account          | Engineering     | 5 min
  5   | Configure branding                  | Onboarding      | 1 hour
  6   | Set up fee structure                | Client + Team   | 2-4 hours
  7   | Import departments & courses        | Client + Team   | 2-4 hours
  8   | Create lecturer accounts            | Client Admin    | 1-2 hours
  9   | Configure academic calendar         | Client Admin    | 1 hour
 10   | Open student self-registration      | Client Admin    | 5 min
 11   | Conduct admin training              | Onboarding      | 2 hours
 12   | Go-live confirmation                | Both parties    | —

SUBSCRIPTION TIERS:
   • Basic: Up to 500 students, 5 GB, 99.5% SLA
   • Professional: Up to 5,000 students, 50 GB, 99.9% SLA
   • Enterprise: Unlimited, 500 GB+, 99.95% SLA, dedicated support`,
  },
  {
    id: "billing-logic",
    title: "Subscription & Billing Logic",
    description: "Usage tracking, subscription tiers, overage rates, Stripe integration plan, and invoicing.",
    category: "business",
    icon: Receipt,
    content: `SUBSCRIPTION & BILLING LOGIC — BRIBTE Digital Campus
Document ID: BRIBTE-BIZ-002

1. BILLING MODEL: Subscription + Usage-Based

   Tier          | Monthly (UGX) | Students | AI Receipts | Storage
   ──────────────┼───────────────┼──────────┼─────────────┼────────
   Basic         | 500,000       | 500      | 1,000       | 5 GB
   Professional  | 2,000,000     | 5,000    | 10,000      | 50 GB
   Enterprise    | Custom        | Unlimited| Unlimited   | 500 GB+

2. OVERAGE RATES
   • Additional students: 1,000 UGX/student/month
   • Extra AI receipts: 500 UGX/receipt
   • Extra storage: 50,000 UGX/GB/month

3. USAGE TRACKING
   • Active students: Count from students table (status = 'active')
   • AI receipts: Count from receipt_uploads per billing period
   • Storage: Total bytes across all buckets

4. PAYMENT METHODS (Planned)
   • Credit card, Mobile Money (via Stripe Africa), Bank transfer

5. DUNNING PROCESS
   Day 0: Auto-retry → Day 3: Warning → Day 7: Escalation
   Day 14: Read-only → Day 30: Suspended → Day 60: Data deletion`,
  },
  {
    id: "changelog",
    title: "Changelog & Release Notes",
    description: "Version history, feature releases, bug fixes, and automated compliance evidence.",
    category: "business",
    icon: FileText,
    content: `CHANGELOG & RELEASE NOTES — BRIBTE Digital Campus
Document ID: BRIBTE-BIZ-003

v1.5.0 — March 8, 2026
   • Fixed: Clearance steps not created (RLS permission issue)
   • Added: submit_clearance_request SECURITY DEFINER function
   • Created: 11 comprehensive documentation files

v1.4.0 — March 2026
   • 10-step AI-powered receipt validation pipeline
   • Google Gemini 2.5 Flash OCR integration
   • Fraud detection & duplicate prevention
   • Auto-approval with confidence scoring

v1.3.0 — March 2026
   • Dynamic fee calculation by study mode
   • Configurable fee items (mandatory + optional)
   • recalculate_fee_balance function with triggers

v1.2.0 — February 2026
   • Course management with modules & lessons
   • Assignment/submission workflow
   • Exam scheduling & grade entry
   • Timetable with conflict detection

v1.1.0 — February 2026
   • Admin dashboard, student approval workflow
   • Department & course CRUD
   • Announcement system, audit logging

v1.0.0 — January 2026
   • Authentication (email + password + verification)
   • Role-based access control (3 roles)
   • Three dashboard portals
   • Row-Level Security on all tables`,
  },
];

export default function AdminPoliciesPage() {
  const [selectedDoc, setSelectedDoc] = useState<PolicyDoc | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const printRef = useRef<HTMLDivElement>(null);

  const filteredDocs = activeCategory === "all" ? policyDocs : policyDocs.filter(d => d.category === activeCategory);

  const handleDownloadPdf = async (doc: PolicyDoc) => {
    // Create a hidden div with formatted content for PDF generation
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${doc.title} — BRIBTE</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Inter', sans-serif;
            padding: 48px;
            color: #1a1a2e;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            border-bottom: 3px solid #1a1a2e;
            padding-bottom: 20px;
            margin-bottom: 32px;
          }
          .header h1 {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 4px;
          }
          .header .subtitle {
            font-size: 13px;
            color: #64748b;
          }
          .header .badge {
            display: inline-block;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 2px 10px;
            border-radius: 4px;
            background: #f1f5f9;
            color: #475569;
            margin-top: 8px;
          }
          .content {
            white-space: pre-wrap;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.7;
            background: #f8fafc;
            padding: 24px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
            font-size: 11px;
            color: #94a3b8;
            text-align: center;
          }
          @media print {
            body { padding: 24px; }
            .content { background: white; border: 1px solid #ccc; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${doc.title}</h1>
          <p class="subtitle">${doc.description}</p>
          <span class="badge">${categoryLabels[doc.category].label} Documentation</span>
        </div>
        <div class="content">${doc.content}</div>
        <div class="footer">
          BRIBTE Digital Campus Management System — Buganda Royal Institute of Business and Technical Education<br/>
          Generated on ${new Date().toLocaleDateString("en-UG", { year: "numeric", month: "long", day: "numeric" })} | Confidential
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    
    // Wait for fonts to load then trigger print
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const categories = [
    { key: "all", label: "All Documents", count: policyDocs.length },
    { key: "developer", label: "Developer", count: policyDocs.filter(d => d.category === "developer").length },
    { key: "compliance", label: "Compliance", count: policyDocs.filter(d => d.category === "compliance").length },
    { key: "business", label: "Business", count: policyDocs.filter(d => d.category === "business").length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Policies & Documentation</h1>
        <p className="text-muted-foreground text-sm mt-1">View and download all system documentation as PDF</p>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <Button
            key={cat.key}
            variant={activeCategory === cat.key ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(cat.key)}
            className="rounded-xl"
          >
            {cat.label}
            <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">{cat.count}</Badge>
          </Button>
        ))}
      </div>

      {/* Document grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredDocs.map((doc) => {
          const Icon = doc.icon;
          const cat = categoryLabels[doc.category];
          return (
            <Card key={doc.id} className="group hover:shadow-lg transition-all duration-200 border-border/50 hover:border-primary/20">
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Badge variant="outline" className={`text-[10px] mb-1.5 ${cat.color}`}>
                      {cat.label}
                    </Badge>
                    <h3 className="font-semibold text-sm text-foreground leading-tight">{doc.title}</h3>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{doc.description}</p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 rounded-xl text-xs h-8"
                    onClick={() => setSelectedDoc(doc)}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 rounded-xl text-xs h-8"
                    onClick={() => handleDownloadPdf(doc)}
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Download PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Preview dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] p-0 rounded-2xl">
          {selectedDoc && (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <selectedDoc.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-display">{selectedDoc.title}</DialogTitle>
                      <Badge variant="outline" className={`text-[10px] mt-1 ${categoryLabels[selectedDoc.category].color}`}>
                        {categoryLabels[selectedDoc.category].label}
                      </Badge>
                    </div>
                  </div>
                  <Button size="sm" className="rounded-xl" onClick={() => handleDownloadPdf(selectedDoc)}>
                    <Download className="w-4 h-4 mr-1.5" />
                    Download PDF
                  </Button>
                </div>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] px-6 py-4">
                <div ref={printRef}>
                  <pre className="text-sm text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed">
                    {selectedDoc.content}
                  </pre>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
