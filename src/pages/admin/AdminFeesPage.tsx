import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AnimatedCard, EmptyState } from "@/components/dashboard/DashboardParts";
import {
  CreditCard, Search, CheckCircle, XCircle, Eye, DollarSign,
  TrendingUp, AlertTriangle, Users, Receipt, ArrowUpRight,
  ArrowDownRight, Calendar, Download, RefreshCw, UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

/* ─── Types ─── */
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
  approved_by: string | null;
  created_at: string;
  student?: { registration_number: string | null; user_id: string; fee_balance: number; course_id: string | null; profile?: { full_name: string; email: string } };
}

interface StudentBalance {
  id: string;
  registration_number: string | null;
  fee_balance: number;
  user_id: string;
  course_id: string | null;
  study_mode: string;
  profile?: { full_name: string; email: string };
  course?: { course_name: string; course_code: string; tuition_day: number | null; tuition_evening: number | null; tuition_weekend: number | null } | null;
  totalPaid?: number;
  tuition?: number;
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
];

export default function AdminFeesPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [balances, setBalances] = useState<StudentBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mainTab, setMainTab] = useState("payments");

  // Student history dialog
  const [historyStudent, setHistoryStudent] = useState<StudentBalance | null>(null);
  const [studentPayments, setStudentPayments] = useState<PaymentRow[]>([]);

  // Refund dialog
  const [refundDialog, setRefundDialog] = useState(false);
  const [refundPayment, setRefundPayment] = useState<PaymentRow | null>(null);
  const [refundNotes, setRefundNotes] = useState("");

  // Balance search
  const [balanceSearch, setBalanceSearch] = useState("");
  const [balanceFilter, setBalanceFilter] = useState("all"); // all | owing | clear

  /* ─── Fetch ─── */
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("payments")
      .select("*, student:students(registration_number, user_id, fee_balance, course_id)")
      .order("created_at", { ascending: false });
    if (data) {
      const userIds = data.map((p: any) => {
        const student = Array.isArray(p.student) ? p.student[0] : p.student;
        return student?.user_id;
      }).filter(Boolean);
      const { data: profilesData } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds.length ? userIds : ["_"]);
      const profileMap = new Map((profilesData || []).map(pr => [pr.user_id, pr]));
      setPayments(data.map((p: any) => {
        const student = Array.isArray(p.student) ? p.student[0] : p.student;
        if (student) student.profile = profileMap.get(student.user_id) || null;
        return { ...p, student };
      }));
    }
    setLoading(false);
  }, []);

  const fetchBalances = useCallback(async () => {
    const { data: students } = await supabase.from("students")
      .select("id, registration_number, fee_balance, user_id, course_id, study_mode")
      .order("fee_balance", { ascending: false });
    if (!students) return;
    const userIds = students.map(s => s.user_id);
    const courseIds = students.map(s => s.course_id).filter(Boolean) as string[];
    const studentIds = students.map(s => s.id);
    const [profilesRes, coursesRes, paymentsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds.length ? userIds : ["_"]),
      courseIds.length ? supabase.from("courses").select("id, course_name, course_code, tuition_day, tuition_evening, tuition_weekend").in("id", courseIds) : Promise.resolve({ data: [] }),
      supabase.from("payments").select("student_id, amount").eq("payment_status", "approved"),
    ]);
    const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p]));
    const courseMap = new Map((coursesRes.data || []).map((c: any) => [c.id, c]));
    // Sum approved payments per student
    const paidMap = new Map<string, number>();
    (paymentsRes.data || []).forEach((p: any) => {
      paidMap.set(p.student_id, (paidMap.get(p.student_id) || 0) + Number(p.amount));
    });
    setBalances(students.map(s => {
      const course = s.course_id ? courseMap.get(s.course_id) || null : null;
      const mode = s.study_mode;
      let tuition = 0;
      if (course) {
        if (mode === "Evening") tuition = Number(course.tuition_evening) || Number(course.tuition_day) || 0;
        else if (mode === "Weekend") tuition = Number(course.tuition_weekend) || Number(course.tuition_day) || 0;
        else tuition = Number(course.tuition_day) || 0;
      }
      return {
        ...s,
        profile: profileMap.get(s.user_id),
        course,
        totalPaid: paidMap.get(s.id) || 0,
        tuition,
      };
    }));
  }, []);

  useEffect(() => {
    fetchPayments();
    fetchBalances();
  }, [fetchPayments, fetchBalances]);

  /* ─── Stats ─── */
  const stats = useMemo(() => {
    const approved = payments.filter(p => p.payment_status === "approved");
    const totalCollected = approved.reduce((s, p) => s + p.amount, 0);
    const totalOutstanding = balances.reduce((s, b) => s + Math.max(0, b.fee_balance), 0);
    const pendingCount = payments.filter(p => p.payment_status === "pending").length;
    const studentsOwing = balances.filter(b => b.fee_balance > 0).length;

    // Monthly revenue for chart
    const monthlyMap = new Map<string, number>();
    approved.forEach(p => {
      const month = new Date(p.payment_date).toLocaleDateString("en", { year: "numeric", month: "short" });
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + p.amount);
    });
    const monthlyRevenue = Array.from(monthlyMap.entries())
      .map(([month, amount]) => ({ month, amount }))
      .slice(-12);

    // Status distribution for pie
    const statusDist = [
      { name: "Approved", value: approved.length },
      { name: "Pending", value: pendingCount },
      { name: "Rejected", value: payments.filter(p => p.payment_status === "rejected").length },
      { name: "Refunded", value: payments.filter(p => p.payment_status === "refunded").length },
    ].filter(s => s.value > 0);

    return { totalCollected, totalOutstanding, pendingCount, studentsOwing, monthlyRevenue, statusDist };
  }, [payments, balances]);

  /* ─── Actions ─── */
  const updateStatus = async (p: PaymentRow, status: string) => {
    const { error } = await supabase.from("payments")
      .update({ payment_status: status, approved_by: user?.id || null })
      .eq("id", p.id);
    if (!error) { toast.success(`Payment ${status}`); fetchPayments(); fetchBalances(); }
    else toast.error(error.message);
  };

  const openRefund = (p: PaymentRow) => {
    setRefundPayment(p);
    setRefundNotes("");
    setRefundDialog(true);
  };

  const processRefund = async () => {
    if (!refundPayment) return;
    const { error } = await supabase.from("payments")
      .update({ payment_status: "refunded", notes: refundNotes || refundPayment.notes })
      .eq("id", refundPayment.id);
    if (!error) {
      // Add refund amount back to student balance
      if (refundPayment.student) {
        await supabase.from("students")
          .update({ fee_balance: (refundPayment.student.fee_balance || 0) + refundPayment.amount })
          .eq("id", refundPayment.student_id);
      }
      toast.success("Refund processed");
      setRefundDialog(false);
      fetchPayments();
      fetchBalances();
    } else toast.error(error.message);
  };

  const openStudentHistory = async (s: StudentBalance) => {
    setHistoryStudent(s);
    const { data } = await supabase.from("payments")
      .select("*").eq("student_id", s.id).order("payment_date", { ascending: false });
    setStudentPayments((data || []) as any);
  };

  /* ─── Filters ─── */
  const filteredPayments = payments.filter(p => {
    if (statusFilter !== "all" && p.payment_status !== statusFilter) return false;
    const q = search.toLowerCase();
    return !q || p.student?.profile?.full_name?.toLowerCase().includes(q) || p.student?.registration_number?.toLowerCase().includes(q);
  });

  const filteredBalances = balances.filter(b => {
    const q = balanceSearch.toLowerCase();
    const matchesSearch = !q || b.profile?.full_name?.toLowerCase().includes(q) || b.registration_number?.toLowerCase().includes(q);
    const matchesFilter = balanceFilter === "all" || (balanceFilter === "owing" ? b.fee_balance > 0 : b.fee_balance <= 0);
    return matchesSearch && matchesFilter;
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "approved": return "bg-green-500/10 text-green-600 dark:text-green-400";
      case "pending": return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
      case "refunded": return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      default: return "bg-destructive/10 text-destructive";
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">Fee Management</h1>
            <p className="text-sm text-muted-foreground mt-1">Track payments, balances & revenue</p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={() => { fetchPayments(); fetchBalances(); }}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Collected", value: `UGX ${stats.totalCollected.toLocaleString()}`, icon: TrendingUp, color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10" },
            { label: "Outstanding", value: `UGX ${stats.totalOutstanding.toLocaleString()}`, icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
            { label: "Pending Approvals", value: stats.pendingCount.toString(), icon: CreditCard, color: "text-primary", bg: "bg-primary/10" },
            { label: "Students Owing", value: stats.studentsOwing.toString(), icon: Users, color: "text-destructive", bg: "bg-destructive/10" },
          ].map((card, i) => (
            <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <AnimatedCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                    <card.icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                    <p className="font-display text-lg font-bold">{card.value}</p>
                  </div>
                </div>
              </AnimatedCard>
            </motion.div>
          ))}
        </div>

        {/* Main Tabs */}
        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList className="rounded-xl">
            <TabsTrigger value="payments" className="rounded-lg text-xs gap-1.5"><Receipt className="w-3.5 h-3.5" />Payments</TabsTrigger>
            <TabsTrigger value="balances" className="rounded-lg text-xs gap-1.5"><Users className="w-3.5 h-3.5" />Balances</TabsTrigger>
            <TabsTrigger value="reports" className="rounded-lg text-xs gap-1.5"><TrendingUp className="w-3.5 h-3.5" />Reports</TabsTrigger>
          </TabsList>

          {/* ─── Payments Tab ─── */}
          <TabsContent value="payments" className="mt-4">
            <AnimatedCard>
              {/* Status chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { label: "All", value: "all", count: payments.length },
                  { label: "Pending", value: "pending", count: payments.filter(p => p.payment_status === "pending").length },
                  { label: "Approved", value: "approved", count: payments.filter(p => p.payment_status === "approved").length },
                  { label: "Rejected", value: "rejected", count: payments.filter(p => p.payment_status === "rejected").length },
                  { label: "Refunded", value: "refunded", count: payments.filter(p => p.payment_status === "refunded").length },
                ].map(f => (
                  <button key={f.value} onClick={() => setStatusFilter(f.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${statusFilter === f.value ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-border hover:bg-muted/50"}`}>
                    {f.label} <span className="ml-1 opacity-60">{f.count}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-3.5 py-2 w-full sm:w-72 border border-transparent focus-within:border-primary/20 mb-4">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search payments..." value={search} onChange={e => setSearch(e.target.value)}
                  className="border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0" />
              </div>

              {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
              ) : filteredPayments.length === 0 ? (
                <EmptyState icon={CreditCard} title="No payments found" description="No payments match your criteria." />
              ) : (
                <div className="overflow-x-auto -mx-5">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="pl-5">Student</th><th>Amount</th><th>Date</th>
                        <th>Semester</th><th>Year</th><th className="text-center">Status</th>
                        <th className="text-center pr-5">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments.map((p, i) => (
                        <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                          <td className="pl-5">
                            <p className="font-semibold text-sm">{p.student?.profile?.full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{p.student?.registration_number || "—"}</p>
                          </td>
                          <td className="font-mono text-sm font-semibold">UGX {p.amount.toLocaleString()}</td>
                          <td className="text-sm text-muted-foreground">
                            {new Date(p.payment_date).toLocaleDateString("en-UG", { year: "numeric", month: "short", day: "numeric" })}
                          </td>
                          <td className="text-sm">{p.semester || "—"}</td>
                          <td className="text-sm">{p.academic_year || "—"}</td>
                          <td className="text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold ${statusColor(p.payment_status)}`}>
                              {p.payment_status}
                            </span>
                          </td>
                          <td className="text-center pr-5">
                            <div className="flex items-center justify-center gap-1">
                              {p.payment_status === "pending" && (
                                <>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg hover:bg-green-500/10" onClick={() => updateStatus(p, "approved")} title="Approve">
                                    <CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg text-destructive hover:bg-destructive/10" onClick={() => updateStatus(p, "rejected")} title="Reject">
                                    <XCircle className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              )}
                              {p.payment_status === "approved" && (
                                <Button size="sm" variant="ghost" className="h-7 px-2 rounded-lg text-xs" onClick={() => openRefund(p)} title="Refund">
                                  <RefreshCw className="w-3 h-3 mr-1" />Refund
                                </Button>
                              )}
                              {p.receipt_url && (
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => window.open(p.receipt_url!, "_blank")} title="View Receipt">
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AnimatedCard>
          </TabsContent>

          {/* ─── Balances Tab ─── */}
          <TabsContent value="balances" className="mt-4">
            <AnimatedCard>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
                <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-3.5 py-2 w-full sm:w-72 border border-transparent focus-within:border-primary/20">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search students..." value={balanceSearch} onChange={e => setBalanceSearch(e.target.value)}
                    className="border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0" />
                </div>
                <div className="flex gap-2">
                  {[
                    { label: "All", value: "all" },
                    { label: "Owing", value: "owing" },
                    { label: "Cleared", value: "clear" },
                  ].map(f => (
                    <button key={f.value} onClick={() => setBalanceFilter(f.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${balanceFilter === f.value ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-border hover:bg-muted/50"}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredBalances.length === 0 ? (
                <EmptyState icon={Users} title="No students found" description="No students match your search." />
              ) : (
                <div className="overflow-x-auto -mx-5">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="pl-5">Student</th><th>Reg. Number</th><th>Course</th>
                        <th>Mode</th><th className="text-right">Tuition</th>
                        <th className="text-right">Paid</th><th className="text-right">Balance</th>
                        <th className="text-center">Status</th><th className="text-center pr-5">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBalances.map((s, i) => {
                        const isCleared = s.fee_balance <= 0;
                        return (
                          <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }}>
                            <td className="pl-5">
                              <p className="text-sm font-semibold">{s.profile?.full_name || "—"}</p>
                              <p className="text-xs text-muted-foreground">{s.profile?.email}</p>
                            </td>
                            <td className="text-sm font-mono">{s.registration_number || "—"}</td>
                            <td className="text-sm">{s.course?.course_name || "—"}</td>
                            <td><Badge variant="outline" className="text-[10px]">{s.study_mode}</Badge></td>
                            <td className="text-right text-sm font-mono">UGX {(s.tuition || 0).toLocaleString()}</td>
                            <td className="text-right text-sm font-mono text-green-600 dark:text-green-400">UGX {(s.totalPaid || 0).toLocaleString()}</td>
                            <td className="text-right">
                              <span className={`font-mono text-sm font-semibold ${s.fee_balance > 0 ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                                UGX {s.fee_balance.toLocaleString()}
                              </span>
                            </td>
                            <td className="text-center">
                              {isCleared ? (
                                <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 text-[10px]">
                                  <CheckCircle className="w-3 h-3 mr-1" /> Cleared
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]">
                                  <AlertTriangle className="w-3 h-3 mr-1" /> Owing
                                </Badge>
                              )}
                            </td>
                            <td className="text-center pr-5">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => openStudentHistory(s)} title="Payment History">
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </AnimatedCard>
          </TabsContent>

          {/* ─── Reports Tab ─── */}
          <TabsContent value="reports" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Monthly Revenue Chart */}
              <AnimatedCard className="p-5">
                <h3 className="font-display text-sm font-bold mb-4">Monthly Revenue</h3>
                {stats.monthlyRevenue.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">No revenue data yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={stats.monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} className="text-muted-foreground" />
                      <Tooltip formatter={(value: number) => [`UGX ${value.toLocaleString()}`, "Revenue"]}
                        contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                      <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </AnimatedCard>

              {/* Payment Status Distribution */}
              <AnimatedCard className="p-5">
                <h3 className="font-display text-sm font-bold mb-4">Payment Distribution</h3>
                {stats.statusDist.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">No payment data yet.</div>
                ) : (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie data={stats.statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
                          {stats.statusDist.map((_, idx) => (
                            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {stats.statusDist.map((s, i) => (
                        <div key={s.name} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-xs">{s.name}</span>
                          <span className="text-xs font-semibold ml-auto">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </AnimatedCard>
            </div>

            {/* Summary Stats */}
            <AnimatedCard className="p-5">
              <h3 className="font-display text-sm font-bold mb-4">Financial Summary</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-xl bg-muted/40">
                  <p className="text-xs text-muted-foreground">Total Transactions</p>
                  <p className="font-display text-xl font-bold mt-1">{payments.length}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-muted/40">
                  <p className="text-xs text-muted-foreground">Avg. Payment</p>
                  <p className="font-display text-xl font-bold mt-1">
                    UGX {payments.length > 0 ? Math.round(payments.filter(p => p.payment_status === "approved").reduce((s, p) => s + p.amount, 0) / Math.max(1, payments.filter(p => p.payment_status === "approved").length)).toLocaleString() : 0}
                  </p>
                </div>
                <div className="text-center p-3 rounded-xl bg-muted/40">
                  <p className="text-xs text-muted-foreground">Total Students</p>
                  <p className="font-display text-xl font-bold mt-1">{balances.length}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-muted/40">
                  <p className="text-xs text-muted-foreground">Collection Rate</p>
                  <p className="font-display text-xl font-bold mt-1">
                    {balances.length > 0 ? Math.round(((balances.length - stats.studentsOwing) / balances.length) * 100) : 0}%
                  </p>
                </div>
              </div>
            </AnimatedCard>
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── Refund Dialog ─── */}
      <Dialog open={refundDialog} onOpenChange={setRefundDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="font-display">Process Refund</DialogTitle></DialogHeader>
          {refundPayment && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-xl bg-muted/40 space-y-1">
                <p className="text-sm"><span className="text-muted-foreground">Student:</span> {refundPayment.student?.profile?.full_name}</p>
                <p className="text-sm"><span className="text-muted-foreground">Amount:</span> <span className="font-mono font-semibold">UGX {refundPayment.amount.toLocaleString()}</span></p>
                <p className="text-sm"><span className="text-muted-foreground">Date:</span> {new Date(refundPayment.payment_date).toLocaleDateString()}</p>
              </div>
              <div>
                <Label className="text-xs font-semibold">Refund Reason</Label>
                <Textarea value={refundNotes} onChange={e => setRefundNotes(e.target.value)} placeholder="Reason for refund..." className="mt-1.5 rounded-xl" rows={3} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialog(false)} className="rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={processRefund} className="rounded-xl">Process Refund</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Student Payment History Dialog ─── */}
      <Dialog open={!!historyStudent} onOpenChange={o => { if (!o) setHistoryStudent(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl">
          {historyStudent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <UserCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="font-display">{historyStudent.profile?.full_name}</DialogTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {historyStudent.registration_number || "No Reg#"} · {historyStudent.course?.course_name || "No course"} · {historyStudent.study_mode}
                    </p>
                  </div>
                </div>
              </DialogHeader>

              {/* Fee Summary */}
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div className="p-3 rounded-xl bg-muted/40 text-center">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Tuition</p>
                  <p className="font-display font-bold text-sm mt-1">UGX {(historyStudent.tuition || 0).toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-green-500/5 text-center">
                  <p className="text-[10px] font-semibold text-green-600 dark:text-green-400 uppercase">Paid</p>
                  <p className="font-display font-bold text-sm mt-1 text-green-600 dark:text-green-400">UGX {(historyStudent.totalPaid || 0).toLocaleString()}</p>
                </div>
                <div className={`p-3 rounded-xl text-center ${historyStudent.fee_balance > 0 ? "bg-destructive/5" : "bg-green-500/5"}`}>
                  <p className={`text-[10px] font-semibold uppercase ${historyStudent.fee_balance > 0 ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                    {historyStudent.fee_balance > 0 ? "Balance" : "Status"}
                  </p>
                  <p className={`font-display font-bold text-sm mt-1 ${historyStudent.fee_balance > 0 ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                    {historyStudent.fee_balance > 0 ? `UGX ${historyStudent.fee_balance.toLocaleString()}` : "✓ Cleared"}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-semibold mb-3">Payment History ({studentPayments.length})</h3>
                {studentPayments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">No payment records for this student.</div>
                ) : (
                  <div className="space-y-2">
                    {studentPayments.map(p => (
                      <div key={p.id} className="flex items-center gap-3 p-3 border rounded-xl">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${p.payment_status === "approved" ? "bg-green-500/10" : p.payment_status === "pending" ? "bg-amber-500/10" : "bg-destructive/10"}`}>
                          {p.payment_status === "approved" ? <ArrowUpRight className="w-4 h-4 text-green-600 dark:text-green-400" /> :
                            p.payment_status === "refunded" ? <ArrowDownRight className="w-4 h-4 text-blue-600" /> :
                              <CreditCard className="w-4 h-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-mono font-semibold">UGX {p.amount.toLocaleString()}</p>
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold ${statusColor(p.payment_status)}`}>{p.payment_status}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(p.payment_date).toLocaleDateString("en-UG", { year: "numeric", month: "short", day: "numeric" })}
                            {p.semester ? ` · Sem ${p.semester}` : ""}{p.academic_year ? ` · ${p.academic_year}` : ""}
                          </p>
                        </div>
                        {p.receipt_url && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => window.open(p.receipt_url!, "_blank")}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
