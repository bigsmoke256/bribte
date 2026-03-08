import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, FileText, ArrowLeft, Save, GraduationCap } from "lucide-react";

// NCHE Uganda Grading Scale
const GRADE_SCALE = [
  { min: 80, max: 100, grade: "A", points: 5.0, desc: "Excellent" },
  { min: 75, max: 79, grade: "B+", points: 4.5, desc: "Very Good" },
  { min: 70, max: 74, grade: "B", points: 4.0, desc: "Good" },
  { min: 65, max: 69, grade: "C+", points: 3.5, desc: "Fairly Good" },
  { min: 60, max: 64, grade: "C", points: 3.0, desc: "Average" },
  { min: 55, max: 59, grade: "D+", points: 2.5, desc: "Below Average" },
  { min: 50, max: 54, grade: "D", points: 2.0, desc: "Pass" },
  { min: 0, max: 49, grade: "F", points: 0, desc: "Fail" },
];

function getGrade(marks: number, maxMarks: number) {
  const pct = (marks / maxMarks) * 100;
  const g = GRADE_SCALE.find(s => pct >= s.min && pct <= s.max);
  return g || GRADE_SCALE[GRADE_SCALE.length - 1];
}

interface Exam {
  id: string; title: string; exam_type: string; exam_date: string; start_time: string;
  end_time: string; venue: string | null; semester: number; academic_year: string;
  max_marks: number; status: string; course_id: string; created_at: string;
  courses?: { course_name: string; course_code: string } | null;
}

interface ExamResult {
  id: string; exam_id: string; student_id: string; marks_obtained: number | null;
  grade: string | null; grade_points: number | null; remarks: string | null;
}

interface Course { id: string; course_name: string; course_code: string; }

export default function AdminExamsPage() {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [results, setResults] = useState<(ExamResult & { student_name?: string; reg_number?: string })[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({ title: "", exam_type: "final", course_id: "", exam_date: "", start_time: "09:00", end_time: "12:00", venue: "", semester: "1", academic_year: "2025/2026", max_marks: "100" });

  useEffect(() => { loadExams(); loadCourses(); }, []);

  const loadExams = async () => {
    setLoading(true);
    const { data } = await supabase.from("exams").select("*, courses!exams_course_id_fkey(course_name, course_code)").order("exam_date", { ascending: false });
    setExams((data || []).map((e: any) => ({ ...e, courses: Array.isArray(e.courses) ? e.courses[0] : e.courses })));
    setLoading(false);
  };

  const loadCourses = async () => {
    const { data } = await supabase.from("courses").select("id, course_name, course_code").order("course_name");
    setCourses(data || []);
  };

  const createExam = async () => {
    if (!form.title || !form.course_id || !form.exam_date) { toast.error("Fill required fields"); return; }
    const { error } = await supabase.from("exams").insert({
      title: form.title, exam_type: form.exam_type, course_id: form.course_id,
      exam_date: form.exam_date, start_time: form.start_time, end_time: form.end_time,
      venue: form.venue || null, semester: parseInt(form.semester), academic_year: form.academic_year,
      max_marks: parseFloat(form.max_marks), created_by: user!.id, status: "scheduled"
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Exam scheduled");
    setDialogOpen(false);
    setForm({ title: "", exam_type: "final", course_id: "", exam_date: "", start_time: "09:00", end_time: "12:00", venue: "", semester: "1", academic_year: "2025/2026", max_marks: "100" });
    loadExams();
    logAudit("create_exam", "exams", "", form.title);
  };

  const openResults = async (exam: Exam) => {
    setSelectedExam(exam);
    setResultsLoading(true);

    // Load existing results
    const { data: existingResults } = await supabase.from("exam_results").select("*").eq("exam_id", exam.id);

    // Load enrolled students for this course
    const { data: enrollments } = await supabase.from("enrollments").select("student_id").eq("course_id", exam.course_id);
    const studentIds = [...new Set([
      ...(enrollments || []).map((e: any) => e.student_id),
      // also get students with this course_id directly
    ])];

    const { data: directStudents } = await supabase.from("students").select("id").eq("course_id", exam.course_id);
    const allStudentIds = [...new Set([...studentIds, ...(directStudents || []).map((s: any) => s.id)])];

    // Get student details
    let studentMap: Record<string, any> = {};
    if (allStudentIds.length > 0) {
      const { data: students } = await supabase.from("students").select("id, user_id, registration_number").in("id", allStudentIds);
      const userIds = (students || []).map((s: any) => s.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const profileMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p.full_name; });
      (students || []).forEach((s: any) => { studentMap[s.id] = { name: profileMap[s.user_id] || "Unknown", reg: s.registration_number }; });
    }

    // Merge results with student info
    const resultMap: Record<string, ExamResult> = {};
    (existingResults || []).forEach((r: any) => { resultMap[r.student_id] = r; });

    const merged = allStudentIds.map(sid => ({
      id: resultMap[sid]?.id || "",
      exam_id: exam.id,
      student_id: sid,
      marks_obtained: resultMap[sid]?.marks_obtained ?? null,
      grade: resultMap[sid]?.grade ?? null,
      grade_points: resultMap[sid]?.grade_points ?? null,
      remarks: resultMap[sid]?.remarks ?? null,
      student_name: studentMap[sid]?.name || "Unknown",
      reg_number: studentMap[sid]?.reg || "—",
    }));

    setResults(merged);
    setEnrolledStudents(allStudentIds);
    setResultsLoading(false);
  };

  const updateMark = (studentId: string, marks: string) => {
    const m = marks === "" ? null : parseFloat(marks);
    setResults(prev => prev.map(r => {
      if (r.student_id !== studentId) return r;
      if (m === null) return { ...r, marks_obtained: null, grade: null, grade_points: null };
      const g = getGrade(m, selectedExam!.max_marks);
      return { ...r, marks_obtained: m, grade: g.grade, grade_points: g.points };
    }));
  };

  const saveResults = async () => {
    if (!selectedExam || !user) return;
    const toSave = results.filter(r => r.marks_obtained !== null);
    let errors = 0;
    for (const r of toSave) {
      const payload = {
        exam_id: selectedExam.id, student_id: r.student_id,
        marks_obtained: r.marks_obtained, grade: r.grade,
        grade_points: r.grade_points, remarks: r.remarks, entered_by: user.id
      };
      if (r.id) {
        const { error } = await supabase.from("exam_results").update(payload).eq("id", r.id);
        if (error) errors++;
      } else {
        const { error } = await supabase.from("exam_results").insert(payload);
        if (error) errors++;
      }
    }
    if (errors > 0) toast.error(`${errors} errors saving results`);
    else toast.success(`Saved ${toSave.length} results`);
    logAudit("save_exam_results", "exam_results", selectedExam.id, `Saved ${toSave.length} results for ${selectedExam.title}`);
    openResults(selectedExam); // refresh
  };

  const logAudit = async (action: string, table: string, recordId: string, desc: string) => {
    await supabase.from("audit_logs").insert({ user_id: user?.id, user_email: user?.email, action, table_name: table, record_id: recordId, description: desc });
  };

  // Results entry view
  if (selectedExam) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedExam(null)} className="rounded-xl"><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-2xl font-display font-bold">Results Entry</h1>
            <p className="text-sm text-muted-foreground">{selectedExam.title} — {selectedExam.courses?.course_name} ({selectedExam.courses?.course_code})</p>
          </div>
          <div className="ml-auto">
            <Button onClick={saveResults} className="rounded-xl gap-2"><Save className="w-4 h-4" />Save All Results</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Date</p>
            <p className="text-sm font-bold">{format(new Date(selectedExam.exam_date), "dd MMM yyyy")}</p>
          </CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Max Marks</p>
            <p className="text-sm font-bold">{selectedExam.max_marks}</p>
          </CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Students</p>
            <p className="text-sm font-bold">{results.length}</p>
          </CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Entered</p>
            <p className="text-sm font-bold">{results.filter(r => r.marks_obtained !== null).length}</p>
          </CardContent></Card>
        </div>

        {/* Grade scale reference */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm">NCHE Uganda Grading Scale</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {GRADE_SCALE.map(g => (
                <Badge key={g.grade} variant="outline" className="text-xs">{g.grade}: {g.min}-{g.max}% ({g.points} pts)</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {resultsLoading ? (
          <div className="py-12 text-center text-muted-foreground">Loading students...</div>
        ) : results.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">No enrolled students found for this course</div>
        ) : (
          <Card className="border-0 shadow-sm">
            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Student</TableHead><TableHead>Reg #</TableHead>
                  <TableHead>Marks (/{selectedExam.max_marks})</TableHead>
                  <TableHead>Grade</TableHead><TableHead>Points</TableHead><TableHead>Remarks</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {results.map(r => (
                    <TableRow key={r.student_id}>
                      <TableCell className="font-medium text-sm">{r.student_name}</TableCell>
                      <TableCell className="text-sm font-mono">{r.reg_number}</TableCell>
                      <TableCell>
                        <Input type="number" min={0} max={selectedExam.max_marks} value={r.marks_obtained ?? ""}
                          onChange={e => updateMark(r.student_id, e.target.value)}
                          className="w-20 rounded-lg" placeholder="—" />
                      </TableCell>
                      <TableCell><Badge variant="outline" className={r.grade === "F" ? "text-destructive" : r.grade === "A" ? "text-emerald-700" : ""}>{r.grade || "—"}</Badge></TableCell>
                      <TableCell className="text-sm font-semibold">{r.grade_points ?? "—"}</TableCell>
                      <TableCell>
                        <Input value={r.remarks || ""} onChange={e => setResults(prev => prev.map(x => x.student_id === r.student_id ? { ...x, remarks: e.target.value } : x))}
                          className="w-32 rounded-lg text-sm" placeholder="Optional" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Exam Management</h1>
          <p className="text-sm text-muted-foreground">Schedule exams and enter results with automatic GPA calculation (NCHE Uganda Scale)</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button className="rounded-xl gap-2"><Plus className="w-4 h-4" />Schedule Exam</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Schedule New Exam</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Final Exam - Semester 1" className="rounded-xl" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Course</Label>
                  <Select value={form.course_id} onValueChange={v => setForm(p => ({ ...p, course_id: v }))}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select course" /></SelectTrigger>
                    <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.course_code} - {c.course_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Type</Label>
                  <Select value={form.exam_type} onValueChange={v => setForm(p => ({ ...p, exam_type: v }))}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="final">Final Exam</SelectItem>
                      <SelectItem value="midterm">Midterm</SelectItem>
                      <SelectItem value="supplementary">Supplementary</SelectItem>
                      <SelectItem value="retake">Retake</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Date</Label><Input type="date" value={form.exam_date} onChange={e => setForm(p => ({ ...p, exam_date: e.target.value }))} className="rounded-xl" /></div>
                <div><Label>Start</Label><Input type="time" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} className="rounded-xl" /></div>
                <div><Label>End</Label><Input type="time" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} className="rounded-xl" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Venue</Label><Input value={form.venue} onChange={e => setForm(p => ({ ...p, venue: e.target.value }))} placeholder="Hall A" className="rounded-xl" /></div>
                <div><Label>Max Marks</Label><Input type="number" value={form.max_marks} onChange={e => setForm(p => ({ ...p, max_marks: e.target.value }))} className="rounded-xl" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Semester</Label>
                  <Select value={form.semester} onValueChange={v => setForm(p => ({ ...p, semester: v }))}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="1">Semester 1</SelectItem><SelectItem value="2">Semester 2</SelectItem><SelectItem value="3">Semester 3</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Academic Year</Label><Input value={form.academic_year} onChange={e => setForm(p => ({ ...p, academic_year: e.target.value }))} className="rounded-xl" /></div>
              </div>
              <Button onClick={createExam} className="rounded-xl">Schedule Exam</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading exams...</div>
      ) : exams.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">No exams scheduled yet</div>
      ) : (
        <Card className="border-0 shadow-sm">
          <ScrollArea className="max-h-[600px]">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Exam</TableHead><TableHead>Course</TableHead><TableHead>Type</TableHead>
                <TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead>Venue</TableHead>
                <TableHead>Semester</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {exams.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium text-sm">{e.title}</TableCell>
                    <TableCell className="text-sm">{e.courses?.course_code || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs capitalize">{e.exam_type}</Badge></TableCell>
                    <TableCell className="text-sm">{format(new Date(e.exam_date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-sm">{e.start_time?.slice(0, 5)} - {e.end_time?.slice(0, 5)}</TableCell>
                    <TableCell className="text-sm">{e.venue || "—"}</TableCell>
                    <TableCell className="text-sm">S{e.semester} • {e.academic_year}</TableCell>
                    <TableCell><Badge variant="outline" className={e.status === "completed" ? "text-emerald-700" : ""}>{e.status}</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="rounded-lg text-xs gap-1" onClick={() => openResults(e)}>
                        <FileText className="w-3.5 h-3.5" />Enter Results
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
