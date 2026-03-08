import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Search, GraduationCap, Briefcase, Mail } from "lucide-react";

interface AlumniRecord {
  id: string; user_id: string; student_id: string | null; graduation_date: string;
  course_completed: string; degree_classification: string | null; final_gpa: number | null;
  contact_email: string | null; contact_phone: string | null; current_employer: string | null;
  job_title: string | null; linkedin_url: string | null; bio: string | null; created_at: string;
  profile_name?: string;
}

export default function AdminAlumniPage() {
  const { user } = useAuth();
  const [alumni, setAlumni] = useState<AlumniRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // For creating alumni from graduated students
  const [graduatedStudents, setGraduatedStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [form, setForm] = useState({ graduation_date: "", course_completed: "", degree_classification: "Second Class Upper", final_gpa: "" });

  useEffect(() => { loadAlumni(); }, []);

  const loadAlumni = async () => {
    setLoading(true);
    const { data } = await supabase.from("alumni").select("*").order("graduation_date", { ascending: false });
    if (!data) { setLoading(false); return; }

    const userIds = [...new Set(data.map((a: any) => a.user_id))];
    let nameMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      (profiles || []).forEach((p: any) => { nameMap[p.user_id] = p.full_name; });
    }

    setAlumni(data.map((a: any) => ({ ...a, profile_name: nameMap[a.user_id] || "Unknown" })));
    setLoading(false);
  };

  const loadGraduatedStudents = async () => {
    const { data } = await supabase.from("students").select("id, user_id, registration_number, courses!students_course_id_fkey(course_name)").eq("status", "graduated");
    if (!data) return;
    const userIds = data.map((s: any) => s.user_id);
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds);
    const pMap: Record<string, any> = {};
    (profiles || []).forEach((p: any) => { pMap[p.user_id] = p; });
    setGraduatedStudents(data.map((s: any) => ({
      ...s,
      name: pMap[s.user_id]?.full_name || "Unknown",
      email: pMap[s.user_id]?.email,
      course_name: Array.isArray(s.courses) ? s.courses[0]?.course_name : s.courses?.course_name,
    })));
  };

  const openCreateDialog = () => {
    loadGraduatedStudents();
    setDialogOpen(true);
  };

  const createAlumni = async () => {
    const student = graduatedStudents.find(s => s.id === selectedStudentId);
    if (!student || !form.graduation_date) { toast.error("Select a student and set graduation date"); return; }
    const { error } = await supabase.from("alumni").insert({
      user_id: student.user_id, student_id: student.id,
      graduation_date: form.graduation_date,
      course_completed: form.course_completed || student.course_name || "Unknown",
      degree_classification: form.degree_classification || null,
      final_gpa: form.final_gpa ? parseFloat(form.final_gpa) : null,
      contact_email: student.email,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Alumni record created");
    setDialogOpen(false);
    setSelectedStudentId("");
    setForm({ graduation_date: "", course_completed: "", degree_classification: "Second Class Upper", final_gpa: "" });
    loadAlumni();
  };

  const filtered = search.trim()
    ? alumni.filter(a => a.profile_name?.toLowerCase().includes(search.toLowerCase()) || a.course_completed.toLowerCase().includes(search.toLowerCase()) || a.current_employer?.toLowerCase().includes(search.toLowerCase()))
    : alumni;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Alumni Management</h1>
          <p className="text-sm text-muted-foreground">Track graduated students, employment, and maintain alumni network</p>
        </div>
        <Button onClick={openCreateDialog} className="rounded-xl gap-2"><Plus className="w-4 h-4" />Add Alumni</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center">
          <GraduationCap className="w-5 h-5 mx-auto text-primary mb-1" />
          <p className="text-xs text-muted-foreground uppercase">Total Alumni</p>
          <p className="text-2xl font-bold">{alumni.length}</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center">
          <Briefcase className="w-5 h-5 mx-auto text-primary mb-1" />
          <p className="text-xs text-muted-foreground uppercase">Employed</p>
          <p className="text-2xl font-bold">{alumni.filter(a => a.current_employer).length}</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center">
          <Mail className="w-5 h-5 mx-auto text-primary mb-1" />
          <p className="text-xs text-muted-foreground uppercase">Reachable</p>
          <p className="text-2xl font-bold">{alumni.filter(a => a.contact_email || a.contact_phone).length}</p>
        </CardContent></Card>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search alumni by name, course, or employer..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl" />
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">No alumni records found</div>
      ) : (
        <Card className="border-0 shadow-sm">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>Course</TableHead><TableHead>Classification</TableHead>
                <TableHead>GPA</TableHead><TableHead>Graduated</TableHead><TableHead>Employer</TableHead>
                <TableHead>Contact</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium text-sm">{a.profile_name}</TableCell>
                    <TableCell className="text-sm">{a.course_completed}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{a.degree_classification || "—"}</Badge></TableCell>
                    <TableCell className="text-sm font-semibold">{a.final_gpa?.toFixed(2) || "—"}</TableCell>
                    <TableCell className="text-sm">{format(new Date(a.graduation_date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-sm">{a.current_employer ? `${a.job_title || ""} @ ${a.current_employer}` : "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.contact_email || a.contact_phone || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Alumni from Graduated Students</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div><Label>Graduated Student</Label>
              <Select value={selectedStudentId} onValueChange={v => {
                setSelectedStudentId(v);
                const s = graduatedStudents.find(gs => gs.id === v);
                if (s) setForm(p => ({ ...p, course_completed: s.course_name || "" }));
              }}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {graduatedStudents.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.registration_number || "No Reg"})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Graduation Date</Label><Input type="date" value={form.graduation_date} onChange={e => setForm(p => ({ ...p, graduation_date: e.target.value }))} className="rounded-xl" /></div>
            <div><Label>Course Completed</Label><Input value={form.course_completed} onChange={e => setForm(p => ({ ...p, course_completed: e.target.value }))} className="rounded-xl" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Degree Classification</Label>
                <Select value={form.degree_classification} onValueChange={v => setForm(p => ({ ...p, degree_classification: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="First Class">First Class</SelectItem>
                    <SelectItem value="Second Class Upper">Second Class Upper</SelectItem>
                    <SelectItem value="Second Class Lower">Second Class Lower</SelectItem>
                    <SelectItem value="Pass">Pass</SelectItem>
                    <SelectItem value="Distinction">Distinction</SelectItem>
                    <SelectItem value="Credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Final GPA</Label><Input type="number" step="0.01" value={form.final_gpa} onChange={e => setForm(p => ({ ...p, final_gpa: e.target.value }))} className="rounded-xl" placeholder="e.g. 4.2" /></div>
            </div>
            <Button onClick={createAlumni} className="rounded-xl">Create Alumni Record</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
