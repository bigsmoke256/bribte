import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { AnimatedCard, SectionHeader } from "@/components/dashboard/DashboardParts";
import { lecturerCourses, lecturerStudentSubmissions, mockAnnouncements } from "@/lib/mock-data";
import { BookOpen, Users, FileText, CheckCircle, Bell, Upload, ArrowUpRight, Clock, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

export default function LecturerDashboard() {
  const { user } = useAuth();
  if (!user) return null;

  const totalSubmissions = lecturerStudentSubmissions.length;
  const gradedCount = lecturerStudentSubmissions.filter(s => s.status === "graded").length;
  const pendingCount = lecturerStudentSubmissions.filter(s => s.status === "submitted").length;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="primary-gradient rounded-2xl p-6 lg:p-8 text-primary-foreground relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-primary-foreground/5 -translate-y-1/2 translate-x-1/4" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-primary-foreground/60 text-sm font-medium mb-1">Welcome back,</p>
              <h1 className="font-display text-2xl lg:text-3xl font-extrabold">{user.fullName}</h1>
              <p className="text-primary-foreground/70 text-sm mt-1">Lecturer Portal</p>
            </div>
            <Button size="sm" className="bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground border-0 rounded-xl hidden sm:flex">
              <PlusCircle className="w-4 h-4 mr-2" /> New Assignment
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Courses" value={lecturerCourses.length} subtitle="This semester" icon={BookOpen} variant="primary" delay={0} />
          <StatCard title="Total Students" value={145} subtitle="Across all courses" icon={Users} delay={0.05} />
          <StatCard title="Pending Reviews" value={pendingCount} subtitle="Need grading" icon={FileText} variant="warning" delay={0.1} />
          <StatCard title="Graded" value={`${gradedCount}/${totalSubmissions}`} subtitle="Submissions complete" icon={CheckCircle} variant="success" delay={0.15} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Courses */}
          <AnimatedCard delay={0.1}>
            <SectionHeader title="My Courses" icon={BookOpen} badge={lecturerCourses.length} />
            <div className="space-y-2.5">
              {lecturerCourses.map((c, i) => (
                <motion.div key={c.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.05 }}
                  className="p-4 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer group hover:shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{c.code}</span>
                        <span className="metric-badge metric-badge-info">{c.credits} Credits</span>
                      </div>
                      <p className="text-sm font-semibold mt-1.5">{c.name}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{c.schedule}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{c.room}</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatedCard>

          {/* Recent submissions */}
          <AnimatedCard delay={0.15}>
            <SectionHeader title="Recent Submissions" icon={Upload} badge={pendingCount}
              action={<Button variant="outline" size="sm" className="rounded-xl text-xs h-8">View All</Button>} />
            <div className="space-y-2">
              {lecturerStudentSubmissions.map((s, i) => (
                <motion.div key={s.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.04 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors group cursor-pointer">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold group-hover:text-primary transition-colors">{s.studentName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.assignment} • {s.course}</p>
                    {s.submittedDate && <p className="text-[10px] text-muted-foreground mt-0.5">Submitted {new Date(s.submittedDate).toLocaleDateString("en-UG", { month: "short", day: "numeric" })}</p>}
                  </div>
                  <Badge variant={s.status === "graded" ? "default" : s.status === "submitted" ? "secondary" : "outline"}
                    className={`text-[10px] flex-shrink-0 rounded-md font-semibold ${s.status === "graded" ? "bg-success text-success-foreground" : ""}`}>
                    {s.status === "graded" ? `${s.grade}/100` : s.status}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </AnimatedCard>
        </div>

        {/* Grading progress & Announcements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <AnimatedCard delay={0.2}>
            <SectionHeader title="Grading Progress" icon={CheckCircle} />
            <div className="space-y-5">
              {lecturerCourses.map((c, i) => {
                const courseSubmissions = lecturerStudentSubmissions.filter(s => s.course === c.code);
                const graded = courseSubmissions.filter(s => s.status === "graded").length;
                const total = courseSubmissions.length || 1;
                const pct = (graded / total) * 100;
                return (
                  <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 + i * 0.05 }}>
                    <div className="flex justify-between text-sm mb-2">
                      <div>
                        <span className="font-semibold">{c.code}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{c.name}</span>
                      </div>
                      <span className={`metric-badge ${pct >= 80 ? "metric-badge-success" : pct >= 40 ? "metric-badge-warning" : "metric-badge-destructive"}`}>
                        {graded}/{total}
                      </span>
                    </div>
                    <Progress value={pct} className="h-2.5 rounded-full" />
                  </motion.div>
                );
              })}
            </div>
          </AnimatedCard>

          <AnimatedCard delay={0.25}>
            <SectionHeader title="Announcements" icon={Bell}
              action={<Button size="sm" className="rounded-xl text-xs h-8"><PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Post New</Button>} />
            <div className="space-y-2.5">
              {mockAnnouncements.slice(0, 3).map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
                  className="p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer">
                  <p className="text-sm font-semibold leading-snug">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{a.content}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-muted-foreground font-medium">{a.author}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(a.date).toLocaleDateString("en-UG", { month: "short", day: "numeric" })}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatedCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
