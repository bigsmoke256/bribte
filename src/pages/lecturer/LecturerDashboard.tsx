import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { lecturerCourses, lecturerStudentSubmissions, mockAnnouncements } from "@/lib/mock-data";
import { BookOpen, Users, FileText, CheckCircle, Clock, Bell, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function LecturerDashboard() {
  const { user } = useAuth();
  if (!user) return null;

  const totalSubmissions = lecturerStudentSubmissions.length;
  const gradedCount = lecturerStudentSubmissions.filter(s => s.status === "graded").length;
  const pendingCount = lecturerStudentSubmissions.filter(s => s.status === "submitted").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Welcome, {user.name.split(" ")[1]}! 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">{user.department} Department</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Courses" value={lecturerCourses.length} subtitle="This semester" icon={BookOpen} variant="primary" />
          <StatCard title="Total Students" value={145} subtitle="Across all courses" icon={Users} />
          <StatCard title="Pending Reviews" value={pendingCount} subtitle="Submissions to grade" icon={FileText} variant="warning" />
          <StatCard title="Graded" value={gradedCount} subtitle={`of ${totalSubmissions} total`} icon={CheckCircle} variant="success" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Courses */}
          <div className="bg-card rounded-xl p-5 border shadow-card">
            <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" /> My Courses
            </h3>
            <div className="space-y-3">
              {lecturerCourses.map(c => (
                <div key={c.id} className="p-3 rounded-lg border bg-muted/30 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.code} · {c.credits} Credits · {c.schedule}</p>
                    <p className="text-xs text-muted-foreground">{c.room}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">{c.credits} CR</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Recent submissions */}
          <div className="bg-card rounded-xl p-5 border shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-sm flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" /> Recent Submissions
              </h3>
              <Badge variant="outline" className="text-xs">{pendingCount} to review</Badge>
            </div>
            <div className="space-y-3">
              {lecturerStudentSubmissions.slice(0, 4).map(s => (
                <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{s.studentName}</p>
                    <p className="text-xs text-muted-foreground">{s.assignment} · {s.course}</p>
                  </div>
                  <Badge variant={s.status === "graded" ? "default" : s.status === "submitted" ? "secondary" : "outline"} className="text-xs flex-shrink-0">
                    {s.status === "graded" ? `${s.grade}/100` : s.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Grading progress & Announcements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-card rounded-xl p-5 border shadow-card">
            <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" /> Grading Progress
            </h3>
            {lecturerCourses.map(c => {
              const courseSubmissions = lecturerStudentSubmissions.filter(s => s.course === c.code);
              const graded = courseSubmissions.filter(s => s.status === "graded").length;
              const total = courseSubmissions.length || 1;
              return (
                <div key={c.id} className="mb-4 last:mb-0">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium">{c.code}</span>
                    <span className="text-muted-foreground">{graded}/{total}</span>
                  </div>
                  <Progress value={(graded / total) * 100} className="h-2" />
                </div>
              );
            })}
          </div>

          <div className="bg-card rounded-xl p-5 border shadow-card">
            <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" /> Recent Announcements
            </h3>
            <div className="space-y-3">
              {mockAnnouncements.slice(0, 3).map(a => (
                <div key={a.id} className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{a.author} · {new Date(a.date).toLocaleDateString("en-UG", { month: "short", day: "numeric" })}</p>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full mt-3">Post Announcement</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
