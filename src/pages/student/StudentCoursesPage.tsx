import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { AnimatedCard, SectionHeader, EmptyState } from "@/components/dashboard/DashboardParts";
import { BookOpen, Clock, Users, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, ExternalLink } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EnrollmentWithCourse {
  id: string;
  academic_year: string;
  semester: number;
  status: string;
  study_mode: string;
  course: {
    id: string;
    course_name: string;
    course_code: string;
    program_level: string;
    duration_years: number;
  } | null;
}

interface ModuleWithLessons {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  lessons: { id: string; title: string; sort_order: number }[];
}

interface MaterialRow {
  id: string;
  title: string;
  file_url: string;
  file_type: string | null;
  created_at: string;
}

export default function StudentCoursesPage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrollmentWithCourse[]>([]);
  const [modules, setModules] = useState<ModuleWithLessons[]>([]);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadEnrollments();
  }, [user]);

  useEffect(() => {
    if (selectedCourseId) loadCourseDetails(selectedCourseId);
  }, [selectedCourseId]);

  async function loadEnrollments() {
    const { data: studentData } = await supabase
      .from("students").select("id, course_id").eq("user_id", user!.id).maybeSingle();
    if (!studentData) { setLoading(false); return; }

    const { data } = await supabase
      .from("enrollments")
      .select("id, academic_year, semester, status, study_mode, course:courses(id, course_name, course_code, program_level, duration_years)")
      .eq("student_id", studentData.id)
      .order("created_at", { ascending: false });

    const enrollmentData = (data as any[]) || [];
    setEnrollments(enrollmentData);
    if (enrollmentData.length > 0 && enrollmentData[0].course?.id) {
      setSelectedCourseId(enrollmentData[0].course.id);
    } else if (studentData.course_id) {
      setSelectedCourseId(studentData.course_id);
    }
    setLoading(false);
  }

  async function loadCourseDetails(courseId: string) {
    const [modulesRes, materialsRes] = await Promise.all([
      supabase.from("course_modules").select("id, title, description, sort_order").eq("course_id", courseId).order("sort_order"),
      supabase.from("course_materials").select("id, title, file_url, file_type, created_at").eq("course_id", courseId).order("created_at", { ascending: false }),
    ]);

    const mods = modulesRes.data || [];
    // Load lessons for each module
    if (mods.length > 0) {
      const { data: lessons } = await supabase
        .from("course_lessons")
        .select("id, title, sort_order, module_id")
        .in("module_id", mods.map(m => m.id))
        .order("sort_order");

      const lessonMap = new Map<string, any[]>();
      (lessons || []).forEach(l => {
        const arr = lessonMap.get((l as any).module_id) || [];
        arr.push(l);
        lessonMap.set((l as any).module_id, arr);
      });

      setModules(mods.map(m => ({ ...m, lessons: lessonMap.get(m.id) || [] })));
    } else {
      setModules([]);
    }
    setMaterials(materialsRes.data || []);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  if (enrollments.length === 0) {
    return <EmptyState icon={BookOpen} title="No Courses" description="You are not enrolled in any courses yet." />;
  }

  const activeCourse = enrollments.find(e => e.course?.id === selectedCourseId)?.course;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold">My Courses</h1>
        <p className="text-sm text-muted-foreground mt-1">View your enrolled courses, modules, and materials</p>
      </div>

      {/* Enrollment cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {enrollments.map((e, i) => (
          <motion.div key={e.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            onClick={() => e.course?.id && setSelectedCourseId(e.course.id)}
            className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
              e.course?.id === selectedCourseId ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/30"
            }`}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{e.course?.course_name || "Unknown"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{e.course?.course_code} • {e.course?.program_level}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={e.status === "approved" ? "default" : "secondary"} className="text-[10px] h-5">{e.status}</Badge>
                  <span className="text-[10px] text-muted-foreground">{e.study_mode} • Sem {e.semester}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Course details */}
      {activeCourse && (
        <Tabs defaultValue="modules" className="space-y-4">
          <TabsList>
            <TabsTrigger value="modules">Modules & Lessons</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
          </TabsList>

          <TabsContent value="modules" className="space-y-3">
            {modules.length === 0 ? (
              <EmptyState icon={BookOpen} title="No Modules" description="No modules have been added to this course yet." />
            ) : (
              modules.map((mod, i) => (
                <AnimatedCard key={mod.id} delay={i * 0.05}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-accent-foreground">
                      {mod.sort_order + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{mod.title}</p>
                      {mod.description && <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>}
                      {mod.lessons.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {mod.lessons.map(l => (
                            <div key={l.id} className="flex items-center gap-2 text-sm text-muted-foreground pl-2 border-l-2 border-border">
                              <Clock className="w-3 h-3" />
                              <span>{l.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </AnimatedCard>
              ))
            )}
          </TabsContent>

          <TabsContent value="materials" className="space-y-3">
            {materials.length === 0 ? (
              <EmptyState icon={BookOpen} title="No Materials" description="No course materials have been uploaded yet." />
            ) : (
              materials.map((m, i) => {
                const isPlaceholder = m.file_url.includes('/placeholder/');
                return (
                  <AnimatedCard key={m.id} delay={i * 0.05}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{m.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {(m.file_type || "Document").toUpperCase()} • {new Date(m.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {isPlaceholder ? (
                        <Badge variant="secondary" className="text-[10px] flex-shrink-0">Coming Soon</Badge>
                      ) : (
                        <a href={m.file_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-primary hover:underline font-medium flex-shrink-0">
                          <ExternalLink className="w-3 h-3" /> View
                        </a>
                      )}
                    </div>
                  </AnimatedCard>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
