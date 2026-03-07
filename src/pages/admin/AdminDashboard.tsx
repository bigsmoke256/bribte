import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { AnimatedCard, SectionHeader } from "@/components/dashboard/DashboardParts";
import { adminStats, enrollmentByDepartment, monthlyRevenue, mockPayments, mockAnnouncements } from "@/lib/mock-data";
import { Users, CreditCard, GraduationCap, BarChart3, TrendingUp, Bell, CheckCircle, XCircle, Download, PlusCircle, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { motion } from "framer-motion";

const COLORS = ["hsl(217,71%,45%)", "hsl(199,89%,48%)", "hsl(42,100%,50%)", "hsl(152,60%,42%)", "hsl(0,72%,51%)", "hsl(280,55%,55%)"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card rounded-xl border shadow-lg p-3 text-sm">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-muted-foreground text-xs mt-0.5">{p.name}: <span className="font-semibold text-foreground">{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span></p>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Overview of BRIBTE campus operations</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-xl">
              <Download className="w-3.5 h-3.5 mr-2" /> Export
            </Button>
            <Button size="sm" className="rounded-xl">
              <PlusCircle className="w-3.5 h-3.5 mr-2" /> Generate Report
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Students" value={adminStats.totalStudents.toLocaleString()} subtitle="Active enrollment" icon={Users} variant="primary" delay={0} trend={{ value: 12.5, positive: true }} />
          <StatCard title="Academic Staff" value={adminStats.totalLecturers} subtitle="Lecturers" icon={GraduationCap} delay={0.05} trend={{ value: 5.3, positive: true }} />
          <StatCard title="Collection Rate" value={`${adminStats.collectionRate}%`} subtitle="Fee collection" icon={TrendingUp} variant="success" delay={0.1} trend={{ value: 3.2, positive: true }} />
          <StatCard title="Pending Payments" value={adminStats.pendingPayments.toLocaleString()} subtitle="Awaiting approval" icon={CreditCard} variant="warning" delay={0.15} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <AnimatedCard delay={0.1} className="lg:col-span-2">
            <SectionHeader title="Revenue Trend (UGX Millions)" icon={BarChart3}
              action={<div className="flex gap-1.5">
                {["Monthly", "Quarterly"].map(t => (
                  <button key={t} className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${t === "Monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{t}</button>
                ))}
              </div>} />
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyRevenue}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(217,71%,45%)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(217,71%,45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220,15%,91%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(220,10%,46%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(220,10%,46%)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(217,71%,45%)" strokeWidth={2.5} fill="url(#revenueGradient)" dot={{ fill: "hsl(217,71%,45%)", strokeWidth: 2, stroke: "white", r: 4 }} activeDot={{ r: 6, strokeWidth: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </AnimatedCard>

          <AnimatedCard delay={0.15}>
            <SectionHeader title="Enrollment" icon={Users} />
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={enrollmentByDepartment} dataKey="students" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} strokeWidth={2} stroke="hsl(0,0%,100%)">
                  {enrollmentByDepartment.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {enrollmentByDepartment.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2 text-xs group cursor-pointer">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform group-hover:scale-125" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-muted-foreground truncate flex-1 group-hover:text-foreground transition-colors">{d.name}</span>
                  <span className="font-bold tabular-nums">{d.students.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </AnimatedCard>
        </div>

        {/* Payment approvals & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <AnimatedCard delay={0.2}>
            <SectionHeader title="Payment Approvals" icon={CreditCard} badge={mockPayments.filter(p => p.status === "pending").length}
              action={<Button variant="outline" size="sm" className="rounded-xl text-xs h-8">View All</Button>} />
            <div className="space-y-2">
              {mockPayments.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 + i * 0.04 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{p.studentName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.studentId} • UGX {p.amount.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {p.status === "pending" ? (
                      <>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg text-success hover:text-success hover:bg-success/10"><CheckCircle className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"><XCircle className="w-4 h-4" /></Button>
                      </>
                    ) : (
                      <Badge variant={p.status === "approved" ? "default" : "destructive"}
                        className={`text-[10px] rounded-md font-semibold ${p.status === "approved" ? "bg-success text-success-foreground" : ""}`}>{p.status}</Badge>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatedCard>

          <AnimatedCard delay={0.25}>
            <SectionHeader title="Announcements" icon={Bell}
              action={<Button size="sm" className="rounded-xl text-xs h-8"><PlusCircle className="w-3.5 h-3.5 mr-1.5" /> New</Button>} />
            <div className="space-y-2.5">
              {mockAnnouncements.map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
                  className="p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant={a.priority === "high" ? "destructive" : "secondary"} className="text-[10px] h-5 px-2 rounded-md font-semibold">{a.priority}</Badge>
                    <span className="text-[10px] text-muted-foreground font-medium">{new Date(a.date).toLocaleDateString("en-UG", { month: "short", day: "numeric" })}</span>
                    <span className="metric-badge metric-badge-info text-[9px] ml-auto">{a.target}</span>
                  </div>
                  <p className="text-sm font-semibold leading-snug">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{a.content}</p>
                </motion.div>
              ))}
            </div>
          </AnimatedCard>
        </div>

        {/* Quick stats footer */}
        <AnimatedCard delay={0.3}>
          <SectionHeader title="Institutional Overview" icon={Activity} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Courses", value: adminStats.totalCourses, color: "text-primary" },
              { label: "Active Enrollments", value: adminStats.activeEnrollments.toLocaleString(), color: "text-success" },
              { label: "Approved Payments", value: adminStats.approvedPayments.toLocaleString(), color: "text-info" },
              { label: "Total Revenue", value: `${(adminStats.totalRevenue / 1000000000).toFixed(1)}B UGX`, color: "text-accent" },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.05 }}
                className="text-center p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                <p className={`font-display text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </AnimatedCard>
      </div>
    </DashboardLayout>
  );
}
