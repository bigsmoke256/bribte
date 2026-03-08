import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { CheckCircle, XCircle, Clock, Send } from "lucide-react";

const STEPS = [
  { name: "Finance Office", order: 0 },
  { name: "Library", order: 1 },
  { name: "Department Head", order: 2 },
  { name: "Final Admin Approval", order: 3 },
];

interface ClearanceRequest {
  id: string; clearance_type: string; academic_year: string; semester: number;
  status: string; created_at: string;
}

interface ClearanceStep {
  id: string; step_name: string; step_order: number; status: string;
  notes: string | null; approved_at: string | null;
}

export default function StudentClearancePage() {
  const { user } = useAuth();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [requests, setRequests] = useState<ClearanceRequest[]>([]);
  const [steps, setSteps] = useState<Record<string, ClearanceStep[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ type: "end_semester", academic_year: "2025/2026", semester: "1" });

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const { data: student } = await supabase.from("students").select("id").eq("user_id", user!.id).single();
    if (!student) { setLoading(false); return; }
    setStudentId(student.id);

    const { data: reqs } = await supabase.from("clearance_requests").select("*").eq("student_id", student.id).order("created_at", { ascending: false });
    setRequests(reqs || []);

    // Load steps for each request
    const stepsMap: Record<string, ClearanceStep[]> = {};
    for (const req of (reqs || [])) {
      const { data: stepsData } = await supabase.from("clearance_steps").select("*").eq("clearance_id", req.id).order("step_order");
      stepsMap[req.id] = stepsData || [];
    }
    setSteps(stepsMap);
    setLoading(false);
  };

  const submitRequest = async () => {
    if (!studentId) return;
    setSubmitting(true);
    const { data: req, error } = await supabase.from("clearance_requests").insert({
      student_id: studentId, clearance_type: form.type,
      academic_year: form.academic_year, semester: parseInt(form.semester), status: "pending"
    }).select().single();

    if (error) { toast.error(error.message); setSubmitting(false); return; }

    // Create the 4 clearance steps
    const stepInserts = STEPS.map(s => ({
      clearance_id: req.id, step_name: s.name, step_order: s.order, status: "pending"
    }));
    await supabase.from("clearance_steps").insert(stepInserts);

    toast.success("Clearance request submitted");
    setSubmitting(false);
    loadData();
  };

  const statusIcon = (s: string) => {
    if (s === "approved" || s === "cleared") return <CheckCircle className="w-5 h-5 text-emerald-600" />;
    if (s === "rejected") return <XCircle className="w-5 h-5 text-destructive" />;
    return <Clock className="w-5 h-5 text-muted-foreground" />;
  };

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Clearance</h1>
        <p className="text-sm text-muted-foreground">Request end-of-semester or graduation clearance</p>
      </div>

      {/* Submit new request */}
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-sm">Request New Clearance</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger className="w-48 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="end_semester">End of Semester</SelectItem>
                  <SelectItem value="graduation">Graduation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Academic Year</Label>
              <Select value={form.academic_year} onValueChange={v => setForm(p => ({ ...p, academic_year: v }))}>
                <SelectTrigger className="w-40 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024/2025">2024/2025</SelectItem>
                  <SelectItem value="2025/2026">2025/2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Semester</Label>
              <Select value={form.semester} onValueChange={v => setForm(p => ({ ...p, semester: v }))}>
                <SelectTrigger className="w-32 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Sem 1</SelectItem>
                  <SelectItem value="2">Sem 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={submitRequest} disabled={submitting} className="rounded-xl gap-2">
              <Send className="w-4 h-4" />{submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing requests */}
      {requests.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-sm">No clearance requests yet</div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <Card key={req.id} className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm capitalize">{req.clearance_type.replace("_", " ")} Clearance</CardTitle>
                    <p className="text-xs text-muted-foreground">{req.academic_year} • Semester {req.semester} • {format(new Date(req.created_at), "dd MMM yyyy")}</p>
                  </div>
                  <Badge variant="outline" className={req.status === "cleared" ? "bg-emerald-500/10 text-emerald-700" : req.status === "rejected" ? "bg-destructive/10 text-destructive" : ""}>{req.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3">
                  {(steps[req.id] || []).map((step, i) => (
                    <div key={step.id} className="flex items-center gap-2 flex-1">
                      {i > 0 && <div className="hidden sm:block w-8 h-px bg-border" />}
                      <div className={`flex-1 p-3 rounded-xl border ${step.status === "approved" ? "border-emerald-200 bg-emerald-50/50" : step.status === "rejected" ? "border-destructive/20 bg-destructive/5" : "border-border"}`}>
                        <div className="flex items-center gap-2">
                          {statusIcon(step.status)}
                          <div>
                            <p className="text-xs font-semibold">{step.step_name}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">{step.status}</p>
                            {step.notes && <p className="text-[10px] text-muted-foreground mt-0.5">{step.notes}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
