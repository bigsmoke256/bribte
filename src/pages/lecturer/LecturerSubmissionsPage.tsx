import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedCard } from "@/components/dashboard/DashboardParts";
import { Download, FileText, Image, Film, Music, UserX, AlertTriangle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function LecturerSubmissionsPage() {
  const { user } = useAuth();
  const [assignmentFilter, setAssignmentFilter] = useState("all");

  const { data: assignments = [] } = useQuery({
    queryKey: ["lecturer-assignments", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("assignments").select("id, title, course_id, max_grade, deadline").eq("lecturer_id", user!.id);
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

  const assignmentIds = assignments.map(a => a.id);
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["lecturer-all-submissions", assignmentIds],
    queryFn: async () => {
      if (assignmentIds.length === 0) return [];
      const { data } = await supabase
        .from("submissions")
        .select("*")
        .in("assignment_id", assignmentIds)
        .order("submitted_at", { ascending: false });
      return data || [];
    },
    enabled: assignmentIds.length > 0,
  });

  // Enrolled students (via enrollments + direct course assignment)
  const courseIds = [...new Set(assignments.map(a => a.course_id))];
  const { data: enrollments = [] } = useQuery({
    queryKey: ["lecturer-sub-enrollments", courseIds],
    queryFn: async () => {
      if (courseIds.length === 0) return [];
      const { data } = await supabase.from("enrollments").select("student_id, course_id").in("course_id", courseIds).eq("status", "approved");
      return data || [];
    },
    enabled: courseIds.length > 0,
  });

  const { data: directStudents = [] } = useQuery({
    queryKey: ["lecturer-sub-direct-students", courseIds],
    queryFn: async () => {
      if (courseIds.length === 0) return [];
      const { data } = await supabase.from("students").select("id, course_id, user_id, registration_number").in("course_id", courseIds).eq("status", "active");
      return data || [];
    },
    enabled: courseIds.length > 0,
  });

  const allStudentIds = useMemo(() => {
    const fromSubs = submissions.map(s => s.student_id);
    const fromDirect = directStudents.map(s => s.id);
    const fromEnroll = enrollments.map(e => e.student_id);
    return [...new Set([...fromSubs, ...fromDirect, ...fromEnroll])];
  }, [submissions, directStudents, enrollments]);

  const { data: studentProfiles = [] } = useQuery({
    queryKey: ["lecturer-sub-students", allStudentIds],
    queryFn: async () => {
      if (allStudentIds.length === 0) return [];
      const { data: students } = await supabase.from("students").select("id, user_id, registration_number").in("id", allStudentIds);
      if (!students) return [];
      const userIds = students.map(s => s.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      return students.map(s => ({
        studentId: s.id,
        regNo: s.registration_number,
        name: profiles?.find(p => p.user_id === s.user_id)?.full_name || "Unknown",
      }));
    },
    enabled: allStudentIds.length > 0,
  });

  function getEnrolledForCourse(cId: string) {
    const fromE = enrollments.filter(e => e.course_id === cId).map(e => e.student_id);
    const fromD = directStudents.filter(s => s.course_id === cId).map(s => s.id);
    return [...new Set([...fromE, ...fromD])];
  }

  // Build "not submitted" rows per assignment
  const missingRows = useMemo(() => {
    const rows: { assignmentId: string; studentId: string }[] = [];
    const targetAssignments = assignmentFilter === "all" ? assignments : assignments.filter(a => a.id === assignmentFilter);
    for (const a of targetAssignments) {
      const enrolled = getEnrolledForCourse(a.course_id);
      const submitted = submissions.filter(s => s.assignment_id === a.id).map(s => s.student_id);
      for (const sId of enrolled) {
        if (!submitted.includes(sId)) rows.push({ assignmentId: a.id, studentId: sId });
      }
    }
    return rows;
  }, [assignments, assignmentFilter, submissions, enrollments, directStudents]);

  const filteredSubmissions = useMemo(() => {
    if (assignmentFilter === "all") return submissions;
    return submissions.filter(s => s.assignment_id === assignmentFilter);
  }, [submissions, assignmentFilter]);

  const getFileType = (filePath: string) => {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) return 'audio';
    if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'image';
    if (['pdf'].includes(ext)) return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'word';
    if (['ppt', 'pptx'].includes(ext)) return 'powerpoint';
    if (['xls', 'xlsx'].includes(ext)) return 'excel';
    if (['psd'].includes(ext)) return 'photoshop';
    return 'file';
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'audio': return <Music className="w-4 h-4" />;
      case 'video': return <Film className="w-4 h-4" />;
      case 'image': return <Image className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getFileLabel = (type: string) => {
    const labels: Record<string, string> = { audio: 'Audio', video: 'Video', image: 'Image', pdf: 'PDF', word: 'Word', powerpoint: 'PPT', excel: 'Excel', photoshop: 'PSD', file: 'File' };
    return labels[type] || 'File';
  };

  const handleOpenFile = (filePath: string) => {
    if (!filePath) return;
    window.open(filePath, '_blank');
    toast.success("File opened! It will download or play in your browser.");
  };

  const getStudentInfo = (studentId: string) => studentProfiles.find(sp => sp.studentId === studentId);

  function SubmissionsTable({ data }: { data: typeof submissions }) {
    return (
      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Student</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden sm:table-cell">Assignment</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden md:table-cell">Course</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Status</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden sm:table-cell">Submitted</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Download</th>
            </tr>
          </thead>
          <tbody>
            {data.map((s, i) => {
              const student = getStudentInfo(s.student_id);
              const assignment = assignments.find(a => a.id === s.assignment_id);
              const course = courses.find(c => c.id === assignment?.course_id);
              const fileType = s.file_url ? getFileType(s.file_url) : null;
              return (
                <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{student?.name || "Unknown"}</p>
                    <p className="text-[10px] text-muted-foreground">{student?.regNo || ""}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{assignment?.title || "—"}</td>
                  <td className="px-4 py-3 hidden md:table-cell"><span className="text-xs font-bold text-primary">{course?.course_code || "—"}</span></td>
                  <td className="px-4 py-3">
                    <Badge variant={s.status === "graded" ? "default" : s.status === "submitted" ? "secondary" : "outline"}
                      className={`text-[10px] ${s.status === "graded" ? "bg-success text-success-foreground" : ""}`}>
                      {s.status === "graded" ? `${s.grade}/${assignment?.max_grade || 100}` : s.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                    {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString("en-UG", { month: "short", day: "numeric" }) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {s.file_url ? (
                      <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => handleOpenFile(s.file_url!)}>
                        {getFileIcon(fileType || 'file')}
                        <Download className="w-3 h-3" />
                        <span className="hidden sm:inline">{getFileLabel(fileType || 'file')}</span>
                      </Button>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Submissions</h1>
          <p className="text-sm text-muted-foreground mt-1">View all student submissions for your assignments</p>
        </div>
        <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
          <SelectTrigger className="w-[220px] rounded-xl">
            <SelectValue placeholder="Filter by assignment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignments</SelectItem>
            {assignments.map(a => {
              const course = courses.find(c => c.id === a.course_id);
              return <SelectItem key={a.id} value={a.id}>{course?.course_code} — {a.title}</SelectItem>;
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-success/5 border border-success/20 text-center">
          <p className="text-2xl font-bold text-success">{filteredSubmissions.length}</p>
          <p className="text-xs text-muted-foreground">Submitted</p>
        </div>
        <div className="p-4 rounded-2xl bg-destructive/5 border border-destructive/20 text-center">
          <p className="text-2xl font-bold text-destructive">{missingRows.length}</p>
          <p className="text-xs text-muted-foreground">Not Submitted</p>
        </div>
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 text-center">
          <p className="text-2xl font-bold text-primary">{filteredSubmissions.filter(s => s.status === "graded").length}</p>
          <p className="text-xs text-muted-foreground">Graded</p>
        </div>
      </div>

      <Tabs defaultValue="submitted" className="space-y-4">
        <TabsList>
          <TabsTrigger value="submitted">
            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />Submitted ({filteredSubmissions.length})
          </TabsTrigger>
          <TabsTrigger value="missing">
            <UserX className="w-3.5 h-3.5 mr-1.5" />Not Submitted ({missingRows.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submitted">
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : filteredSubmissions.length === 0 ? (
            <AnimatedCard><p className="text-center text-muted-foreground py-8">No submissions received yet.</p></AnimatedCard>
          ) : (
            <AnimatedCard>
              <SubmissionsTable data={filteredSubmissions} />
            </AnimatedCard>
          )}
        </TabsContent>

        <TabsContent value="missing">
          {missingRows.length === 0 ? (
            <AnimatedCard><p className="text-center text-muted-foreground py-8">All enrolled students have submitted! 🎉</p></AnimatedCard>
          ) : (
            <AnimatedCard>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Student</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden sm:table-cell">Assignment</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden md:table-cell">Course</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Deadline</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missingRows.map((row, i) => {
                      const student = getStudentInfo(row.studentId);
                      const assignment = assignments.find(a => a.id === row.assignmentId);
                      const course = courses.find(c => c.id === assignment?.course_id);
                      const isPast = assignment ? new Date(assignment.deadline) < new Date() : false;
                      return (
                        <motion.tr key={`${row.assignmentId}-${row.studentId}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                          className="border-t hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium">{student?.name || "Unknown"}</p>
                            <p className="text-[10px] text-muted-foreground">{student?.regNo || ""}</p>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{assignment?.title || "—"}</td>
                          <td className="px-4 py-3 hidden md:table-cell"><span className="text-xs font-bold text-primary">{course?.course_code || "—"}</span></td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {assignment ? new Date(assignment.deadline).toLocaleDateString("en-UG", { month: "short", day: "numeric" }) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={isPast ? "destructive" : "outline"} className="text-[10px] gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {isPast ? "Overdue" : "Pending"}
                            </Badge>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </AnimatedCard>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
