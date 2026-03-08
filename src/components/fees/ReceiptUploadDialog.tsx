import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, CheckCircle, AlertTriangle, XCircle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  courseId: string | null;
  onComplete: () => void;
}

type ProcessingStatus = "idle" | "uploading" | "processing" | "verified" | "review_required" | "rejected" | "error";

interface RejectionInfo {
  title: string;
  reasons: string[];
  adminNotified: boolean;
}

export function ReceiptUploadDialog({ open, onOpenChange, studentId, courseId, onComplete }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [rejectionInfo, setRejectionInfo] = useState<RejectionInfo | null>(null);

  const reset = () => {
    setFile(null);
    setStatus("idle");
    setStatusMessage("");
    setRejectionInfo(null);
  };

  const handleClose = (val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  };

  const hashFile = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus("uploading");
    setStatusMessage("Uploading receipt...");

    try {
      const fileHash = await hashFile(file);
      const ext = file.name.split(".").pop();
      const path = `${studentId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("receipts").upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);

      const { data: receipt, error: insertErr } = await supabase.from("receipt_uploads").insert({
        student_id: studentId,
        course_id: courseId,
        file_url: urlData.publicUrl,
        file_hash: fileHash,
        status: "processing",
      }).select("id").single();
      if (insertErr) throw insertErr;

      setStatus("processing");
      setStatusMessage("Analyzing receipt with AI...");

      const { data: result, error: fnErr } = await supabase.functions.invoke("process-receipt", {
        body: { receipt_id: receipt.id },
      });

      if (fnErr) {
        // Function failed - check if receipt was still updated in DB
        const { data: updatedReceipt } = await supabase
          .from("receipt_uploads")
          .select("status, review_notes")
          .eq("id", receipt.id)
          .single();
        
        if (updatedReceipt?.status === "rejected") {
          setStatus("rejected");
          setRejectionInfo({
            title: "Receipt Rejected",
            reasons: [updatedReceipt.review_notes || "Receipt did not pass verification."],
            adminNotified: true,
          });
          toast.error("Receipt rejected");
          onComplete();
          return;
        }
        throw new Error("Processing failed. Please try again.");
      }

      if (result.status === "verified") {
        setStatus("verified");
        const balanceMsg = result.new_balance != null
          ? result.new_balance < 0
            ? ` You now have a credit of UGX ${Math.abs(result.new_balance).toLocaleString()}.`
            : result.new_balance === 0
              ? " Your fees are now fully paid!"
              : ` Remaining balance: UGX ${Number(result.new_balance).toLocaleString()}.`
          : "";
        setStatusMessage(`Payment of UGX ${Number(result.extracted?.amount || 0).toLocaleString()} verified and applied automatically!${balanceMsg}`);
        toast.success("Payment verified and balance updated!");
      } else if (result.status === "review_required") {
        setStatus("review_required");
        const reviewReasons: Record<string, string> = {
          low_confidence: "The receipt image quality is too low to verify automatically.",
          unknown_provider: "The payment provider on the receipt is not recognized.",
          name_partial_match: "The student name on the receipt partially matches your records.",
          course_mismatch: "The course on the receipt doesn't match your enrollment.",
          amount_suspicious: "The payment amount requires manual verification.",
          extraction_failed: "The system couldn't read the receipt content.",
          no_amount: "Could not extract a payment amount from the receipt.",
        };
        const detail = reviewReasons[result.reason] || "";
        setStatusMessage(`Your receipt has been sent to administration for manual review. ${detail} You'll be notified once processed.`);
        toast.info("Receipt submitted for admin review");
      } else if (result.status === "rejected") {
        setStatus("rejected");

        // Build rejection reasons list
        const reasons: string[] = [];
        
        const reasonTitles: Record<string, string> = {
          duplicate_file: "Duplicate Receipt",
          duplicate_transaction: "Duplicate Transaction",
          missing_fields: "Incomplete Receipt",
          name_mismatch: "Student Name Mismatch",
          fake_receipt: "Not a Genuine Receipt",
          wrong_institution: "Wrong Institution",
        };

        const reasonDescriptions: Record<string, string> = {
          duplicate_file: "This exact receipt file has already been uploaded previously.",
          duplicate_transaction: "This transaction code has already been processed in the system.",
          missing_fields: "The receipt is missing required information needed for verification.",
          name_mismatch: "The student name on the receipt does not match your registered name.",
          fake_receipt: "The system determined this is not a genuine SchoolPay receipt.",
          wrong_institution: "The institution on the receipt does not match Buganda Royal Institute / BRIBTE.",
        };

        // Add the main reason
        reasons.push(reasonDescriptions[result.reason] || "Receipt did not pass verification checks.");

        // Add specific indicators for fake receipts
        if (result.indicators?.length) {
          result.indicators.forEach((ind: string) => reasons.push(ind));
        }

        // Add missing fields
        if (result.missing?.length) {
          reasons.push(`Missing fields: ${result.missing.join(", ")}`);
        }

        // Add backend details if different from what we already have
        if (result.details && !reasons.some(r => r.includes(result.details.substring(0, 30)))) {
          // Extract specific notes from details
          const detailNotes = result.details.replace(/^Receipt rejected:\s*/i, "");
          if (detailNotes && detailNotes.length > 10) {
            reasons.push(detailNotes);
          }
        }

        setRejectionInfo({
          title: reasonTitles[result.reason] || "Receipt Rejected",
          reasons,
          adminNotified: true,
        });
        toast.error("Receipt rejected");
      }

      onComplete();
    } catch (e: any) {
      setStatus("error");
      setStatusMessage(e.message || "Upload failed. Please try again.");
      toast.error("Upload failed");
    }
  };

  const statusIcon = {
    idle: null,
    uploading: <Loader2 className="w-8 h-8 text-primary animate-spin" />,
    processing: <Loader2 className="w-8 h-8 text-primary animate-spin" />,
    verified: <CheckCircle className="w-8 h-8 text-success" />,
    review_required: <AlertTriangle className="w-8 h-8 text-warning" />,
    rejected: <ShieldAlert className="w-10 h-10 text-destructive" />,
    error: <XCircle className="w-8 h-8 text-destructive" />,
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Payment Receipt</DialogTitle>
          <DialogDescription>
            Upload your payment receipt and it will be automatically verified and applied.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {status === "idle" ? (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-4 py-2">
              <div>
                <Label>Receipt File (JPG, PNG, or PDF)</Label>
                <Input type="file" accept="image/jpeg,image/png,image/jpg,application/pdf"
                  onChange={e => setFile(e.target.files?.[0] || null)} className="mt-1" />
              </div>
              <p className="text-xs text-muted-foreground">
                The system will automatically extract the payment amount, transaction ID, and other details from your receipt.
              </p>
            </motion.div>
          ) : status === "rejected" && rejectionInfo ? (
            <motion.div key="rejected" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="py-4 space-y-4">
              {/* Header */}
              <div className="flex flex-col items-center text-center">
                {statusIcon.rejected}
                <p className="font-display font-bold text-base mt-3 text-destructive">
                  {rejectionInfo.title}
                </p>
              </div>

              {/* Reasons List */}
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-2.5">
                <p className="text-xs font-semibold text-destructive uppercase tracking-wide">Reasons for rejection:</p>
                <ul className="space-y-2">
                  {rejectionInfo.reasons.map((reason, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <XCircle className="w-3.5 h-3.5 text-destructive mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-foreground leading-snug">{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Admin Notification Badge */}
              {rejectionInfo.adminNotified && (
                <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Administrators have been automatically notified about this rejection.
                  </p>
                </div>
              )}

              {/* Guidance */}
              <p className="text-xs text-muted-foreground text-center">
                Please upload a valid, original SchoolPay receipt to proceed with your payment.
              </p>
            </motion.div>
          ) : (
            <motion.div key="status" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center py-8 text-center">
              {statusIcon[status]}
              <p className="font-display font-semibold text-sm mt-4">
                {status === "uploading" ? "Uploading..." :
                 status === "processing" ? "Processing Receipt..." :
                 status === "verified" ? "Payment Verified!" :
                 status === "review_required" ? "Under Review" :
                 "Error"}
              </p>
              <p className="text-xs text-muted-foreground mt-2 max-w-[280px] whitespace-pre-line">{statusMessage}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter>
          {status === "idle" ? (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
              <Button onClick={handleUpload} disabled={!file}>
                <Upload className="w-4 h-4 mr-2" /> Upload & Verify
              </Button>
            </>
          ) : (status === "verified" || status === "review_required" || status === "rejected" || status === "error") ? (
            <Button onClick={() => handleClose(false)}>Close</Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
