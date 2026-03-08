import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AnimatedCard, SectionHeader, EmptyState } from "@/components/dashboard/DashboardParts";
import {
  UserCog, Search, PlusCircle, Edit2, Trash2, BookOpen, Users,
  BarChart3, X, Eye, Briefcase, GraduationCap, ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface LecturerRow {
  id: string;
  user_id: string;
  specialization: string | null;
  department_id: string | null;
  profile?: { full_name: string; email: string; phone: string | null };
  department?: { name: string } | null;
  assignedCourses?: { id: string; course_code: string; course_name: string; program_level: string }[];
  stats?: { totalStudents: number; totalAssignments: number; gradedSubmissions: number; avgGrade: number | null };
}

interface DeptOption { id: string; name: string; }
interface CourseOption { id: string; course_code: string; course_name: string; program_level: string; lecturer_id: string | null; }

const MAX_TEACHING_LOAD = 8; // max courses per lecturer

export default function AdminLecturersPage() {
  const { user } = useAuth();
  const [lecturers, setLecturers] = useState<LecturerRow[]>([]);
  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [allCourses, setAllCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  // Dialogs
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);
  const [profileDialog, setProfileDialog] = useState(false);
  const [editLecturer, setEditLecturer] = useState<LecturerRow | null>(null);
  const [selectedLecturer, setSelectedLecturer] = useState<LecturerRow | null>(null);

  // Profile detail data
  const [profileStudents, setProfileStudents] = useState<any[]>([]);

  const [createForm, setCreateForm] = useState({ email: "", password: "", full_name: "", department_id: "", specialization: "" });
  const [editForm, setEditForm] = useState({ department_id: "", specialization: "" });
  const [creating, setCreating] = useState(false);
  const [assignCourseId, setAssignCourseId] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    const [lecRes, deptRes, courseRes] = await Promise.all([
      supabase.from("lecturers").select("*, department:departments(name)").order("created_at", { ascending: false }),
      supabase.from("departments").select("id, name").order("name"),
      supabase.from("courses").select("id, course_code, course_name, program_level, lecturer_id").order("course_code"),
    ]);

    if (deptRes.data) setDepartments(deptRes.data);
    if (courseRes.data) setAllCourses(courseRes.data);

    if (lecRes.data) {
      const userIds = lecRes.data.map((l: any) => l.user_id);
      const { data: profilesData } = await supabase.from("profiles").select("user_id, full_name, email, phone").in("user_id", userIds);
      const profileMap = new Map((profilesData || []).map(p => [p.user_id, p]));

      const lecturerIds = lecRes.data.map((l: any) => l.user_id);
      const { data: assignmentsData } = await supabase.from("assignments").select("id, lecturer_id, course_id").in("lecturer_id", lecturerIds);
      const assignmentIds = (assignmentsData || []).map(a => a.id);

      let subsData: any[] = [];
      if (assignmentIds.length > 0) {
        const { data } = await supabase.from("submissions").select("assignment_id, grade, status").in("assignment_id", assignmentIds);
        subsData = data || [];
      }

      const courseIds = (courseRes.data || []).filter(c => c.lecturer_id).map(c => c.id);
      let enrollData: any[] = [];
      if (courseIds.length > 0) {
        const { data } = await supabase.from("enrollments").select("course_id, student_id").in("course_id", courseIds);
        enrollData = data || [];
      }

      setLecturers(lecRes.data.map((l: any) => {
        const courses = (courseRes.data || []).filter(c => c.lecturer_id === l.user_id);
        const lecAssignments = (assignmentsData || []).filter(a => a.lecturer_id === l.user_id);
        const lecAssignmentIds = lecAssignments.map(a => a.id);
        const lecSubs = subsData.filter(s => lecAssignmentIds.includes(s.assignment_id));
        const graded = lecSubs.filter(s => s.grade !== null);
        const lecCourseIds = courses.map(c => c.id);
        const students = new Set(enrollData.filter(e => lecCourseIds.includes(e.course_id)).map(e => e.student_id));

        return {
          ...l,
          profile: profileMap.get(l.user_id) || null,
          department: Array.isArray(l.department) ? l.department[0] : l.department,
          assignedCourses: courses,
          stats: {
            totalStudents: students.size,
            totalAssignments: lecAssignments.length,
            gradedSubmissions: graded.length,
            avgGrade: graded.length > 0 ? Math.round(graded.reduce((s, g) => s + Number(g.grade), 0) / graded.length) : null,
          },
        };
      }));
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // --- Create ---
  const createLecturer = async () => {
    if (!createForm.email || !createForm.password || !createForm.full_name) {
      toast.error("Fill in all required fields"); return;
    }
    setCreating(true);
    try {
      const res = await supabase.functions.invoke("create-admin", {
        body: { email: createForm.email, password: createForm.password, full_name: createForm.full_name, role: "lecturer" },
      });
      if (res.error) throw new Error(res.error.message);
      const result = res.data as any;
      if (result.error) throw new Error(result.error);
      if (createForm.department_id || createForm.specialization) {
        await supabase.from("lecturers").update({
          department_id: createForm.department_id || null,
          specialization: createForm.specialization || null,
        }).eq("user_id", result.user_id);
      }
      toast.success("Lecturer account created");
      setCreateDialog(false);
      setCreateForm({ email: "", password: "", full_name: "", department_id: "", specialization: "" });
      fetchAll();
    } catch (e: any) {
      toast.error(e.message || "Failed to create lecturer");
    }
    setCreating(false);
  };

  // --- Edit ---
  const openEdit = (l: LecturerRow) => {
    setEditLecturer(l);
    setEditForm({ department_id: l.department_id || "", specialization: l.specialization || "" });
    setEditDialog(true);
  };

  const saveLecturer = async () => {
    if (!editLecturer) return;
    const { error } = await supabase.from("lecturers")
      .update({ department_id: editForm.department_id || null, specialization: editForm.specialization || null })
      .eq("id", editLecturer.id);
    if (error) toast.error(error.message);
    else { toast.success("Updated"); setEditDialog(false); fetchAll(); }
  };

  const deleteLecturer = async (l: LecturerRow) => {
    if (!confirm(`Delete ${l.profile?.full_name}?`)) return;
    const { error } = await supabase.from("lecturers").delete().eq("id", l.id);
    if (!error) { toast.success("Removed"); fetchAll(); } else toast.error(error.message);
  };

  // --- Course Assignment ---
  const openAssign = (l: LecturerRow) => { setSelectedLecturer(l); setAssignCourseId(""); setAssignDialog(true); };

  const assignCourse = async () => {
    if (!selectedLecturer || !assignCourseId) return;
    const { error } = await supabase.from("courses").update({ lecturer_id: selectedLecturer.user_id }).eq("id", assignCourseId);
    if (error) toast.error(error.message);
    else { toast.success("Course assigned"); fetchAll(); setAssignCourseId(""); }
  };

  const unassignCourse = async (courseId: string) => {
    const { error } = await supabase.from("courses").update({ lecturer_id: null }).eq("id", courseId);
    if (error) toast.error(error.message);
    else { toast.success("Course unassigned"); fetchAll(); }
  };

  // --- Profile View ---
  const openProfile = async (l: LecturerRow) => {
    setSelectedLecturer(l);
    setProfileDialog(true);
    setProfileStudents([]);

    // Fetch enrolled students for this lecturer's courses
    const lecCourseIds = (l.assignedCourses || []).map(c => c.id);
    if (lecCourseIds.length > 0) {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("student_id, course_id, academic_year, semester, study_mode")
        .in("course_id", lecCourseIds);

      if (enrollments && enrollments.length > 0) {
        const studentIds = [...new Set(enrollments.map(e => e.student_id))];
        const { data: studentRecords } = await supabase
          .from("students")
          .select("id, user_id, registration_number, status")
          .in("id", studentIds);

        if (studentRecords) {
          const sUserIds = studentRecords.map(s => s.user_id);
          const { data: sProfs } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", sUserIds);
          const spm = new Map((sProfs || []).map(p => [p.user_id, p]));

          // Map course IDs to names
          const courseMap = new Map((l.assignedCourses || []).map(c => [c.id, c]));

          setProfileStudents(studentRecords.map(s => {
            const studentEnrollments = enrollments.filter(e => e.student_id === s.id);
            const courseNames = studentEnrollments.map(e => courseMap.get(e.course_id)?.course_code || "").filter(Boolean);
            return {
              ...s,
              profile: spm.get(s.user_id),
              courses: courseNames,
            };
          }));
        }
      }
    }
  };

  const unassignedCourses = allCourses.filter(c => !c.lecturer_id);

  const filtered = lecturers.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.profile?.full_name?.toLowerCase().includes(q) || l.profile?.email?.toLowerCase().includes(q) || l.specialization?.toLowerCase().includes(q);
    const matchDept = deptFilter === "all" || l.department_id === deptFilter;
    return matchSearch && matchDept;
  });

  const teachingLoad = (count: number) => {
    const pct = Math.min((count / MAX_TEACHING_LOAD) * 100, 100);
    return { pct, label: count >= MAX_TEACHING_LOAD ? "Full" : count >= MAX_TEACHING_LOAD * 0.75 ? "High" : count > 0 ? "Normal" : "None" };
  };

  if (!user) return null;

  return (
    <>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">Lecturers</h1>
            <p className="text-sm text-muted-foreground mt-1">{lecturers.length} academic staff</p>
          </div>
          <Button onClick={() => setCreateDialog(true)} className="rounded-xl">
            <PlusCircle className="w-4 h-4 mr-2" /> Add Lecturer
          </Button>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Lecturers", value: lecturers.length, icon: UserCog, color: "text-primary" },
            { label: "Courses Assigned", value: allCourses.filter(c => c.lecturer_id).length, icon: BookOpen, color: "text-success" },
            { label: "Unassigned Courses", value: unassignedCourses.length, icon: Briefcase, color: "text-warning" },
            { label: "Total Students Taught", value: lecturers.reduce((s, l) => s + (l.stats?.totalStudents || 0), 0), icon: Users, color: "text-info" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="p-3.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center shrink-0">
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className={`font-display text-lg font-extrabold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters & Table */}
        <AnimatedCard>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-3.5 py-2 w-full sm:w-72 border border-transparent focus-within:border-primary/20">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input placeholder="Search lecturers..." value={search} onChange={e => setSearch(e.target.value)}
                className="border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0" />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-full sm:w-48 rounded-xl"><SelectValue placeholder="All Departments" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={UserCog} title="No lecturers found" description="Add lecturers using the button above." />
          ) : (
            <div className="overflow-x-auto -mx-5">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="pl-5">Name</th>
                    <th>Department</th>
                    <th>Specialization</th>
                    <th className="text-center">Teaching Load</th>
                    <th className="text-center">Students</th>
                    <th className="text-center pr-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l, i) => {
                    const load = teachingLoad(l.assignedCourses?.length || 0);
                    return (
                      <motion.tr key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }}>
                        <td className="pl-5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                              {l.profile?.full_name?.charAt(0) || "?"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate">{l.profile?.full_name || "—"}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{l.profile?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="text-sm">{l.department?.name || <span className="text-muted-foreground italic text-xs">Unassigned</span>}</td>
                        <td className="text-sm">{l.specialization || <span className="text-muted-foreground italic text-xs">—</span>}</td>
                        <td className="text-center">
                          <div className="flex items-center gap-2 justify-center min-w-[100px]">
                            <Progress value={load.pct} className="h-1.5 w-16" />
                            <span className="text-[10px] font-semibold text-muted-foreground">{l.assignedCourses?.length || 0}/{MAX_TEACHING_LOAD}</span>
                          </div>
                        </td>
                        <td className="text-center">
                          <Badge variant="outline" className="text-[10px] rounded-md">{l.stats?.totalStudents || 0}</Badge>
                        </td>
                        <td className="text-center pr-5">
                          <div className="flex items-center justify-center gap-0.5">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" title="View Profile" onClick={() => openProfile(l)}>
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" title="Assign Courses" onClick={() => openAssign(l)}>
                              <BookOpen className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => openEdit(l)} title="Edit">
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg text-destructive hover:bg-destructive/10" onClick={() => deleteLecturer(l)} title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AnimatedCard>
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="font-display">Add Lecturer</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label className="text-xs font-semibold">Full Name *</Label><Input value={createForm.full_name} onChange={e => setCreateForm(f => ({ ...f, full_name: e.target.value }))} className="mt-1.5 rounded-xl" /></div>
            <div><Label className="text-xs font-semibold">Email *</Label><Input type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} className="mt-1.5 rounded-xl" /></div>
            <div><Label className="text-xs font-semibold">Password *</Label><Input type="password" value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} className="mt-1.5 rounded-xl" /></div>
            <div>
              <Label className="text-xs font-semibold">Department</Label>
              <Select value={createForm.department_id} onValueChange={v => setCreateForm(f => ({ ...f, department_id: v }))}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold">Specialization</Label><Input value={createForm.specialization} onChange={e => setCreateForm(f => ({ ...f, specialization: e.target.value }))} className="mt-1.5 rounded-xl" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={createLecturer} disabled={creating} className="rounded-xl">{creating ? "Creating..." : "Create Account"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="font-display">Edit Lecturer</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Department</Label>
              <Select value={editForm.department_id} onValueChange={v => setEditForm(f => ({ ...f, department_id: v }))}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold">Specialization</Label><Input value={editForm.specialization} onChange={e => setEditForm(f => ({ ...f, specialization: e.target.value }))} className="mt-1.5 rounded-xl" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={saveLecturer} className="rounded-xl">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Courses Dialog */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Assign Courses — {selectedLecturer?.profile?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold mb-2 block">Assigned Courses ({selectedLecturer?.assignedCourses?.length || 0}/{MAX_TEACHING_LOAD})</Label>
              {selectedLecturer?.assignedCourses?.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No courses assigned yet</p>
              ) : (
                <div className="space-y-2">
                  {selectedLecturer?.assignedCourses?.map(c => (
                    <div key={c.id} className="flex items-center justify-between bg-muted/60 rounded-xl px-3 py-2">
                      <div>
                        <span className="font-mono text-xs text-primary font-semibold">{c.course_code}</span>
                        <span className="text-sm ml-2">{c.course_name}</span>
                        <Badge variant="outline" className="ml-2 text-[9px]">{c.program_level}</Badge>
                      </div>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10 rounded-lg" onClick={() => unassignCourse(c.id)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Add Course</Label>
              <div className="flex gap-2">
                <Select value={assignCourseId} onValueChange={setAssignCourseId}>
                  <SelectTrigger className="rounded-xl flex-1"><SelectValue placeholder="Select unassigned course" /></SelectTrigger>
                  <SelectContent>
                    {unassignedCourses.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.course_code} — {c.course_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={assignCourse} disabled={!assignCourseId} className="rounded-xl">Assign</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(false)} className="rounded-xl">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Lecturer Profile Dialog */}
      <Dialog open={profileDialog} onOpenChange={setProfileDialog}>
        <DialogContent className="max-w-2xl rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Lecturer Profile</DialogTitle>
          </DialogHeader>
          {selectedLecturer && (
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary shrink-0">
                  {selectedLecturer.profile?.full_name?.charAt(0) || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display font-bold text-lg">{selectedLecturer.profile?.full_name || "—"}</h3>
                  <p className="text-sm text-muted-foreground">{selectedLecturer.profile?.email}</p>
                  {selectedLecturer.profile?.phone && <p className="text-sm text-muted-foreground">{selectedLecturer.profile.phone}</p>}
                </div>
                <div className="text-right shrink-0">
                  <Badge variant="secondary" className="text-xs rounded-lg">{selectedLecturer.department?.name || "No Dept"}</Badge>
                  {selectedLecturer.specialization && (
                    <p className="text-[10px] text-muted-foreground mt-1">{selectedLecturer.specialization}</p>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-muted/30 text-center">
                  <BookOpen className="w-4 h-4 mx-auto mb-1 text-primary" />
                  <p className="text-xl font-extrabold">{selectedLecturer.assignedCourses?.length || 0}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Courses</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 text-center">
                  <Users className="w-4 h-4 mx-auto mb-1 text-info" />
                  <p className="text-xl font-extrabold">{selectedLecturer.stats?.totalStudents || 0}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Students</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 text-center">
                  <ClipboardCheck className="w-4 h-4 mx-auto mb-1 text-success" />
                  <p className="text-xl font-extrabold">{selectedLecturer.stats?.totalAssignments || 0}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Assignments</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 text-center">
                  <BarChart3 className="w-4 h-4 mx-auto mb-1 text-warning" />
                  <p className="text-xl font-extrabold">{selectedLecturer.stats?.avgGrade !== null ? `${selectedLecturer.stats?.avgGrade}%` : "—"}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Avg Grade</p>
                </div>
              </div>

              {/* Teaching Load Bar */}
              <div className="p-3 rounded-xl bg-muted/30">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold">Teaching Load</p>
                  <p className="text-xs text-muted-foreground">{selectedLecturer.assignedCourses?.length || 0} / {MAX_TEACHING_LOAD} courses</p>
                </div>
                <Progress value={teachingLoad(selectedLecturer.assignedCourses?.length || 0).pct} className="h-2" />
              </div>

              {/* Tabs */}
              <Tabs defaultValue="courses" className="w-full">
                <TabsList className="w-full rounded-xl">
                  <TabsTrigger value="courses" className="flex-1 rounded-lg text-xs">Courses Taught</TabsTrigger>
                  <TabsTrigger value="students" className="flex-1 rounded-lg text-xs">Students Enrolled</TabsTrigger>
                  <TabsTrigger value="performance" className="flex-1 rounded-lg text-xs">Performance</TabsTrigger>
                </TabsList>

                <TabsContent value="courses" className="mt-3">
                  {!selectedLecturer.assignedCourses?.length ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No courses assigned</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedLecturer.assignedCourses.map(c => (
                        <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                          <div>
                            <p className="text-sm font-semibold">{c.course_name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{c.course_code}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] rounded-md">{c.program_level}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="students" className="mt-3">
                  {profileStudents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No enrolled students</p>
                  ) : (
                    <div className="space-y-2">
                      {profileStudents.map((s: any) => (
                        <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                            {s.profile?.full_name?.charAt(0) || "?"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate">{s.profile?.full_name || "—"}</p>
                            <p className="text-[10px] text-muted-foreground">{s.registration_number || "No reg"} • {s.courses.join(", ")}</p>
                          </div>
                          <Badge variant={s.status === "active" ? "default" : "secondary"} className="text-[9px] rounded-md shrink-0">{s.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="performance" className="mt-3">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-success/5 border border-success/10 text-center">
                        <p className="text-xs text-muted-foreground font-semibold">Graded Submissions</p>
                        <p className="text-2xl font-extrabold text-success mt-1">{selectedLecturer.stats?.gradedSubmissions || 0}</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/10 text-center">
                        <p className="text-xs text-muted-foreground font-semibold">Average Grade Given</p>
                        <p className="text-2xl font-extrabold text-primary mt-1">
                          {selectedLecturer.stats?.avgGrade !== null ? `${selectedLecturer.stats?.avgGrade}%` : "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/30 text-center">
                      <p className="text-xs text-muted-foreground font-semibold">Total Assignments Created</p>
                      <p className="text-xl font-extrabold mt-1">{selectedLecturer.stats?.totalAssignments || 0}</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileDialog(false)} className="rounded-xl">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
