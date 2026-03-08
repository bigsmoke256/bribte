import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedCard, SectionHeader } from "@/components/dashboard/DashboardParts";
import { BookOpen, Users, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export default function LecturerCoursesPage() {
  const { user } = useAuth();

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["lecturer-courses-full", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, course_code, course_name, program_level, max_capacity, duration_years, department:departments(name)")
        .eq("lecturer_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const courseIds = courses.map(c => c.id);
  const { data: enrollments = [] } = useQuery({
    queryKey: ["lecturer-course-enrollments", courseIds],
    queryFn: async () => {
      if (courseIds.length === 0) return [];
      const { data } = await supabase
        .from("enrollments")
        .select("student_id, course_id, study_mode, academic_year")
        .in("course_id", courseIds);
      return data || [];
    },
    enabled: courseIds.length > 0,
  });

  // Get student profiles for enrolled students
  const studentIds = [...new Set(enrollments.map(e => e.student_id))];
  const { data: studentProfiles = [] } = useQuery({
    queryKey: ["lecturer-enrolled-students", studentIds],
    queryFn: async () => {
      if (studentIds.length === 0) return [];
      const { data: students } = await supabase.from("students").select("id, user_id, registration_number, year_of_study, study_mode").in("id", studentIds);
      if (!students || students.length === 0) return [];
      const userIds = students.map(s => s.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds);
      return students.map(s => ({
        ...s,
        full_name: profiles?.find(p => p.user_id === s.user_id)?.full_name || "Unknown",
        email: profiles?.find(p => p.user_id === s.user_id)?.email || "",
      }));
    },
    enabled: studentIds.length > 0,
  });

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold">My Courses</h1>
        <p className="text-sm text-muted-foreground mt-1">Courses assigned to you and their enrolled students</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : courses.length === 0 ? (
        <AnimatedCard><p className="text-center text-muted-foreground py-8">No courses have been assigned to you yet.</p></AnimatedCard>
      ) : (
        courses.map((course, ci) => {
          const courseEnrollments = enrollments.filter(e => e.course_id === course.id);
          const courseStudents = courseEnrollments.map(e => studentProfiles.find(sp => sp.id === e.student_id)).filter(Boolean);
          const dept = course.department as any;

          return (
            <motion.div key={course.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.08 }}>
              <AnimatedCard delay={ci * 0.05}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{course.course_code}</span>
                      <Badge variant="outline" className="text-[10px]">{course.program_level}</Badge>
                    </div>
                    <h3 className="text-lg font-semibold mt-1">{course.course_name}</h3>
                    {dept?.name && <p className="text-xs text-muted-foreground mt-0.5">{dept.name}</p>}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="w-4 h-4" />{courseStudents.length} / {course.max_capacity || 50}</span>
                    <span className="flex items-center gap-1"><GraduationCap className="w-4 h-4" />{course.duration_years}yr</span>
                  </div>
                </div>

                {courseStudents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No students enrolled in this course yet</p>
                ) : (
                  <div className="border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Student</th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden sm:table-cell">Reg. No.</th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden md:table-cell">Study Mode</th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden md:table-cell">Year</th>
                        </tr>
                      </thead>
                      <tbody>
                        {courseStudents.map((student: any, i: number) => (
                          <tr key={student.id} className="border-t hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2.5">
                              <p className="font-medium">{student.full_name}</p>
                              <p className="text-xs text-muted-foreground">{student.email}</p>
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">{student.registration_number || "—"}</td>
                            <td className="px-4 py-2.5 hidden md:table-cell"><Badge variant="outline" className="text-[10px]">{student.study_mode}</Badge></td>
                            <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">Year {student.year_of_study}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </AnimatedCard>
            </motion.div>
          );
        })
      )}
    </div>
  );
}
