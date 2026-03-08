import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedCard } from "@/components/dashboard/DashboardParts";
import { CheckCircle, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function LecturerGradesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedAssignment, setSelectedAssignment] = useState("");
  const [grades, setGrades] = useState<Record<string, { grade: string; feedback: string }>>({});

  const { data: assignments = [] } = useQuery({
    queryKey: ["lecturer-assignments", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("assignments").select("id, title, course_id, max_grade").eq("lecturer_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["lecturer-courses", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, course_code, course_name").eq("lecturer_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["lecturer-grade-submissions", selectedAssignment],
    queryFn: async () => {
      if (!selectedAssignment) return [];
      const { data } = await supabase.from("submissions").select("*").eq("assignment_id", selectedAssignment).order("submitted_at", { ascending: true });
      return data || [];
    },
    enabled: !!selectedAssignment,
  });

  const studentIds = [...new Set(submissions.map(s => s.student_id))];
  const { data: studentProfiles = [] } = useQuery({
    queryKey: ["lecturer-grade-students", studentIds],
    queryFn: async () => {
      if (studentIds.length === 0) return [];
      const { data: students } = await supabase.from("students").select("id, user_id, registration_number").in("id", studentIds);
      if (!students) return [];
      const userIds = students.map(s => s.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      return students.map(s => ({
        studentId: s.id,
        regNo: s.registration_number,
        name: profiles?.find(p => p.user_id === s.user_id)?.full_name || "Unknown",
      }));
    },
    enabled: studentIds.length > 0,
  });

  const saveMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      const g = grades[submissionId];
      if (!g) return;
      const { error } = await supabase.from("submissions").update({
        grade: parseFloat(g.grade),
        feedback: g.feedback || null,
        status: "graded",
      }).eq("id", submissionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lecturer-grade-submissions"] });
      toast.success("Grade saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const currentAssignment = assignments.find(a => a.id === selectedAssignment);
  const currentCourse = courses.find(c => c.id === currentAssignment?.course_id);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold">Grade Entry</h1>
        <p className="text-sm text-muted-foreground mt-1">Grade and provide feedback on student submissions</p>
      </div>

      <AnimatedCard>
        <div className="max-w-sm">
          <label className="text-sm font-medium mb-2 block">Select Assignment</label>
          <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
            <SelectTrigger><SelectValue placeholder="Choose an assignment to grade" /></SelectTrigger>
            <SelectContent>
              {assignments.map(a => {
                const c = courses.find(c => c.id === a.course_id);
                return <SelectItem key={a.id} value={a.id}>{c?.course_code} — {a.title}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>
      </AnimatedCard>

      {selectedAssignment && (
        isLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        ) : submissions.length === 0 ? (
          <AnimatedCard><p className="text-center text-muted-foreground py-8">No submissions for this assignment yet.</p></AnimatedCard>
        ) : (
          <div className="space-y-3">
            {submissions.map((s, i) => {
              const student = studentProfiles.find(sp => sp.studentId === s.student_id);
              const localGrade = grades[s.id];
              const gradeValue = localGrade?.grade ?? (s.grade !== null ? String(s.grade) : "");
              const feedbackValue = localGrade?.feedback ?? (s.feedback || "");

              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <AnimatedCard delay={i * 0.03}>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold">{student?.name || "Unknown"}</p>
                          <Badge variant={s.status === "graded" ? "default" : "secondary"} className={`text-[10px] ${s.status === "graded" ? "bg-success text-success-foreground" : ""}`}>
                            {s.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{student?.regNo || ""}</p>
                        {s.file_url && (
                          <a href={s.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">View submission file</a>
                        )}
                        {s.submitted_at && <p className="text-[10px] text-muted-foreground mt-1">Submitted {new Date(s.submitted_at).toLocaleDateString("en-UG", { month: "short", day: "numeric", year: "numeric" })}</p>}
                      </div>
                      <div className="flex flex-col gap-2 sm:w-64">
                        <div className="flex items-center gap-2">
                          <Input type="number" placeholder="Grade" value={gradeValue}
                            onChange={e => setGrades(prev => ({ ...prev, [s.id]: { ...prev[s.id], grade: e.target.value, feedback: feedbackValue } }))}
                            className="w-24" min={0} max={currentAssignment?.max_grade || 100} />
                          <span className="text-sm text-muted-foreground">/ {currentAssignment?.max_grade || 100}</span>
                        </div>
                        <Textarea placeholder="Feedback (optional)" value={feedbackValue} rows={2}
                          onChange={e => setGrades(prev => ({ ...prev, [s.id]: { ...prev[s.id], feedback: e.target.value, grade: gradeValue } }))} />
                        <Button size="sm" className="rounded-xl" onClick={() => saveMutation.mutate(s.id)}
                          disabled={!gradeValue || saveMutation.isPending}>
                          <Save className="w-3.5 h-3.5 mr-1.5" />{saveMutation.isPending ? "Saving..." : "Save Grade"}
                        </Button>
                      </div>
                    </div>
                  </AnimatedCard>
                </motion.div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
