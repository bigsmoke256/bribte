import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { AnimatedCard, SectionHeader } from "@/components/dashboard/DashboardParts";
import { Users, CreditCard, GraduationCap, BarChart3, TrendingUp, Bell, CheckCircle, XCircle, Download, PlusCircle, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function AdminDashboardHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ students: 0, lecturers: 0, courses: 0, pendingPayments: 0, approvedRevenue: 0, enrollments: 0 });
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const [s, l, c, e, p, a] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("lecturers").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("enrollments").select("id", { count: "exact", head: true }),
        supabase.from("payments").select("*, student:students!payments_student_id_fkey(registration_number, profile:profiles!students_user_id_fkey(full_name))").order("created_at", { ascending: false }).limit(5),
        supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(4),
      ]);

      const allPayments = await supabase.from("payments").select("amount, payment_status");
      const payData = allPayments.data || [];

      setStats({
        students: s.count || 0,
        lecturers: l.count || 0,
        courses: c.count || 0,
        enrollments: e.count || 0,
        pendingPayments: payData.filter(x => x.payment_status === "pending").length,
        approvedRevenue: payData.filter(x => x.payment_status === "approved").reduce((sum, x) => sum + (x.amount || 0), 0),
      });

      if (p.data) {
        setRecentPayments(p.data.map((x: any) => {
          const student = Array.isArray(x.student) ? x.student[0] : x.student;
          if (student) student.profile = Array.isArray(student.profile) ? student.profile[0] : student.profile;
          return { ...x, student };
        }));
      }
      if (a.data) setRecentAnnouncements(a.data);
    };
    load();
  }, []);

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Overview of BRIBTE campus operations</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Students" value={stats.students.toLocaleString()} subtitle="Registered" icon={Users} variant="primary" delay={0} />
          <StatCard title="Academic Staff" value={stats.lecturers} subtitle="Lecturers" icon={GraduationCap} delay={0.05} />
          <StatCard title="Total Courses" value={stats.courses} subtitle="Programs" icon={BarChart3} variant="success" delay={0.1} />
          <StatCard title="Pending Payments" value={stats.pendingPayments} subtitle="Awaiting approval" icon={CreditCard} variant="warning" delay={0.15} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <AnimatedCard delay={0.2}>
            <SectionHeader title="Recent Payments" icon={CreditCard} badge={stats.pendingPayments} />
            {recentPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No payments yet</p>
            ) : (
              <div className="space-y-2">
                {recentPayments.map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 + i * 0.04 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{p.student?.profile?.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.student?.registration_number || "—"} • UGX {p.amount.toLocaleString()}</p>
                    </div>
                    <span className={`metric-badge text-[10px] font-semibold ${
                      p.payment_status === "approved" ? "bg-success/10 text-success" :
                      p.payment_status === "pending" ? "bg-warning/10 text-warning" :
                      "bg-destructive/10 text-destructive"}`}>{p.payment_status}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatedCard>

          <AnimatedCard delay={0.25}>
            <SectionHeader title="Recent Announcements" icon={Bell} />
            {recentAnnouncements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No announcements yet</p>
            ) : (
              <div className="space-y-2.5">
                {recentAnnouncements.map((a, i) => (
                  <motion.div key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
                    className="p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant={a.priority === "high" ? "destructive" : "secondary"} className="text-[10px] h-5 px-2 rounded-md font-semibold">{a.priority}</Badge>
                      <span className="text-[10px] text-muted-foreground font-medium">{new Date(a.created_at).toLocaleDateString("en-UG", { month: "short", day: "numeric" })}</span>
                      <span className="metric-badge metric-badge-info text-[9px] ml-auto">{a.target_group}</span>
                    </div>
                    <p className="text-sm font-semibold leading-snug">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{a.message}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatedCard>
        </div>

        <AnimatedCard delay={0.3}>
          <SectionHeader title="Institutional Overview" icon={Activity} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Courses", value: stats.courses, color: "text-primary" },
              { label: "Active Enrollments", value: stats.enrollments, color: "text-success" },
              { label: "Pending Payments", value: stats.pendingPayments, color: "text-warning" },
              { label: "Total Revenue", value: `UGX ${stats.approvedRevenue.toLocaleString()}`, color: "text-accent" },
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
