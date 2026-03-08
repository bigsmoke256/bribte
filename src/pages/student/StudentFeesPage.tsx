import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useMemo } from "react";
import { AnimatedCard, SectionHeader, EmptyState } from "@/components/dashboard/DashboardParts";
import { CreditCard, Upload, CheckCircle, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function StudentFeesPage() {
  const { user } = useAuth();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [feeBalance, setFeeBalance] = useState(0);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadAmount, setUploadAmount] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => { if (user) loadData(); }, [user]);

  async function loadData() {
    const { data: student } = await supabase.from("students").select("id, fee_balance").eq("user_id", user!.id).maybeSingle();
    if (!student) { setLoading(false); return; }
    setStudentId(student.id);
    setFeeBalance(student.fee_balance);

    const { data } = await supabase.from("payments").select("*").eq("student_id", student.id).order("payment_date", { ascending: false });
    setPayments(data || []);
    setLoading(false);
  }

  const stats = useMemo(() => {
    const approved = payments.filter(p => p.payment_status === "approved");
    const totalPaid = approved.reduce((s, p) => s + Number(p.amount), 0);
    const total = totalPaid + feeBalance;
    return { totalPaid, total, percentage: total > 0 ? (totalPaid / total) * 100 : 0 };
  }, [payments, feeBalance]);

  async function handleUpload() {
    if (!studentId || !uploadFile || !uploadAmount) return;
    setUploading(true);
    try {
      const ext = uploadFile.name.split(".").pop();
      const path = `${studentId}/${Date.now()}.${ext}`;
      const { error: ue } = await supabase.storage.from("receipts").upload(path, uploadFile);
      if (ue) throw ue;
      const { data: u } = supabase.storage.from("receipts").getPublicUrl(path);
      const { error: ie } = await supabase.from("payments").insert({
        student_id: studentId, amount: parseFloat(uploadAmount), receipt_url: u.publicUrl, payment_status: "pending",
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
          <p className="text-sm text-muted-foreground mt-1">Track your tuition payments</p>
        </div>
        <Button onClick={() => setUploadOpen(true)}><Upload className="w-4 h-4 mr-2" /> Upload Receipt</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AnimatedCard delay={0}>
          <p className="text-xs text-muted-foreground mb-1">Total Fees</p>
          <p className="font-display text-2xl font-bold">UGX {stats.total.toLocaleString()}</p>
          <Progress value={stats.percentage} className="h-2 mt-3" />
          <p className="text-xs text-muted-foreground mt-1">{stats.percentage.toFixed(0)}% paid</p>
        </AnimatedCard>
        <AnimatedCard delay={0.05}>
          <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
          <p className="font-display text-2xl font-bold text-success">UGX {stats.totalPaid.toLocaleString()}</p>
        </AnimatedCard>
        <AnimatedCard delay={0.1}>
          <p className="text-xs text-muted-foreground mb-1">Outstanding Balance</p>
          <p className="font-display text-2xl font-bold text-destructive">UGX {feeBalance.toLocaleString()}</p>
        </AnimatedCard>
      </div>

      {/* Payment history */}
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
