import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { AnimatedCard, SectionHeader } from "@/components/dashboard/DashboardParts";
import { feeStructure, mockAssignments, mockAnnouncements, mockTimetable, gpaData, mockCourses } from "@/lib/mock-data";
import { CreditCard, FileText, BarChart3, BookOpen, Calendar, Bell, Clock, AlertTriangle, ArrowUpRight, Upload, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function StudentDashboard() {
  const { user } = useAuth();
  if (!user) return null;

  const pendingAssignments = mockAssignments.filter(a => a.status === "pending").length;
  const feePercentage = (feeStructure.paid / feeStructure.totalFees) * 100;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        {/* Welcome banner */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="primary-gradient rounded-2xl p-6 lg:p-8 text-primary-foreground relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary-foreground/5 -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-1/2 w-48 h-48 rounded-full bg-primary-foreground/5 translate-y-1/2" />
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-primary-foreground/60 text-sm font-medium mb-1">Good morning,</p>
                <h1 className="font-display text-2xl lg:text-3xl font-extrabold mb-1">{user.name} 👋</h1>
                <p className="text-primary-foreground/70 text-sm">{user.program} — Year {user.year} • {user.studentId}</p>
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-primary-foreground/60 text-xs font-medium">Current Semester GPA</p>
                <p className="font-display text-4xl font-extrabold mt-1">{gpaData.currentGPA.toFixed(2)}</p>
                <p className="text-primary-foreground/50 text-xs">Cumulative: {gpaData.cumulativeGPA.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Fee Balance" value={`${(feeStructure.balance / 1000000).toFixed(1)}M`} subtitle={`UGX • ${feePercentage.toFixed(0)}% paid`} icon={CreditCard} variant="warning" delay={0} />
          <StatCard title="Pending Tasks" value={pendingAssignments} subtitle="Assignments due" icon={FileText} delay={0.05} />
          <StatCard title="Courses" value={mockCourses.length} subtitle="Registered this semester" icon={BookOpen} variant="info" delay={0.1} />
          <StatCard title="Credits" value={gpaData.semesterCredits} subtitle={`of ${gpaData.totalCredits} cumulative`} icon={BarChart3} variant="success" delay={0.15} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Fee payment card */}
          <AnimatedCard delay={0.1}>
            <SectionHeader title="Fee Status" icon={CreditCard} />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Total Fees</p>
                  <p className="font-display font-bold text-lg">UGX {feeStructure.totalFees.toLocaleString()}</p>
                </div>
                <div className={`metric-badge ${feePercentage >= 75 ? "metric-badge-success" : feePercentage >= 50 ? "metric-badge-warning" : "metric-badge-destructive"}`}>
                  {feePercentage.toFixed(0)}% paid
                </div>
              </div>
              <Progress value={feePercentage} className="h-3 rounded-full" />
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-success-light">
                  <p className="text-[10px] text-success font-semibold uppercase tracking-wider">Paid</p>
                  <p className="font-display font-bold text-success text-sm mt-0.5">UGX {feeStructure.paid.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-destructive/5">
                  <p className="text-[10px] text-destructive font-semibold uppercase tracking-wider">Balance</p>
                  <p className="font-display font-bold text-destructive text-sm mt-0.5">UGX {feeStructure.balance.toLocaleString()}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full rounded-xl">
                <Upload className="w-3.5 h-3.5 mr-2" /> Upload Payment Receipt
              </Button>
            </div>
          </AnimatedCard>

          {/* Assignments */}
          <AnimatedCard delay={0.15}>
            <SectionHeader title="Upcoming Assignments" icon={FileText} badge={pendingAssignments} />
            <div className="space-y-2.5">
              {mockAssignments.filter(a => a.status === "pending").slice(0, 3).map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.05 }}
                  className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors cursor-pointer group">
                  <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.courseCode} • Due {new Date(a.dueDate).toLocaleDateString("en-UG", { month: "short", day: "numeric" })}</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                </motion.div>
              ))}
            </div>
          </AnimatedCard>

          {/* Announcements */}
          <AnimatedCard delay={0.2}>
            <SectionHeader title="Announcements" icon={Bell} />
            <div className="space-y-2.5">
              {mockAnnouncements.slice(0, 3).map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.05 }}
                  className="p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant={a.priority === "high" ? "destructive" : "secondary"} className="text-[10px] h-5 px-2 rounded-md font-semibold">
                      {a.priority}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-medium">{new Date(a.date).toLocaleDateString("en-UG", { month: "short", day: "numeric" })}</span>
                  </div>
                  <p className="text-sm font-semibold leading-snug">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{a.content}</p>
                </motion.div>
              ))}
            </div>
          </AnimatedCard>
        </div>

        {/* Schedule */}
        <AnimatedCard delay={0.25}>
          <SectionHeader title="Today's Schedule" icon={Calendar} badge={mockTimetable.filter(t => t.day === "Monday").length} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {mockTimetable.filter(t => t.day === "Monday").map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
                className="flex items-center gap-3 p-3.5 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-all hover:shadow-sm group cursor-pointer">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                  <Clock className="w-4.5 h-4.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{t.courseName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.time}</p>
                  <p className="text-[11px] text-muted-foreground">{t.room}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatedCard>

        {/* Results table */}
        <AnimatedCard delay={0.3}>
          <SectionHeader title="Results Summary" icon={BarChart3}
            action={<span className="text-xs font-semibold text-primary">CGPA: {gpaData.cumulativeGPA.toFixed(2)}</span>} />
          <div className="overflow-x-auto -mx-5">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="pl-5">Course</th>
                  <th>Name</th>
                  <th className="text-center">Grade</th>
                  <th className="text-center">Credits</th>
                  <th className="text-center pr-5">Points</th>
                </tr>
              </thead>
              <tbody>
                {gpaData.results.map((r, i) => (
                  <motion.tr key={r.course} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 + i * 0.04 }}>
                    <td className="pl-5 font-semibold text-primary">{r.course}</td>
                    <td className="text-muted-foreground">{r.name}</td>
                    <td className="text-center">
                      <span className={`metric-badge ${r.points >= 3.7 ? "metric-badge-success" : r.points >= 3.0 ? "metric-badge-info" : "metric-badge-warning"}`}>
                        {r.grade}
                      </span>
                    </td>
                    <td className="text-center text-muted-foreground">{r.credits}</td>
                    <td className="text-center pr-5 font-semibold">{r.points.toFixed(1)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </AnimatedCard>
      </div>
    </DashboardLayout>
  );
}
