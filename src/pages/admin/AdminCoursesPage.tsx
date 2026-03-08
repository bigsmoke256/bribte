import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AnimatedCard, EmptyState } from "@/components/dashboard/DashboardParts";
import { BookOpen, Search, PlusCircle, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";

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
  department?: { name: string } | null;
}

const emptyForm = {
  course_code: "", course_name: "", program_level: "Diploma", duration_years: 2,
  tuition_day: 0, tuition_evening: 0, tuition_weekend: 0, department_id: "", lecturer_id: "",
};

export default function AdminCoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<CourseRow | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase.from("courses")
      .select("*, department:departments!courses_department_id_fkey(name)")
      .order("course_code");
    if (data) setCourses(data.map((c: any) => ({ ...c, department: Array.isArray(c.department) ? c.department[0] : c.department })));
    setLoading(false);
  };

  useEffect(() => {
    fetch();
    supabase.from("departments").select("id, name").order("name").then(({ data }) => { if (data) setDepartments(data); });
  }, []);

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
      tuition_weekend: form.tuition_weekend, department_id: form.department_id || null, lecturer_id: form.lecturer_id || null,
    };
    const { error } = editing
      ? await supabase.from("courses").update(payload).eq("id", editing.id)
      : await supabase.from("courses").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(editing ? "Updated" : "Created"); setDialog(false); fetch(); }
  };

  const deleteCourse = async (c: CourseRow) => {
    if (!confirm(`Delete ${c.course_name}?`)) return;
    const { error } = await supabase.from("courses").delete().eq("id", c.id);
    if (!error) { toast.success("Deleted"); fetch(); } else toast.error(error.message);
  };

  const programLevels = [...new Set(courses.map(c => c.program_level))].sort();

  const filtered = courses.filter(c => {
    const q = search.toLowerCase();
    const matchesSearch = !q || c.course_code.toLowerCase().includes(q) || c.course_name.toLowerCase().includes(q);
    const matchesLevel = levelFilter === "all" || c.program_level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">Courses</h1>
            <p className="text-sm text-muted-foreground mt-1">{courses.length} programs</p>
          </div>
          <Button onClick={openCreate} className="rounded-xl"><PlusCircle className="w-4 h-4 mr-2" /> Add Course</Button>
        </motion.div>

        <AnimatedCard>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-3.5 py-2 w-full sm:w-72 border border-transparent focus-within:border-primary/20">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search courses..." value={search} onChange={e => setSearch(e.target.value)}
                className="border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0" />
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-full sm:w-48 rounded-xl">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {programLevels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={BookOpen} title="No courses found" description="Create courses using the button above." />
          ) : (
            <div className="overflow-x-auto -mx-5">
              <table className="data-table">
                <thead><tr><th className="pl-5">Code</th><th>Name</th><th>Level</th><th>Department</th><th className="text-center">Duration</th><th className="text-right">Tuition (Day)</th><th className="text-center pr-5">Actions</th></tr></thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                      <td className="pl-5 font-mono font-semibold text-primary text-sm">{c.course_code}</td>
                      <td className="text-sm font-semibold">{c.course_name}</td>
                      <td><Badge variant="outline" className="text-[10px] rounded-md">{c.program_level}</Badge></td>
                      <td className="text-sm">{c.department?.name || "—"}</td>
                      <td className="text-center text-sm">{c.duration_years}yr</td>
                      <td className="text-right text-sm font-mono">UGX {(c.tuition_day || 0).toLocaleString()}</td>
                      <td className="text-center pr-5">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => openEdit(c)}><Edit2 className="w-3.5 h-3.5" /></Button>
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
                    <SelectItem value="Certificate">Certificate</SelectItem>
                    <SelectItem value="Diploma">Diploma</SelectItem>
                    <SelectItem value="Bachelors">Bachelors</SelectItem>
                    <SelectItem value="Masters">Masters</SelectItem>
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
              <div><Label className="text-xs font-semibold">Duration (years)</Label><Input type="number" min={1} max={6} value={form.duration_years} onChange={e => setForm(f => ({ ...f, duration_years: parseInt(e.target.value) || 2 }))} className="mt-1.5 rounded-xl" /></div>
            </div>
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
    </DashboardLayout>
  );
}
