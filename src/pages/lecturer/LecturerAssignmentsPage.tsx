import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedCard, SectionHeader } from "@/components/dashboard/DashboardParts";
import { ClipboardList, PlusCircle, Trash2, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function LecturerAssignmentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [maxGrade, setMaxGrade] = useState("100");
  const [instructions, setInstructions] = useState("");

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

  // Get submission counts per assignment
  const assignmentIds = assignments.map(a => a.id);
  const { data: submissions = [] } = useQuery({
    queryKey: ["lecturer-assignment-submissions-count", assignmentIds],
    queryFn: async () => {
      if (assignmentIds.length === 0) return [];
      const { data } = await supabase.from("submissions").select("id, assignment_id, status").in("assignment_id", assignmentIds);
      return data || [];
    },
    enabled: assignmentIds.length > 0,
  });

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

            return (
              <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <AnimatedCard delay={i * 0.03}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{course?.course_code || "—"}</span>
                        <Badge variant={isPast ? "destructive" : "outline"} className="text-[10px]">
                          {isPast ? "Past Due" : "Active"}
                        </Badge>
                      </div>
                      <h3 className="font-semibold">{a.title}</h3>
                      {a.instructions && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.instructions}</p>}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(a.deadline).toLocaleDateString("en-UG", { month: "short", day: "numeric", year: "numeric" })}</span>
                        <span>Max: {a.max_grade} pts</span>
                        <span>{submitted} submitted</span>
                        <span>{graded} graded</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => {
                      if (confirm("Delete this assignment?")) deleteMutation.mutate(a.id);
                    }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </AnimatedCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
