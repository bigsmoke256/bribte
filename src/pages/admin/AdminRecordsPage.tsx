import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, User, ArrowLeft, BookOpen, CreditCard, FileText, GraduationCap, Calendar, Download } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface StudentRecord {
  id: string;
  user_id: string;
  registration_number: string | null;
  status: string;
  study_mode: string;
  year_of_study: number;
  semester: number;
  fee_balance: number;
  admission_date: string | null;
  course_id: string | null;
  created_at: string;
  profile?: { full_name: string; email: string; phone: string | null; avatar_url: string | null };
  course?: { course_name: string; course_code: string; program_level: string; duration_years: number };
}

interface PaymentRecord {
  id: string;
  amount: number;
  payment_date: string;
  payment_status: string;
  notes: string | null;
  semester: string | null;
  academic_year: string | null;
}

interface EnrollmentRecord {
  id: string;
  academic_year: string;
  semester: number;
  status: string;
  study_mode: string;
  course: { course_name: string; course_code: string } | null;
}

interface SubmissionRecord {
  id: string;
  status: string;
  grade: number | null;
  submitted_at: string | null;
  feedback: string | null;
  assignment: { title: string; max_grade: number; course: { course_name: string; course_code: string } | null } | null;
}

interface ReceiptRecord {
  id: string;
  status: string;
  uploaded_at: string;
  review_notes: string | null;
  file_url: string;
}

export default function AdminRecordsPage() {
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<StudentRecord | null>(null);

  // Detail data
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [totalStudents, setTotalStudents] = useState(0);

  useEffect(() => {
    supabase.from("students").select("id", { count: "exact", head: true }).then(({ count }) => {
      if (count !== null) setTotalStudents(count);
    });
    // Load recent students on mount
    loadStudents("");
  }, []);

  const loadStudents = async (q: string) => {
    setLoading(true);
    try {
      // First get profiles matching search
      let query = supabase.from("students").select(`
        id, user_id, registration_number, status, study_mode, year_of_study, semester, fee_balance, admission_date, course_id, created_at,
        profiles!students_user_id_fkey ( full_name, email, phone, avatar_url ),
        courses!students_course_id_fkey ( course_name, course_code, program_level, duration_years )
      `).order("created_at", { ascending: false }).limit(50);

      if (q.trim()) {
        // We'll search by reg number or fetch all and filter client-side for name
        // Since we can't easily filter on joined table, fetch more and filter
        query = supabase.from("students").select(`
          id, user_id, registration_number, status, study_mode, year_of_study, semester, fee_balance, admission_date, course_id, created_at,
          profiles!students_user_id_fkey ( full_name, email, phone, avatar_url ),
          courses!students_course_id_fkey ( course_name, course_code, program_level, duration_years )
        `).order("created_at", { ascending: false }).limit(200);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = (data || []).map((s: any) => ({
        ...s,
        profile: Array.isArray(s.profiles) ? s.profiles[0] : s.profiles,
        course: Array.isArray(s.courses) ? s.courses[0] : s.courses,
      }));

      if (q.trim()) {
        const lower = q.toLowerCase();
        results = results.filter((s: any) =>
          s.profile?.full_name?.toLowerCase().includes(lower) ||
          s.profile?.email?.toLowerCase().includes(lower) ||
          s.registration_number?.toLowerCase().includes(lower) ||
          s.course?.course_name?.toLowerCase().includes(lower) ||
          s.course?.course_code?.toLowerCase().includes(lower)
        );
      }

      setStudents(results);
    } catch (e) {
      console.error("Error loading students:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentDetails = async (student: StudentRecord) => {
    setSelected(student);
    setDetailLoading(true);
    try {
      const [paymentsRes, enrollmentsRes, submissionsRes, receiptsRes] = await Promise.all([
        supabase.from("payments").select("id, amount, payment_date, payment_status, notes, semester, academic_year")
          .eq("student_id", student.id).order("payment_date", { ascending: false }),
        supabase.from("enrollments").select(`id, academic_year, semester, status, study_mode, courses!enrollments_course_id_fkey ( course_name, course_code )`)
          .eq("student_id", student.id).order("academic_year", { ascending: false }),
        supabase.from("submissions").select(`id, status, grade, submitted_at, feedback, assignments!submissions_assignment_id_fkey ( title, max_grade, courses!assignments_course_id_fkey ( course_name, course_code ) )`)
          .eq("student_id", student.id).order("submitted_at", { ascending: false }),
        supabase.from("receipt_uploads").select("id, status, uploaded_at, review_notes, file_url")
          .eq("student_id", student.id).order("uploaded_at", { ascending: false }),
      ]);

      setPayments((paymentsRes.data || []) as PaymentRecord[]);
      setEnrollments((enrollmentsRes.data || []).map((e: any) => ({ ...e, course: Array.isArray(e.courses) ? e.courses[0] : e.courses })) as EnrollmentRecord[]);
      setSubmissions((submissionsRes.data || []).map((s: any) => ({ ...s, assignment: Array.isArray(s.assignments) ? s.assignments[0] : s.assignments })) as SubmissionRecord[]);
      setReceipts((receiptsRes.data || []) as ReceiptRecord[]);
    } catch (e) {
      console.error("Error loading student details:", e);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadStudents(search);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "active": return "bg-emerald-500/10 text-emerald-700 border-emerald-200";
      case "graduated": return "bg-blue-500/10 text-blue-700 border-blue-200";
      case "suspended": return "bg-destructive/10 text-destructive border-destructive/20";
      case "pending": return "bg-warning/10 text-warning border-warning/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const paymentStatusColor = (s: string) => {
    switch (s) {
      case "approved": return "bg-emerald-500/10 text-emerald-700";
      case "pending": return "bg-warning/10 text-warning";
      case "rejected": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const totalPaid = payments.filter(p => p.payment_status === "approved").reduce((sum, p) => sum + Number(p.amount), 0);

  // Detail view
  if (selected) {
    const s = selected;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelected(null)} className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold">Student Record</h1>
            <p className="text-sm text-muted-foreground">Complete academic & financial history</p>
          </div>
        </div>

        {/* Profile header */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                {s.profile?.avatar_url ? (
                  <img src={s.profile.avatar_url} alt="" className="w-20 h-20 rounded-2xl object-cover" />
                ) : (
                  <User className="w-8 h-8 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <h2 className="text-xl font-bold">{s.profile?.full_name || "Unknown"}</h2>
                  <p className="text-sm text-muted-foreground">{s.profile?.email}</p>
                  {s.profile?.phone && <p className="text-sm text-muted-foreground">{s.profile.phone}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={statusColor(s.status)}>{s.status}</Badge>
                  <Badge variant="outline">{s.registration_number || "No Reg #"}</Badge>
                  <Badge variant="outline">{s.study_mode}</Badge>
                  <Badge variant="outline">Year {s.year_of_study} • Sem {s.semester}</Badge>
                </div>
              </div>
              <div className="text-right space-y-1 flex-shrink-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Fee Balance</p>
                <p className={`text-2xl font-bold ${s.fee_balance > 0 ? "text-destructive" : "text-emerald-600"}`}>
                  UGX {Number(s.fee_balance).toLocaleString()}
                </p>
                {s.admission_date && (
                  <p className="text-xs text-muted-foreground">Admitted: {format(new Date(s.admission_date), "dd MMM yyyy")}</p>
                )}
              </div>
            </div>
            {s.course && (
              <div className="mt-4 p-3 rounded-xl bg-muted/50 flex items-center gap-3">
                <GraduationCap className="w-5 h-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold">{s.course.course_name} ({s.course.course_code})</p>
                  <p className="text-xs text-muted-foreground">{s.course.program_level} • {s.course.duration_years} year(s)</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {detailLoading ? (
          <div className="py-12 text-center text-muted-foreground">Loading records...</div>
        ) : (
          <Tabs defaultValue="payments" className="space-y-4">
            <TabsList className="w-full justify-start bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="payments" className="rounded-lg gap-2"><CreditCard className="w-4 h-4" />Payments ({payments.length})</TabsTrigger>
              <TabsTrigger value="enrollments" className="rounded-lg gap-2"><BookOpen className="w-4 h-4" />Enrollments ({enrollments.length})</TabsTrigger>
              <TabsTrigger value="academics" className="rounded-lg gap-2"><FileText className="w-4 h-4" />Submissions ({submissions.length})</TabsTrigger>
              <TabsTrigger value="receipts" className="rounded-lg gap-2"><FileText className="w-4 h-4" />Receipts ({receipts.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="payments" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase">Total Paid</p>
                  <p className="text-xl font-bold text-emerald-600">UGX {totalPaid.toLocaleString()}</p>
                </CardContent></Card>
                <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase">Transactions</p>
                  <p className="text-xl font-bold">{payments.length}</p>
                </CardContent></Card>
                <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase">Outstanding</p>
                  <p className={`text-xl font-bold ${s.fee_balance > 0 ? "text-destructive" : "text-emerald-600"}`}>UGX {Number(s.fee_balance).toLocaleString()}</p>
                </CardContent></Card>
              </div>
              {payments.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">No payment records found</div>
              ) : (
                <Card className="border-0 shadow-sm">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Semester</TableHead><TableHead>Year</TableHead><TableHead>Notes</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {payments.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm">{format(new Date(p.payment_date), "dd MMM yyyy")}</TableCell>
                          <TableCell className="font-semibold">UGX {Number(p.amount).toLocaleString()}</TableCell>
                          <TableCell><Badge variant="outline" className={paymentStatusColor(p.payment_status)}>{p.payment_status}</Badge></TableCell>
                          <TableCell className="text-sm">{p.semester || "—"}</TableCell>
                          <TableCell className="text-sm">{p.academic_year || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{p.notes || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="enrollments">
              {enrollments.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">No enrollment records found</div>
              ) : (
                <Card className="border-0 shadow-sm">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Course</TableHead><TableHead>Academic Year</TableHead><TableHead>Semester</TableHead><TableHead>Mode</TableHead><TableHead>Status</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {enrollments.map(e => (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium">{e.course?.course_name || "—"} <span className="text-muted-foreground text-xs">({e.course?.course_code})</span></TableCell>
                          <TableCell>{e.academic_year}</TableCell>
                          <TableCell>Semester {e.semester}</TableCell>
                          <TableCell>{e.study_mode}</TableCell>
                          <TableCell><Badge variant="outline">{e.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="academics">
              {submissions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">No submission records found</div>
              ) : (
                <Card className="border-0 shadow-sm">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Assignment</TableHead><TableHead>Course</TableHead><TableHead>Submitted</TableHead><TableHead>Grade</TableHead><TableHead>Status</TableHead><TableHead>Feedback</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {submissions.map(sub => (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">{sub.assignment?.title || "—"}</TableCell>
                          <TableCell className="text-sm">{sub.assignment?.course?.course_code || "—"}</TableCell>
                          <TableCell className="text-sm">{sub.submitted_at ? format(new Date(sub.submitted_at), "dd MMM yyyy") : "—"}</TableCell>
                          <TableCell className="font-semibold">{sub.grade !== null ? `${sub.grade}/${sub.assignment?.max_grade || 100}` : "—"}</TableCell>
                          <TableCell><Badge variant="outline">{sub.status}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{sub.feedback || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="receipts">
              {receipts.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">No receipt records found</div>
              ) : (
                <Card className="border-0 shadow-sm">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Date Uploaded</TableHead><TableHead>Status</TableHead><TableHead>Review Notes</TableHead><TableHead>Action</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {receipts.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="text-sm">{format(new Date(r.uploaded_at), "dd MMM yyyy HH:mm")}</TableCell>
                          <TableCell><Badge variant="outline" className={paymentStatusColor(r.status)}>{r.status}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">{r.review_notes || "—"}</TableCell>
                          <TableCell>
                            <a href={r.file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm">View</a>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Student Records</h1>
        <p className="text-sm text-muted-foreground">Complete historical records for all {totalStudents} students — search by name, registration number, email, or course</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search student name, reg number, email, or course..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
        <Button type="submit" className="rounded-xl">Search</Button>
      </form>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Searching records...</div>
      ) : students.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">No students found. Try a different search.</div>
      ) : (
        <Card className="border-0 shadow-sm">
          <ScrollArea className="max-h-[600px]">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Reg Number</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Year / Sem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Admitted</TableHead>
                <TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {students.map(s => (
                  <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => loadStudentDetails(s)}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{s.profile?.full_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{s.profile?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono">{s.registration_number || "—"}</TableCell>
                    <TableCell className="text-sm">{s.course?.course_code || "—"}</TableCell>
                    <TableCell className="text-sm">{s.study_mode}</TableCell>
                    <TableCell className="text-sm">Y{s.year_of_study} / S{s.semester}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-xs ${statusColor(s.status)}`}>{s.status}</Badge></TableCell>
                    <TableCell className={`text-sm font-semibold ${s.fee_balance > 0 ? "text-destructive" : "text-emerald-600"}`}>
                      UGX {Number(s.fee_balance).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.admission_date ? format(new Date(s.admission_date), "dd/MM/yyyy") : "—"}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="rounded-lg text-xs">View Records →</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
