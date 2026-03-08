import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { CheckCircle, XCircle, Clock, ChevronRight } from "lucide-react";

const STEP_NAMES = ["Finance Office", "Library", "Department Head", "Final Admin Approval"];
const STEP_ORDER = { "Finance Office": 0, "Library": 1, "Department Head": 2, "Final Admin Approval": 3 };

interface ClearanceRequest {
  id: string; student_id: string; clearance_type: string; academic_year: string;
  semester: number; status: string; created_at: string;
  student_name?: string; reg_number?: string;
}

interface ClearanceStep {
  id: string; clearance_id: string; step_name: string; step_order: number;
  status: string; approved_by: string | null; notes: string | null; approved_at: string | null;
}

export default function AdminClearancePage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ClearanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<ClearanceRequest | null>(null);
  const [steps, setSteps] = useState<ClearanceStep[]>([]);
  const [stepsLoading, setStepsLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [actionStep, setActionStep] = useState<ClearanceStep | null>(null);

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    setLoading(true);
    const { data } = await supabase.from("clearance_requests").select("*").order("created_at", { ascending: false });
    if (!data) { setLoading(false); return; }

    const studentIds = [...new Set(data.map((r: any) => r.student_id))];
    let studentMap: Record<string, any> = {};
    if (studentIds.length > 0) {
      const { data: students } = await supabase.from("students").select("id, user_id, registration_number").in("id", studentIds);
      const userIds = (students || []).map((s: any) => s.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const pMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { pMap[p.user_id] = p.full_name; });
      (students || []).forEach((s: any) => { studentMap[s.id] = { name: pMap[s.user_id] || "Unknown", reg: s.registration_number }; });
    }

    setRequests(data.map((r: any) => ({ ...r, student_name: studentMap[r.student_id]?.name, reg_number: studentMap[r.student_id]?.reg })));
    setLoading(false);
  };

  const openSteps = async (req: ClearanceRequest) => {
    setSelectedReq(req);
    setStepsLoading(true);
    const { data } = await supabase.from("clearance_steps").select("*").eq("clearance_id", req.id).order("step_order");
    setSteps(data || []);
    setStepsLoading(false);
  };

  const approveStep = async (step: ClearanceStep) => {
    const { error } = await supabase.from("clearance_steps").update({
      status: "approved", approved_by: user?.id, approved_at: new Date().toISOString(), notes: notes || null
    }).eq("id", step.id);
    if (error) { toast.error(error.message); return; }

    // Check if all steps approved
    const updatedSteps = steps.map(s => s.id === step.id ? { ...s, status: "approved" } : s);
    const allApproved = updatedSteps.every(s => s.status === "approved");
    if (allApproved && selectedReq) {
      await supabase.from("clearance_requests").update({ status: "cleared" }).eq("id", selectedReq.id);
    }

    toast.success(`${step.step_name} approved`);
    await supabase.from("audit_logs").insert({ user_id: user?.id, user_email: user?.email, action: "approve_clearance_step", table_name: "clearance_steps", record_id: step.id, description: `Approved ${step.step_name} for clearance ${selectedReq?.id}` });
    setNotes("");
    setActionStep(null);
    openSteps(selectedReq!);
    loadRequests();
  };

  const rejectStep = async (step: ClearanceStep) => {
    if (!notes.trim()) { toast.error("Please provide rejection reason"); return; }
    const { error } = await supabase.from("clearance_steps").update({
      status: "rejected", approved_by: user?.id, approved_at: new Date().toISOString(), notes
    }).eq("id", step.id);
    if (error) { toast.error(error.message); return; }

    await supabase.from("clearance_requests").update({ status: "rejected" }).eq("id", selectedReq!.id);
    toast.success(`${step.step_name} rejected`);
    setNotes("");
    setActionStep(null);
    openSteps(selectedReq!);
    loadRequests();
  };

  const statusIcon = (s: string) => {
    if (s === "approved" || s === "cleared") return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    if (s === "rejected") return <XCircle className="w-4 h-4 text-destructive" />;
    return <Clock className="w-4 h-4 text-muted-foreground" />;
  };

  const statusColor = (s: string) => {
    if (s === "approved" || s === "cleared") return "bg-emerald-500/10 text-emerald-700";
    if (s === "rejected") return "bg-destructive/10 text-destructive";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Student Clearance</h1>
        <p className="text-sm text-muted-foreground">Manage 4-step clearance: Finance → Library → Department → Admin</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {["pending", "in_progress", "cleared", "rejected"].map(status => (
          <Card key={status} className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">{status.replace("_", " ")}</p>
              <p className="text-2xl font-bold">{requests.filter(r => r.status === status).length}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : requests.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">No clearance requests yet</div>
      ) : (
        <Card className="border-0 shadow-sm">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Student</TableHead><TableHead>Reg #</TableHead><TableHead>Type</TableHead>
                <TableHead>Academic Year</TableHead><TableHead>Semester</TableHead>
                <TableHead>Status</TableHead><TableHead>Requested</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {requests.map(r => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openSteps(r)}>
                    <TableCell className="font-medium text-sm">{r.student_name || "Unknown"}</TableCell>
                    <TableCell className="text-sm font-mono">{r.reg_number || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs capitalize">{r.clearance_type.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="text-sm">{r.academic_year}</TableCell>
                    <TableCell className="text-sm">Semester {r.semester}</TableCell>
                    <TableCell><Badge variant="outline" className={statusColor(r.status)}>{r.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(r.created_at), "dd MMM yyyy")}</TableCell>
                    <TableCell><ChevronRight className="w-4 h-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      {/* Steps Dialog */}
      <Dialog open={!!selectedReq} onOpenChange={() => setSelectedReq(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Clearance Steps — {selectedReq?.student_name}</DialogTitle>
          </DialogHeader>
          {stepsLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading steps...</div>
          ) : steps.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No clearance steps found. Steps are created when a student submits a clearance request.</div>
          ) : (
            <div className="space-y-3">
              {steps.map((step, i) => (
                <Card key={step.id} className={`border ${step.status === "approved" ? "border-emerald-200 bg-emerald-50/50" : step.status === "rejected" ? "border-destructive/20 bg-destructive/5" : "border-border"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">{i + 1}</div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{step.step_name}</p>
                        {step.notes && <p className="text-xs text-muted-foreground mt-0.5">{step.notes}</p>}
                        {step.approved_at && <p className="text-[10px] text-muted-foreground">{format(new Date(step.approved_at), "dd MMM yyyy HH:mm")}</p>}
                      </div>
                      {statusIcon(step.status)}
                      {step.status === "pending" && (
                        <Button size="sm" className="rounded-lg text-xs" onClick={(e) => { e.stopPropagation(); setActionStep(step); }}>Review</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Action dialog for step review */}
          {actionStep && (
            <div className="border-t pt-4 space-y-3">
              <p className="font-semibold text-sm">Review: {actionStep.step_name}</p>
              <Textarea placeholder="Add notes (required for rejection)" value={notes} onChange={e => setNotes(e.target.value)} className="rounded-xl" />
              <div className="flex gap-2">
                <Button onClick={() => approveStep(actionStep)} className="rounded-xl gap-2 flex-1"><CheckCircle className="w-4 h-4" />Approve</Button>
                <Button variant="destructive" onClick={() => rejectStep(actionStep)} className="rounded-xl gap-2 flex-1"><XCircle className="w-4 h-4" />Reject</Button>
                <Button variant="ghost" onClick={() => { setActionStep(null); setNotes(""); }} className="rounded-xl">Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
