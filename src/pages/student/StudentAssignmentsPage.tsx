import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useMemo } from "react";
import { AnimatedCard, SectionHeader, EmptyState } from "@/components/dashboard/DashboardParts";
import { FileText, CheckCircle, Clock, AlertTriangle, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function StudentAssignmentsPage() {
  const { user } = useAuth();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [submitFile, setSubmitFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function loadData() {
    const { data: student } = await supabase
      .from("students").select("id, course_id").eq("user_id", user!.id).maybeSingle();
    if (!student) { setLoading(false); return; }
    setStudentId(student.id);
    setCourseId(student.course_id);

    const [assignRes, subRes] = await Promise.all([
      supabase.from("assignments")
        .select("id, title, deadline, max_grade, course_id, instructions, course:courses(course_name, course_code)")
        .eq("course_id", student.course_id || "")
        .order("deadline", { ascending: true }),
      supabase.from("submissions")
        .select("id, assignment_id, status, grade, feedback, submitted_at, file_url")
        .eq("student_id", student.id),
    ]);

    setAssignments((assignRes.data as any[]) || []);
    setSubmissions(subRes.data || []);
    setLoading(false);
  }

  const assignmentList = useMemo(() => {
    const subMap = new Map(submissions.map(s => [s.assignment_id, s]));
    return assignments.map(a => ({
      ...a,
      submission: subMap.get(a.id) || null,
      effectiveStatus: subMap.has(a.id) ? subMap.get(a.id)!.status : (new Date(a.deadline) < new Date() ? "overdue" : "pending"),
    }));
  }, [assignments, submissions]);

  // Pending = no submission and not overdue, or overdue with no submission
  // Submitted = has a submission with status "submitted" (not yet graded)
  // Graded = has a submission with status "graded"
  const pending = assignmentList.filter(a => !a.submission && (a.effectiveStatus === "pending" || a.effectiveStatus === "overdue"));
  const submitted = assignmentList.filter(a => a.submission && a.submission.status === "submitted");
  const graded = assignmentList.filter(a => a.submission && a.submission.status === "graded");

  async function handleSubmit() {
    if (!studentId || !selectedAssignment || !submitFile) return;
    setSubmitting(true);
    try {
      const fileExt = submitFile.name.split(".").pop();
      const filePath = `${studentId}/${selectedAssignment.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("submissions")
        .upload(filePath, submitFile);

      if (uploadError) throw uploadError;

      // Store just the file path, not the full URL (bucket is private)
      const { error: insertError } = await supabase.from("submissions").insert({
        assignment_id: selectedAssignment.id,
        student_id: studentId,
        file_url: filePath,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;

      toast.success("Assignment submitted successfully!");
      setSubmitOpen(false);
      setSubmitFile(null);
      setSelectedAssignment(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  function AssignmentCard({ a, i }: { a: any; i: number }) {
    const isOverdue = a.effectiveStatus === "overdue";
    const isPending = a.effectiveStatus === "pending";
    return (
      <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
        className="p-4 rounded-2xl border bg-card hover:shadow-sm transition-all">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              a.effectiveStatus === "graded" ? "bg-success/10" : isOverdue ? "bg-destructive/10" : a.effectiveStatus === "submitted" ? "bg-info/10" : "bg-warning/10"
            }`}>
              {a.effectiveStatus === "graded" ? <CheckCircle className="w-5 h-5 text-success" /> :
               isOverdue ? <AlertTriangle className="w-5 h-5 text-destructive" /> :
               a.effectiveStatus === "submitted" ? <Upload className="w-5 h-5 text-info" /> :
               <Clock className="w-5 h-5 text-warning" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm">{a.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{a.course?.course_code} • Due {new Date(a.deadline).toLocaleDateString("en-UG", { month: "short", day: "numeric", year: "numeric" })}</p>
              {a.instructions && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.instructions}</p>}
              {a.submission?.grade != null && (
                <p className="text-sm font-bold text-success mt-1">Grade: {a.submission.grade}/{a.max_grade}</p>
              )}
              {a.submission?.feedback && (
                <p className="text-xs text-muted-foreground mt-0.5 italic">"{a.submission.feedback}"</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={a.effectiveStatus === "graded" ? "default" : a.effectiveStatus === "submitted" ? "secondary" : isOverdue ? "destructive" : "outline"} className="text-[10px] h-5">
              {a.effectiveStatus}
            </Badge>
            {(isPending || isOverdue) && !a.submission && (
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setSelectedAssignment(a); setSubmitOpen(true); }}>
                Submit
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold">Assignments</h1>
        <p className="text-sm text-muted-foreground mt-1">Track and submit your assignments</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-warning/5 border border-warning/20 text-center">
          <p className="text-2xl font-bold text-warning">{pending.length}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
        <div className="p-4 rounded-2xl bg-info/5 border border-info/20 text-center">
          <p className="text-2xl font-bold text-info">{submitted.length}</p>
          <p className="text-xs text-muted-foreground">Submitted</p>
        </div>
        <div className="p-4 rounded-2xl bg-success/5 border border-success/20 text-center">
          <p className="text-2xl font-bold text-success">{graded.length}</p>
          <p className="text-xs text-muted-foreground">Graded</p>
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All ({assignmentList.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="submitted">Submitted ({submitted.length})</TabsTrigger>
          <TabsTrigger value="graded">Graded ({graded.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="space-y-3">
          {assignmentList.length === 0 ? <EmptyState icon={FileText} title="No Assignments" description="No assignments have been created yet." /> :
            assignmentList.map((a, i) => <AssignmentCard key={a.id} a={a} i={i} />)}
        </TabsContent>
        <TabsContent value="pending" className="space-y-3">
          {pending.length === 0 ? <EmptyState icon={CheckCircle} title="All Clear" description="No pending assignments." /> :
            pending.map((a, i) => <AssignmentCard key={a.id} a={a} i={i} />)}
        </TabsContent>
        <TabsContent value="submitted" className="space-y-3">
          {submitted.length === 0 ? <EmptyState icon={Upload} title="None Submitted" description="No submitted assignments." /> :
            submitted.map((a, i) => <AssignmentCard key={a.id} a={a} i={i} />)}
        </TabsContent>
        <TabsContent value="graded" className="space-y-3">
          {graded.length === 0 ? <EmptyState icon={CheckCircle} title="No Grades Yet" description="No graded assignments." /> :
            graded.map((a, i) => <AssignmentCard key={a.id} a={a} i={i} />)}
        </TabsContent>
      </Tabs>

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Assignment</DialogTitle>
            <DialogDescription>Upload your work for "{selectedAssignment?.title}"</DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label>Upload File</Label>
            <Input type="file" onChange={e => setSubmitFile(e.target.files?.[0] || null)} />
            <p className="text-xs text-muted-foreground">Accepted: PDF, Word, PowerPoint, Excel, images, audio, video, and more. Max size: 100MB.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !submitFile}>
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
