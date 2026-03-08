import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedCard } from "@/components/dashboard/DashboardParts";
import { Download, FileText, Image, Film, Music, File } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function LecturerSubmissionsPage() {
  const { user } = useAuth();

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

  const studentIds = [...new Set(submissions.map(s => s.student_id))];
  const { data: studentProfiles = [] } = useQuery({
    queryKey: ["lecturer-sub-students", studentIds],
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
    const labels: Record<string, string> = {
      audio: 'Audio',
      video: 'Video',
      image: 'Image',
      pdf: 'PDF',
      word: 'Word',
      powerpoint: 'PPT',
      excel: 'Excel',
      photoshop: 'PSD',
      file: 'File'
    };
    return labels[type] || 'File';
  };

  const handleDownloadFile = async (filePath: string, studentName: string) => {
    if (!filePath) return;
    
    // If it's already a full URL (legacy), just open it
    if (filePath.startsWith('http')) {
      window.open(filePath, '_blank');
      return;
    }

    try {
      toast.loading("Preparing download...");
      
      const { data, error } = await supabase.storage
        .from("submissions")
        .download(filePath);

      if (error) throw error;
      
      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      const ext = filePath.split('.').pop() || 'file';
      a.download = `${studentName.replace(/\s+/g, '_')}_submission.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.dismiss();
      toast.success("File downloaded! It will open in your default app.");
    } catch (err: any) {
      toast.dismiss();
      toast.error("Failed to download: " + err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold">Submissions</h1>
        <p className="text-sm text-muted-foreground mt-1">View all student submissions for your assignments</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : submissions.length === 0 ? (
        <AnimatedCard><p className="text-center text-muted-foreground py-8">No submissions received yet.</p></AnimatedCard>
      ) : (
        <AnimatedCard>
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
                {submissions.map((s, i) => {
                  const student = studentProfiles.find(sp => sp.studentId === s.student_id);
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
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 gap-1.5 text-xs" 
                            onClick={() => handleDownloadFile(s.file_url!, student?.name || "Student")}
                          >
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
        </AnimatedCard>
      )}
    </div>
  );
}
