import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedCard, SectionHeader } from "@/components/dashboard/DashboardParts";
import { ClipboardList, PlusCircle, Trash2, Calendar, Users, AlertTriangle, CheckCircle, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function LecturerAssignmentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [maxGrade, setMaxGrade] = useState("100");
  const [instructions, setInstructions] = useState("");
  const [detailAssignment, setDetailAssignment] = useState<any>(null);

  const { data: courses = [] } = useQuery({
    queryKey: ["lecturer-courses", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, course_code, course_name").eq("lecturer_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["lecturer-assignments-full", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("assignments")
        .select("id, title, course_id, deadline, max_grade, instructions, created_at")
        .eq("lecturer_id", user!.id)
        .order("deadline", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Get ALL submissions for lecturer's assignments
  const assignmentIds = assignments.map(a => a.id);
  const { data: submissions = [] } = useQuery({
    queryKey: ["lecturer-assignment-submissions-count", assignmentIds],
    queryFn: async () => {
      if (assignmentIds.length === 0) return [];
      const { data } = await supabase.from("submissions").select("id, assignment_id, status, student_id").in("assignment_id", assignmentIds);
      return data || [];
    },
    enabled: assignmentIds.length > 0,
  });

  // Get enrolled students per course (to know who SHOULD submit)
  const courseIds = [...new Set(assignments.map(a => a.course_id))];
  const { data: enrollments = [] } = useQuery({
    queryKey: ["lecturer-course-enrollments", courseIds],
    queryFn: async () => {
      if (courseIds.length === 0) return [];
      const { data } = await supabase
        .from("enrollments")
        .select("student_id, course_id")
        .in("course_id", courseIds)
        .eq("status", "approved");
      return data || [];
    },
    enabled: courseIds.length > 0,
  });

  // Also get students directly assigned to course (students.course_id)
  const { data: directStudents = [] } = useQuery({
    queryKey: ["lecturer-direct-students", courseIds],
    queryFn: async () => {
      if (courseIds.length === 0) return [];
      const { data } = await supabase
        .from("students")
        .select("id, course_id, user_id, registration_number")
        .in("course_id", courseIds)
        .eq("status", "active");
      return data || [];
    },
    enabled: courseIds.length > 0,
  });

  // Get profiles for student names
  const allStudentUserIds = [...new Set(directStudents.map(s => s.user_id))];
  const { data: profiles = [] } = useQuery({
    queryKey: ["lecturer-student-profiles", allStudentUserIds],
    queryFn: async () => {
      if (allStudentUserIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", allStudentUserIds);
      return data || [];
    },
    enabled: allStudentUserIds.length > 0,
  });

  // Build a map: courseId -> enrolled student IDs (union of enrollments + direct)
  function getEnrolledStudentsForCourse(cId: string) {
    const fromEnrollments = enrollments.filter(e => e.course_id === cId).map(e => e.student_id);
    const fromDirect = directStudents.filter(s => s.course_id === cId).map(s => s.id);
    return [...new Set([...fromEnrollments, ...fromDirect])];
  }

  function getStudentName(studentId: string) {
    const student = directStudents.find(s => s.id === studentId);
    if (!student) return "Unknown Student";
    const profile = profiles.find(p => p.user_id === student.user_id);
    return profile?.full_name || "Unknown Student";
  }

  function getStudentRegNo(studentId: string) {
    return directStudents.find(s => s.id === studentId)?.registration_number || "";
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("assignments").insert({
        title,
        course_id: courseId,
        lecturer_id: user!.id,
        deadline: new Date(deadline).toISOString(),
        max_grade: parseInt(maxGrade),
        instructions: instructions || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lecturer-assignments-full"] });
      toast.success("Assignment created successfully");
      setOpen(false);
      setTitle(""); setCourseId(""); setDeadline(""); setMaxGrade("100"); setInstructions("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assignments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lecturer-assignments-full"] });
      toast.success("Assignment deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Detail dialog data
  const detailEnrolled = detailAssignment ? getEnrolledStudentsForCourse(detailAssignment.course_id) : [];
  const detailSubmitted = detailAssignment ? submissions.filter(s => s.assignment_id === detailAssignment.id).map(s => s.student_id) : [];
  const detailMissing = detailEnrolled.filter(id => !detailSubmitted.includes(id));

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Assignments</h1>
          <p className="text-sm text-muted-foreground mt-1">Create and manage assignments for your courses</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl"><PlusCircle className="w-4 h-4 mr-2" />New Assignment</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Create Assignment</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Midterm Project" />
              </div>
              <div>
                <Label>Course</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                  <SelectContent>
                    {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.course_code} - {c.course_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Deadline</Label>
                  <Input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} />
                </div>
                <div>
                  <Label>Max Grade</Label>
                  <Input type="number" value={maxGrade} onChange={e => setMaxGrade(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Instructions (optional)</Label>
                <Textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Assignment instructions..." rows={3} />
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={!title || !courseId || !deadline || createMutation.isPending} className="w-full rounded-xl">
                {createMutation.isPending ? "Creating..." : "Create Assignment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : assignments.length === 0 ? (
        <AnimatedCard><p className="text-center text-muted-foreground py-8">No assignments created yet. Click "New Assignment" to get started.</p></AnimatedCard>
      ) : (
        <div className="space-y-3">
          {assignments.map((a, i) => {
            const course = courses.find(c => c.id === a.course_id);
            const aSubmissions = submissions.filter(s => s.assignment_id === a.id);
            const graded = aSubmissions.filter(s => s.status === "graded").length;
            const submitted = aSubmissions.filter(s => s.status === "submitted").length;
            const isPast = new Date(a.deadline) < new Date();
            const enrolled = getEnrolledStudentsForCourse(a.course_id);
            const missing = enrolled.filter(id => !aSubmissions.map(s => s.student_id).includes(id)).length;

            return (
              <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <AnimatedCard delay={i * 0.03}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 cursor-pointer" onClick={() => setDetailAssignment(a)}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{course?.course_code || "—"}</span>
                        <Badge variant={isPast ? "destructive" : "outline"} className="text-[10px]">
                          {isPast ? "Past Due" : "Active"}
                        </Badge>
                        {missing > 0 && isPast && (
                          <Badge variant="destructive" className="text-[10px] gap-1">
                            <UserX className="w-3 h-3" />{missing} missing
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold">{a.title}</h3>
                      {a.instructions && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.instructions}</p>}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(a.deadline).toLocaleDateString("en-UG", { month: "short", day: "numeric", year: "numeric" })}</span>
                        <span>Max: {a.max_grade} pts</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{enrolled.length} enrolled</span>
                        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-success" />{submitted + graded} submitted</span>
                        {missing > 0 && <span className="flex items-center gap-1 text-destructive font-medium"><AlertTriangle className="w-3 h-3" />{missing} not submitted</span>}
                        <span>{graded} graded</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="rounded-xl text-xs h-8" onClick={() => setDetailAssignment(a)}>
                        <Users className="w-3.5 h-3.5 mr-1.5" />View Students
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => {
                        if (confirm("Delete this assignment?")) deleteMutation.mutate(a.id);
                      }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </AnimatedCard>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Detail: Submitted vs Missing Students */}
      <Dialog open={!!detailAssignment} onOpenChange={(v) => !v && setDetailAssignment(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{detailAssignment?.title}</DialogTitle>
            <DialogDescription>
              {courses.find(c => c.id === detailAssignment?.course_id)?.course_code} • Due {detailAssignment && new Date(detailAssignment.deadline).toLocaleDateString("en-UG", { month: "short", day: "numeric", year: "numeric" })}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="p-3 rounded-xl bg-success/10 border border-success/20 text-center">
              <p className="text-xl font-bold text-success">{detailSubmitted.length}</p>
              <p className="text-[10px] text-muted-foreground">Submitted</p>
            </div>
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
              <p className="text-xl font-bold text-destructive">{detailMissing.length}</p>
              <p className="text-[10px] text-muted-foreground">Not Submitted</p>
            </div>
          </div>

          <ScrollArea className="max-h-[350px] mt-3">
            {detailMissing.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-destructive flex items-center gap-1.5 mb-2">
                  <UserX className="w-3.5 h-3.5" />Haven't Submitted ({detailMissing.length})
                </h4>
                <div className="space-y-1.5">
                  {detailMissing.map(id => (
                    <div key={id} className="flex items-center gap-3 p-2.5 rounded-lg bg-destructive/5 border border-destructive/10">
                      <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{getStudentName(id)}</p>
                        <p className="text-[10px] text-muted-foreground">{getStudentRegNo(id)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailSubmitted.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-success flex items-center gap-1.5 mb-2">
                  <CheckCircle className="w-3.5 h-3.5" />Submitted ({detailSubmitted.length})
                </h4>
                <div className="space-y-1.5">
                  {detailSubmitted.map(id => (
                    <div key={id} className="flex items-center gap-3 p-2.5 rounded-lg bg-success/5 border border-success/10">
                      <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{getStudentName(id)}</p>
                        <p className="text-[10px] text-muted-foreground">{getStudentRegNo(id)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailEnrolled.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No enrolled students found for this course.</p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
