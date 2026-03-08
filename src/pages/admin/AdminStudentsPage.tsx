import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AnimatedCard, SectionHeader, EmptyState } from "@/components/dashboard/DashboardParts";
import {
  Users, Search, PlusCircle, Edit2, Trash2, Eye, CheckCircle, XCircle,
  GraduationCap, CreditCard, BookOpen, Ban, Award, UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface CourseOption { id: string; course_name: string; course_code: string; }

export default function AdminStudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");

  // Dialogs
  const [editStudent, setEditStudent] = useState<StudentRow | null>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [profileDialog, setProfileDialog] = useState(false);
  const [profileStudent, setProfileStudent] = useState<StudentRow | null>(null);
  const [createDialog, setCreateDialog] = useState(false);

  // Profile detail data
  const [profileEnrollments, setProfileEnrollments] = useState<any[]>([]);
  const [profilePayments, setProfilePayments] = useState<any[]>([]);
  const [profileGrades, setProfileGrades] = useState<any[]>([]);

  const [editForm, setEditForm] = useState({
    registration_number: "", status: "pending", study_mode: "Day",
    year_of_study: 1, semester: 1, fee_balance: 0, course_id: "",
  });

  const [createForm, setCreateForm] = useState({
    email: "", password: "", full_name: "", course_id: "", study_mode: "Day",
  });
  const [creating, setCreating] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    const { data: studentsData } = await supabase
      .from("students")
      .select("*, course:courses(course_name, course_code)")
      .order("created_at", { ascending: false });

    if (studentsData) {
      const userIds = studentsData.map((s: any) => s.user_id);
      const { data: profilesData } = await supabase
        .from("profiles").select("user_id, full_name, email, phone").in("user_id", userIds);
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

  // --- Student Profile ---
  const openProfile = async (s: StudentRow) => {
    setProfileStudent(s);
    setProfileDialog(true);

    const [enr, pay, subs] = await Promise.all([
      supabase.from("enrollments").select("*, course:courses(course_name, course_code)").eq("student_id", s.id).order("created_at", { ascending: false }),
      supabase.from("payments").select("*").eq("student_id", s.id).order("created_at", { ascending: false }),
      supabase.from("submissions").select("*, assignment:assignments(title, max_grade, course:courses(course_code))").eq("student_id", s.id).order("created_at", { ascending: false }),
    ]);

    setProfileEnrollments((enr.data || []).map((e: any) => ({ ...e, course: Array.isArray(e.course) ? e.course[0] : e.course })));
    setProfilePayments(pay.data || []);
    setProfileGrades((subs.data || []).map((sub: any) => {
      const assignment = Array.isArray(sub.assignment) ? sub.assignment[0] : sub.assignment;
      return { ...sub, assignment };
    }));
  };

  // --- Edit ---
  const openEdit = (s: StudentRow) => {
    setEditStudent(s);
    setEditForm({
      registration_number: s.registration_number || "",
      status: s.status, study_mode: s.study_mode,
      year_of_study: s.year_of_study, semester: s.semester,
      fee_balance: s.fee_balance, course_id: s.course_id || "",
    });
    setEditDialog(true);
  };

  const saveStudent = async () => {
    if (!editStudent) return;
    const { error } = await supabase.from("students").update({
      registration_number: editForm.registration_number || null,
      status: editForm.status, study_mode: editForm.study_mode,
      year_of_study: editForm.year_of_study, semester: editForm.semester,
      fee_balance: editForm.fee_balance, course_id: editForm.course_id || null,
    }).eq("id", editStudent.id);
    if (error) toast.error(error.message);
    else { toast.success("Student updated"); setEditDialog(false); fetchStudents(); }
  };

  // --- Create Student ---
  const createStudent = async () => {
    if (!createForm.email || !createForm.password || !createForm.full_name) {
      toast.error("Fill in all required fields"); return;
    }
    setCreating(true);
    try {
      const res = await supabase.functions.invoke("create-admin", {
        body: { email: createForm.email, password: createForm.password, full_name: createForm.full_name, role: "student" },
      });
      if (res.error) throw new Error(res.error.message);
      const result = res.data as any;
      if (result.error) throw new Error(result.error);

      // Update student record with course/mode
      if (createForm.course_id || createForm.study_mode !== "Day") {
        // Find the student record that was just created
        const { data: newStudent } = await supabase.from("students").select("id").eq("user_id", result.user_id).maybeSingle();
        if (newStudent) {
          await supabase.from("students").update({
            course_id: createForm.course_id || null,
            study_mode: createForm.study_mode,
          }).eq("id", newStudent.id);
        }
      }

      toast.success("Student account created");
      setCreateDialog(false);
      setCreateForm({ email: "", password: "", full_name: "", course_id: "", study_mode: "Day" });
      fetchStudents();
    } catch (e: any) {
      toast.error(e.message || "Failed to create student");
    }
    setCreating(false);
  };

  // --- Status Actions ---
  const updateStatus = async (s: StudentRow, newStatus: string) => {
    const { error } = await supabase.from("students").update({ status: newStatus }).eq("id", s.id);
    if (!error) { toast.success(`Student ${newStatus}`); fetchStudents(); }
    else toast.error(error.message);
  };

  const deleteStudent = async (s: StudentRow) => {
    if (!confirm(`Delete ${s.profile?.full_name}? This cannot be undone.`)) return;
    const { error } = await supabase.from("students").delete().eq("id", s.id);
    if (!error) { toast.success("Student removed"); fetchStudents(); }
    else toast.error(error.message);
  };

  // --- Filtering ---
  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.profile?.full_name?.toLowerCase().includes(q) || s.profile?.email?.toLowerCase().includes(q) || s.registration_number?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    const matchMode = modeFilter === "all" || s.study_mode === modeFilter;
    return matchSearch && matchStatus && matchMode;
  });

  const statusColor = (s: string) =>
    s === "active" ? "bg-success/10 text-success border-success/20" :
    s === "pending" ? "bg-warning/10 text-warning border-warning/20" :
    s === "suspended" ? "bg-destructive/10 text-destructive border-destructive/20" :
    s === "graduated" ? "bg-primary/10 text-primary border-primary/20" :
    "bg-muted text-muted-foreground";

  const counts = {
    all: students.length,
    pending: students.filter(s => s.status === "pending").length,
    active: students.filter(s => s.status === "active").length,
    suspended: students.filter(s => s.status === "suspended").length,
    graduated: students.filter(s => s.status === "graduated").length,
  };

  if (!user) return null;

  return (
      <div className="space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">Students</h1>
            <p className="text-sm text-muted-foreground mt-1">{students.length} total students</p>
          </div>
          <Button onClick={() => setCreateDialog(true)} className="rounded-xl">
            <UserPlus className="w-4 h-4 mr-2" /> Add Student
          </Button>
        </motion.div>

        {/* Status Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(["all", "pending", "active", "suspended", "graduated"] as const).map((key) => (
            <motion.button key={key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              onClick={() => setStatusFilter(key)}
              className={`p-3 rounded-xl text-center transition-all border ${
                statusFilter === key ? "border-primary bg-primary/5" : "border-transparent bg-muted/40 hover:bg-muted/60"
              }`}>
              <p className="text-lg font-extrabold">{counts[key]}</p>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground capitalize">{key}</p>
            </motion.button>
          ))}
        </div>

        {/* Filters & Table */}
        <AnimatedCard>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-3.5 py-2 w-full sm:w-72 border border-transparent focus-within:border-primary/20">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input placeholder="Search by name, email, or reg number..." value={search} onChange={e => setSearch(e.target.value)}
                className="border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0" />
            </div>
            <Select value={modeFilter} onValueChange={setModeFilter}>
              <SelectTrigger className="w-full sm:w-36 rounded-xl"><SelectValue placeholder="All Modes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="Day">Day</SelectItem>
                <SelectItem value="Evening">Evening</SelectItem>
                <SelectItem value="Weekend">Weekend</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Users} title="No students found" description="No students match your criteria." />
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
                    <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }}>
                      <td className="pl-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {s.profile?.full_name?.charAt(0) || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{s.profile?.full_name || "—"}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{s.profile?.email || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-sm font-mono">{s.registration_number || <span className="text-muted-foreground italic text-xs">Not assigned</span>}</td>
                      <td className="text-sm">{s.course ? <span title={s.course.course_name}>{s.course.course_code}</span> : <span className="text-muted-foreground italic text-xs">None</span>}</td>
                      <td className="text-center text-sm">{s.year_of_study}</td>
                      <td className="text-center"><Badge variant="outline" className="text-[10px] rounded-md">{s.study_mode}</Badge></td>
                      <td className="text-center">
                        <Badge className={`text-[10px] font-semibold rounded-md border ${statusColor(s.status)}`}>{s.status}</Badge>
                      </td>
                      <td className="text-right text-sm font-mono">UGX {s.fee_balance.toLocaleString()}</td>
                      <td className="text-center pr-5">
                        <div className="flex items-center justify-center gap-0.5">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => openProfile(s)} title="View Profile">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {s.status === "pending" && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg text-success hover:bg-success/10" onClick={() => updateStatus(s, "active")} title="Approve">
                              <CheckCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {s.status === "active" && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg text-warning hover:bg-warning/10" onClick={() => updateStatus(s, "suspended")} title="Suspend">
                                <Ban className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg text-primary hover:bg-primary/10" onClick={() => updateStatus(s, "graduated")} title="Graduate">
                                <Award className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                          {s.status === "suspended" && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg text-success hover:bg-success/10" onClick={() => updateStatus(s, "active")} title="Reactivate">
                              <CheckCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => openEdit(s)} title="Edit">
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

      {/* Create Student Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="font-display">Add New Student</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label className="text-xs font-semibold">Full Name *</Label><Input value={createForm.full_name} onChange={e => setCreateForm(f => ({ ...f, full_name: e.target.value }))} className="mt-1.5 rounded-xl" /></div>
            <div><Label className="text-xs font-semibold">Email *</Label><Input type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} className="mt-1.5 rounded-xl" /></div>
            <div><Label className="text-xs font-semibold">Password *</Label><Input type="password" value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} className="mt-1.5 rounded-xl" /></div>
            <div>
              <Label className="text-xs font-semibold">Course</Label>
              <Select value={createForm.course_id} onValueChange={v => setCreateForm(f => ({ ...f, course_id: v }))}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.course_code} – {c.course_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Study Mode</Label>
              <Select value={createForm.study_mode} onValueChange={v => setCreateForm(f => ({ ...f, study_mode: v }))}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Day">Day</SelectItem>
                  <SelectItem value="Evening">Evening</SelectItem>
                  <SelectItem value="Weekend">Weekend</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={createStudent} disabled={creating} className="rounded-xl">{creating ? "Creating..." : "Create Account"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="font-display">Edit Student</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label className="text-xs font-semibold">Registration Number</Label><Input value={editForm.registration_number} onChange={e => setEditForm(f => ({ ...f, registration_number: e.target.value }))} placeholder="e.g. BR/NCICT/4018/25" className="mt-1.5 rounded-xl" /></div>
            <div>
              <Label className="text-xs font-semibold">Course</Label>
              <Select value={editForm.course_id} onValueChange={v => setEditForm(f => ({ ...f, course_id: v }))}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.course_code} – {c.course_name}</SelectItem>)}</SelectContent>
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
              <div><Label className="text-xs font-semibold">Year of Study</Label><Input type="number" min={1} max={6} value={editForm.year_of_study} onChange={e => setEditForm(f => ({ ...f, year_of_study: parseInt(e.target.value) || 1 }))} className="mt-1.5 rounded-xl" /></div>
              <div><Label className="text-xs font-semibold">Semester</Label><Input type="number" min={1} max={4} value={editForm.semester} onChange={e => setEditForm(f => ({ ...f, semester: parseInt(e.target.value) || 1 }))} className="mt-1.5 rounded-xl" /></div>
            </div>
            <div><Label className="text-xs font-semibold">Fee Balance (UGX)</Label><Input type="number" min={0} value={editForm.fee_balance} onChange={e => setEditForm(f => ({ ...f, fee_balance: parseFloat(e.target.value) || 0 }))} className="mt-1.5 rounded-xl" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={saveStudent} className="rounded-xl">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student Profile Dialog */}
      <Dialog open={profileDialog} onOpenChange={setProfileDialog}>
        <DialogContent className="max-w-2xl rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Student Profile</DialogTitle>
          </DialogHeader>
          {profileStudent && (
            <div className="space-y-5">
              {/* Personal Info Header */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary shrink-0">
                  {profileStudent.profile?.full_name?.charAt(0) || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display font-bold text-lg">{profileStudent.profile?.full_name || "—"}</h3>
                  <p className="text-sm text-muted-foreground">{profileStudent.profile?.email}</p>
                  {profileStudent.profile?.phone && <p className="text-sm text-muted-foreground">{profileStudent.profile.phone}</p>}
                </div>
                <Badge className={`text-xs font-semibold rounded-lg border ${statusColor(profileStudent.status)}`}>{profileStudent.status}</Badge>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-muted/30 text-center">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Reg Number</p>
                  <p className="font-mono text-sm font-bold mt-1">{profileStudent.registration_number || "N/A"}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 text-center">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Course</p>
                  <p className="text-sm font-bold mt-1">{profileStudent.course?.course_code || "N/A"}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 text-center">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Year / Sem</p>
                  <p className="text-sm font-bold mt-1">Y{profileStudent.year_of_study} / S{profileStudent.semester}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 text-center">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Fee Balance</p>
                  <p className="text-sm font-bold mt-1 text-warning">UGX {profileStudent.fee_balance.toLocaleString()}</p>
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="enrollments" className="w-full">
                <TabsList className="w-full rounded-xl">
                  <TabsTrigger value="enrollments" className="flex-1 rounded-lg text-xs">Enrollments</TabsTrigger>
                  <TabsTrigger value="grades" className="flex-1 rounded-lg text-xs">Grades</TabsTrigger>
                  <TabsTrigger value="fees" className="flex-1 rounded-lg text-xs">Fee History</TabsTrigger>
                </TabsList>

                <TabsContent value="enrollments" className="mt-3">
                  {profileEnrollments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No enrollments found</p>
                  ) : (
                    <div className="space-y-2">
                      {profileEnrollments.map((e: any) => (
                        <div key={e.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                          <div>
                            <p className="text-sm font-semibold">{e.course?.course_name || "—"}</p>
                            <p className="text-[10px] text-muted-foreground">{e.academic_year} • Semester {e.semester} • {e.study_mode}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] rounded-md">{e.course?.course_code}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="grades" className="mt-3">
                  {profileGrades.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No grades recorded</p>
                  ) : (
                    <div className="space-y-2">
                      {profileGrades.map((g: any) => (
                        <div key={g.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                          <div>
                            <p className="text-sm font-semibold">{g.assignment?.title || "—"}</p>
                            <p className="text-[10px] text-muted-foreground">{g.assignment?.course?.course_code || ""}</p>
                          </div>
                          <div className="text-right">
                            {g.grade !== null ? (
                              <p className="text-sm font-bold text-primary">{g.grade}/{g.assignment?.max_grade || 100}</p>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">{g.status}</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="fees" className="mt-3">
                  {profilePayments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No payment records</p>
                  ) : (
                    <div className="space-y-2">
                      {profilePayments.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                          <div>
                            <p className="text-sm font-semibold font-mono">UGX {p.amount?.toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(p.payment_date).toLocaleDateString("en-UG", { year: "numeric", month: "short", day: "numeric" })}
                              {p.academic_year && ` • ${p.academic_year}`}
                            </p>
                          </div>
                          <Badge className={`text-[10px] font-semibold rounded-md border ${
                            p.payment_status === "approved" ? "bg-success/10 text-success border-success/20" :
                            p.payment_status === "pending" ? "bg-warning/10 text-warning border-warning/20" :
                            "bg-destructive/10 text-destructive border-destructive/20"
                          }`}>{p.payment_status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileDialog(false)} className="rounded-xl">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
