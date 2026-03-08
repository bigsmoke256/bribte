import { useAuth } from "@/lib/auth-context";
import { StatCard } from "@/components/dashboard/StatCard";
import { AnimatedCard, SectionHeader } from "@/components/dashboard/DashboardParts";
import { BookOpen, Users, FileText, CheckCircle, Bell, Upload, ArrowUpRight, Clock, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export default function LecturerDashboardHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch courses assigned to this lecturer
  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ["lecturer-courses", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, course_code, course_name, program_level, max_capacity, duration_years")
        .eq("lecturer_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch enrollments for those courses to get student count
  const courseIds = courses.map(c => c.id);
  const { data: enrollments = [] } = useQuery({
    queryKey: ["lecturer-enrollments", courseIds],
    queryFn: async () => {
      if (courseIds.length === 0) return [];
      const { data } = await supabase
        .from("enrollments")
        .select("student_id, course_id")
        .in("course_id", courseIds);
      return data || [];
    },
    enabled: courseIds.length > 0,
  });

  // Fetch assignments created by this lecturer
  const { data: assignments = [] } = useQuery({
    queryKey: ["lecturer-assignments", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("assignments")
        .select("id, title, course_id, deadline, max_grade")
        .eq("lecturer_id", user!.id)
        .order("deadline", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch submissions for lecturer's assignments
  const assignmentIds = assignments.map(a => a.id);
  const { data: submissions = [] } = useQuery({
    queryKey: ["lecturer-submissions", assignmentIds],
    queryFn: async () => {
      if (assignmentIds.length === 0) return [];
      const { data } = await supabase
        .from("submissions")
        .select("id, assignment_id, student_id, status, grade, submitted_at, file_url")
        .in("assignment_id", assignmentIds)
        .order("submitted_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: assignmentIds.length > 0,
  });

  // Fetch student profiles for submissions
  const studentIds = [...new Set(submissions.map(s => s.student_id))];
  const { data: studentRecords = [] } = useQuery({
    queryKey: ["lecturer-students-profiles", studentIds],
    queryFn: async () => {
      if (studentIds.length === 0) return [];
      const { data: students } = await supabase
        .from("students")
        .select("id, user_id")
        .in("id", studentIds);
      if (!students || students.length === 0) return [];
      const userIds = students.map(s => s.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      return students.map(s => ({
        studentId: s.id,
        name: profiles?.find(p => p.user_id === s.user_id)?.full_name || "Unknown",
      }));
    },
    enabled: studentIds.length > 0,
  });

  // Fetch announcements
  const { data: announcements = [] } = useQuery({
    queryKey: ["lecturer-announcements"],
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id, title, message, priority, created_at")
        .order("created_at", { ascending: false })
        .limit(3);
      return data || [];
    },
  });

  const totalStudents = new Set(enrollments.map(e => e.student_id)).size;
  const pendingCount = submissions.filter(s => s.status === "submitted").length;
  const gradedCount = submissions.filter(s => s.status === "graded").length;
  const totalSubmissions = submissions.length;

  if (!user) return null;

  return (
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
          <Button size="sm" onClick={() => navigate("/lecturer/assignments")}
            className="bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground border-0 rounded-xl hidden sm:flex">
            <PlusCircle className="w-4 h-4 mr-2" /> New Assignment
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Courses" value={coursesLoading ? "..." : courses.length} subtitle="Assigned to you" icon={BookOpen} variant="primary" delay={0} />
        <StatCard title="Total Students" value={totalStudents} subtitle="Across your courses" icon={Users} delay={0.05} />
        <StatCard title="Pending Reviews" value={pendingCount} subtitle="Need grading" icon={FileText} variant="warning" delay={0.1} />
        <StatCard title="Graded" value={`${gradedCount}/${totalSubmissions}`} subtitle="Submissions complete" icon={CheckCircle} variant="success" delay={0.15} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Courses */}
        <AnimatedCard delay={0.1}>
          <SectionHeader title="My Courses" icon={BookOpen} badge={courses.length}
            action={<Button variant="outline" size="sm" className="rounded-xl text-xs h-8" onClick={() => navigate("/lecturer/courses")}>View All</Button>} />
          <div className="space-y-2.5">
            {coursesLoading ? (
              Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
            ) : courses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No courses assigned yet</p>
            ) : (
              courses.slice(0, 4).map((c, i) => {
                const enrolled = enrollments.filter(e => e.course_id === c.id).length;
                return (
                  <motion.div key={c.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.05 }}
                    className="p-4 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer group hover:shadow-sm"
                    onClick={() => navigate("/lecturer/courses")}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{c.course_code}</span>
                          <span className="metric-badge metric-badge-info">{c.program_level}</span>
                        </div>
                        <p className="text-sm font-semibold mt-1.5">{c.course_name}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{enrolled} students</span>
                          <span>{c.duration_years} year(s)</span>
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </AnimatedCard>

        {/* Recent submissions */}
        <AnimatedCard delay={0.15}>
          <SectionHeader title="Recent Submissions" icon={Upload} badge={pendingCount}
            action={<Button variant="outline" size="sm" className="rounded-xl text-xs h-8" onClick={() => navigate("/lecturer/submissions")}>View All</Button>} />
          <div className="space-y-2">
            {submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No submissions yet</p>
            ) : (
              submissions.slice(0, 5).map((s, i) => {
                const studentName = studentRecords.find(sr => sr.studentId === s.student_id)?.name || "Unknown";
                const assignment = assignments.find(a => a.id === s.assignment_id);
                const course = courses.find(c => c.id === assignment?.course_id);
                return (
                  <motion.div key={s.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.04 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors group cursor-pointer"
                    onClick={() => navigate("/lecturer/submissions")}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold group-hover:text-primary transition-colors">{studentName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{assignment?.title || "Assignment"} • {course?.course_code || ""}</p>
                      {s.submitted_at && <p className="text-[10px] text-muted-foreground mt-0.5">Submitted {new Date(s.submitted_at).toLocaleDateString("en-UG", { month: "short", day: "numeric" })}</p>}
                    </div>
                    <Badge variant={s.status === "graded" ? "default" : s.status === "submitted" ? "secondary" : "outline"}
                      className={`text-[10px] flex-shrink-0 rounded-md font-semibold ${s.status === "graded" ? "bg-success text-success-foreground" : ""}`}>
                      {s.status === "graded" ? `${s.grade}/${assignment?.max_grade || 100}` : s.status}
                    </Badge>
                  </motion.div>
                );
              })
            )}
          </div>
        </AnimatedCard>
      </div>

      {/* Announcements */}
      <AnimatedCard delay={0.25}>
        <SectionHeader title="Announcements" icon={Bell}
          action={<Button size="sm" className="rounded-xl text-xs h-8" onClick={() => navigate("/lecturer/announcements")}><PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Post New</Button>} />
        <div className="space-y-2.5">
          {announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No announcements yet</p>
          ) : (
            announcements.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
                className="p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer">
                <p className="text-sm font-semibold leading-snug">{a.title}</p>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{a.message}</p>
                <span className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleDateString("en-UG", { month: "short", day: "numeric" })}</span>
              </motion.div>
            ))
          )}
        </div>
      </AnimatedCard>
    </div>
  );
}
