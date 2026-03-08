import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AnimatedCard, SectionHeader } from "@/components/dashboard/DashboardParts";
import { BarChart3, Users, CreditCard, BookOpen, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function AdminReportsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ students: 0, lecturers: 0, courses: 0, payments: 0, revenue: 0, pending: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [s, l, c, p] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("lecturers").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("payments").select("amount, payment_status"),
      ]);
      const payments = p.data || [];
      const revenue = payments.filter(x => x.payment_status === "approved").reduce((sum, x) => sum + (x.amount || 0), 0);
      const pending = payments.filter(x => x.payment_status === "pending").length;
      setStats({
        students: s.count || 0, lecturers: l.count || 0, courses: c.count || 0,
        payments: payments.length, revenue, pending,
      });
    };
    fetchStats();
  }, []);

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Institutional overview and statistics</p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: "Total Students", value: stats.students, icon: Users, color: "text-primary" },
            { label: "Total Lecturers", value: stats.lecturers, icon: Users, color: "text-info" },
            { label: "Total Courses", value: stats.courses, icon: BookOpen, color: "text-success" },
            { label: "Total Payments", value: stats.payments, icon: CreditCard, color: "text-accent" },
            { label: "Total Revenue", value: `UGX ${stats.revenue.toLocaleString()}`, icon: BarChart3, color: "text-success" },
            { label: "Pending Payments", value: stats.pending, icon: CreditCard, color: "text-warning" },
          ].map((s, i) => (
            <AnimatedCard key={s.label} delay={i * 0.05}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                <div>
                  <p className={`font-display text-xl font-extrabold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </AnimatedCard>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
