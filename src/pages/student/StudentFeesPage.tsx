import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useMemo } from "react";
import { AnimatedCard, SectionHeader, EmptyState } from "@/components/dashboard/DashboardParts";
import { CreditCard, Upload, CheckCircle, Clock, XCircle, Receipt, Info, FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { PaymentReceipt } from "@/components/PaymentReceipt";

interface FeeItem {
  id: string; name: string; amount: number; frequency: string;
  category: string; applies_to: string; is_optional: boolean;
}

export default function StudentFeesPage() {
  const { user } = useAuth();
  const [student, setStudent] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadAmount, setUploadAmount] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => { if (user) loadData(); }, [user]);

  async function loadData() {
    const { data: studentData } = await supabase.from("students")
      .select("*, course:courses(*)").eq("user_id", user!.id).maybeSingle();
    if (!studentData) { setLoading(false); return; }
    setStudent(studentData);
    setCourse(studentData.course);

    const [paymentsRes, feeItemsRes] = await Promise.all([
      supabase.from("payments").select("*").eq("student_id", studentData.id).order("payment_date", { ascending: false }),
      supabase.from("fee_items").select("*").order("category", { ascending: true }),
    ]);
    setPayments(paymentsRes.data || []);
    setFeeItems((feeItemsRes.data as FeeItem[]) || []);
    setLoading(false);
  }

  const tuition = useMemo(() => {
    if (!course || !student) return 0;
    const mode = student.study_mode;
    if (mode === "Evening") return Number(course.tuition_evening) || Number(course.tuition_day) || 0;
    if (mode === "Weekend") return Number(course.tuition_weekend) || Number(course.tuition_day) || 0;
    return Number(course.tuition_day) || 0;
  }, [course, student]);

  const feeBreakdown = useMemo(() => {
    const isDiploma = course?.program_level?.toLowerCase().includes("diploma");
    const isSemester = ["Diploma", "National Diploma", "Higher National Diploma"].some(
      l => course?.program_level?.includes(l)
    );

    const applicable = feeItems.filter(f => {
      if (f.applies_to === "diploma_only" && !isDiploma) return false;
      if (f.applies_to === "semester_basis" && !isSemester) return false;
      if (f.applies_to === "term_basis" && isSemester) return false;
      return true;
    });

    const oneTime = applicable.filter(f => f.frequency === "once");
    const recurring = applicable.filter(f => f.frequency !== "once" && !f.is_optional);
    const optional = applicable.filter(f => f.is_optional);

    const oneTimeTotal = oneTime.reduce((s, f) => s + Number(f.amount), 0);
    const recurringTotal = recurring.reduce((s, f) => s + Number(f.amount), 0);

    return { oneTime, recurring, optional, oneTimeTotal, recurringTotal };
  }, [feeItems, course]);

  const stats = useMemo(() => {
    const approved = payments.filter(p => p.payment_status === "approved");
    const totalPaid = approved.reduce((s, p) => s + Number(p.amount), 0);
    const balance = student?.fee_balance ?? 0;
    const totalFees = totalPaid + balance;
    return { totalPaid, totalFees, balance, percentage: totalFees > 0 ? (totalPaid / totalFees) * 100 : 0 };
  }, [payments, student]);

  async function handleUpload() {
    if (!student || !uploadFile || !uploadAmount) return;
    setUploading(true);
    try {
      const ext = uploadFile.name.split(".").pop();
      const path = `${student.id}/${Date.now()}.${ext}`;
      const { error: ue } = await supabase.storage.from("receipts").upload(path, uploadFile);
      if (ue) throw ue;
      const { data: u } = supabase.storage.from("receipts").getPublicUrl(path);
      const { error: ie } = await supabase.from("payments").insert({
        student_id: student.id, amount: parseFloat(uploadAmount), receipt_url: u.publicUrl, payment_status: "pending",
      });
      if (ie) throw ie;
      toast.success("Receipt uploaded! Awaiting approval.");
      setUploadOpen(false); setUploadFile(null); setUploadAmount("");
      loadData();
    } catch (e: any) { toast.error(e.message || "Upload failed"); }
    finally { setUploading(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Fees & Payments</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your tuition and fee payments</p>
        </div>
        <Button onClick={() => setUploadOpen(true)}><Upload className="w-4 h-4 mr-2" /> Upload Receipt</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AnimatedCard delay={0}>
          <p className="text-xs text-muted-foreground mb-1">Total Fees (Tuition)</p>
          <p className="font-display text-2xl font-bold">UGX {tuition.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">{student?.study_mode} session • per semester</p>
          <Progress value={stats.percentage} className="h-2 mt-3" />
          <p className="text-xs text-muted-foreground mt-1">{stats.percentage.toFixed(0)}% paid</p>
        </AnimatedCard>
        <AnimatedCard delay={0.05}>
          <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
          <p className="font-display text-2xl font-bold text-success">UGX {stats.totalPaid.toLocaleString()}</p>
        </AnimatedCard>
        <AnimatedCard delay={0.1}>
          <p className="text-xs text-muted-foreground mb-1">Outstanding Balance</p>
          <p className={`font-display text-2xl font-bold ${stats.balance > 0 ? "text-destructive" : "text-success"}`}>
            UGX {stats.balance.toLocaleString()}
          </p>
          {stats.balance > 0 && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <Info className="w-3 h-3" /> Please clear your balance to avoid penalties
            </p>
          )}
        </AnimatedCard>
      </div>

      {/* Fee Structure Breakdown */}
      <AnimatedCard delay={0.12}>
        <SectionHeader title="Fee Structure" icon={Receipt} />
        <div className="mt-4 space-y-4">
          {/* Tuition */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tuition Fee</p>
            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5">
              <span className="text-sm font-medium">Tuition ({student?.study_mode || "Day"})</span>
              <span className="font-display font-bold">UGX {tuition.toLocaleString()}</span>
            </div>
          </div>

          {/* One-time fees */}
          {feeBreakdown.oneTime.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">One-Time Fees</p>
              <div className="space-y-1">
                {feeBreakdown.oneTime.map(f => (
                  <div key={f.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/40 transition-colors">
                    <span className="text-sm">{f.name}</span>
                    <span className="text-sm font-semibold">UGX {Number(f.amount).toLocaleString()}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between p-2.5 font-semibold">
                  <span className="text-sm">Subtotal (One-Time)</span>
                  <span className="text-sm">UGX {feeBreakdown.oneTimeTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Recurring fees */}
          {feeBreakdown.recurring.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recurring Fees</p>
              <div className="space-y-1">
                {feeBreakdown.recurring.map(f => (
                  <div key={f.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/40 transition-colors">
                    <div>
                      <span className="text-sm">{f.name}</span>
                      <Badge variant="secondary" className="ml-2 text-[10px] h-4">{f.frequency.replace("_", "/")}</Badge>
                    </div>
                    <span className="text-sm font-semibold">UGX {Number(f.amount).toLocaleString()}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between p-2.5 font-semibold">
                  <span className="text-sm">Subtotal (Recurring)</span>
                  <span className="text-sm">UGX {feeBreakdown.recurringTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Optional fees */}
          {feeBreakdown.optional.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Optional Fees</p>
              <div className="space-y-1">
                {feeBreakdown.optional.map(f => (
                  <div key={f.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/40 transition-colors">
                    <div>
                      <span className="text-sm">{f.name}</span>
                      <Badge variant="outline" className="ml-2 text-[10px] h-4">Optional</Badge>
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">UGX {Number(f.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </AnimatedCard>

      {/* Payment History */}
      <AnimatedCard delay={0.15}>
        <SectionHeader title="Payment History" icon={CreditCard} />
        {payments.length === 0 ? (
          <EmptyState icon={CreditCard} title="No Payments" description="No payment records found." />
        ) : (
          <div className="space-y-3 mt-4">
            {payments.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    p.payment_status === "approved" ? "bg-success/10" : p.payment_status === "pending" ? "bg-warning/10" : "bg-destructive/10"
                  }`}>
                    {p.payment_status === "approved" ? <CheckCircle className="w-4 h-4 text-success" /> :
                     p.payment_status === "pending" ? <Clock className="w-4 h-4 text-warning" /> :
                     <XCircle className="w-4 h-4 text-destructive" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">UGX {Number(p.amount).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{new Date(p.payment_date).toLocaleDateString("en-UG", { year: "numeric", month: "short", day: "numeric" })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {p.receipt_url && <a href={p.receipt_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">View Receipt</a>}
                  <Badge variant={p.payment_status === "approved" ? "default" : p.payment_status === "pending" ? "secondary" : "destructive"} className="text-[10px] h-5">
                    {p.payment_status}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatedCard>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Payment Receipt</DialogTitle><DialogDescription>Upload your receipt for verification.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Amount Paid (UGX)</Label><Input type="number" placeholder="e.g. 500000" value={uploadAmount} onChange={e => setUploadAmount(e.target.value)} /></div>
            <div><Label>Receipt File</Label><Input type="file" accept="image/*,.pdf" onChange={e => setUploadFile(e.target.files?.[0] || null)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading || !uploadFile || !uploadAmount}>{uploading ? "Uploading..." : "Submit"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
