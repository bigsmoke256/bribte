import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { adminStats, enrollmentByDepartment, monthlyRevenue, mockPayments, mockAnnouncements } from "@/lib/mock-data";
import { Users, CreditCard, GraduationCap, BarChart3, TrendingUp, Bell, CheckCircle, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(213,72%,38%)", "hsl(199,89%,48%)", "hsl(38,92%,50%)", "hsl(142,71%,45%)", "hsl(0,72%,51%)", "hsl(280,60%,50%)"];

export default function AdminDashboard() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Overview of BRIBTE operations</p>
          </div>
          <Button size="sm">Generate Report</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Students" value={adminStats.totalStudents.toLocaleString()} subtitle="Active enrollment" icon={Users} variant="primary" trend={{ value: 12.5, positive: true }} />
          <StatCard title="Lecturers" value={adminStats.totalLecturers} subtitle="Academic staff" icon={GraduationCap} />
          <StatCard title="Collection Rate" value={`${adminStats.collectionRate}%`} subtitle="Fee collection" icon={TrendingUp} variant="success" trend={{ value: 3.2, positive: true }} />
          <StatCard title="Pending Payments" value={adminStats.pendingPayments.toLocaleString()} subtitle="Awaiting approval" icon={CreditCard} variant="warning" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-card rounded-xl p-5 border shadow-card">
            <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Monthly Revenue (UGX Millions)
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(214,20%,90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(215,15%,50%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(215,15%,50%)" />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(214,20%,90%)", fontSize: "12px" }} />
                <Bar dataKey="revenue" fill="hsl(213,72%,38%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-xl p-5 border shadow-card">
            <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Enrollment by Department
            </h3>
            <div className="flex items-center">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={enrollmentByDepartment} dataKey="students" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                    {enrollmentByDepartment.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {enrollmentByDepartment.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-muted-foreground truncate">{d.name}</span>
                    <span className="font-medium ml-auto">{d.students.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Payment approvals & announcements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-card rounded-xl p-5 border shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" /> Recent Payments
              </h3>
              <Badge variant="outline" className="text-xs">{mockPayments.filter(p => p.status === "pending").length} pending</Badge>
            </div>
            <div className="space-y-2.5">
              {mockPayments.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{p.studentName}</p>
                    <p className="text-xs text-muted-foreground">{p.studentId} · UGX {p.amount.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {p.status === "pending" ? (
                      <>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-success hover:text-success"><CheckCircle className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"><XCircle className="w-4 h-4" /></Button>
                      </>
                    ) : (
                      <Badge variant={p.status === "approved" ? "default" : "destructive"} className="text-[10px]">{p.status}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl p-5 border shadow-card">
            <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" /> Announcements
            </h3>
            <div className="space-y-3">
              {mockAnnouncements.map(a => (
                <div key={a.id} className="p-2.5 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={a.priority === "high" ? "destructive" : "secondary"} className="text-[10px] h-5">{a.priority}</Badge>
                    <span className="text-[10px] text-muted-foreground">{new Date(a.date).toLocaleDateString("en-UG", { month: "short", day: "numeric" })}</span>
                  </div>
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{a.content}</p>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full mt-3">Manage Announcements</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
