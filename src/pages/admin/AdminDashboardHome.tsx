import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { AnimatedCard, SectionHeader, EmptyState } from "@/components/dashboard/DashboardParts";
import {
  Users, CreditCard, GraduationCap, BarChart3, Bell, Activity,
  BookOpen, CalendarDays, UserPlus, PlusCircle, Megaphone, Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AdminDashboardHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    students: 0, lecturers: 0, courses: 0, enrollments: 0,
    pendingPayments: 0, approvedRevenue: 0, activeStudents: 0,
  });
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);
  const [recentStudents, setRecentStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [s, l, c, e, p, a, students] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("lecturers").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("enrollments").select("id", { count: "exact", head: true }),
        supabase.from("payments").select("*, student:students(registration_number, user_id)").order("created_at", { ascending: false }).limit(5),
        supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(4),
        supabase.from("students").select("id, user_id, status, created_at, course:courses(course_name)").order("created_at", { ascending: false }).limit(5),
      ]);

      const allPayments = await supabase.from("payments").select("amount, payment_status");
      const payData = allPayments.data || [];

      // Count active students
      const activeCount = await supabase.from("students").select("id", { count: "exact", head: true }).eq("status", "active");

      setStats({
        students: s.count || 0,
        lecturers: l.count || 0,
        courses: c.count || 0,
        enrollments: e.count || 0,
        pendingPayments: payData.filter(x => x.payment_status === "pending").length,
        approvedRevenue: payData.filter(x => x.payment_status === "approved").reduce((sum, x) => sum + (x.amount || 0), 0),
        activeStudents: activeCount.count || 0,
      });

      // Enrich payments with profile names
      if (p.data) {
        const userIds = p.data.map((x: any) => {
          const student = Array.isArray(x.student) ? x.student[0] : x.student;
          return student?.user_id;
        }).filter(Boolean);
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
        const pm = new Map((profs || []).map(pr => [pr.user_id, pr]));
        setRecentPayments(p.data.map((x: any) => {
          const student = Array.isArray(x.student) ? x.student[0] : x.student;
          if (student) student.profile = pm.get(student.user_id) || null;
          return { ...x, student };
        }));
      }

      // Enrich recent students with profile names
      if (students.data) {
        const sUserIds = students.data.map((x: any) => x.user_id);
        const { data: sProfs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", sUserIds);
        const spm = new Map((sProfs || []).map(pr => [pr.user_id, pr]));
        setRecentStudents(students.data.map((x: any) => ({
          ...x,
          profile: spm.get(x.user_id),
          course: Array.isArray(x.course) ? x.course[0] : x.course,
        })));
      }

      if (a.data) setRecentAnnouncements(a.data);
      setLoading(false);
    };
    load();
  }, []);

  if (!user) return null;

  const quickActions = [
    { label: "Add Student", icon: UserPlus, path: "/admin/students", color: "bg-primary/10 text-primary hover:bg-primary/20" },
    { label: "Add Lecturer", icon: GraduationCap, path: "/admin/lecturers", color: "bg-success/10 text-success hover:bg-success/20" },
    { label: "Create Course", icon: PlusCircle, path: "/admin/courses", color: "bg-info/10 text-info hover:bg-info/20" },
    { label: "Post Announcement", icon: Megaphone, path: "/admin/announcements", color: "bg-warning/10 text-warning hover:bg-warning/20" },
  ];

  return (
      <div className="space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Campus overview — {new Date().toLocaleDateString("en-UG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </motion.div>

        {/* Stat Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard title="Total Students" value={stats.students} subtitle={`${stats.activeStudents} active`} icon={Users} variant="primary" delay={0} />
          <StatCard title="Lecturers" value={stats.lecturers} subtitle="Academic staff" icon={GraduationCap} delay={0.04} />
          <StatCard title="Active Courses" value={stats.courses} subtitle="Programs offered" icon={BookOpen} variant="success" delay={0.08} />
          <StatCard title="Enrollments" value={stats.enrollments} subtitle="Current term" icon={CalendarDays} variant="info" delay={0.12} />
          <StatCard title="Fees Collected" value={`UGX ${(stats.approvedRevenue / 1000000).toFixed(1)}M`} subtitle={`${stats.pendingPayments} pending`} icon={CreditCard} variant="warning" delay={0.16} />
          <StatCard title="Announcements" value={recentAnnouncements.length} subtitle="Recent posts" icon={Bell} delay={0.2} />
        </div>

        {/* Quick Actions */}
        <AnimatedCard delay={0.22} className="!p-4">
          <SectionHeader title="Quick Actions" icon={Activity} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map((action, i) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.05 }}
                onClick={() => navigate(action.path)}
                className={`flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 ${action.color} group`}
              >
                <div className="w-9 h-9 rounded-lg bg-background/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <action.icon className="w-4.5 h-4.5" />
                </div>
                <span className="text-sm font-semibold">{action.label}</span>
              </motion.button>
            ))}
          </div>
        </AnimatedCard>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Recent Students */}
          <AnimatedCard delay={0.28}>
            <SectionHeader title="Recent Students" icon={Users} badge={stats.students}
              action={<Button variant="ghost" size="sm" className="text-xs h-7 rounded-lg" onClick={() => navigate("/admin/students")}>View All</Button>} />
            {recentStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No students yet</p>
            ) : (
              <div className="space-y-2">
                {recentStudents.map((s, i) => (
                  <motion.div key={s.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.04 }}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {s.profile?.full_name?.charAt(0) || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{s.profile?.full_name || "—"}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{s.course?.course_name || "No course"}</p>
                    </div>
                    <Badge variant={s.status === "active" ? "default" : "secondary"} className="text-[9px] h-5 px-1.5 rounded-md shrink-0">
                      {s.status}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatedCard>

          {/* Recent Payments */}
          <AnimatedCard delay={0.32}>
            <SectionHeader title="Recent Payments" icon={CreditCard} badge={stats.pendingPayments}
              action={<Button variant="ghost" size="sm" className="text-xs h-7 rounded-lg" onClick={() => navigate("/admin/fees")}>View All</Button>} />
            {recentPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No payments yet</p>
            ) : (
              <div className="space-y-2">
                {recentPayments.map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.34 + i * 0.04 }}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{p.student?.profile?.full_name || "—"}</p>
                      <p className="text-[10px] text-muted-foreground">{p.student?.registration_number || "—"}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-xs font-bold font-mono">UGX {p.amount?.toLocaleString()}</p>
                      <Badge variant={p.payment_status === "approved" ? "default" : p.payment_status === "pending" ? "secondary" : "destructive"}
                        className="text-[9px] h-4 px-1.5 rounded-md mt-0.5">{p.payment_status}</Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatedCard>

          {/* Recent Announcements */}
          <AnimatedCard delay={0.36}>
            <SectionHeader title="Announcements" icon={Bell}
              action={<Button variant="ghost" size="sm" className="text-xs h-7 rounded-lg" onClick={() => navigate("/admin/announcements")}>View All</Button>} />
            {recentAnnouncements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No announcements yet</p>
            ) : (
              <div className="space-y-2.5">
                {recentAnnouncements.map((a, i) => (
                  <motion.div key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.38 + i * 0.05 }}
                    className="p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={a.priority === "high" ? "destructive" : "secondary"} className="text-[9px] h-4 px-1.5 rounded-md font-semibold">
                        {a.priority}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {new Date(a.created_at).toLocaleDateString("en-UG", { month: "short", day: "numeric" })}
                      </span>
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5 rounded-md ml-auto">{a.target_group}</Badge>
                    </div>
                    <p className="text-sm font-semibold leading-snug">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{a.message}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatedCard>
        </div>

        {/* Institutional Overview Bar */}
        <AnimatedCard delay={0.4} className="!p-4">
          <SectionHeader title="Institutional Overview" icon={BarChart3} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Active Students", value: stats.activeStudents, icon: Users, color: "text-primary" },
              { label: "Current Enrollments", value: stats.enrollments, icon: CalendarDays, color: "text-info" },
              { label: "Pending Payments", value: stats.pendingPayments, icon: Clock, color: "text-warning" },
              { label: "Total Revenue", value: `UGX ${stats.approvedRevenue.toLocaleString()}`, icon: CreditCard, color: "text-success" },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 + i * 0.05 }}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center shrink-0">
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className={`font-display text-lg font-extrabold ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatedCard>
      </div>
  );
}
