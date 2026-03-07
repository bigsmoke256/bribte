import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { feeStructure, mockAssignments, mockAnnouncements, mockTimetable, gpaData, mockCourses } from "@/lib/mock-data";
import { CreditCard, FileText, BarChart3, BookOpen, Calendar, Bell, Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function StudentDashboard() {
  const { user } = useAuth();
  if (!user) return null;

  const pendingAssignments = mockAssignments.filter(a => a.status === "pending").length;
  const feePercentage = (feeStructure.paid / feeStructure.totalFees) * 100;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="font-display text-2xl font-bold">Welcome, {user.name.split(" ")[0]}! 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">{user.program} — Year {user.year} | {user.studentId}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="GPA" value={gpaData.currentGPA.toFixed(2)} subtitle="Current Semester" icon={BarChart3} variant="primary" />
          <StatCard title="Fee Balance" value={`UGX ${(feeStructure.balance / 1000000).toFixed(1)}M`} subtitle={`${feePercentage.toFixed(0)}% paid`} icon={CreditCard} variant="warning" />
          <StatCard title="Pending Tasks" value={pendingAssignments} subtitle="Assignments due" icon={FileText} />
          <StatCard title="Courses" value={mockCourses.length} subtitle="This semester" icon={BookOpen} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Fee payment progress */}
          <div className="bg-card rounded-xl p-5 border shadow-card">
            <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" /> Fee Payment Status
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Fees</span>
                <span className="font-semibold">UGX {feeStructure.totalFees.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-semibold text-success">UGX {feeStructure.paid.toLocaleString()}</span>
              </div>
              <Progress value={feePercentage} className="h-2.5" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Balance</span>
                <span className="font-semibold text-destructive">UGX {feeStructure.balance.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Upcoming assignments */}
          <div className="bg-card rounded-xl p-5 border shadow-card">
            <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Upcoming Assignments
            </h3>
            <div className="space-y-3">
              {mockAssignments.filter(a => a.status === "pending").slice(0, 3).map(a => (
                <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/50">
                  <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.courseCode} · Due {new Date(a.dueDate).toLocaleDateString("en-UG", { month: "short", day: "numeric" })}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Announcements */}
          <div className="bg-card rounded-xl p-5 border shadow-card">
            <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" /> Announcements
            </h3>
            <div className="space-y-3">
              {mockAnnouncements.slice(0, 3).map(a => (
                <div key={a.id} className="p-2.5 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={a.priority === "high" ? "destructive" : "secondary"} className="text-[10px] h-5">
                      {a.priority}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{new Date(a.date).toLocaleDateString("en-UG", { month: "short", day: "numeric" })}</span>
                  </div>
                  <p className="text-sm font-medium">{a.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Today's Timetable */}
        <div className="bg-card rounded-xl p-5 border shadow-card">
          <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Today's Schedule
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {mockTimetable.filter(t => t.day === "Monday").map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{t.courseName}</p>
                  <p className="text-xs text-muted-foreground">{t.time} · {t.room}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Results summary */}
        <div className="bg-card rounded-xl p-5 border shadow-card">
          <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Results Summary
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Course</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Name</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Grade</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Credits</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Points</th>
                </tr>
              </thead>
              <tbody>
                {gpaData.results.map(r => (
                  <tr key={r.course} className="border-b last:border-0">
                    <td className="py-2.5 px-3 font-medium">{r.course}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{r.name}</td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge variant="secondary">{r.grade}</Badge>
                    </td>
                    <td className="py-2.5 px-3 text-center">{r.credits}</td>
                    <td className="py-2.5 px-3 text-center font-medium">{r.points.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
