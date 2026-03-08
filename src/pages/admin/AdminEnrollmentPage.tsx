import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AnimatedCard, EmptyState } from "@/components/dashboard/DashboardParts";
import { GraduationCap, Search, PlusCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface EnrollmentRow {
  id: string;
  academic_year: string;
  semester: number;
  study_mode: string;
  student_id: string;
  course_id: string;
  student?: { registration_number: string | null; profile?: { full_name: string } };
  course?: { course_name: string; course_code: string };
}

export default function AdminEnrollmentPage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ student_id: "", course_id: "", academic_year: "2025/2026", semester: 1, study_mode: "Day" });

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("enrollments")
      .select("*, student:students(registration_number, user_id), course:courses(course_name, course_code)")
      .order("created_at", { ascending: false });
    if (data) {
      const userIds = data.map((e: any) => {
        const student = Array.isArray(e.student) ? e.student[0] : e.student;
        return student?.user_id;
      }).filter(Boolean);
      const { data: profilesData } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const profileMap = new Map((profilesData || []).map(p => [p.user_id, p]));
      setEnrollments(data.map((e: any) => {
        const student = Array.isArray(e.student) ? e.student[0] : e.student;
        if (student) student.profile = profileMap.get(student.user_id) || null;
        return { ...e, student, course: Array.isArray(e.course) ? e.course[0] : e.course };
      }));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    supabase.from("students").select("id, registration_number, user_id").then(async ({ data }) => {
      if (data) {
        const uids = data.map(s => s.user_id);
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", uids);
        const pm = new Map((profs || []).map(p => [p.user_id, p]));
        setStudents(data.map(s => ({ ...s, profile: pm.get(s.user_id) || null })));
      }
    });
    supabase.from("courses").select("id, course_name, course_code").order("course_code").then(({ data }) => { if (data) setCourses(data); });
  }, []);

  const enroll = async () => {
    if (!form.student_id || !form.course_id) { toast.error("Select student and course"); return; }
    const { error } = await supabase.from("enrollments").insert({
      student_id: form.student_id, course_id: form.course_id, academic_year: form.academic_year,
      semester: form.semester, study_mode: form.study_mode,
    });
    if (error) toast.error(error.message);
    else { toast.success("Enrolled"); setDialog(false); fetchData(); }
  };

  const remove = async (e: EnrollmentRow) => {
    if (!confirm("Remove this enrollment?")) return;
    const { error } = await supabase.from("enrollments").delete().eq("id", e.id);
    if (!error) { toast.success("Removed"); fetchData(); }
  };

  const filtered = enrollments.filter(e => {
    const q = search.toLowerCase();
    return !q || e.student?.profile?.full_name?.toLowerCase().includes(q) || e.course?.course_code?.toLowerCase().includes(q);
  });

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">Enrollment</h1>
            <p className="text-sm text-muted-foreground mt-1">{enrollments.length} enrollments</p>
          </div>
          <Button onClick={() => setDialog(true)} className="rounded-xl"><PlusCircle className="w-4 h-4 mr-2" /> Enroll Student</Button>
        </motion.div>

        <AnimatedCard>
          <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-3.5 py-2 w-full sm:w-72 border border-transparent focus-within:border-primary/20 mb-4">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
              className="border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0" />
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={GraduationCap} title="No enrollments" description="Enroll students using the button above." />
          ) : (
            <div className="overflow-x-auto -mx-5">
              <table className="data-table">
                <thead><tr><th className="pl-5">Student</th><th>Course</th><th>Academic Year</th><th className="text-center">Sem</th><th className="text-center">Mode</th><th className="text-center pr-5">Actions</th></tr></thead>
                <tbody>
                  {filtered.map((e, i) => (
                    <motion.tr key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                      <td className="pl-5">
                        <p className="font-semibold text-sm">{e.student?.profile?.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{e.student?.registration_number || "—"}</p>
                      </td>
                      <td className="text-sm"><span className="font-mono text-primary font-semibold">{e.course?.course_code}</span> {e.course?.course_name}</td>
                      <td className="text-sm">{e.academic_year}</td>
                      <td className="text-center text-sm">{e.semester}</td>
                      <td className="text-center text-sm">{e.study_mode}</td>
                      <td className="text-center pr-5">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg text-destructive hover:bg-destructive/10" onClick={() => remove(e)}><Trash2 className="w-3.5 h-3.5" /></Button>
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
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="font-display">Enroll Student</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Student</Label>
              <Select value={form.student_id} onValueChange={v => setForm(f => ({ ...f, student_id: v }))}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.profile?.full_name || s.registration_number || s.id}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Course</Label>
              <Select value={form.course_id} onValueChange={v => setForm(f => ({ ...f, course_id: v }))}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.course_code} – {c.course_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs font-semibold">Academic Year</Label><Input value={form.academic_year} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))} className="mt-1.5 rounded-xl" /></div>
              <div><Label className="text-xs font-semibold">Semester</Label><Input type="number" min={1} max={4} value={form.semester} onChange={e => setForm(f => ({ ...f, semester: parseInt(e.target.value) || 1 }))} className="mt-1.5 rounded-xl" /></div>
              <div>
                <Label className="text-xs font-semibold">Mode</Label>
                <Select value={form.study_mode} onValueChange={v => setForm(f => ({ ...f, study_mode: v }))}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Day">Day</SelectItem><SelectItem value="Evening">Evening</SelectItem><SelectItem value="Weekend">Weekend</SelectItem></SelectContent>
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
    </DashboardLayout>
  );
}
