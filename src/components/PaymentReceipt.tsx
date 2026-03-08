import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Printer } from "lucide-react";
import crestImg from "@/assets/bribte-crest.png";

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

// Convert crest to base64 for print/download
function imgToBase64(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

const RECEIPT_STYLES = (balanceColor: string) => `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif; padding: 32px; color: #1a1a2e; background: #fff; }
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

  .receipt-outer { max-width: 640px; margin: 0 auto; }
  .receipt-border { border: 3px solid #1e3a6e; border-radius: 16px; overflow: hidden; }

  /* Top gold accent bar */
  .gold-bar { height: 6px; background: linear-gradient(90deg, #d4a017, #f5c542, #d4a017); }

  .receipt-body { padding: 32px 36px 28px; }

  /* Header */
  .header { display: flex; align-items: center; gap: 20px; margin-bottom: 8px; }
  .crest { width: 80px; height: 80px; object-fit: contain; }
  .header-text { flex: 1; }
  .header-text h1 { font-size: 20px; font-weight: 800; color: #1e3a6e; text-transform: uppercase; letter-spacing: 1.5px; line-height: 1.2; }
  .header-text .motto { font-size: 10px; color: #d4a017; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-top: 2px; }
  .header-text .address { font-size: 10px; color: #666; margin-top: 4px; line-height: 1.4; }

  /* Blue title banner */
  .title-banner { background: linear-gradient(135deg, #1e3a6e, #2b5ba8); color: #fff; text-align: center; padding: 10px 16px; border-radius: 8px; margin: 20px 0 16px; }
  .title-banner h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; }
  .title-banner .receipt-no { font-size: 11px; opacity: 0.85; margin-top: 2px; font-weight: 500; }

  /* Dividers */
  .divider { border: none; border-top: 1px solid #e2e8f0; margin: 14px 0; }
  .divider-gold { border: none; border-top: 2px solid #f5c542; margin: 16px 0; }

  /* Info rows */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
  .info-item { }
  .info-item .label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #8896a6; font-weight: 600; }
  .info-item .value { font-size: 13px; font-weight: 600; color: #1a1a2e; margin-top: 1px; }

  /* Amount highlight */
  .amount-section { background: linear-gradient(135deg, #f0f7ff, #e8f4f8); border: 1px solid #c5d9f0; border-radius: 10px; padding: 16px 20px; margin: 16px 0; display: flex; justify-content: space-between; align-items: center; }
  .amount-section .label { font-size: 13px; font-weight: 600; color: #1e3a6e; }
  .amount-section .amount { font-size: 22px; font-weight: 800; color: #1e3a6e; }

  /* Summary table */
  .summary-table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  .summary-table td { padding: 7px 0; font-size: 12px; }
  .summary-table td:first-child { color: #666; }
  .summary-table td:last-child { text-align: right; font-weight: 600; color: #1a1a2e; }
  .summary-table .total-row td { border-top: 2px solid #1e3a6e; padding-top: 10px; font-size: 13px; font-weight: 700; }
  .summary-table .total-row td:last-child { color: ${balanceColor}; }

  /* Stamp */
  .stamp-area { text-align: center; margin: 20px 0 12px; }
  .stamp { display: inline-flex; align-items: center; gap: 8px; padding: 8px 24px; border: 2px solid #1e3a6e; border-radius: 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #1e3a6e; }
  .stamp.verified { border-color: #16a34a; color: #16a34a; }
  .stamp.pending { border-color: #d97706; color: #d97706; }

  /* Footer */
  .footer { text-align: center; margin-top: 20px; padding-top: 12px; border-top: 1px solid #e2e8f0; }
  .footer p { font-size: 9px; color: #999; line-height: 1.6; }
  .footer .watermark { font-size: 8px; color: #ccc; margin-top: 8px; letter-spacing: 1px; text-transform: uppercase; }

  /* Bottom gold bar */
  .gold-bar-bottom { height: 4px; background: linear-gradient(90deg, #d4a017, #f5c542, #d4a017); }

  @media print { body { padding: 16px; } }
`;

function ReceiptContent({ data, crestSrc }: { data: ReceiptData; crestSrc: string }) {
  const isVerified = data.paymentStatus === "approved";
  return (
    <div className="receipt-outer">
      <div className="receipt-border">
        <div className="gold-bar" />
        <div className="receipt-body">
          {/* Header with crest */}
          <div className="header">
            <img src={crestSrc} alt="BRIBTE Crest" className="crest" />
            <div className="header-text">
              <h1>Buganda Royal Institute<br />of Business & Technical Education</h1>
              <div className="motto">Education Is The Best Investment</div>
              <div className="address">P.O. Box 7166, Kampala, Uganda • Tel: 0701689440 • bribtemengo@yahoo.com</div>
            </div>
          </div>

          {/* Title banner */}
          <div className="title-banner">
            <h2>Official Payment Receipt</h2>
            <div className="receipt-no">{data.receiptNumber}</div>
          </div>

          {/* Receipt & Date info */}
          <div className="info-grid">
            <div className="info-item">
              <div className="label">Date of Payment</div>
              <div className="value">{new Date(data.paymentDate).toLocaleDateString("en-UG", { year: "numeric", month: "long", day: "numeric" })}</div>
            </div>
            <div className="info-item">
              <div className="label">Study Mode</div>
              <div className="value">{data.studyMode}</div>
            </div>
          </div>

          <hr className="divider" />

          {/* Student info */}
          <div className="info-grid">
            <div className="info-item">
              <div className="label">Student Name</div>
              <div className="value">{data.studentName}</div>
            </div>
            <div className="info-item">
              <div className="label">Registration Number</div>
              <div className="value">{data.registrationNumber || "N/A"}</div>
            </div>
            <div className="info-item">
              <div className="label">Course</div>
              <div className="value">{data.courseName}</div>
            </div>
            <div className="info-item">
              <div className="label">Course Code</div>
              <div className="value">{data.courseCode}</div>
            </div>
          </div>

          <hr className="divider-gold" />

          {/* Amount paid highlight */}
          <div className="amount-section">
            <div className="label">Amount Paid</div>
            <div className="amount">UGX {data.paymentAmount.toLocaleString()}</div>
          </div>

          {/* Financial summary */}
          <table className="summary-table">
            <tbody>
              <tr>
                <td>Total Fees</td>
                <td>UGX {data.tuition.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Total Paid to Date</td>
                <td style={{ color: "#16a34a" }}>UGX {data.totalPaid.toLocaleString()}</td>
              </tr>
              <tr className="total-row">
                <td>Outstanding Balance</td>
                <td>UGX {data.balance.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          {/* Verification stamp */}
          <div className="stamp-area">
            <div className={`stamp ${isVerified ? "verified" : "pending"}`}>
              {isVerified ? "✓ Payment Verified" : "⏳ Pending Verification"}
            </div>
          </div>

          {/* Footer */}
          <div className="footer">
            <p>This is a system-generated receipt from Buganda Royal Institute of Business & Technical Education.</p>
            <p>For enquiries, please contact the Finance Office.</p>
            <p style={{ marginTop: 4 }}>Generated: {new Date().toLocaleDateString("en-UG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
            <div className="watermark">BRIBTE • Official Document</div>
          </div>
        </div>
        <div className="gold-bar-bottom" />
      </div>
    </div>
  );
}

export function PaymentReceipt({ open, onOpenChange, data }: PaymentReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!data) return null;

  const balanceColor = data.balance > 0 ? "#dc2626" : "#16a34a";

  const getFullHtml = async () => {
    const base64Crest = await imgToBase64(crestImg);
    const content = receiptRef.current;
    if (!content) return "";
    // Replace the crest src with base64 for standalone HTML
    const htmlContent = content.innerHTML.replace(
      /src="[^"]*bribte-crest[^"]*"/,
      `src="${base64Crest}"`
    );
    return `<html><head><title>Receipt - ${data.receiptNumber}</title><style>${RECEIPT_STYLES(balanceColor)}</style></head><body>${htmlContent}</body></html>`;
  };

  const handlePrint = async () => {
    const html = await getFullHtml();
    if (!html) return;
    const printWindow = window.open("", "_blank", "width=800,height=700");
    if (!printWindow) return;
    printWindow.document.write(html.replace("</body>", '<script>window.onload = function() { window.print(); }</script></body>'));
    printWindow.document.close();
  };

  const handleDownload = async () => {
    const html = await getFullHtml();
    if (!html) return;
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-4">
        <DialogHeader>
          <DialogTitle className="font-display">Payment Receipt</DialogTitle>
        </DialogHeader>

        <div ref={receiptRef}>
          <style>{RECEIPT_STYLES(balanceColor)}</style>
          <ReceiptContent data={data} crestSrc={crestImg} />
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
