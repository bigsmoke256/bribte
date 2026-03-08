import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AnimatedCard, EmptyState } from "@/components/dashboard/DashboardParts";
import {
  GraduationCap, Search, PlusCircle, Trash2, CheckCircle, XCircle,
  Users, BookOpen, Calendar, BarChart3, Eye, UserCheck, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { motion } from "framer-motion";

/* ─── Types ─── */
interface EnrollmentRow {
  id: string;
  academic_year: string;
  semester: number;
  study_mode: string;
  student_id: string;
  course_id: string;
  status: string;
  created_at: string;
  student?: { registration_number: string | null; user_id: string; profile?: { full_name: string; email: string } };
  course?: { course_name: string; course_code: string; program_level: string };
}

interface CourseCapacity {
  id: string;
  course_code: string;
  course_name: string;
  program_level: string;
  max_capacity: number;
  enrolled: number;
  lecturer_name?: string;
}

export default function AdminEnrollmentPage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [courseCapacities, setCourseCapacities] = useState<CourseCapacity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [mainTab, setMainTab] = useState("enrollments");
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ student_id: "", course_id: "", academic_year: "2025/2026", semester: 1, study_mode: "Day" });

  // Course detail dialog
  const [detailCourse, setDetailCourse] = useState<CourseCapacity | null>(null);
  const [courseEnrollments, setCourseEnrollments] = useState<EnrollmentRow[]>([]);

  /* ─── Fetch ─── */
  const fetchEnrollments = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("enrollments")
      .select("*, student:students(registration_number, user_id), course:courses(course_name, course_code, program_level)")
      .order("created_at", { ascending: false });
    if (data) {
      const userIds = data.map((e: any) => {
        const student = Array.isArray(e.student) ? e.student[0] : e.student;
        return student?.user_id;
      }).filter(Boolean);
      const { data: profilesData } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds.length ? userIds : ["_"]);
      const profileMap = new Map((profilesData || []).map(p => [p.user_id, p]));
      setEnrollments(data.map((e: any) => {
        const student = Array.isArray(e.student) ? e.student[0] : e.student;
        if (student) student.profile = profileMap.get(student.user_id) || null;
        return { ...e, student, course: Array.isArray(e.course) ? e.course[0] : e.course };
      }));
    }
    setLoading(false);
  }, []);

  const fetchCapacities = useCallback(async () => {
    const { data: coursesData } = await supabase.from("courses")
      .select("id, course_code, course_name, program_level, max_capacity, lecturer_id")
      .order("course_code");
    if (!coursesData) return;
    // Count enrollments per course
    const { data: enrollData } = await supabase.from("enrollments")
      .select("course_id, status");
    const countMap = new Map<string, number>();
    (enrollData || []).forEach((e: any) => {
      if (e.status === "approved") {
        countMap.set(e.course_id, (countMap.get(e.course_id) || 0) + 1);
      }
    });
    // Lecturer names
    const lecIds = coursesData.map((c: any) => c.lecturer_id).filter(Boolean);
    let lecNameMap = new Map<string, string>();
    if (lecIds.length) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", lecIds);
      lecNameMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));
    }
    setCourseCapacities(coursesData.map((c: any) => ({
      ...c,
      max_capacity: c.max_capacity || 50,
      enrolled: countMap.get(c.id) || 0,
      lecturer_name: c.lecturer_id ? lecNameMap.get(c.lecturer_id) : undefined,
    })));
  }, []);

  useEffect(() => {
    fetchEnrollments();
    fetchCapacities();
    supabase.from("students").select("id, registration_number, user_id").then(async ({ data }) => {
      if (data) {
        const uids = data.map(s => s.user_id);
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", uids.length ? uids : ["_"]);
        const pm = new Map((profs || []).map(p => [p.user_id, p]));
        setStudents(data.map(s => ({ ...s, profile: pm.get(s.user_id) || null })));
      }
    });
    supabase.from("courses").select("id, course_name, course_code").order("course_code").then(({ data }) => { if (data) setCourses(data); });
  }, [fetchEnrollments, fetchCapacities]);

  /* ─── Stats ─── */
  const stats = useMemo(() => {
    const approved = enrollments.filter(e => e.status === "approved").length;
    const pending = enrollments.filter(e => e.status === "pending").length;
    const uniqueStudents = new Set(enrollments.filter(e => e.status === "approved").map(e => e.student_id)).size;
    const uniqueCourses = new Set(enrollments.filter(e => e.status === "approved").map(e => e.course_id)).size;
    const academicYears = [...new Set(enrollments.map(e => e.academic_year))].sort().reverse();
    return { approved, pending, uniqueStudents, uniqueCourses, academicYears };
  }, [enrollments]);

  /* ─── Actions ─── */
  const enroll = async () => {
    if (!form.student_id || !form.course_id) { toast.error("Select student and course"); return; }
    // Check capacity
    const cap = courseCapacities.find(c => c.id === form.course_id);
    if (cap && cap.enrolled >= cap.max_capacity) {
      toast.error(`Course is full (${cap.enrolled}/${cap.max_capacity})`);
      return;
    }
    const { error } = await supabase.from("enrollments").insert({
      student_id: form.student_id, course_id: form.course_id, academic_year: form.academic_year,
      semester: form.semester, study_mode: form.study_mode, status: "approved",
    });
    if (error) toast.error(error.message);
    else { toast.success("Enrolled successfully"); setDialog(false); fetchEnrollments(); fetchCapacities(); }
  };

  const updateStatus = async (e: EnrollmentRow, status: string) => {
    const { error } = await supabase.from("enrollments").update({ status }).eq("id", e.id);
    if (!error) { toast.success(`Enrollment ${status}`); fetchEnrollments(); fetchCapacities(); }
    else toast.error(error.message);
  };

  const remove = async (e: EnrollmentRow) => {
    if (!confirm("Remove this enrollment?")) return;
    const { error } = await supabase.from("enrollments").delete().eq("id", e.id);
    if (!error) { toast.success("Removed"); fetchEnrollments(); fetchCapacities(); }
    else toast.error(error.message);
  };

  const openCourseDetail = (c: CourseCapacity) => {
    setDetailCourse(c);
    setCourseEnrollments(enrollments.filter(e => e.course_id === c.id));
  };

  /* ─── Filters ─── */
  const filtered = enrollments.filter(e => {
    const q = search.toLowerCase();
    const matchesSearch = !q || e.student?.profile?.full_name?.toLowerCase().includes(q) || e.course?.course_code?.toLowerCase().includes(q) || e.student?.registration_number?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    const matchesCourse = courseFilter === "all" || e.course_id === courseFilter;
    const matchesYear = yearFilter === "all" || e.academic_year === yearFilter;
    return matchesSearch && matchesStatus && matchesCourse && matchesYear;
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "approved": return "bg-green-500/10 text-green-600 dark:text-green-400";
      case "pending": return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
      case "rejected": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (!user) return null;

  return (
    <>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">Enrollment</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage student-course assignments</p>
          </div>
          <Button onClick={() => setDialog(true)} className="rounded-xl"><PlusCircle className="w-4 h-4 mr-2" /> Enroll Student</Button>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Active Enrollments", value: stats.approved, icon: UserCheck, color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10" },
            { label: "Pending Requests", value: stats.pending, icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
            { label: "Students Enrolled", value: stats.uniqueStudents, icon: Users, color: "text-primary", bg: "bg-primary/10" },
            { label: "Courses Active", value: stats.uniqueCourses, icon: BookOpen, color: "text-primary", bg: "bg-primary/10" },
          ].map((card, i) => (
            <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <AnimatedCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                    <card.icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                    <p className="font-display text-xl font-bold">{card.value}</p>
                  </div>
                </div>
              </AnimatedCard>
            </motion.div>
          ))}
        </div>

        {/* Main Tabs */}
        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList className="rounded-xl">
            <TabsTrigger value="enrollments" className="rounded-lg text-xs gap-1.5"><GraduationCap className="w-3.5 h-3.5" />Enrollments</TabsTrigger>
            <TabsTrigger value="capacity" className="rounded-lg text-xs gap-1.5"><BarChart3 className="w-3.5 h-3.5" />Course Capacity</TabsTrigger>
          </TabsList>

          {/* ─── Enrollments Tab ─── */}
          <TabsContent value="enrollments" className="mt-4">
            <AnimatedCard>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
                <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-3.5 py-2 w-full sm:w-64 border border-transparent focus-within:border-primary/20">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                    className="border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "All", value: "all", count: enrollments.length },
                    { label: "Approved", value: "approved", count: enrollments.filter(e => e.status === "approved").length },
                    { label: "Pending", value: "pending", count: enrollments.filter(e => e.status === "pending").length },
                    { label: "Rejected", value: "rejected", count: enrollments.filter(e => e.status === "rejected").length },
                  ].map(f => (
                    <button key={f.value} onClick={() => setStatusFilter(f.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${statusFilter === f.value ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-border hover:bg-muted/50"}`}>
                      {f.label} <span className="ml-1 opacity-60">{f.count}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 mb-4">
                <Select value={courseFilter} onValueChange={setCourseFilter}>
                  <SelectTrigger className="w-full sm:w-52 rounded-xl text-xs"><SelectValue placeholder="All Courses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.course_code} – {c.course_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {stats.academicYears.length > 0 && (
                  <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger className="w-full sm:w-40 rounded-xl text-xs"><SelectValue placeholder="All Years" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {stats.academicYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
              ) : filtered.length === 0 ? (
                <EmptyState icon={GraduationCap} title="No enrollments" description="Enroll students using the button above." />
              ) : (
                <div className="overflow-x-auto -mx-5">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="pl-5">Student</th><th>Course</th><th>Year</th>
                        <th className="text-center">Sem</th><th className="text-center">Mode</th>
                        <th className="text-center">Status</th><th className="text-center pr-5">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((e, i) => (
                        <motion.tr key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }}>
                          <td className="pl-5">
                            <p className="font-semibold text-sm">{e.student?.profile?.full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{e.student?.registration_number || "—"}</p>
                          </td>
                          <td className="text-sm">
                            <span className="font-mono text-primary font-semibold">{e.course?.course_code}</span>
                            <span className="ml-1.5">{e.course?.course_name}</span>
                          </td>
                          <td className="text-sm">{e.academic_year}</td>
                          <td className="text-center text-sm">{e.semester}</td>
                          <td className="text-center text-sm">{e.study_mode}</td>
                          <td className="text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold ${statusColor(e.status)}`}>
                              {e.status}
                            </span>
                          </td>
                          <td className="text-center pr-5">
                            <div className="flex items-center justify-center gap-1">
                              {e.status === "pending" && (
                                <>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg hover:bg-green-500/10" onClick={() => updateStatus(e, "approved")} title="Approve">
                                    <CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg text-destructive hover:bg-destructive/10" onClick={() => updateStatus(e, "rejected")} title="Reject">
                                    <XCircle className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              )}
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg text-destructive hover:bg-destructive/10" onClick={() => remove(e)} title="Remove">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AnimatedCard>
          </TabsContent>

          {/* ─── Course Capacity Tab ─── */}
          <TabsContent value="capacity" className="mt-4">
            <AnimatedCard>
              <p className="text-sm font-semibold mb-4">{courseCapacities.length} Courses</p>
              {courseCapacities.length === 0 ? (
                <EmptyState icon={BookOpen} title="No courses" description="Create courses first." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {courseCapacities.map((c, i) => {
                    const pct = c.max_capacity > 0 ? Math.round((c.enrolled / c.max_capacity) * 100) : 0;
                    const isFull = pct >= 100;
                    return (
                      <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                        className="border rounded-xl p-4 hover:border-primary/20 transition-all cursor-pointer" onClick={() => openCourseDetail(c)}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-mono text-xs font-semibold text-primary">{c.course_code}</p>
                            <p className="text-sm font-semibold mt-0.5">{c.course_name}</p>
                          </div>
                          <Badge variant={isFull ? "destructive" : "outline"} className="text-[10px] rounded-md">
                            {isFull ? "Full" : c.program_level}
                          </Badge>
                        </div>
                        {c.lecturer_name && (
                          <p className="text-xs text-muted-foreground mb-2">Lecturer: {c.lecturer_name}</p>
                        )}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Enrolled</span>
                            <span className="font-semibold">{c.enrolled} / {c.max_capacity}</span>
                          </div>
                          <Progress value={Math.min(pct, 100)} className="h-2" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </AnimatedCard>
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── Enroll Dialog ─── */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="font-display">Enroll Student</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Student *</Label>
              <Select value={form.student_id} onValueChange={v => setForm(f => ({ ...f, student_id: v }))}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.profile?.full_name || s.registration_number || s.id}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Course *</Label>
              <Select value={form.course_id} onValueChange={v => setForm(f => ({ ...f, course_id: v }))}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>
                  {courses.map(c => {
                    const cap = courseCapacities.find(cc => cc.id === c.id);
                    const isFull = cap && cap.enrolled >= cap.max_capacity;
                    return (
                      <SelectItem key={c.id} value={c.id} disabled={isFull}>
                        {c.course_code} – {c.course_name} {isFull ? "(Full)" : cap ? `(${cap.enrolled}/${cap.max_capacity})` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Academic Year</Label>
                <Input value={form.academic_year} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))} className="mt-1.5 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Semester</Label>
                <Input type="number" min={1} max={4} value={form.semester} onChange={e => setForm(f => ({ ...f, semester: parseInt(e.target.value) || 1 }))} className="mt-1.5 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Mode</Label>
                <Select value={form.study_mode} onValueChange={v => setForm(f => ({ ...f, study_mode: v }))}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Day">Day</SelectItem>
                    <SelectItem value="Evening">Evening</SelectItem>
                    <SelectItem value="Weekend">Weekend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={enroll} className="rounded-xl">Enroll</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Course Detail Dialog ─── */}
      <Dialog open={!!detailCourse} onOpenChange={o => { if (!o) setDetailCourse(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl">
          {detailCourse && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="font-display">{detailCourse.course_name}</DialogTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {detailCourse.course_code} · {detailCourse.enrolled}/{detailCourse.max_capacity} enrolled
                      {detailCourse.lecturer_name && ` · ${detailCourse.lecturer_name}`}
                    </p>
                  </div>
                </div>
              </DialogHeader>

              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Capacity</span>
                  <span className="font-semibold">{Math.round((detailCourse.enrolled / Math.max(1, detailCourse.max_capacity)) * 100)}%</span>
                </div>
                <Progress value={Math.min(Math.round((detailCourse.enrolled / Math.max(1, detailCourse.max_capacity)) * 100), 100)} className="h-2.5 mb-4" />

                <h3 className="text-sm font-semibold">Enrolled Students ({courseEnrollments.filter(e => e.status === "approved").length})</h3>
                {courseEnrollments.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">No students enrolled yet.</div>
                ) : (
                  <div className="space-y-1.5">
                    {courseEnrollments.map(e => (
                      <div key={e.id} className="flex items-center gap-3 p-2.5 rounded-xl border group">
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold">
                          {(e.student?.profile?.full_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{e.student?.profile?.full_name || "—"}</p>
                          <p className="text-[10px] text-muted-foreground">{e.student?.registration_number || "—"} · Sem {e.semester} · {e.study_mode}</p>
                        </div>
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold ${statusColor(e.status)}`}>{e.status}</span>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-lg text-destructive opacity-0 group-hover:opacity-100" onClick={() => remove(e)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
  );
}
