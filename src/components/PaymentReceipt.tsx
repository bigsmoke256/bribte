import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Download, Printer } from "lucide-react";

interface ReceiptData {
  studentName: string;
  registrationNumber: string;
  courseName: string;
  courseCode: string;
  studyMode: string;
  paymentAmount: number;
  paymentDate: string;
  paymentStatus: string;
  receiptNumber: string;
  tuition: number;
  totalPaid: number;
  balance: number;
}

interface PaymentReceiptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ReceiptData | null;
  institutionName?: string;
}

export function PaymentReceipt({ open, onOpenChange, data, institutionName = "Bribte Institute of Technology" }: PaymentReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!data) return null;

  const handlePrint = () => {
    const content = receiptRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Receipt - ${data.receiptNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; color: #1a1a1a; }
        .receipt { max-width: 600px; margin: 0 auto; border: 2px solid #e5e5e5; border-radius: 12px; padding: 32px; }
        .header { text-align: center; margin-bottom: 24px; }
        .header h1 { font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
        .header p { font-size: 11px; color: #666; margin-top: 4px; }
        .receipt-title { text-align: center; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #16a34a; margin: 16px 0; padding: 8px; background: #f0fdf4; border-radius: 6px; }
        .divider { border: none; border-top: 1px dashed #d4d4d4; margin: 16px 0; }
        .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
        .row .label { color: #666; }
        .row .value { font-weight: 600; }
        .amount-row { font-size: 15px; padding: 10px 0; }
        .amount-row .value { color: #16a34a; font-size: 18px; }
        .summary { background: #fafafa; border-radius: 8px; padding: 16px; margin-top: 16px; }
        .summary .row { font-size: 12px; }
        .balance-row .value { color: ${data.balance > 0 ? '#dc2626' : '#16a34a'}; font-weight: 700; }
        .footer { text-align: center; margin-top: 24px; font-size: 10px; color: #999; }
        .stamp { text-align: center; margin-top: 16px; padding: 8px; border: 2px solid #16a34a; border-radius: 8px; color: #16a34a; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; display: inline-block; }
        .stamp-container { text-align: center; }
        @media print { body { padding: 20px; } .receipt { border: 1px solid #ccc; } }
      </style></head><body>
      ${content.innerHTML}
      <script>window.onload = function() { window.print(); }</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleDownload = () => {
    const content = receiptRef.current;
    if (!content) return;
    const html = `
      <html><head><title>Receipt - ${data.receiptNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; color: #1a1a1a; }
        .receipt { max-width: 600px; margin: 0 auto; border: 2px solid #e5e5e5; border-radius: 12px; padding: 32px; }
        .header { text-align: center; margin-bottom: 24px; }
        .header h1 { font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
        .header p { font-size: 11px; color: #666; margin-top: 4px; }
        .receipt-title { text-align: center; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #16a34a; margin: 16px 0; padding: 8px; background: #f0fdf4; border-radius: 6px; }
        .divider { border: none; border-top: 1px dashed #d4d4d4; margin: 16px 0; }
        .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
        .row .label { color: #666; }
        .row .value { font-weight: 600; }
        .amount-row { font-size: 15px; padding: 10px 0; }
        .amount-row .value { color: #16a34a; font-size: 18px; }
        .summary { background: #fafafa; border-radius: 8px; padding: 16px; margin-top: 16px; }
        .summary .row { font-size: 12px; }
        .balance-row .value { color: ${data.balance > 0 ? '#dc2626' : '#16a34a'}; font-weight: 700; }
        .footer { text-align: center; margin-top: 24px; font-size: 10px; color: #999; }
        .stamp-container { text-align: center; }
        .stamp { text-align: center; margin-top: 16px; padding: 8px; border: 2px solid #16a34a; border-radius: 8px; color: #16a34a; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; display: inline-block; }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Receipt-${data.receiptNumber}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Payment Receipt</DialogTitle>
        </DialogHeader>

        <div ref={receiptRef}>
          <div className="receipt">
            <div className="header">
              <h1>{institutionName}</h1>
              <p>P.O. Box 7166, Kampala, Uganda</p>
              <p>Tel: +256-XXX-XXXXXX | Email: info@bribte.ac.ug</p>
            </div>

            <div className="receipt-title">Official Payment Receipt</div>

            <hr className="divider" />

            <div className="row">
              <span className="label">Receipt No:</span>
              <span className="value">{data.receiptNumber}</span>
            </div>
            <div className="row">
              <span className="label">Date:</span>
              <span className="value">{new Date(data.paymentDate).toLocaleDateString("en-UG", { year: "numeric", month: "long", day: "numeric" })}</span>
            </div>

            <hr className="divider" />

            <div className="row">
              <span className="label">Student Name:</span>
              <span className="value">{data.studentName}</span>
            </div>
            <div className="row">
              <span className="label">Reg. Number:</span>
              <span className="value">{data.registrationNumber || "N/A"}</span>
            </div>
            <div className="row">
              <span className="label">Course:</span>
              <span className="value">{data.courseName} ({data.courseCode})</span>
            </div>
            <div className="row">
              <span className="label">Study Mode:</span>
              <span className="value">{data.studyMode}</span>
            </div>

            <hr className="divider" />

            <div className="row amount-row">
              <span className="label">Amount Paid:</span>
              <span className="value">UGX {data.paymentAmount.toLocaleString()}</span>
            </div>

            <div className="summary">
              <div className="row">
                <span className="label">Total Tuition:</span>
                <span className="value">UGX {data.tuition.toLocaleString()}</span>
              </div>
              <div className="row">
                <span className="label">Total Paid to Date:</span>
                <span className="value" style={{ color: "#16a34a" }}>UGX {data.totalPaid.toLocaleString()}</span>
              </div>
              <hr className="divider" />
              <div className="row balance-row">
                <span className="label">Outstanding Balance:</span>
                <span className="value">UGX {data.balance.toLocaleString()}</span>
              </div>
            </div>

            <div className="stamp-container">
              <div className="stamp">
                {data.paymentStatus === "approved" ? "✓ Payment Verified" : "⏳ Pending Verification"}
              </div>
            </div>

            <div className="footer">
              <p>This is a system-generated receipt. For queries, contact the Finance Office.</p>
              <p style={{ marginTop: "4px" }}>Generated on {new Date().toLocaleDateString("en-UG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          <Button onClick={handlePrint} className="flex-1 rounded-xl">
            <Printer className="w-4 h-4 mr-2" /> Print Receipt
          </Button>
          <Button onClick={handleDownload} variant="outline" className="flex-1 rounded-xl">
            <Download className="w-4 h-4 mr-2" /> Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
