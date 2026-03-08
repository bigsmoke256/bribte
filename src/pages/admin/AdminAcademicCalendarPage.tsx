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
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Calendar, Trash2, Edit } from "lucide-react";

const EVENT_TYPES = [
  { value: "term_start", label: "Term Start", color: "bg-emerald-500/10 text-emerald-700" },
  { value: "term_end", label: "Term End", color: "bg-blue-500/10 text-blue-700" },
  { value: "exam_period", label: "Exam Period", color: "bg-destructive/10 text-destructive" },
  { value: "registration", label: "Registration", color: "bg-warning/10 text-warning" },
  { value: "holiday", label: "Holiday", color: "bg-purple-500/10 text-purple-700" },
  { value: "graduation", label: "Graduation", color: "bg-amber-500/10 text-amber-700" },
  { value: "general", label: "General", color: "bg-muted text-muted-foreground" },
];

interface CalendarEvent {
  id: string; title: string; event_type: string; start_date: string; end_date: string | null;
  semester: number | null; academic_year: string | null; description: string | null; created_at: string;
}

export default function AdminAcademicCalendarPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", event_type: "general", start_date: "", end_date: "", semester: "", academic_year: "2025/2026", description: "" });

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    setLoading(true);
    const { data } = await supabase.from("academic_calendar").select("*").order("start_date", { ascending: true });
    setEvents(data || []);
    setLoading(false);
  };

  const createEvent = async () => {
    if (!form.title || !form.start_date) { toast.error("Title and start date required"); return; }
    const { error } = await supabase.from("academic_calendar").insert({
      title: form.title, event_type: form.event_type, start_date: form.start_date,
      end_date: form.end_date || null, semester: form.semester ? parseInt(form.semester) : null,
      academic_year: form.academic_year || null, description: form.description || null,
      created_by: user!.id
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Calendar event added");
    setDialogOpen(false);
    setForm({ title: "", event_type: "general", start_date: "", end_date: "", semester: "", academic_year: "2025/2026", description: "" });
    loadEvents();
  };

  const deleteEvent = async (id: string) => {
    const { error } = await supabase.from("academic_calendar").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Event deleted");
    loadEvents();
  };

  const typeInfo = (t: string) => EVENT_TYPES.find(e => e.value === t) || EVENT_TYPES[EVENT_TYPES.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Academic Calendar</h1>
          <p className="text-sm text-muted-foreground">Manage term dates, exam periods, holidays, and key dates</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button className="rounded-xl gap-2"><Plus className="w-4 h-4" />Add Event</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Calendar Event</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Semester 1 Begins" className="rounded-xl" /></div>
              <div><Label>Event Type</Label>
                <Select value={form.event_type} onValueChange={v => setForm(p => ({ ...p, event_type: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} className="rounded-xl" /></div>
                <div><Label>End Date (optional)</Label><Input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} className="rounded-xl" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Semester</Label>
                  <Select value={form.semester} onValueChange={v => setForm(p => ({ ...p, semester: v }))}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent><SelectItem value="1">Semester 1</SelectItem><SelectItem value="2">Semester 2</SelectItem><SelectItem value="3">Semester 3</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Academic Year</Label><Input value={form.academic_year} onChange={e => setForm(p => ({ ...p, academic_year: e.target.value }))} className="rounded-xl" /></div>
              </div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="rounded-xl" placeholder="Optional details" /></div>
              <Button onClick={createEvent} className="rounded-xl">Add Event</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {["exam_period", "holiday", "term_start", "registration"].map(t => {
          const info = typeInfo(t);
          return (
            <Card key={t} className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase">{info.label}s</p>
                <p className="text-2xl font-bold">{events.filter(e => e.event_type === t).length}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : events.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">No calendar events yet</div>
      ) : (
        <Card className="border-0 shadow-sm">
          <ScrollArea className="max-h-[600px]">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Event</TableHead><TableHead>Type</TableHead><TableHead>Start</TableHead>
                <TableHead>End</TableHead><TableHead>Semester</TableHead><TableHead>Year</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {events.map(e => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{e.title}</p>
                      {e.description && <p className="text-xs text-muted-foreground line-clamp-1">{e.description}</p>}
                    </TableCell>
                    <TableCell><Badge variant="outline" className={`text-xs ${typeInfo(e.event_type).color}`}>{typeInfo(e.event_type).label}</Badge></TableCell>
                    <TableCell className="text-sm">{format(new Date(e.start_date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-sm">{e.end_date ? format(new Date(e.end_date), "dd MMM yyyy") : "—"}</TableCell>
                    <TableCell className="text-sm">{e.semester ? `Sem ${e.semester}` : "—"}</TableCell>
                    <TableCell className="text-sm">{e.academic_year || "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="rounded-lg" onClick={() => deleteEvent(e.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
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
