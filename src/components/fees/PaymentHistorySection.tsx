import { AnimatedCard, SectionHeader, EmptyState } from "@/components/dashboard/DashboardParts";
import { CreditCard, CheckCircle, Clock, XCircle, FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface Props {
  payments: any[];
  onViewReceipt: (payment: any) => void;
}

export function PaymentHistorySection({ payments, onViewReceipt }: Props) {
  return (
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
              <div className="flex items-center gap-2">
                {p.payment_status === "approved" && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 rounded-lg text-xs" onClick={() => onViewReceipt(p)}>
                    <FileDown className="w-3 h-3 mr-1" /> Receipt
                  </Button>
                )}
                {p.receipt_url && <a href={p.receipt_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">View Upload</a>}
                <Badge variant={p.payment_status === "approved" ? "default" : p.payment_status === "pending" ? "secondary" : "destructive"} className="text-[10px] h-5">
                  {p.payment_status}
                </Badge>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </AnimatedCard>
  );
}
