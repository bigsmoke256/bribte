import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useMemo } from "react";
import { AnimatedCard, EmptyState } from "@/components/dashboard/DashboardParts";
import {
  FileText, CheckCircle, Clock, AlertTriangle, Upload, Download,
  ChevronRight, BookOpen, Calendar, Award, MessageSquare, Paperclip,
  FileDown, ArrowUpRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
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
  const [detailOpen, setDetailOpen] = useState(false);
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
        .select("id, title, deadline, max_grade, course_id, instructions, file_url, course:courses(course_name, course_code)")
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

  const pending = assignmentList.filter(a => !a.submission && (a.effectiveStatus === "pending" || a.effectiveStatus === "overdue"));
  const submitted = assignmentList.filter(a => a.submission && a.submission.status === "submitted");
  const graded = assignmentList.filter(a => a.submission && a.submission.status === "graded");

  const completionRate = assignmentList.length > 0
    ? Math.round(((submitted.length + graded.length) / assignmentList.length) * 100)
    : 0;

  async function handleDownloadAssignmentFile(fileUrl: string, title: string) {
    try {
      // Try getting a signed/public URL from the assignments bucket
      const { data } = supabase.storage.from("assignments").getPublicUrl(fileUrl);
      if (data?.publicUrl) {
        const a = document.createElement("a");
        a.href = data.publicUrl;
        a.download = title || "assignment-file";
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("Downloading assignment file...");
      }
    } catch {
      toast.error("Could not download file");
    }
  }

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

  function getDaysLeft(deadline: string) {
    const diff = new Date(deadline).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  }

  function getStatusConfig(status: string) {
    switch (status) {
      case "graded": return { color: "text-success", bg: "bg-success/10", border: "border-success/20", icon: CheckCircle, label: "Graded" };
      case "submitted": return { color: "text-info", bg: "bg-info/10", border: "border-info/20", icon: Upload, label: "Submitted" };
      case "overdue": return { color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20", icon: AlertTriangle, label: "Overdue" };
      default: return { color: "text-warning", bg: "bg-warning/10", border: "border-warning/20", icon: Clock, label: "Pending" };
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  function AssignmentCard({ a, i }: { a: any; i: number }) {
    const status = getStatusConfig(a.effectiveStatus);
    const StatusIcon = status.icon;
    const daysLeft = getDaysLeft(a.deadline);
    const isPending = a.effectiveStatus === "pending";
    const isOverdue = a.effectiveStatus === "overdue";

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.04, duration: 0.3 }}
        className={`group relative rounded-2xl border ${status.border} bg-card overflow-hidden hover:shadow-md transition-all duration-300 cursor-pointer`}
        onClick={() => { setSelectedAssignment(a); setDetailOpen(true); }}
      >
        {/* Status accent strip */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${status.bg.replace('/10', '/60')}`} />

        <div className="p-4 pl-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className={`w-11 h-11 rounded-xl ${status.bg} flex items-center justify-center flex-shrink-0`}>
                <StatusIcon className={`w-5 h-5 ${status.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{a.title}</h3>
                  {a.file_url && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded-md">
                      <Paperclip className="w-2.5 h-2.5" />File
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span className="font-medium text-primary/80">{a.course?.course_code}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(a.deadline).toLocaleDateString("en-UG", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  {isPending && daysLeft > 0 && (
                    <>
                      <span>•</span>
                      <span className={`font-medium ${daysLeft <= 3 ? "text-destructive" : daysLeft <= 7 ? "text-warning" : "text-muted-foreground"}`}>
                        {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
                      </span>
                    </>
                  )}
                </div>
                {a.instructions && (
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{a.instructions}</p>
                )}
                {a.submission?.grade != null && (
                  <div className="flex items-center gap-2 mt-2">
                    <Award className="w-3.5 h-3.5 text-success" />
                    <span className="text-sm font-bold text-success">{a.submission.grade}/{a.max_grade}</span>
                    <span className="text-[10px] text-muted-foreground">
                      ({Math.round((a.submission.grade / a.max_grade) * 100)}%)
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <Badge
                variant={a.effectiveStatus === "graded" ? "default" : a.effectiveStatus === "submitted" ? "secondary" : isOverdue ? "destructive" : "outline"}
                className="text-[10px] h-5"
              >
                {status.label}
              </Badge>
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="font-display text-2xl font-bold">Assignments</h1>
        <p className="text-sm text-muted-foreground mt-1">Track, download, and submit your coursework</p>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="p-4 rounded-2xl bg-card border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground font-medium">Completion</p>
            <BookOpen className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold">{completionRate}%</p>
          <Progress value={completionRate} className="h-1.5 mt-2" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="p-4 rounded-2xl bg-warning/5 border border-warning/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground font-medium">Pending</p>
            <Clock className="w-4 h-4 text-warning" />
          </div>
          <p className="text-2xl font-bold text-warning">{pending.length}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Need your attention</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="p-4 rounded-2xl bg-info/5 border border-info/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground font-medium">Submitted</p>
            <Upload className="w-4 h-4 text-info" />
          </div>
          <p className="text-2xl font-bold text-info">{submitted.length}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Awaiting grading</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="p-4 rounded-2xl bg-success/5 border border-success/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground font-medium">Graded</p>
            <CheckCircle className="w-4 h-4 text-success" />
          </div>
          <p className="text-2xl font-bold text-success">{graded.length}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {graded.length > 0 ? `Avg: ${Math.round(graded.reduce((s, a) => s + (a.submission?.grade || 0), 0) / graded.length)}pts` : "No grades yet"}
          </p>
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="bg-muted/60">
          <TabsTrigger value="all">All ({assignmentList.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="submitted">Submitted ({submitted.length})</TabsTrigger>
          <TabsTrigger value="graded">Graded ({graded.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="space-y-2.5">
          {assignmentList.length === 0 ? <EmptyState icon={FileText} title="No Assignments" description="No assignments have been created yet." /> :
            assignmentList.map((a, i) => <AssignmentCard key={a.id} a={a} i={i} />)}
        </TabsContent>
        <TabsContent value="pending" className="space-y-2.5">
          {pending.length === 0 ? <EmptyState icon={CheckCircle} title="All Clear" description="No pending assignments." /> :
            pending.map((a, i) => <AssignmentCard key={a.id} a={a} i={i} />)}
        </TabsContent>
        <TabsContent value="submitted" className="space-y-2.5">
          {submitted.length === 0 ? <EmptyState icon={Upload} title="None Submitted" description="No submitted assignments." /> :
            submitted.map((a, i) => <AssignmentCard key={a.id} a={a} i={i} />)}
        </TabsContent>
        <TabsContent value="graded" className="space-y-2.5">
          {graded.length === 0 ? <EmptyState icon={CheckCircle} title="No Grades Yet" description="No graded assignments." /> :
            graded.map((a, i) => <AssignmentCard key={a.id} a={a} i={i} />)}
        </TabsContent>
      </Tabs>

      {/* Assignment Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          {selectedAssignment && (() => {
            const a = selectedAssignment;
            const status = getStatusConfig(a.effectiveStatus);
            const StatusIcon = status.icon;
            const daysLeft = getDaysLeft(a.deadline);
            const isPending = a.effectiveStatus === "pending";
            const isOverdue = a.effectiveStatus === "overdue";

            return (
              <>
                {/* Header banner */}
                <div className={`${status.bg} px-6 py-5 relative`}>
                  <div className={`absolute top-3 right-3`}>
                    <Badge
                      variant={a.effectiveStatus === "graded" ? "default" : a.effectiveStatus === "submitted" ? "secondary" : isOverdue ? "destructive" : "outline"}
                      className="text-xs"
                    >
                      <StatusIcon className="w-3 h-3 mr-1" />{status.label}
                    </Badge>
                  </div>
                  <p className="text-xs font-medium text-primary/70 mb-1">{a.course?.course_code} • {a.course?.course_name}</p>
                  <h2 className="font-display text-lg font-bold pr-20">{a.title}</h2>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Due {new Date(a.deadline).toLocaleDateString("en-UG", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Award className="w-3 h-3" />{a.max_grade} pts max</span>
                  </div>
                  {isPending && daysLeft > 0 && (
                    <p className={`text-xs font-semibold mt-1.5 ${daysLeft <= 3 ? "text-destructive" : daysLeft <= 7 ? "text-warning" : "text-muted-foreground"}`}>
                      ⏰ {daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining
                    </p>
                  )}
                </div>

                <ScrollArea className="max-h-[400px]">
                  <div className="px-6 py-4 space-y-5">
                    {/* Instructions */}
                    {a.instructions && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" />Lecturer Instructions
                        </h4>
                        <div className="p-4 rounded-xl bg-muted/40 border border-border/60">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{a.instructions}</p>
                        </div>
                      </div>
                    )}

                    {/* Download assignment file */}
                    {a.file_url && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Paperclip className="w-3.5 h-3.5" />Assignment File
                        </h4>
                        <Button
                          variant="outline"
                          className="w-full justify-between rounded-xl h-12 border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all"
                          onClick={(e) => { e.stopPropagation(); handleDownloadAssignmentFile(a.file_url, a.title); }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <FileDown className="w-4 h-4 text-primary" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-medium">Download Assignment</p>
                              <p className="text-[10px] text-muted-foreground">Save for offline access</p>
                            </div>
                          </div>
                          <Download className="w-4 h-4 text-primary" />
                        </Button>
                      </div>
                    )}

                    {/* Grade & Feedback (if graded) */}
                    {a.submission?.grade != null && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5" />Your Grade
                        </h4>
                        <div className="p-4 rounded-xl bg-success/5 border border-success/20">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-2xl font-bold text-success">{a.submission.grade}<span className="text-sm text-muted-foreground font-normal">/{a.max_grade}</span></p>
                              <p className="text-xs text-muted-foreground mt-0.5">{Math.round((a.submission.grade / a.max_grade) * 100)}% score</p>
                            </div>
                            <div className="w-14 h-14 rounded-full border-4 border-success/30 flex items-center justify-center">
                              <span className="text-sm font-bold text-success">{Math.round((a.submission.grade / a.max_grade) * 100)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {a.submission?.feedback && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5" />Lecturer Feedback
                        </h4>
                        <div className="p-4 rounded-xl bg-muted/40 border border-border/60">
                          <p className="text-sm italic leading-relaxed">"{a.submission.feedback}"</p>
                        </div>
                      </div>
                    )}

                    {/* Submission info */}
                    {a.submission && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle className="w-3.5 h-3.5 text-success" />
                        <span>Submitted on {new Date(a.submission.submitted_at).toLocaleDateString("en-UG", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    )}

                    <Separator />

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      {(a.effectiveStatus === "pending" || a.effectiveStatus === "overdue") && !a.submission && (
                        <Button
                          className="flex-1 rounded-xl h-11"
                          onClick={() => { setDetailOpen(false); setTimeout(() => setSubmitOpen(true), 200); }}
                        >
                          <Upload className="w-4 h-4 mr-2" />Submit Assignment
                        </Button>
                      )}
                      {a.file_url && (
                        <Button
                          variant="outline"
                          className="rounded-xl h-11"
                          onClick={(e) => { e.stopPropagation(); handleDownloadAssignmentFile(a.file_url, a.title); }}
                        >
                          <Download className="w-4 h-4 mr-2" />Download
                        </Button>
                      )}
                      {!a.file_url && a.submission && (
                        <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => setDetailOpen(false)}>
                          Close
                        </Button>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Submit Dialog */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Assignment</DialogTitle>
            <DialogDescription>Upload your work for "{selectedAssignment?.title}"</DialogDescription>
          </DialogHeader>

          {/* Show instructions reminder in submit dialog */}
          {selectedAssignment?.instructions && (
            <div className="p-3 rounded-xl bg-muted/40 border text-xs text-muted-foreground">
              <p className="font-semibold text-foreground text-xs mb-1">📋 Instructions reminder:</p>
              <p className="line-clamp-4">{selectedAssignment.instructions}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Upload File</Label>
            <Input type="file" onChange={e => setSubmitFile(e.target.files?.[0] || null)} />
            <p className="text-xs text-muted-foreground">Accepted: PDF, Word, PowerPoint, Excel, images, audio, video, and more. Max size: 100MB.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !submitFile} className="rounded-xl">
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}