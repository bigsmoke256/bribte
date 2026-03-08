import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AnimatedCard, SectionHeader, EmptyState } from "@/components/dashboard/DashboardParts";
import { UserCog, Search, PlusCircle, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface LecturerRow {
  id: string;
  user_id: string;
  specialization: string | null;
  department_id: string | null;
  profile?: { full_name: string; email: string; phone: string | null };
  department?: { name: string } | null;
}

interface DeptOption { id: string; name: string; }

export default function AdminLecturersPage() {
  const { user } = useAuth();
  const [lecturers, setLecturers] = useState<LecturerRow[]>([]);
  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editLecturer, setEditLecturer] = useState<LecturerRow | null>(null);
  const [createForm, setCreateForm] = useState({ email: "", password: "", full_name: "", department_id: "", specialization: "" });
  const [editForm, setEditForm] = useState({ department_id: "", specialization: "" });
  const [creating, setCreating] = useState(false);

  const fetchLecturers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("lecturers")
      .select("*, department:departments(name)")
      .order("created_at", { ascending: false });
    if (data) {
      const userIds = data.map((l: any) => l.user_id);
      const { data: profilesData } = await supabase.from("profiles").select("user_id, full_name, email, phone").in("user_id", userIds);
      const profileMap = new Map((profilesData || []).map(p => [p.user_id, p]));
      setLecturers(data.map((l: any) => ({
        ...l,
        profile: profileMap.get(l.user_id) || null,
        department: Array.isArray(l.department) ? l.department[0] : l.department,
      })));
    }
    setLoading(false);
  };

  const fetchDepts = async () => {
    const { data } = await supabase.from("departments").select("id, name").order("name");
    if (data) setDepartments(data);
  };

  useEffect(() => { fetchLecturers(); fetchDepts(); }, []);

  const createLecturer = async () => {
    if (!createForm.email || !createForm.password || !createForm.full_name) {
      toast.error("Fill in all required fields");
      return;
    }
    setCreating(true);
    try {
      const res = await supabase.functions.invoke("create-admin", {
        body: { email: createForm.email, password: createForm.password, full_name: createForm.full_name, role: "lecturer" },
      });
      if (res.error) throw new Error(res.error.message);
      const result = res.data as any;
      if (result.error) throw new Error(result.error);

      // Update lecturer record with dept/specialization
      if (createForm.department_id || createForm.specialization) {
        await supabase
          .from("lecturers")
          .update({
            department_id: createForm.department_id || null,
            specialization: createForm.specialization || null,
          })
          .eq("user_id", result.user_id);
      }

      toast.success("Lecturer account created");
      setCreateDialog(false);
      setCreateForm({ email: "", password: "", full_name: "", department_id: "", specialization: "" });
      fetchLecturers();
    } catch (e: any) {
      toast.error(e.message || "Failed to create lecturer");
    }
    setCreating(false);
  };

  const openEdit = (l: LecturerRow) => {
    setEditLecturer(l);
    setEditForm({ department_id: l.department_id || "", specialization: l.specialization || "" });
    setEditDialog(true);
  };

  const saveLecturer = async () => {
    if (!editLecturer) return;
    const { error } = await supabase
      .from("lecturers")
      .update({ department_id: editForm.department_id || null, specialization: editForm.specialization || null })
      .eq("id", editLecturer.id);
    if (error) toast.error(error.message);
    else { toast.success("Updated"); setEditDialog(false); fetchLecturers(); }
  };

  const deleteLecturer = async (l: LecturerRow) => {
    if (!confirm(`Delete ${l.profile?.full_name}?`)) return;
    const { error } = await supabase.from("lecturers").delete().eq("id", l.id);
    if (!error) { toast.success("Removed"); fetchLecturers(); }
    else toast.error(error.message);
  };

  const filtered = lecturers.filter(l => {
    const q = search.toLowerCase();
    return !q || l.profile?.full_name?.toLowerCase().includes(q) || l.profile?.email?.toLowerCase().includes(q) || l.specialization?.toLowerCase().includes(q);
  });

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto">
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

        <AnimatedCard>
          <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-3.5 py-2 w-full sm:w-72 border border-transparent focus-within:border-primary/20 mb-4">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search lecturers..." value={search} onChange={e => setSearch(e.target.value)}
              className="border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0" />
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={UserCog} title="No lecturers found" description="Add lecturers using the button above." />
          ) : (
            <div className="overflow-x-auto -mx-5">
              <table className="data-table">
                <thead><tr><th className="pl-5">Name</th><th>Department</th><th>Specialization</th><th className="text-center pr-5">Actions</th></tr></thead>
                <tbody>
                  {filtered.map((l, i) => (
                    <motion.tr key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                      <td className="pl-5">
                        <p className="font-semibold text-sm">{l.profile?.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{l.profile?.email}</p>
                      </td>
                      <td className="text-sm">{l.department?.name || <span className="text-muted-foreground italic">Unassigned</span>}</td>
                      <td className="text-sm">{l.specialization || <span className="text-muted-foreground italic">—</span>}</td>
                      <td className="text-center pr-5">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => openEdit(l)}><Edit2 className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg text-destructive hover:bg-destructive/10" onClick={() => deleteLecturer(l)}><Trash2 className="w-3.5 h-3.5" /></Button>
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
    </DashboardLayout>
  );
}
