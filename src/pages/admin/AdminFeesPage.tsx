import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AnimatedCard, EmptyState } from "@/components/dashboard/DashboardParts";
import { CreditCard, Search, CheckCircle, XCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface PaymentRow {
  id: string;
  amount: number;
  payment_date: string;
  payment_status: string;
  semester: string | null;
  academic_year: string | null;
  notes: string | null;
  receipt_url: string | null;
  student_id: string;
  student?: { registration_number: string | null; profile?: { full_name: string; email: string } };
}

export default function AdminFeesPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const fetchPayments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("payments")
      .select("*, student:students!payments_student_id_fkey(registration_number, profile:profiles!students_user_id_fkey(full_name, email))")
      .order("created_at", { ascending: false });
    if (data) {
      setPayments(data.map((p: any) => {
        const student = Array.isArray(p.student) ? p.student[0] : p.student;
        if (student) {
          student.profile = Array.isArray(student.profile) ? student.profile[0] : student.profile;
        }
        return { ...p, student };
      }));
    }
    setLoading(false);
  };

  useEffect(() => { fetchPayments(); }, []);

  const updateStatus = async (p: PaymentRow, status: string) => {
    const { error } = await supabase.from("payments").update({ payment_status: status, approved_by: user?.id || null }).eq("id", p.id);
    if (!error) { toast.success(`Payment ${status}`); fetchPayments(); }
    else toast.error(error.message);
  };

  const filtered = payments.filter(p => {
    if (filter !== "all" && p.payment_status !== filter) return false;
    const q = search.toLowerCase();
    return !q || p.student?.profile?.full_name?.toLowerCase().includes(q) || p.student?.registration_number?.toLowerCase().includes(q);
  });

  const statusColor = (s: string) =>
    s === "approved" ? "bg-success/10 text-success" : s === "pending" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive";

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">Fee Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Review and approve student payments</p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "All", value: "all", count: payments.length },
            { label: "Pending", value: "pending", count: payments.filter(p => p.payment_status === "pending").length },
            { label: "Approved", value: "approved", count: payments.filter(p => p.payment_status === "approved").length },
            { label: "Rejected", value: "rejected", count: payments.filter(p => p.payment_status === "rejected").length },
          ].map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={`p-3 rounded-xl border text-center transition-all ${filter === f.value ? "bg-primary/10 border-primary/30" : "bg-card hover:bg-muted/50"}`}>
              <p className="font-display text-xl font-bold">{f.count}</p>
              <p className="text-xs text-muted-foreground">{f.label}</p>
            </button>
          ))}
        </div>

        <AnimatedCard>
          <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-3.5 py-2 w-full sm:w-72 border border-transparent focus-within:border-primary/20 mb-4">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search payments..." value={search} onChange={e => setSearch(e.target.value)}
              className="border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0" />
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={CreditCard} title="No payments found" description="No payments match your criteria." />
          ) : (
            <div className="overflow-x-auto -mx-5">
              <table className="data-table">
                <thead><tr><th className="pl-5">Student</th><th>Amount</th><th>Date</th><th>Semester</th><th className="text-center">Status</th><th className="text-center pr-5">Actions</th></tr></thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                      <td className="pl-5">
                        <p className="font-semibold text-sm">{p.student?.profile?.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{p.student?.registration_number || "—"}</p>
                      </td>
                      <td className="font-mono text-sm font-semibold">UGX {p.amount.toLocaleString()}</td>
                      <td className="text-sm text-muted-foreground">{new Date(p.payment_date).toLocaleDateString("en-UG", { year: "numeric", month: "short", day: "numeric" })}</td>
                      <td className="text-sm">{p.semester || "—"}</td>
                      <td className="text-center"><span className={`metric-badge text-[10px] font-semibold ${statusColor(p.payment_status)}`}>{p.payment_status}</span></td>
                      <td className="text-center pr-5">
                        <div className="flex items-center justify-center gap-1">
                          {p.payment_status === "pending" && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg text-success hover:bg-success/10" onClick={() => updateStatus(p, "approved")}><CheckCircle className="w-3.5 h-3.5" /></Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg text-destructive hover:bg-destructive/10" onClick={() => updateStatus(p, "rejected")}><XCircle className="w-3.5 h-3.5" /></Button>
                            </>
                          )}
                          {p.receipt_url && <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => window.open(p.receipt_url!, "_blank")}><Eye className="w-3.5 h-3.5" /></Button>}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AnimatedCard>
      </div>
    </DashboardLayout>
  );
}
