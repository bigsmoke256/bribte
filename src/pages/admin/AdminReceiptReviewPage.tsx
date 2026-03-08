import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AnimatedCard, SectionHeader, EmptyState } from "@/components/dashboard/DashboardParts";
import { FileText, CheckCircle, XCircle, Eye, AlertTriangle, RefreshCw, Search, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface ReceiptRow {
  id: string;
  student_id: string;
  course_id: string | null;
  file_url: string;
  file_hash: string | null;
  status: string;
  uploaded_at: string;
  review_notes: string | null;
  student?: { registration_number: string | null; user_id: string; fee_balance: number };
  profile?: { full_name: string; email: string };
  course?: { course_name: string; course_code: string } | null;
  extraction?: {
    amount: number | null;
    transaction_id: string | null;
    payment_date: string | null;
    sender_name: string | null;
    payment_provider: string | null;
    confidence_score: number | null;
    raw_text: string | null;
  } | null;
}

export default function AdminReceiptReviewPage() {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("receipt_uploads")
      .select("*")
      .order("uploaded_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    // Enrich with student, profile, course, extraction
    const studentIds = [...new Set(data.map(r => r.student_id))];
    const courseIds = [...new Set(data.map(r => r.course_id).filter(Boolean))] as string[];
    const receiptIds = data.map(r => r.id);

    const [studentsRes, coursesRes, extractionsRes] = await Promise.all([
      supabase.from("students").select("id, registration_number, user_id, fee_balance").in("id", studentIds.length ? studentIds : ["_"]),
      courseIds.length ? supabase.from("courses").select("id, course_name, course_code").in("id", courseIds) : Promise.resolve({ data: [] }),
      supabase.from("receipt_extractions").select("*").in("receipt_id", receiptIds.length ? receiptIds : ["_"]),
    ]);

    const studentMap = new Map((studentsRes.data || []).map(s => [s.id, s]));
    const courseMap = new Map((coursesRes.data || []).map((c: any) => [c.id, c]));
    const extractionMap = new Map((extractionsRes.data || []).map((e: any) => [e.receipt_id, e]));

    const userIds = [...new Set((studentsRes.data || []).map(s => s.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds.length ? userIds : ["_"]);
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    const enriched: ReceiptRow[] = data.map(r => {
      const student = studentMap.get(r.student_id);
      return {
        ...r,
        student: student || undefined,
        profile: student ? profileMap.get(student.user_id) : undefined,
        course: r.course_id ? courseMap.get(r.course_id) : null,
        extraction: extractionMap.get(r.id) || null,
      };
    });

    setReceipts(enriched);
    setLoading(false);
  }, []);

  useEffect(() => { fetchReceipts(); }, [fetchReceipts]);

  const openDetail = (r: ReceiptRow) => {
    setSelectedReceipt(r);
    setAdminNotes(r.review_notes || "");
    setDetailOpen(true);
  };

  const approveReceipt = async (r: ReceiptRow) => {
    setProcessing(true);
    try {
      const ext = r.extraction;
      if (!ext?.amount || !r.student) throw new Error("Missing extraction data or student");

      // Create payment
      const { error: payErr } = await supabase.from("payments").insert({
        student_id: r.student_id,
        amount: ext.amount,
        payment_status: "approved",
        receipt_url: r.file_url,
        approved_by: user?.id,
        notes: `Admin approved. Tx: ${ext.transaction_id || "N/A"}. Provider: ${ext.payment_provider || "N/A"}`,
      });
      if (payErr) throw payErr;

      // Track transaction
      if (ext.transaction_id) {
        try {
          await supabase.from("payment_transactions").insert({
            student_id: r.student_id,
            course_id: r.course_id,
            transaction_id: ext.transaction_id,
            amount: ext.amount,
            receipt_id: r.id,
          });
        } catch { /* ignore duplicate */ }
      }

      // Recalculate
      await supabase.rpc("recalculate_fee_balance", { p_student_id: r.student_id });

      // Update receipt
      await supabase.from("receipt_uploads").update({
        status: "verified",
        reviewed_by: user?.id,
        review_notes: adminNotes || "Approved by admin",
      }).eq("id", r.id);

      toast.success("Receipt approved and payment applied");
      setDetailOpen(false);
      fetchReceipts();
    } catch (e: any) {
      toast.error(e.message || "Failed to approve");
    } finally {
      setProcessing(false);
    }
  };

  const rejectReceipt = async (r: ReceiptRow) => {
    setProcessing(true);
    try {
      await supabase.from("receipt_uploads").update({
        status: "rejected",
        reviewed_by: user?.id,
        review_notes: adminNotes || "Rejected by admin",
      }).eq("id", r.id);
      toast.success("Receipt rejected");
      setDetailOpen(false);
      fetchReceipts();
    } catch (e: any) {
      toast.error(e.message || "Failed to reject");
    } finally {
      setProcessing(false);
    }
  };

  const filteredReceipts = receipts.filter(r => {
    if (tab !== "all" && r.status !== tab) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return r.profile?.full_name?.toLowerCase().includes(q) ||
      r.student?.registration_number?.toLowerCase().includes(q) ||
      r.extraction?.transaction_id?.toLowerCase().includes(q);
  });

  const statusBadge = (s: string) => {
    const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      processing: { variant: "secondary", label: "Processing" },
      verified: { variant: "default", label: "Verified" },
      rejected: { variant: "destructive", label: "Rejected" },
      review_required: { variant: "outline", label: "Needs Review" },
      pending: { variant: "secondary", label: "Pending" },
    };
    const cfg = map[s] || { variant: "secondary" as const, label: s };
    return <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge>;
  };

  const counts = {
    all: receipts.length,
    review_required: receipts.filter(r => r.status === "review_required").length,
    processing: receipts.filter(r => r.status === "processing").length,
    verified: receipts.filter(r => r.status === "verified").length,
    rejected: receipts.filter(r => r.status === "rejected").length,
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Receipt Review</h1>
          <p className="text-sm text-muted-foreground mt-1">OCR-processed receipt verification queue</p>
        </div>
        <Button variant="outline" className="rounded-xl" onClick={fetchReceipts}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Needs Review", value: counts.review_required, icon: AlertTriangle, color: "text-warning" },
          { label: "Processing", value: counts.processing, icon: RotateCcw, color: "text-muted-foreground" },
          { label: "Verified", value: counts.verified, icon: CheckCircle, color: "text-success" },
          { label: "Rejected", value: counts.rejected, icon: XCircle, color: "text-destructive" },
        ].map((s, i) => (
          <AnimatedCard key={s.label} delay={i * 0.05} className="p-4">
            <div className="flex items-center gap-3">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="font-display text-xl font-bold">{s.value}</p>
              </div>
            </div>
          </AnimatedCard>
        ))}
      </div>

      {/* Tabs + List */}
      <AnimatedCard delay={0.1}>
        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <TabsList className="rounded-xl">
              <TabsTrigger value="review_required" className="rounded-lg text-xs">Review ({counts.review_required})</TabsTrigger>
              <TabsTrigger value="processing" className="rounded-lg text-xs">Processing ({counts.processing})</TabsTrigger>
              <TabsTrigger value="verified" className="rounded-lg text-xs">Verified ({counts.verified})</TabsTrigger>
              <TabsTrigger value="rejected" className="rounded-lg text-xs">Rejected ({counts.rejected})</TabsTrigger>
              <TabsTrigger value="all" className="rounded-lg text-xs">All ({counts.all})</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-3 py-2 w-full sm:w-64 border border-transparent focus-within:border-primary/20">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                className="border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0" />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : filteredReceipts.length === 0 ? (
            <EmptyState icon={FileText} title="No receipts" description="No receipts match your filter." />
          ) : (
            <div className="space-y-2">
              {filteredReceipts.map((r, i) => (
                <motion.div key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer"
                  onClick={() => openDetail(r)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{r.profile?.full_name || "Unknown Student"}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.student?.registration_number || "—"} • {new Date(r.uploaded_at).toLocaleDateString("en-UG", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                      {r.extraction?.amount && (
                        <p className="text-xs font-mono font-semibold text-primary mt-0.5">UGX {Number(r.extraction.amount).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {r.extraction?.confidence_score != null && (
                      <div className="hidden sm:flex items-center gap-1.5">
                        <Progress value={(r.extraction.confidence_score) * 100} className="w-16 h-1.5" />
                        <span className="text-[10px] text-muted-foreground">{Math.round((r.extraction.confidence_score) * 100)}%</span>
                      </div>
                    )}
                    {statusBadge(r.status)}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Tabs>
      </AnimatedCard>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receipt Details</DialogTitle>
            <DialogDescription>Review OCR extraction and take action</DialogDescription>
          </DialogHeader>
          {selectedReceipt && (
            <div className="space-y-4">
              {/* Receipt Image */}
              <div className="rounded-xl border overflow-hidden bg-muted/30">
                {selectedReceipt.file_url.endsWith(".pdf") ? (
                  <iframe src={selectedReceipt.file_url} className="w-full h-64" />
                ) : (
                  <img src={selectedReceipt.file_url} alt="Receipt" className="w-full max-h-64 object-contain" />
                )}
              </div>

              {/* Student Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Student</Label>
                  <p className="text-sm font-semibold">{selectedReceipt.profile?.full_name || "Unknown"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Reg. Number</Label>
                  <p className="text-sm">{selectedReceipt.student?.registration_number || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Course</Label>
                  <p className="text-sm">{selectedReceipt.course ? `${selectedReceipt.course.course_code} - ${selectedReceipt.course.course_name}` : "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="mt-0.5">{statusBadge(selectedReceipt.status)}</div>
                </div>
              </div>

              {/* Extracted Data */}
              {selectedReceipt.extraction && (
                <div className="rounded-xl border p-4 space-y-3">
                  <h4 className="font-display font-semibold text-sm flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" /> OCR Extracted Data
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground">Amount</Label>
                      <p className="font-mono font-semibold">
                        {selectedReceipt.extraction.amount ? `UGX ${Number(selectedReceipt.extraction.amount).toLocaleString()}` : "—"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Transaction ID</Label>
                      <p className="font-mono">{selectedReceipt.extraction.transaction_id || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Payment Date</Label>
                      <p>{selectedReceipt.extraction.payment_date || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Sender</Label>
                      <p>{selectedReceipt.extraction.sender_name || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Provider</Label>
                      <p>{selectedReceipt.extraction.payment_provider || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Confidence</Label>
                      <div className="flex items-center gap-2">
                        <Progress value={(selectedReceipt.extraction.confidence_score || 0) * 100} className="w-20 h-2" />
                        <span className="text-xs font-semibold">{Math.round((selectedReceipt.extraction.confidence_score || 0) * 100)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Review Notes */}
              {selectedReceipt.review_notes && (
                <div className="rounded-xl border border-warning/30 bg-warning/5 p-3">
                  <p className="text-xs font-semibold text-warning mb-1">System Notes</p>
                  <p className="text-sm text-muted-foreground">{selectedReceipt.review_notes}</p>
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <Label>Admin Notes</Label>
                <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this receipt..." className="mt-1" />
              </div>

              {/* Actions */}
              {(selectedReceipt.status === "review_required" || selectedReceipt.status === "processing") && (
                <DialogFooter className="gap-2">
                  <Button variant="destructive" onClick={() => rejectReceipt(selectedReceipt)} disabled={processing}>
                    <XCircle className="w-4 h-4 mr-2" /> Reject
                  </Button>
                  <Button onClick={() => approveReceipt(selectedReceipt)} disabled={processing || !selectedReceipt.extraction?.amount}>
                    <CheckCircle className="w-4 h-4 mr-2" /> Approve & Apply Payment
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
