import { useAuth } from "@/lib/auth-context";
import { StatCard } from "@/components/dashboard/StatCard";
import { AnimatedCard, SectionHeader, EmptyState } from "@/components/dashboard/DashboardParts";
import { CreditCard, FileText, BookOpen, Bell, Upload, AlertTriangle, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";

interface StudentRecord {
  id: string; registration_number: string | null; status: string; study_mode: string;
  year_of_study: number; semester: number; fee_balance: number; course_id: string | null;
  course?: { course_name: string; course_code: string } | null;
}

export default function StudentDashboardHome() {
  const { user } = useAuth();
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadAmount, setUploadAmount] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => { if (user) loadData(); }, [user]);

  async function loadData() {
    if (!user) return;
    setLoading(true);
    const { data: studentData } = await supabase.from("students")
      .select("*, course:courses(course_name, course_code)").eq("user_id", user.id).maybeSingle();
    setStudent(studentData);
    if (!studentData) { setLoading(false); return; }

    const [paymentsRes, assignmentsRes, submissionsRes, announcementsRes] = await Promise.all([
      supabase.from("payments").select("id, amount, payment_date, payment_status, semester, academic_year, receipt_url")
        .eq("student_id", studentData.id).order("payment_date", { ascending: false }),
      supabase.from("assignments").select("id, title, deadline, max_grade, course_id, course:courses(course_name, course_code)")
        .eq("course_id", studentData.course_id || "").order("deadline", { ascending: true }),
      supabase.from("submissions").select("id, assignment_id, status, grade, feedback").eq("student_id", studentData.id),
      supabase.from("announcements").select("id, title, message, priority, created_at, target_group")
        .in("target_group", ["all", "students"]).order("created_at", { ascending: false }).limit(10),
    ]);

    setPayments(paymentsRes.data || []);
    setAssignments((assignmentsRes.data as any[]) || []);
    setSubmissions(submissionsRes.data || []);
    setAnnouncements(announcementsRes.data || []);
    setLoading(false);
  }

  const feeStats = useMemo(() => {
    const approved = payments.filter(p => p.payment_status === "approved");
    const totalPaid = approved.reduce((s, p) => s + Number(p.amount), 0);
    const balance = student?.fee_balance ?? 0;
    const totalFees = totalPaid + balance;
    return { totalFees, totalPaid, balance, percentage: totalFees > 0 ? (totalPaid / totalFees) * 100 : 0 };
  }, [payments, student]);

  const assignmentList = useMemo(() => {
    const subMap = new Map(submissions.map(s => [s.assignment_id, s]));
    return assignments.map(a => ({ ...a, submission: subMap.get(a.id) || null, effectiveStatus: subMap.has(a.id) ? subMap.get(a.id)!.status : "pending" }));
  }, [assignments, submissions]);

  const pendingAssignments = assignmentList.filter(a => a.effectiveStatus === "pending" || a.effectiveStatus === "submitted");

  async function handleUploadReceipt() {
    if (!student || !uploadFile || !uploadAmount) return;
    setUploading(true);
    try {
      const ext = uploadFile.name.split(".").pop();
      const path = `${student.id}/${Date.now()}.${ext}`;
      const { error: ue } = await supabase.storage.from("receipts").upload(path, uploadFile);
      if (ue) throw ue;
      const { data: u } = supabase.storage.from("receipts").getPublicUrl(path);
      const { error: ie } = await supabase.from("payments").insert({ student_id: student.id, amount: parseFloat(uploadAmount), receipt_url: u.publicUrl, payment_status: "pending" });
      if (ie) throw ie;
      toast.success("Receipt uploaded! Awaiting approval.");
      setUploadOpen(false); setUploadFile(null); setUploadAmount("");
      loadData();
    } catch (e: any) { toast.error(e.message || "Upload failed"); }
    finally { setUploading(false); }
  }

  if (!user) return null;
  const displayName = user.fullName || user.email;
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  if (!student) return <div className="max-w-[1400px] mx-auto"><EmptyState icon={GraduationCap} title="Student Record Not Found" description="Your student profile hasn't been set up yet. Please contact the administration office." /></div>;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="primary-gradient rounded-2xl p-6 lg:p-8 text-primary-foreground relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary-foreground/5 -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-primary-foreground/60 text-sm font-medium mb-1">{greeting},</p>
            <h1 className="font-display text-2xl lg:text-3xl font-extrabold mb-1">{displayName} 👋</h1>
            <p className="text-primary-foreground/70 text-sm">{student.registration_number || "Student"} • {student.course?.course_name || "No course assigned"}</p>
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-primary-foreground/60 text-xs font-medium">Year {student.year_of_study}, Semester {student.semester}</p>
            <Badge className="mt-2 bg-primary-foreground/20 text-primary-foreground border-0 text-xs">{student.study_mode} • {student.status}</Badge>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Fee Balance" value={`${(feeStats.balance / 1000).toFixed(0)}K`} subtitle={`UGX • ${feeStats.percentage.toFixed(0)}% paid`} icon={CreditCard} variant={feeStats.percentage >= 75 ? "success" : "warning"} delay={0} />
        <StatCard title="Pending Tasks" value={pendingAssignments.length} subtitle="Assignments" icon={FileText} delay={0.05} />
        <StatCard title="Payments" value={payments.length} subtitle={`${payments.filter(p => p.payment_status === "approved").length} approved`} icon={CreditCard} variant="info" delay={0.1} />
        <StatCard title="Announcements" value={announcements.length} subtitle="Recent notices" icon={Bell} variant="success" delay={0.15} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <AnimatedCard delay={0.1}>
          <SectionHeader title="Fee Status" icon={CreditCard} />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground mb-0.5">Total Fees</p><p className="font-display font-bold text-lg">UGX {feeStats.totalFees.toLocaleString()}</p></div>
              <div className={`metric-badge ${feeStats.percentage >= 75 ? "metric-badge-success" : feeStats.percentage >= 50 ? "metric-badge-warning" : "metric-badge-destructive"}`}>{feeStats.percentage.toFixed(0)}% paid</div>
            </div>
            <Progress value={feeStats.percentage} className="h-3 rounded-full" />
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-success-light"><p className="text-[10px] text-success font-semibold uppercase tracking-wider">Paid</p><p className="font-display font-bold text-success text-sm mt-0.5">UGX {feeStats.totalPaid.toLocaleString()}</p></div>
              <div className="p-3 rounded-xl bg-destructive/5"><p className="text-[10px] text-destructive font-semibold uppercase tracking-wider">Balance</p><p className="font-display font-bold text-destructive text-sm mt-0.5">UGX {feeStats.balance.toLocaleString()}</p></div>
            </div>
            <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={() => setUploadOpen(true)}><Upload className="w-3.5 h-3.5 mr-2" /> Upload Payment Receipt</Button>
            {payments.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs font-semibold text-muted-foreground">Recent Payments</p>
                {payments.slice(0, 3).map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{new Date(p.payment_date).toLocaleDateString("en-UG", { month: "short", day: "numeric" })}</span>
                    <span className="font-semibold">UGX {Number(p.amount).toLocaleString()}</span>
                    <Badge variant={p.payment_status === "approved" ? "default" : p.payment_status === "pending" ? "secondary" : "destructive"} className="text-[10px] h-5">{p.payment_status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AnimatedCard>

        <AnimatedCard delay={0.15}>
          <SectionHeader title="Assignments" icon={FileText} badge={pendingAssignments.length} />
          <div className="space-y-2.5">
            {assignmentList.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No assignments yet</p> :
              assignmentList.slice(0, 5).map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.05 }}
                  className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors cursor-pointer group">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${a.effectiveStatus === "graded" ? "bg-success/10" : a.effectiveStatus === "submitted" ? "bg-info/10" : "bg-warning/10"}`}>
                    {a.effectiveStatus === "graded" ? <BookOpen className="w-3.5 h-3.5 text-success" /> : <AlertTriangle className="w-3.5 h-3.5 text-warning" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.course?.course_code || ""} • Due {new Date(a.deadline).toLocaleDateString("en-UG", { month: "short", day: "numeric" })}</p>
                    {a.submission?.grade != null && <p className="text-xs font-semibold text-success mt-0.5">Grade: {a.submission.grade}/{a.max_grade}</p>}
                  </div>
                  <Badge variant={a.effectiveStatus === "graded" ? "default" : a.effectiveStatus === "submitted" ? "secondary" : "outline"} className="text-[10px] h-5 flex-shrink-0">{a.effectiveStatus}</Badge>
                </motion.div>
              ))}
          </div>
        </AnimatedCard>

        <AnimatedCard delay={0.2}>
          <SectionHeader title="Announcements" icon={Bell} />
          <div className="space-y-2.5">
            {announcements.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No announcements yet</p> :
              announcements.slice(0, 4).map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.05 }}
                  className="p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant={a.priority === "high" ? "destructive" : "secondary"} className="text-[10px] h-5 px-2 rounded-md font-semibold">{a.priority}</Badge>
                    <span className="text-[10px] text-muted-foreground font-medium">{new Date(a.created_at).toLocaleDateString("en-UG", { month: "short", day: "numeric" })}</span>
                  </div>
                  <p className="text-sm font-semibold leading-snug">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.message}</p>
                </motion.div>
              ))}
          </div>
        </AnimatedCard>
      </div>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Payment Receipt</DialogTitle><DialogDescription>Upload your payment receipt for verification.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Amount Paid (UGX)</Label><Input type="number" placeholder="e.g. 500000" value={uploadAmount} onChange={e => setUploadAmount(e.target.value)} /></div>
            <div><Label>Receipt File</Label><Input type="file" accept="image/*,.pdf" onChange={e => setUploadFile(e.target.files?.[0] || null)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={handleUploadReceipt} disabled={uploading || !uploadFile || !uploadAmount}>{uploading ? "Uploading..." : "Submit Receipt"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
