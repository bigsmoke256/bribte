import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AnimatedCard, SectionHeader, EmptyState } from "@/components/dashboard/DashboardParts";
import { Users, Search, PlusCircle, Edit2, Trash2, Eye, CheckCircle, XCircle, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface StudentRow {
  id: string;
  user_id: string;
  registration_number: string | null;
  status: string;
  study_mode: string;
  year_of_study: number;
  semester: number;
  fee_balance: number;
  course_id: string | null;
  admission_date: string | null;
  profile?: { full_name: string; email: string; phone: string | null };
  course?: { course_name: string; course_code: string } | null;
}

interface CourseOption {
  id: string;
  course_name: string;
  course_code: string;
}

export default function AdminStudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editStudent, setEditStudent] = useState<StudentRow | null>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    registration_number: "",
    status: "pending",
    study_mode: "Day",
    year_of_study: 1,
    semester: 1,
    fee_balance: 0,
    course_id: "",
  });

  const fetchStudents = async () => {
    setLoading(true);
    const { data: studentsData } = await supabase
      .from("students")
      .select("*, course:courses(course_name, course_code)")
      .order("created_at", { ascending: false });

    if (studentsData) {
      // Fetch profiles for all student user_ids
      const userIds = studentsData.map((s: any) => s.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, phone")
        .in("user_id", userIds);

      const profileMap = new Map((profilesData || []).map(p => [p.user_id, p]));
      setStudents(studentsData.map((s: any) => ({
        ...s,
        profile: profileMap.get(s.user_id) || null,
        course: Array.isArray(s.course) ? s.course[0] : s.course,
      })));
    }
    setLoading(false);
  };

  const fetchCourses = async () => {
    const { data } = await supabase.from("courses").select("id, course_name, course_code").order("course_name");
    if (data) setCourses(data);
  };

  useEffect(() => { fetchStudents(); fetchCourses(); }, []);

  const openEdit = (s: StudentRow) => {
    setEditStudent(s);
    setEditForm({
      registration_number: s.registration_number || "",
      status: s.status,
      study_mode: s.study_mode,
      year_of_study: s.year_of_study,
      semester: s.semester,
      fee_balance: s.fee_balance,
      course_id: s.course_id || "",
    });
    setEditDialog(true);
  };

  const saveStudent = async () => {
    if (!editStudent) return;
    const { error } = await supabase
      .from("students")
      .update({
        registration_number: editForm.registration_number || null,
        status: editForm.status,
        study_mode: editForm.study_mode,
        year_of_study: editForm.year_of_study,
        semester: editForm.semester,
        fee_balance: editForm.fee_balance,
        course_id: editForm.course_id || null,
      })
      .eq("id", editStudent.id);

    if (error) {
      toast.error("Failed to update student: " + error.message);
    } else {
      toast.success("Student updated successfully");
      setEditDialog(false);
      fetchStudents();
    }
  };

  const approveStudent = async (s: StudentRow) => {
    const { error } = await supabase
      .from("students")
      .update({ status: "active" })
      .eq("id", s.id);
    if (!error) {
      toast.success(`${s.profile?.full_name || "Student"} approved`);
      fetchStudents();
    }
  };

  const deleteStudent = async (s: StudentRow) => {
    if (!confirm(`Delete ${s.profile?.full_name}? This cannot be undone.`)) return;
    const { error } = await supabase.from("students").delete().eq("id", s.id);
    if (!error) {
      toast.success("Student removed");
      fetchStudents();
    } else {
      toast.error("Failed to delete: " + error.message);
    }
  };

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    return !q ||
      s.profile?.full_name?.toLowerCase().includes(q) ||
      s.profile?.email?.toLowerCase().includes(q) ||
      s.registration_number?.toLowerCase().includes(q);
  });

  const statusColor = (s: string) =>
    s === "active" ? "bg-success/10 text-success" :
    s === "pending" ? "bg-warning/10 text-warning" :
    s === "suspended" ? "bg-destructive/10 text-destructive" :
    "bg-muted text-muted-foreground";

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">Students</h1>
            <p className="text-sm text-muted-foreground mt-1">{students.length} total students</p>
          </div>
        </motion.div>

        <AnimatedCard>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-3.5 py-2 w-full sm:w-72 border border-transparent focus-within:border-primary/20">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Input placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)}
                className="border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0" />
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="rounded-lg text-xs">{filtered.filter(s => s.status === "pending").length} pending</Badge>
              <Badge variant="secondary" className="rounded-lg text-xs">{filtered.filter(s => s.status === "active").length} active</Badge>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Users} title="No students found" description="No students match your search criteria." />
          ) : (
            <div className="overflow-x-auto -mx-5">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="pl-5">Name</th>
                    <th>Reg. Number</th>
                    <th>Course</th>
                    <th className="text-center">Year</th>
                    <th className="text-center">Mode</th>
                    <th className="text-center">Status</th>
                    <th className="text-right">Fee Balance</th>
                    <th className="text-center pr-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                      <td className="pl-5">
                        <div>
                          <p className="font-semibold text-sm">{s.profile?.full_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{s.profile?.email || "—"}</p>
                        </div>
                      </td>
                      <td className="text-sm font-mono">{s.registration_number || <span className="text-muted-foreground italic">Not assigned</span>}</td>
                      <td className="text-sm">{s.course ? <span>{s.course.course_code}</span> : <span className="text-muted-foreground italic">None</span>}</td>
                      <td className="text-center text-sm">{s.year_of_study}</td>
                      <td className="text-center"><Badge variant="outline" className="text-[10px] rounded-md">{s.study_mode}</Badge></td>
                      <td className="text-center">
                        <span className={`metric-badge text-[10px] font-semibold ${statusColor(s.status)}`}>{s.status}</span>
                      </td>
                      <td className="text-right text-sm font-mono">UGX {s.fee_balance.toLocaleString()}</td>
                      <td className="text-center pr-5">
                        <div className="flex items-center justify-center gap-1">
                          {s.status === "pending" && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg text-success hover:bg-success/10" onClick={() => approveStudent(s)} title="Approve">
                              <CheckCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg hover:bg-muted" onClick={() => openEdit(s)} title="Edit">
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg text-destructive hover:bg-destructive/10" onClick={() => deleteStudent(s)} title="Delete">
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
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Registration Number</Label>
              <Input value={editForm.registration_number} onChange={e => setEditForm(f => ({ ...f, registration_number: e.target.value }))}
                placeholder="e.g. BRI/2026/0001" className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs font-semibold">Course</Label>
              <Select value={editForm.course_id} onValueChange={v => setEditForm(f => ({ ...f, course_id: v }))}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>
                  {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.course_code} – {c.course_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Status</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="graduated">Graduated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Study Mode</Label>
                <Select value={editForm.study_mode} onValueChange={v => setEditForm(f => ({ ...f, study_mode: v }))}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Day">Day</SelectItem>
                    <SelectItem value="Evening">Evening</SelectItem>
                    <SelectItem value="Weekend">Weekend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Year of Study</Label>
                <Input type="number" min={1} max={6} value={editForm.year_of_study}
                  onChange={e => setEditForm(f => ({ ...f, year_of_study: parseInt(e.target.value) || 1 }))} className="mt-1.5 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Semester</Label>
                <Input type="number" min={1} max={4} value={editForm.semester}
                  onChange={e => setEditForm(f => ({ ...f, semester: parseInt(e.target.value) || 1 }))} className="mt-1.5 rounded-xl" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Fee Balance (UGX)</Label>
              <Input type="number" min={0} value={editForm.fee_balance}
                onChange={e => setEditForm(f => ({ ...f, fee_balance: parseFloat(e.target.value) || 0 }))} className="mt-1.5 rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={saveStudent} className="rounded-xl">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
