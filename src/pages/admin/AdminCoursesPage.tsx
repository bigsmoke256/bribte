import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AnimatedCard, EmptyState } from "@/components/dashboard/DashboardParts";
import {
  BookOpen, Search, PlusCircle, Edit2, Trash2, Eye, Upload,
  ToggleLeft, ToggleRight, Layers, FileText, ClipboardCheck,
  GraduationCap, X, ChevronDown, ChevronRight, Plus, File,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion } from "framer-motion";

/* ─── Types ─── */
interface CourseRow {
  id: string;
  course_code: string;
  course_name: string;
  program_level: string;
  duration_years: number;
  tuition_day: number | null;
  tuition_evening: number | null;
  tuition_weekend: number | null;
  department_id: string | null;
  lecturer_id: string | null;
  is_published: boolean;
  department?: { name: string } | null;
}

interface ModuleRow {
  id: string; course_id: string; title: string; description: string | null; sort_order: number;
  lessons?: LessonRow[];
}
interface LessonRow {
  id: string; module_id: string; title: string; content: string | null; sort_order: number;
}
interface MaterialRow {
  id: string; course_id: string; title: string; file_url: string; file_type: string | null; created_at: string;
}
interface LecturerOption {
  id: string; user_id: string; profile?: { full_name: string } | null;
}
interface AssignmentRow {
  id: string; title: string; deadline: string; max_grade: number;
}

const emptyForm = {
  course_code: "", course_name: "", program_level: "Diploma", duration_years: 2,
  tuition_day: 0, tuition_evening: 0, tuition_weekend: 0, department_id: "", lecturer_id: "",
};

export default function AdminCoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [lecturers, setLecturers] = useState<LecturerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [pubFilter, setPubFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");

  // Form dialog
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<CourseRow | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Detail dialog
  const [detailCourse, setDetailCourse] = useState<CourseRow | null>(null);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [detailTab, setDetailTab] = useState("structure");

  // Module/lesson forms
  const [moduleDialog, setModuleDialog] = useState(false);
  const [editingModule, setEditingModule] = useState<ModuleRow | null>(null);
  const [moduleForm, setModuleForm] = useState({ title: "", description: "" });
  const [lessonDialog, setLessonDialog] = useState(false);
  const [lessonParentModule, setLessonParentModule] = useState<string>("");
  const [editingLesson, setEditingLesson] = useState<LessonRow | null>(null);
  const [lessonForm, setLessonForm] = useState({ title: "", content: "" });
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Material upload
  const [uploading, setUploading] = useState(false);

  /* ─── Fetch ─── */
  const fetchCourses = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("courses")
      .select("*, department:departments!courses_department_id_fkey(name)")
      .order("course_code");
    if (data) setCourses(data.map((c: any) => ({
      ...c,
      is_published: c.is_published ?? true,
      department: Array.isArray(c.department) ? c.department[0] : c.department,
    })));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCourses();
    supabase.from("departments").select("id, name").order("name").then(({ data }) => { if (data) setDepartments(data); });
    // Fetch lecturers with profiles
    supabase.from("lecturers").select("id, user_id").then(async ({ data: lecs }) => {
      if (!lecs) return;
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name");
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      setLecturers(lecs.map(l => ({ ...l, profile: profileMap.get(l.user_id) || null })));
    });
  }, [fetchCourses]);

  /* ─── Detail fetch ─── */
  const openDetail = async (c: CourseRow) => {
    setDetailCourse(c);
    setDetailTab("structure");
    // Fetch modules, lessons, materials, assignments in parallel
    const [modRes, matRes, asgRes] = await Promise.all([
      supabase.from("course_modules").select("*").eq("course_id", c.id).order("sort_order"),
      supabase.from("course_materials").select("*").eq("course_id", c.id).order("created_at", { ascending: false }),
      supabase.from("assignments").select("id, title, deadline, max_grade").eq("course_id", c.id).order("deadline"),
    ]);
    const mods: ModuleRow[] = (modRes.data || []) as any;
    // Fetch lessons for all modules
    if (mods.length > 0) {
      const { data: lessons } = await supabase.from("course_lessons")
        .select("*").in("module_id", mods.map(m => m.id)).order("sort_order");
      const lessonMap = new Map<string, LessonRow[]>();
      (lessons || []).forEach((l: any) => {
        if (!lessonMap.has(l.module_id)) lessonMap.set(l.module_id, []);
        lessonMap.get(l.module_id)!.push(l);
      });
      mods.forEach(m => { m.lessons = lessonMap.get(m.id) || []; });
    }
    setModules(mods);
    setMaterials((matRes.data || []) as any);
    setAssignments((asgRes.data || []) as any);
  };

  /* ─── CRUD ─── */
  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialog(true); };
  const openEdit = (c: CourseRow) => {
    setEditing(c);
    setForm({
      course_code: c.course_code, course_name: c.course_name, program_level: c.program_level,
      duration_years: c.duration_years, tuition_day: c.tuition_day || 0, tuition_evening: c.tuition_evening || 0,
      tuition_weekend: c.tuition_weekend || 0, department_id: c.department_id || "", lecturer_id: c.lecturer_id || "",
    });
    setDialog(true);
  };

  const save = async () => {
    if (!form.course_code || !form.course_name) { toast.error("Code and name required"); return; }
    const payload = {
      course_code: form.course_code, course_name: form.course_name, program_level: form.program_level,
      duration_years: form.duration_years, tuition_day: form.tuition_day, tuition_evening: form.tuition_evening,
      tuition_weekend: form.tuition_weekend, department_id: form.department_id || null,
      lecturer_id: form.lecturer_id || null,
    };
    const { error } = editing
      ? await supabase.from("courses").update(payload).eq("id", editing.id)
      : await supabase.from("courses").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(editing ? "Updated" : "Created"); setDialog(false); fetchCourses(); }
  };

  const deleteCourse = async (c: CourseRow) => {
    if (!confirm(`Delete ${c.course_name}?`)) return;
    const { error } = await supabase.from("courses").delete().eq("id", c.id);
    if (!error) { toast.success("Deleted"); fetchCourses(); } else toast.error(error.message);
  };

  const togglePublish = async (c: CourseRow) => {
    const { error } = await supabase.from("courses").update({ is_published: !c.is_published }).eq("id", c.id);
    if (!error) { toast.success(c.is_published ? "Unpublished" : "Published"); fetchCourses(); }
    else toast.error(error.message);
  };

  /* ─── Module CRUD ─── */
  const openAddModule = () => { setEditingModule(null); setModuleForm({ title: "", description: "" }); setModuleDialog(true); };
  const openEditModule = (m: ModuleRow) => { setEditingModule(m); setModuleForm({ title: m.title, description: m.description || "" }); setModuleDialog(true); };

  const saveModule = async () => {
    if (!moduleForm.title || !detailCourse) return;
    const payload = { title: moduleForm.title, description: moduleForm.description || null, course_id: detailCourse.id, sort_order: modules.length };
    const { error } = editingModule
      ? await supabase.from("course_modules").update({ title: payload.title, description: payload.description }).eq("id", editingModule.id)
      : await supabase.from("course_modules").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(editingModule ? "Module updated" : "Module added"); setModuleDialog(false); openDetail(detailCourse); }
  };

  const deleteModule = async (m: ModuleRow) => {
    if (!confirm(`Delete module "${m.title}"?`) || !detailCourse) return;
    const { error } = await supabase.from("course_modules").delete().eq("id", m.id);
    if (!error) { toast.success("Module deleted"); openDetail(detailCourse); } else toast.error(error.message);
  };

  /* ─── Lesson CRUD ─── */
  const openAddLesson = (moduleId: string) => { setLessonParentModule(moduleId); setEditingLesson(null); setLessonForm({ title: "", content: "" }); setLessonDialog(true); };
  const openEditLesson = (l: LessonRow) => { setLessonParentModule(l.module_id); setEditingLesson(l); setLessonForm({ title: l.title, content: l.content || "" }); setLessonDialog(true); };

  const saveLesson = async () => {
    if (!lessonForm.title || !detailCourse) return;
    const mod = modules.find(m => m.id === lessonParentModule);
    const payload = { title: lessonForm.title, content: lessonForm.content || null, module_id: lessonParentModule, sort_order: (mod?.lessons?.length || 0) };
    const { error } = editingLesson
      ? await supabase.from("course_lessons").update({ title: payload.title, content: payload.content }).eq("id", editingLesson.id)
      : await supabase.from("course_lessons").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(editingLesson ? "Lesson updated" : "Lesson added"); setLessonDialog(false); openDetail(detailCourse); }
  };

  const deleteLesson = async (l: LessonRow) => {
    if (!confirm(`Delete lesson "${l.title}"?`) || !detailCourse) return;
    const { error } = await supabase.from("course_lessons").delete().eq("id", l.id);
    if (!error) { toast.success("Deleted"); openDetail(detailCourse); } else toast.error(error.message);
  };

  /* ─── Material upload ─── */
  const handleMaterialUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !detailCourse) return;
    const file = e.target.files[0];
    setUploading(true);
    const path = `${detailCourse.id}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from("course-materials").upload(path, file);
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("course-materials").getPublicUrl(path);
    const { error } = await supabase.from("course_materials").insert({
      course_id: detailCourse.id, title: file.name, file_url: urlData.publicUrl,
      file_type: file.type, uploaded_by: user?.id || null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Material uploaded"); openDetail(detailCourse); }
    setUploading(false);
  };

  const deleteMaterial = async (m: MaterialRow) => {
    if (!confirm(`Delete "${m.title}"?`) || !detailCourse) return;
    await supabase.from("course_materials").delete().eq("id", m.id);
    toast.success("Deleted");
    openDetail(detailCourse);
  };

  /* ─── Filter ─── */
  const programLevels = [...new Set(courses.map(c => c.program_level))].sort();
  const filtered = courses.filter(c => {
    const q = search.toLowerCase();
    const matchesSearch = !q || c.course_code.toLowerCase().includes(q) || c.course_name.toLowerCase().includes(q);
    const matchesLevel = levelFilter === "all" || c.program_level === levelFilter;
    const matchesPub = pubFilter === "all" || (pubFilter === "published" ? c.is_published : !c.is_published);
    const matchesMode = modeFilter === "all"
      || (modeFilter === "day" && (c.tuition_day || 0) > 0)
      || (modeFilter === "evening" && (c.tuition_evening || 0) > 0)
      || (modeFilter === "weekend" && (c.tuition_weekend || 0) > 0);
    return matchesSearch && matchesLevel && matchesPub && matchesMode;
  });

  const toggleExpand = (id: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getLecturerName = (lecId: string | null) => {
    if (!lecId) return "—";
    const l = lecturers.find(lec => lec.user_id === lecId);
    return l?.profile?.full_name || "Unknown";
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">Courses</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {courses.length} programs · {courses.filter(c => c.is_published).length} published
            </p>
          </div>
          <Button onClick={openCreate} className="rounded-xl"><PlusCircle className="w-4 h-4 mr-2" /> Add Course</Button>
        </motion.div>

        {/* Filters */}
        <AnimatedCard>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-3.5 py-2 w-full sm:w-72 border border-transparent focus-within:border-primary/20">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search courses..." value={search} onChange={e => setSearch(e.target.value)}
                className="border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0" />
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-full sm:w-44 rounded-xl"><SelectValue placeholder="All Levels" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {programLevels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={pubFilter} onValueChange={setPubFilter}>
              <SelectTrigger className="w-full sm:w-40 rounded-xl"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
            <Select value={modeFilter} onValueChange={setModeFilter}>
              <SelectTrigger className="w-full sm:w-44 rounded-xl"><SelectValue placeholder="Study Mode" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="evening">Evening</SelectItem>
                <SelectItem value="weekend">Weekend</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={BookOpen} title="No courses found" description="Create courses using the button above." />
          ) : (
            <div className="overflow-x-auto -mx-5">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="pl-5">Code</th><th>Name</th><th>Level</th><th>Department</th>
                    <th>Lecturer</th><th className="text-center">Duration</th><th className="text-center">Status</th>
                    <th className="text-right">Tuition (Day)</th><th className="text-center pr-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                      <td className="pl-5 font-mono font-semibold text-primary text-sm">{c.course_code}</td>
                      <td className="text-sm font-semibold">{c.course_name}</td>
                      <td><Badge variant="outline" className="text-[10px] rounded-md">{c.program_level}</Badge></td>
                      <td className="text-sm">{c.department?.name || "—"}</td>
                      <td className="text-sm">{getLecturerName(c.lecturer_id)}</td>
                      <td className="text-center text-sm">{c.duration_years}yr</td>
                      <td className="text-center">
                        <Badge variant={c.is_published ? "default" : "secondary"} className="text-[10px] rounded-md">
                          {c.is_published ? "Published" : "Draft"}
                        </Badge>
                      </td>
                      <td className="text-right text-sm font-mono">UGX {(c.tuition_day || 0).toLocaleString()}</td>
                      <td className="text-center pr-5">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => openDetail(c)} title="View"><Eye className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => openEdit(c)} title="Edit"><Edit2 className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => togglePublish(c)} title={c.is_published ? "Unpublish" : "Publish"}>
                            {c.is_published ? <ToggleRight className="w-3.5 h-3.5 text-green-600" /> : <ToggleLeft className="w-3.5 h-3.5 text-muted-foreground" />}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg text-destructive hover:bg-destructive/10" onClick={() => deleteCourse(c)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AnimatedCard>
      </div>

      {/* ─── Create/Edit Dialog ─── */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader><DialogTitle className="font-display">{editing ? "Edit" : "Add"} Course</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold">Course Code *</Label><Input value={form.course_code} onChange={e => setForm(f => ({ ...f, course_code: e.target.value }))} className="mt-1.5 rounded-xl" /></div>
              <div>
                <Label className="text-xs font-semibold">Program Level</Label>
                <Select value={form.program_level} onValueChange={v => setForm(f => ({ ...f, program_level: v }))}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Certificate", "Junior Certificate", "National Certificate", "Diploma", "National Diploma", "Higher National Diploma", "Bachelors", "Masters"].map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs font-semibold">Course Name *</Label><Input value={form.course_name} onChange={e => setForm(f => ({ ...f, course_name: e.target.value }))} className="mt-1.5 rounded-xl" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Department</Label>
                <Select value={form.department_id} onValueChange={v => setForm(f => ({ ...f, department_id: v }))}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Assign Lecturer</Label>
                <Select value={form.lecturer_id} onValueChange={v => setForm(f => ({ ...f, lecturer_id: v }))}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Select lecturer" /></SelectTrigger>
                  <SelectContent>
                    {lecturers.map(l => (
                      <SelectItem key={l.id} value={l.user_id}>{l.profile?.full_name || "Unknown"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs font-semibold">Duration (years)</Label><Input type="number" min={1} max={6} value={form.duration_years} onChange={e => setForm(f => ({ ...f, duration_years: parseInt(e.target.value) || 2 }))} className="mt-1.5 rounded-xl" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs font-semibold">Tuition Day</Label><Input type="number" min={0} value={form.tuition_day} onChange={e => setForm(f => ({ ...f, tuition_day: parseFloat(e.target.value) || 0 }))} className="mt-1.5 rounded-xl" /></div>
              <div><Label className="text-xs font-semibold">Evening</Label><Input type="number" min={0} value={form.tuition_evening} onChange={e => setForm(f => ({ ...f, tuition_evening: parseFloat(e.target.value) || 0 }))} className="mt-1.5 rounded-xl" /></div>
              <div><Label className="text-xs font-semibold">Weekend</Label><Input type="number" min={0} value={form.tuition_weekend} onChange={e => setForm(f => ({ ...f, tuition_weekend: parseFloat(e.target.value) || 0 }))} className="mt-1.5 rounded-xl" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={save} className="rounded-xl">{editing ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Detail Dialog ─── */}
      <Dialog open={!!detailCourse} onOpenChange={o => { if (!o) setDetailCourse(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl">
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
                      {detailCourse.course_code} · {detailCourse.program_level} · {detailCourse.duration_years}yr
                      <Badge variant={detailCourse.is_published ? "default" : "secondary"} className="ml-2 text-[10px]">
                        {detailCourse.is_published ? "Published" : "Draft"}
                      </Badge>
                    </p>
                  </div>
                </div>
              </DialogHeader>

              <Tabs value={detailTab} onValueChange={setDetailTab} className="mt-4">
                <TabsList className="rounded-xl">
                  <TabsTrigger value="structure" className="rounded-lg text-xs gap-1.5"><Layers className="w-3.5 h-3.5" />Structure</TabsTrigger>
                  <TabsTrigger value="materials" className="rounded-lg text-xs gap-1.5"><FileText className="w-3.5 h-3.5" />Materials</TabsTrigger>
                  <TabsTrigger value="assignments" className="rounded-lg text-xs gap-1.5"><ClipboardCheck className="w-3.5 h-3.5" />Assignments</TabsTrigger>
                </TabsList>

                {/* ─── Structure Tab ─── */}
                <TabsContent value="structure" className="space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{modules.length} Modules</p>
                    <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={openAddModule}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Module
                    </Button>
                  </div>
                  {modules.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">No modules yet. Add modules to build the course structure.</div>
                  ) : (
                    <div className="space-y-2">
                      {modules.map((m, mi) => (
                        <div key={m.id} className="border rounded-xl overflow-hidden">
                          <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 cursor-pointer" onClick={() => toggleExpand(m.id)}>
                            {expandedModules.has(m.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <span className="text-xs font-semibold text-muted-foreground">M{mi + 1}</span>
                            <span className="text-sm font-semibold flex-1">{m.title}</span>
                            <Badge variant="outline" className="text-[10px]">{m.lessons?.length || 0} lessons</Badge>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={e => { e.stopPropagation(); openEditModule(m); }}><Edit2 className="w-3 h-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={e => { e.stopPropagation(); deleteModule(m); }}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                          {expandedModules.has(m.id) && (
                            <div className="px-4 py-3 space-y-2">
                              {m.description && <p className="text-xs text-muted-foreground mb-2">{m.description}</p>}
                              {(m.lessons || []).map((l, li) => (
                                <div key={l.id} className="flex items-center gap-2 pl-4 py-1.5 rounded-lg hover:bg-muted/30 group">
                                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">L{li + 1}</span>
                                  <span className="text-sm flex-1">{l.title}</span>
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100" onClick={() => openEditLesson(l)}><Edit2 className="w-3 h-3" /></Button>
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteLesson(l)}><Trash2 className="w-3 h-3" /></Button>
                                </div>
                              ))}
                              <Button size="sm" variant="ghost" className="text-xs text-primary mt-1" onClick={() => openAddLesson(m.id)}>
                                <Plus className="w-3.5 h-3.5 mr-1" /> Add Lesson
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* ─── Materials Tab ─── */}
                <TabsContent value="materials" className="space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{materials.length} Materials</p>
                    <label>
                      <input type="file" className="hidden" onChange={handleMaterialUpload} disabled={uploading} />
                      <Button size="sm" variant="outline" className="rounded-xl text-xs" asChild disabled={uploading}>
                        <span><Upload className="w-3.5 h-3.5 mr-1" /> {uploading ? "Uploading..." : "Upload File"}</span>
                      </Button>
                    </label>
                  </div>
                  {materials.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">No materials uploaded yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {materials.map(m => (
                        <div key={m.id} className="flex items-center gap-3 p-3 border rounded-xl group">
                          <File className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{m.title}</p>
                            <p className="text-[10px] text-muted-foreground">{m.file_type} · {new Date(m.created_at).toLocaleDateString()}</p>
                          </div>
                          <a href={m.file_url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="ghost" className="h-7 rounded-lg text-xs">View</Button>
                          </a>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg text-destructive opacity-0 group-hover:opacity-100" onClick={() => deleteMaterial(m)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* ─── Assignments Tab ─── */}
                <TabsContent value="assignments" className="space-y-3 mt-4">
                  <p className="text-sm font-semibold">{assignments.length} Assignments</p>
                  {assignments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">No assignments for this course yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {assignments.map(a => (
                        <div key={a.id} className="flex items-center gap-3 p-3 border rounded-xl">
                          <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{a.title}</p>
                            <p className="text-[10px] text-muted-foreground">Due: {new Date(a.deadline).toLocaleDateString()} · Max: {a.max_grade}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Module Dialog ─── */}
      <Dialog open={moduleDialog} onOpenChange={setModuleDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="font-display">{editingModule ? "Edit" : "Add"} Module</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs font-semibold">Title *</Label><Input value={moduleForm.title} onChange={e => setModuleForm(f => ({ ...f, title: e.target.value }))} className="mt-1.5 rounded-xl" /></div>
            <div><Label className="text-xs font-semibold">Description</Label><Textarea value={moduleForm.description} onChange={e => setModuleForm(f => ({ ...f, description: e.target.value }))} className="mt-1.5 rounded-xl" rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModuleDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={saveModule} className="rounded-xl">{editingModule ? "Save" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Lesson Dialog ─── */}
      <Dialog open={lessonDialog} onOpenChange={setLessonDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="font-display">{editingLesson ? "Edit" : "Add"} Lesson</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs font-semibold">Title *</Label><Input value={lessonForm.title} onChange={e => setLessonForm(f => ({ ...f, title: e.target.value }))} className="mt-1.5 rounded-xl" /></div>
            <div><Label className="text-xs font-semibold">Content</Label><Textarea value={lessonForm.content} onChange={e => setLessonForm(f => ({ ...f, content: e.target.value }))} className="mt-1.5 rounded-xl" rows={5} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLessonDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={saveLesson} className="rounded-xl">{editingLesson ? "Save" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
