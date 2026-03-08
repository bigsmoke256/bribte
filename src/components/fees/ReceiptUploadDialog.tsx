import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
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

export function ReceiptUploadDialog({ open, onOpenChange, studentId, courseId, onComplete }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");

  const reset = () => {
    setFile(null);
    setStatus("idle");
    setStatusMessage("");
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
      // 1. Compute file hash
      const fileHash = await hashFile(file);

      // 2. Upload to storage
      const ext = file.name.split(".").pop();
      const path = `${studentId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("receipts").upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);

      // 3. Create receipt_uploads record
      const { data: receipt, error: insertErr } = await supabase.from("receipt_uploads").insert({
        student_id: studentId,
        course_id: courseId,
        file_url: urlData.publicUrl,
        file_hash: fileHash,
        status: "processing",
      }).select("id").single();
      if (insertErr) throw insertErr;

      // 4. Trigger OCR processing
      setStatus("processing");
      setStatusMessage("Analyzing receipt with AI...");

      const { data: result, error: fnErr } = await supabase.functions.invoke("process-receipt", {
        body: { receipt_id: receipt.id },
      });

      if (fnErr) throw fnErr;

      // 5. Show result
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
        setStatusMessage("The system couldn't fully read your receipt. It has been sent to administration for manual review. You'll be notified once processed.");
        toast.info("Receipt submitted for admin review");
      } else if (result.status === "rejected") {
        setStatus("rejected");
        const reasonMap: Record<string, string> = {
          duplicate_file: "This exact receipt file has already been uploaded.",
          duplicate_transaction: "This transaction code has already been processed.",
          missing_fields: `Receipt is missing required fields${result.missing ? ": " + result.missing.join(", ") : ""}. Please upload a valid SchoolPay receipt.`,
          name_mismatch: "The student name on the receipt does not match your records.",
        };
        setStatusMessage(reasonMap[result.reason] || "Receipt was rejected. Please upload a valid SchoolPay payment receipt.");
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
    rejected: <XCircle className="w-8 h-8 text-destructive" />,
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
          ) : (
            <motion.div key="status" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center py-8 text-center">
              {statusIcon[status]}
              <p className="font-display font-semibold text-sm mt-4">
                {status === "uploading" ? "Uploading..." :
                 status === "processing" ? "Processing Receipt..." :
                 status === "verified" ? "Payment Verified!" :
                 status === "review_required" ? "Under Review" :
                 status === "rejected" ? "Receipt Rejected" :
                 "Error"}
              </p>
              <p className="text-xs text-muted-foreground mt-2 max-w-[280px]">{statusMessage}</p>
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
