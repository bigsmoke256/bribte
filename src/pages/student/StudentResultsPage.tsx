import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useMemo } from "react";
import { AnimatedCard, SectionHeader, EmptyState } from "@/components/dashboard/DashboardParts";
import { BarChart3, Award, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

export default function StudentResultsPage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) loadData(); }, [user]);

  async function loadData() {
    const { data: student } = await supabase.from("students").select("id").eq("user_id", user!.id).maybeSingle();
    if (!student) { setLoading(false); return; }

    const { data } = await supabase
      .from("submissions")
      .select("id, grade, status, feedback, assignment:assignments(title, max_grade, course:courses(course_name, course_code))")
      .eq("student_id", student.id)
      .eq("status", "graded");

    setSubmissions((data as any[]) || []);
    setLoading(false);
  }

  const stats = useMemo(() => {
    if (submissions.length === 0) return { avg: 0, highest: 0, count: 0 };
    const percentages = submissions.map(s => (s.grade / s.assignment.max_grade) * 100);
    return {
      avg: percentages.reduce((a, b) => a + b, 0) / percentages.length,
      highest: Math.max(...percentages),
      count: submissions.length,
    };
  }, [submissions]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold">Results & GPA</h1>
        <p className="text-sm text-muted-foreground mt-1">View your graded work and performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AnimatedCard delay={0}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Average Score</p><p className="font-display text-xl font-bold">{stats.avg.toFixed(1)}%</p></div>
          </div>
        </AnimatedCard>
        <AnimatedCard delay={0.05}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center"><Award className="w-5 h-5 text-success" /></div>
            <div><p className="text-xs text-muted-foreground">Highest Score</p><p className="font-display text-xl font-bold">{stats.highest.toFixed(1)}%</p></div>
          </div>
        </AnimatedCard>
        <AnimatedCard delay={0.1}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-info" /></div>
            <div><p className="text-xs text-muted-foreground">Graded Assignments</p><p className="font-display text-xl font-bold">{stats.count}</p></div>
          </div>
        </AnimatedCard>
      </div>

      <AnimatedCard delay={0.15}>
        <SectionHeader title="Graded Work" icon={BarChart3} />
        {submissions.length === 0 ? (
          <EmptyState icon={BarChart3} title="No Results" description="No graded assignments yet." />
        ) : (
          <div className="space-y-3 mt-4">
            {submissions.map((s, i) => {
              const pct = (s.grade / s.assignment.max_grade) * 100;
              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">{s.assignment.title}</p>
                      <p className="text-xs text-muted-foreground">{s.assignment.course?.course_code} — {s.assignment.course?.course_name}</p>
                    </div>
                    <Badge variant={pct >= 70 ? "default" : pct >= 50 ? "secondary" : "destructive"} className="text-xs">
                      {s.grade}/{s.assignment.max_grade}
                    </Badge>
                  </div>
                  <Progress value={pct} className="h-2" />
                  {s.feedback && <p className="text-xs text-muted-foreground mt-2 italic">"{s.feedback}"</p>}
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatedCard>
    </div>
  );
}
