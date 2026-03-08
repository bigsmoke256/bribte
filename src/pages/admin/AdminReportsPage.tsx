import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AnimatedCard, EmptyState } from "@/components/dashboard/DashboardParts";
import {
  BarChart3, Users, CreditCard, BookOpen, Download, TrendingUp,
  GraduationCap, UserCheck, Calendar, FileText, FileSpreadsheet,
  PieChart as PieChartIcon, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
} from "recharts";

/* ─── Chart colors ─── */
const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5, 280 65% 60%))",
];

/* ─── CSV / Export helpers ─── */
const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
  const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
};

export default function AdminReportsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState("overview");

  // Raw data
  const [studentsData, setStudentsData] = useState<any[]>([]);
  const [enrollmentsData, setEnrollmentsData] = useState<any[]>([]);
  const [paymentsData, setPaymentsData] = useState<any[]>([]);
  const [coursesData, setCoursesData] = useState<any[]>([]);
  const [lecturersData, setLecturersData] = useState<any[]>([]);
  const [submissionsData, setSubmissionsData] = useState<any[]>([]);
  const [profilesData, setProfilesData] = useState<any[]>([]);

  /* ─── Fetch all data ─── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [students, enrollments, payments, courses, lecturers, submissions, profiles] = await Promise.all([
      supabase.from("students").select("id, status, study_mode, year_of_study, fee_balance, admission_date, course_id, user_id, created_at"),
      supabase.from("enrollments").select("id, course_id, student_id, academic_year, semester, study_mode, status, created_at"),
      supabase.from("payments").select("id, amount, payment_status, payment_date, student_id, semester, academic_year, created_at"),
      supabase.from("courses").select("id, course_code, course_name, program_level, department_id, lecturer_id, tuition_day, is_published"),
      supabase.from("lecturers").select("id, user_id, department_id, specialization"),
      supabase.from("submissions").select("id, assignment_id, student_id, grade, status, created_at"),
      supabase.from("profiles").select("user_id, full_name, email"),
    ]);
    setStudentsData(students.data || []);
    setEnrollmentsData(enrollments.data || []);
    setPaymentsData(payments.data || []);
    setCoursesData(courses.data || []);
    setLecturersData(lecturers.data || []);
    setSubmissionsData(submissions.data || []);
    setProfilesData(profiles.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const profileMap = useMemo(() => new Map(profilesData.map(p => [p.user_id, p.full_name])), [profilesData]);

  /* ─── Overview Stats ─── */
  const overview = useMemo(() => {
    const approvedPayments = paymentsData.filter(p => p.payment_status === "approved");
    const totalRevenue = approvedPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalOutstanding = studentsData.reduce((s, st) => s + Math.max(0, st.fee_balance || 0), 0);
    return {
      totalStudents: studentsData.length,
      activeStudents: studentsData.filter(s => s.status === "active").length,
      totalLecturers: lecturersData.length,
      totalCourses: coursesData.length,
      totalEnrollments: enrollmentsData.filter(e => e.status === "approved").length,
      totalRevenue,
      totalOutstanding,
      pendingPayments: paymentsData.filter(p => p.payment_status === "pending").length,
      avgPayment: approvedPayments.length > 0 ? Math.round(totalRevenue / approvedPayments.length) : 0,
    };
  }, [studentsData, lecturersData, coursesData, enrollmentsData, paymentsData]);

  /* ─── Enrollment Trends ─── */
  const enrollmentTrends = useMemo(() => {
    const byYear = new Map<string, { approved: number; pending: number; rejected: number }>();
    enrollmentsData.forEach(e => {
      const year = e.academic_year || "Unknown";
      if (!byYear.has(year)) byYear.set(year, { approved: 0, pending: 0, rejected: 0 });
      const entry = byYear.get(year)!;
      if (e.status === "approved") entry.approved++;
      else if (e.status === "pending") entry.pending++;
      else entry.rejected++;
    });
    return Array.from(byYear.entries()).map(([year, counts]) => ({ year, ...counts })).sort((a, b) => a.year.localeCompare(b.year));
  }, [enrollmentsData]);

  const enrollmentByMode = useMemo(() => {
    const counts = { Day: 0, Evening: 0, Weekend: 0 };
    enrollmentsData.filter(e => e.status === "approved").forEach(e => {
      const mode = e.study_mode as keyof typeof counts;
      if (mode in counts) counts[mode]++;
    });
    return Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [enrollmentsData]);

  const enrollmentByLevel = useMemo(() => {
    const courseMap = new Map(coursesData.map(c => [c.id, c.program_level]));
    const counts = new Map<string, number>();
    enrollmentsData.filter(e => e.status === "approved").forEach(e => {
      const level = courseMap.get(e.course_id) || "Unknown";
      counts.set(level, (counts.get(level) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [enrollmentsData, coursesData]);

  /* ─── Revenue Reports ─── */
  const monthlyRevenue = useMemo(() => {
    const map = new Map<string, number>();
    paymentsData.filter(p => p.payment_status === "approved").forEach(p => {
      const month = new Date(p.payment_date).toLocaleDateString("en", { year: "numeric", month: "short" });
      map.set(month, (map.get(month) || 0) + p.amount);
    });
    return Array.from(map.entries()).map(([month, amount]) => ({ month, amount })).slice(-12);
  }, [paymentsData]);

  const revenueByStatus = useMemo(() => {
    const counts: Record<string, { count: number; total: number }> = {};
    paymentsData.forEach(p => {
      if (!counts[p.payment_status]) counts[p.payment_status] = { count: 0, total: 0 };
      counts[p.payment_status].count++;
      counts[p.payment_status].total += p.amount || 0;
    });
    return Object.entries(counts).map(([name, data]) => ({ name, ...data }));
  }, [paymentsData]);

  /* ─── Lecturer Performance ─── */
  const lecturerPerformance = useMemo(() => {
    // Count courses per lecturer
    const lecCourses = new Map<string, number>();
    coursesData.forEach(c => {
      if (c.lecturer_id) lecCourses.set(c.lecturer_id, (lecCourses.get(c.lecturer_id) || 0) + 1);
    });
    return lecturersData.map(l => ({
      name: profileMap.get(l.user_id) || "Unknown",
      courses: lecCourses.get(l.user_id) || 0,
      userId: l.user_id,
    })).sort((a, b) => b.courses - a.courses);
  }, [lecturersData, coursesData, profileMap]);

  /* ─── Course Stats ─── */
  const courseEnrollmentStats = useMemo(() => {
    const counts = new Map<string, number>();
    enrollmentsData.filter(e => e.status === "approved").forEach(e => {
      counts.set(e.course_id, (counts.get(e.course_id) || 0) + 1);
    });
    return coursesData.map(c => ({
      code: c.course_code,
      name: c.course_name,
      enrolled: counts.get(c.id) || 0,
      level: c.program_level,
    })).sort((a, b) => b.enrolled - a.enrolled).slice(0, 15);
  }, [coursesData, enrollmentsData]);

  /* ─── Student Status Distribution ─── */
  const studentStatusDist = useMemo(() => {
    const counts = new Map<string, number>();
    studentsData.forEach(s => counts.set(s.status, (counts.get(s.status) || 0) + 1));
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [studentsData]);

  /* ─── Export functions ─── */
  const exportEnrollments = () => {
    const headers = ["Student", "Course", "Academic Year", "Semester", "Mode", "Status"];
    const rows = enrollmentsData.map(e => {
      const student = studentsData.find(s => s.id === e.student_id);
      const course = coursesData.find(c => c.id === e.course_id);
      return [
        student ? profileMap.get(student.user_id) || "" : "",
        course ? `${course.course_code} - ${course.course_name}` : "",
        e.academic_year, String(e.semester), e.study_mode, e.status,
      ];
    });
    downloadCSV("enrollments_report", headers, rows);
  };

  const exportPayments = () => {
    const headers = ["Student", "Amount", "Date", "Status", "Semester", "Academic Year"];
    const rows = paymentsData.map(p => {
      const student = studentsData.find(s => s.id === p.student_id);
      return [
        student ? profileMap.get(student.user_id) || "" : "",
        String(p.amount), new Date(p.payment_date).toLocaleDateString(),
        p.payment_status, p.semester || "", p.academic_year || "",
      ];
    });
    downloadCSV("payments_report", headers, rows);
  };

  const exportStudents = () => {
    const headers = ["Name", "Email", "Status", "Study Mode", "Year", "Fee Balance"];
    const rows = studentsData.map(s => {
      const profile = profilesData.find(p => p.user_id === s.user_id);
      return [
        profile?.full_name || "", profile?.email || "",
        s.status, s.study_mode, String(s.year_of_study), String(s.fee_balance),
      ];
    });
    downloadCSV("students_report", headers, rows);
  };

  const exportLecturers = () => {
    const headers = ["Name", "Courses Assigned"];
    const rows = lecturerPerformance.map(l => [l.name, String(l.courses)]);
    downloadCSV("lecturers_report", headers, rows);
  };

  if (!user) return null;

  const chartTooltipStyle = {
    borderRadius: 12,
    border: "1px solid hsl(var(--border))",
    background: "hsl(var(--card))",
    fontSize: 12,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">Reports</h1>
            <p className="text-sm text-muted-foreground mt-1">Institutional analytics & data insights</p>
          </div>
        </motion.div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Students", value: overview.totalStudents, sub: `${overview.activeStudents} active`, icon: Users, color: "text-primary", bg: "bg-primary/10" },
            { label: "Total Revenue", value: `UGX ${overview.totalRevenue.toLocaleString()}`, sub: `${overview.pendingPayments} pending`, icon: TrendingUp, color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10" },
            { label: "Enrollments", value: overview.totalEnrollments, sub: `${overview.totalCourses} courses`, icon: GraduationCap, color: "text-primary", bg: "bg-primary/10" },
            { label: "Outstanding", value: `UGX ${overview.totalOutstanding.toLocaleString()}`, sub: `Avg pmt: UGX ${overview.avgPayment.toLocaleString()}`, icon: CreditCard, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
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
                    <p className="text-[10px] text-muted-foreground">{card.sub}</p>
                  </div>
                </div>
              </AnimatedCard>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList className="rounded-xl">
            <TabsTrigger value="overview" className="rounded-lg text-xs gap-1.5"><BarChart3 className="w-3.5 h-3.5" />Overview</TabsTrigger>
            <TabsTrigger value="enrollment" className="rounded-lg text-xs gap-1.5"><GraduationCap className="w-3.5 h-3.5" />Enrollment</TabsTrigger>
            <TabsTrigger value="revenue" className="rounded-lg text-xs gap-1.5"><TrendingUp className="w-3.5 h-3.5" />Revenue</TabsTrigger>
            <TabsTrigger value="performance" className="rounded-lg text-xs gap-1.5"><Activity className="w-3.5 h-3.5" />Performance</TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : (
            <>
              {/* ─── Overview Tab ─── */}
              <TabsContent value="overview" className="mt-4 space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Student Status */}
                  <AnimatedCard className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-display text-sm font-bold">Student Status</h3>
                      <Button size="sm" variant="outline" className="rounded-xl text-xs h-7" onClick={exportStudents}>
                        <Download className="w-3 h-3 mr-1" /> CSV
                      </Button>
                    </div>
                    {studentStatusDist.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">No data</div>
                    ) : (
                      <div className="flex items-center gap-6">
                        <ResponsiveContainer width="50%" height={200}>
                          <PieChart>
                            <Pie data={studentStatusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                              {studentStatusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={chartTooltipStyle} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-2">
                          {studentStatusDist.map((s, i) => (
                            <div key={s.name} className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                              <span className="text-xs capitalize">{s.name}</span>
                              <span className="text-xs font-semibold ml-auto">{s.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </AnimatedCard>

                  {/* Top Courses */}
                  <AnimatedCard className="p-5">
                    <h3 className="font-display text-sm font-bold mb-4">Top Courses by Enrollment</h3>
                    {courseEnrollmentStats.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">No data</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={courseEnrollmentStats.slice(0, 8)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis dataKey="code" type="category" width={80} tick={{ fontSize: 10 }} />
                          <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [v, "Enrolled"]} />
                          <Bar dataKey="enrolled" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </AnimatedCard>
                </div>

                {/* Quick Export */}
                <AnimatedCard className="p-5">
                  <h3 className="font-display text-sm font-bold mb-4">Export Reports</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Students Report", icon: Users, fn: exportStudents, count: studentsData.length },
                      { label: "Enrollments Report", icon: GraduationCap, fn: exportEnrollments, count: enrollmentsData.length },
                      { label: "Payments Report", icon: CreditCard, fn: exportPayments, count: paymentsData.length },
                      { label: "Lecturers Report", icon: UserCheck, fn: exportLecturers, count: lecturersData.length },
                    ].map(exp => (
                      <button key={exp.label} onClick={exp.fn}
                        className="p-4 rounded-xl border text-center hover:bg-muted/50 hover:border-primary/20 transition-all group">
                        <exp.icon className="w-6 h-6 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
                        <p className="text-xs font-semibold mt-2">{exp.label}</p>
                        <p className="text-[10px] text-muted-foreground">{exp.count} records</p>
                        <div className="flex items-center justify-center gap-1 mt-2">
                          <Download className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">CSV</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </AnimatedCard>
              </TabsContent>

              {/* ─── Enrollment Tab ─── */}
              <TabsContent value="enrollment" className="mt-4 space-y-4">
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={exportEnrollments}>
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Export Enrollments
                  </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Enrollment Trends */}
                  <AnimatedCard className="p-5">
                    <h3 className="font-display text-sm font-bold mb-4">Enrollment by Academic Year</h3>
                    {enrollmentTrends.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">No data</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={enrollmentTrends}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={chartTooltipStyle} />
                          <Bar dataKey="approved" name="Approved" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="pending" name="Pending" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </AnimatedCard>

                  {/* By Study Mode */}
                  <AnimatedCard className="p-5">
                    <h3 className="font-display text-sm font-bold mb-4">Enrollment by Study Mode</h3>
                    {enrollmentByMode.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">No data</div>
                    ) : (
                      <div className="flex items-center gap-6">
                        <ResponsiveContainer width="50%" height={220}>
                          <PieChart>
                            <Pie data={enrollmentByMode} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={45}>
                              {enrollmentByMode.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={chartTooltipStyle} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-3">
                          {enrollmentByMode.map((s, i) => (
                            <div key={s.name} className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                              <span className="text-sm">{s.name}</span>
                              <span className="text-sm font-bold ml-auto">{s.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </AnimatedCard>
                </div>

                {/* By Program Level */}
                <AnimatedCard className="p-5">
                  <h3 className="font-display text-sm font-bold mb-4">Enrollment by Program Level</h3>
                  {enrollmentByLevel.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">No data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={enrollmentByLevel}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Bar dataKey="value" name="Students" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </AnimatedCard>
              </TabsContent>

              {/* ─── Revenue Tab ─── */}
              <TabsContent value="revenue" className="mt-4 space-y-4">
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={exportPayments}>
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Export Payments
                  </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Monthly Revenue */}
                  <AnimatedCard className="p-5">
                    <h3 className="font-display text-sm font-bold mb-4">Monthly Revenue</h3>
                    {monthlyRevenue.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">No revenue data</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={monthlyRevenue}>
                          <defs>
                            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
                          <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [`UGX ${v.toLocaleString()}`, "Revenue"]} />
                          <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fill="url(#revenueGrad)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </AnimatedCard>

                  {/* Payment Status */}
                  <AnimatedCard className="p-5">
                    <h3 className="font-display text-sm font-bold mb-4">Payment Distribution</h3>
                    {revenueByStatus.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">No data</div>
                    ) : (
                      <div className="space-y-3">
                        {revenueByStatus.map((s, i) => (
                          <div key={s.name} className="p-3 rounded-xl border">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                                <span className="text-sm font-semibold capitalize">{s.name}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">{s.count} transactions</span>
                            </div>
                            <p className="text-lg font-bold font-mono">UGX {s.total.toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </AnimatedCard>
                </div>

                {/* Financial Summary */}
                <AnimatedCard className="p-5">
                  <h3 className="font-display text-sm font-bold mb-4">Financial Summary</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: "Total Revenue", value: `UGX ${overview.totalRevenue.toLocaleString()}` },
                      { label: "Outstanding Balances", value: `UGX ${overview.totalOutstanding.toLocaleString()}` },
                      { label: "Avg. Payment", value: `UGX ${overview.avgPayment.toLocaleString()}` },
                      { label: "Collection Rate", value: `${studentsData.length > 0 ? Math.round(((studentsData.length - studentsData.filter(s => s.fee_balance > 0).length) / studentsData.length) * 100) : 0}%` },
                    ].map(s => (
                      <div key={s.label} className="text-center p-3 rounded-xl bg-muted/40">
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className="font-display text-lg font-bold mt-1">{s.value}</p>
                      </div>
                    ))}
                  </div>
                </AnimatedCard>
              </TabsContent>

              {/* ─── Performance Tab ─── */}
              <TabsContent value="performance" className="mt-4 space-y-4">
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={exportLecturers}>
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Export Lecturers
                  </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Lecturer Teaching Load */}
                  <AnimatedCard className="p-5">
                    <h3 className="font-display text-sm font-bold mb-4">Lecturer Teaching Load</h3>
                    {lecturerPerformance.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">No lecturers</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={Math.max(200, lecturerPerformance.length * 35)}>
                        <BarChart data={lecturerPerformance.slice(0, 10)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} />
                          <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [v, "Courses"]} />
                          <Bar dataKey="courses" fill="hsl(var(--chart-2))" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </AnimatedCard>

                  {/* Course Popularity */}
                  <AnimatedCard className="p-5">
                    <h3 className="font-display text-sm font-bold mb-4">Course Enrollment Ranking</h3>
                    {courseEnrollmentStats.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">No data</div>
                    ) : (
                      <div className="space-y-2 max-h-[350px] overflow-y-auto">
                        {courseEnrollmentStats.map((c, i) => (
                          <div key={c.code} className="flex items-center gap-3 p-2.5 rounded-xl border">
                            <span className="text-xs font-bold text-muted-foreground w-6 text-center">#{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{c.name}</p>
                              <p className="text-[10px] text-muted-foreground">{c.code} · {c.level}</p>
                            </div>
                            <span className="text-sm font-bold font-mono text-primary">{c.enrolled}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </AnimatedCard>
                </div>

                {/* Institutional Summary */}
                <AnimatedCard className="p-5">
                  <h3 className="font-display text-sm font-bold mb-4">Institutional Summary</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    {[
                      { label: "Students", value: overview.totalStudents },
                      { label: "Lecturers", value: overview.totalLecturers },
                      { label: "Courses", value: overview.totalCourses },
                      { label: "Enrollments", value: overview.totalEnrollments },
                      { label: "Student:Lecturer", value: overview.totalLecturers > 0 ? `${Math.round(overview.totalStudents / overview.totalLecturers)}:1` : "N/A" },
                    ].map(s => (
                      <div key={s.label} className="text-center p-3 rounded-xl bg-muted/40">
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className="font-display text-xl font-bold mt-1">{s.value}</p>
                      </div>
                    ))}
                  </div>
                </AnimatedCard>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
