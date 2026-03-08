import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { AnimatedCard, SectionHeader, EmptyState } from "@/components/dashboard/DashboardParts";
import { CreditCard, Upload, CheckCircle, Clock, XCircle, Receipt, Info, FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { PaymentReceipt } from "@/components/PaymentReceipt";
import { FeeBreakdownSection } from "@/components/fees/FeeBreakdownSection";
import { PaymentHistorySection } from "@/components/fees/PaymentHistorySection";
import { ReceiptUploadDialog } from "@/components/fees/ReceiptUploadDialog";

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
  const [selectedOptional, setSelectedOptional] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadAmount, setUploadAmount] = useState("");
  const [uploading, setUploading] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<any>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    const { data: studentData } = await supabase.from("students")
      .select("*, course:courses(*)").eq("user_id", user.id).maybeSingle();
    if (!studentData) { setLoading(false); return; }
    setStudent(studentData);
    setCourse(studentData.course);

    const [paymentsRes, feeItemsRes, selectionsRes] = await Promise.all([
      supabase.from("payments").select("*").eq("student_id", studentData.id).order("payment_date", { ascending: false }),
      supabase.from("fee_items").select("*").order("category", { ascending: true }),
      supabase.from("student_fee_selections").select("fee_item_id").eq("student_id", studentData.id),
    ]);
    setPayments(paymentsRes.data || []);
    setFeeItems((feeItemsRes.data as FeeItem[]) || []);
    setSelectedOptional(new Set((selectionsRes.data || []).map((s: any) => s.fee_item_id)));
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const tuition = useMemo(() => {
    if (!course || !student) return 0;
    const mode = student.study_mode;
    if (mode === "Evening") return Number(course.tuition_evening) || Number(course.tuition_day) || 0;
    if (mode === "Weekend") return Number(course.tuition_weekend) || Number(course.tuition_day) || 0;
    return Number(course.tuition_day) || 0;
  }, [course, student]);

  const feeBreakdown = useMemo(() => {
    if (!course || !student) return { oneTime: [], recurring: [], optional: [], oneTimeTotal: 0, recurringTotal: 0, optionalTotal: 0, applicableOneTime: false, applicableYearly: false };

    const isDiploma = course?.program_level?.toLowerCase().includes("diploma");
    const isSemester = ["Diploma", "National Diploma", "Higher National Diploma"].some(
      l => course?.program_level?.includes(l)
    );
    const yearOfStudy = student.year_of_study || 1;
    const semester = student.semester || 1;

    const applicable = feeItems.filter(f => {
      if (f.applies_to === "diploma_only" && !isDiploma) return false;
      if (f.applies_to === "semester_basis" && !isSemester) return false;
      if (f.applies_to === "term_basis" && isSemester) return false;
      return true;
    });

    const oneTime = applicable.filter(f => f.frequency === "once" && !f.is_optional);
    const recurring = applicable.filter(f => {
      if (f.frequency === "once" || f.is_optional) return false;
      // per_semester fees only apply to semester-basis programs
      if (f.frequency === "per_semester" && !isSemester) return false;
      // per_term fees only apply to term-basis programs
      if (f.frequency === "per_term" && isSemester) return false;
      return true;
    });
    const optional = applicable.filter(f => f.is_optional);

    // Determine which fees apply THIS semester
    const applicableOneTime = yearOfStudy === 1 && semester === 1;
    const applicableYearly = semester === 1;

    const oneTimeTotal = applicableOneTime ? oneTime.reduce((s, f) => s + Number(f.amount), 0) : 0;

    const recurringTotal = recurring.reduce((s, f) => {
      if (f.frequency === "yearly" && !applicableYearly) return s;
      return s + Number(f.amount);
    }, 0);

    const optionalTotal = optional.reduce((s, f) => {
      if (selectedOptional.has(f.id)) return s + Number(f.amount);
      return s;
    }, 0);

    return { oneTime, recurring, optional, oneTimeTotal, recurringTotal, optionalTotal, applicableOneTime, applicableYearly };
  }, [feeItems, course, student, selectedOptional]);

  const grandTotal = useMemo(() => {
    return tuition + feeBreakdown.oneTimeTotal + feeBreakdown.recurringTotal + feeBreakdown.optionalTotal;
  }, [tuition, feeBreakdown]);

  const stats = useMemo(() => {
    const approved = payments.filter(p => p.payment_status === "approved");
    const totalPaid = approved.reduce((s, p) => s + Number(p.amount), 0);
    const balance = student?.fee_balance ?? 0;
    return { totalPaid, grandTotal, balance, percentage: grandTotal > 0 ? (totalPaid / grandTotal) * 100 : 0 };
  }, [payments, student, grandTotal]);

  const toggleOptionalFee = async (feeId: string) => {
    if (!student) return;
    const newSet = new Set(selectedOptional);
    try {
      if (newSet.has(feeId)) {
        await supabase.from("student_fee_selections").delete().eq("student_id", student.id).eq("fee_item_id", feeId);
        newSet.delete(feeId);
        toast.success("Optional fee removed");
      } else {
        await supabase.from("student_fee_selections").insert({ student_id: student.id, fee_item_id: feeId });
        newSet.add(feeId);
        toast.success("Optional fee added");
      }
      setSelectedOptional(newSet);
      // Recalculate balance
      await supabase.rpc("recalculate_fee_balance", { p_student_id: student.id });
      // Refresh student data
      const { data: updated } = await supabase.from("students").select("fee_balance").eq("id", student.id).maybeSingle();
      if (updated) setStudent((prev: any) => ({ ...prev, fee_balance: updated.fee_balance }));
    } catch (e: any) {
      toast.error(e.message || "Failed to update selection");
    }
  };

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

  const getReceiptData = (p: any) => {
    if (!student || !course) return null;
    const approved = payments.filter(pm => pm.payment_status === "approved");
    const totalPaidToDate = approved.reduce((s: number, pm: any) => s + Number(pm.amount), 0);
    return {
      studentName: user?.fullName || user?.email || "",
      registrationNumber: student.registration_number || "",
      courseName: course.course_name || "",
      courseCode: course.course_code || "",
      studyMode: student.study_mode || "Day",
      paymentAmount: Number(p.amount),
      paymentDate: p.payment_date,
      paymentStatus: p.payment_status,
      receiptNumber: `RCP-${p.id.slice(0, 8).toUpperCase()}`,
      tuition: grandTotal,
      totalPaid: totalPaidToDate,
      balance: student.fee_balance,
    };
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Fees & Payments</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your tuition and fee payments</p>
        </div>
        <Button onClick={() => setUploadOpen(true)}><Upload className="w-4 h-4 mr-2" /> Upload Receipt (AI Verified)</Button>
      </div>

      {/* Balance Alert */}
      {stats.balance > 0 ? (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">Outstanding Fee Balance: UGX {stats.balance.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You have paid UGX {stats.totalPaid.toLocaleString()} out of UGX {grandTotal.toLocaleString()} (total fees this semester). Please clear the remaining balance to avoid penalties.
            </p>
          </div>
        </motion.div>
      ) : stats.balance < 0 ? (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-success">Overpayment Credit: UGX {Math.abs(stats.balance).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You have a credit of UGX {Math.abs(stats.balance).toLocaleString()} which will be applied to your next semester fees.
            </p>
          </div>
        </motion.div>
      ) : stats.totalPaid > 0 ? (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-success/30 bg-success/5 p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-success">Fees Fully Paid</p>
            <p className="text-xs text-muted-foreground mt-0.5">All fees for this semester have been cleared. Thank you!</p>
          </div>
        </motion.div>
      ) : null}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AnimatedCard delay={0}>
          <p className="text-xs text-muted-foreground mb-1">Total Fees This Semester</p>
          <p className="font-display text-2xl font-bold">UGX {grandTotal.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">{student?.study_mode} session • Year {student?.year_of_study}, Sem {student?.semester}</p>
          <Progress value={stats.percentage} className="h-2 mt-3" />
          <p className="text-xs text-muted-foreground mt-1">{Math.min(stats.percentage, 100).toFixed(0)}% paid</p>
        </AnimatedCard>
        <AnimatedCard delay={0.05}>
          <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
          <p className="font-display text-2xl font-bold text-success">UGX {stats.totalPaid.toLocaleString()}</p>
        </AnimatedCard>
        <AnimatedCard delay={0.1}>
          <p className="text-xs text-muted-foreground mb-1">Outstanding Balance</p>
          <p className={`font-display text-2xl font-bold ${stats.balance > 0 ? "text-destructive" : "text-success"}`}>
            {stats.balance < 0 ? `UGX -${Math.abs(stats.balance).toLocaleString()} (Credit)` : `UGX ${stats.balance.toLocaleString()}`}
          </p>
          {stats.balance > 0 ? (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <Info className="w-3 h-3" /> Please clear your balance to avoid penalties
            </p>
          ) : stats.balance < 0 ? (
            <p className="text-xs text-success mt-1 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Credit will apply to next semester
            </p>
          ) : stats.totalPaid > 0 ? (
            <p className="text-xs text-success mt-1 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Fully paid!
            </p>
          ) : null}
        </AnimatedCard>
      </div>

      {/* Fee Structure Breakdown */}
      <FeeBreakdownSection
        tuition={tuition}
        studyMode={student?.study_mode}
        feeBreakdown={feeBreakdown}
        grandTotal={grandTotal}
        selectedOptional={selectedOptional}
        onToggleOptional={toggleOptionalFee}
      />

      {/* Payment History */}
      <PaymentHistorySection
        payments={payments}
        onViewReceipt={(p) => { setReceiptPayment(p); setReceiptOpen(true); }}
      />

      {/* AI-Powered Receipt Upload */}
      <ReceiptUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        studentId={student?.id || ""}
        courseId={student?.course_id || null}
        onComplete={loadData}
      />

      <PaymentReceipt
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        data={receiptPayment ? getReceiptData(receiptPayment) : null}
      />
    </div>
  );
}
