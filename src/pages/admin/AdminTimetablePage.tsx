import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedCard, EmptyState } from "@/components/dashboard/DashboardParts";
import { Calendar, Clock, MapPin, Plus, Trash2, Edit2, BookOpen, User, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { toast } from "sonner";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_COLORS = [
  "bg-rose-500/10 border-rose-500/20 text-rose-700",
  "bg-blue-500/10 border-blue-500/20 text-blue-700",
  "bg-emerald-500/10 border-emerald-500/20 text-emerald-700",
  "bg-amber-500/10 border-amber-500/20 text-amber-700",
  "bg-purple-500/10 border-purple-500/20 text-purple-700",
  "bg-cyan-500/10 border-cyan-500/20 text-cyan-700",
  "bg-pink-500/10 border-pink-500/20 text-pink-700",
];

function formatTime(time: string) {
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
}

export default function AdminTimetablePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [filterCourse, setFilterCourse] = useState<string>("all");
  const [form, setForm] = useState({
    course_id: "",
    lecturer_id: "",
    day_of_week: "1",
    start_time: "08:00",
    end_time: "10:00",
    room_location: "",
    module_id: "",
  });

  // Get all courses
  const { data: courses = [] } = useQuery({
    queryKey: ["all-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, course_name, course_code, lecturer_id").order("course_code");
      return data || [];
    },
  });

  // Get all lecturers
  const { data: lecturers = [] } = useQuery({
    queryKey: ["all-lecturers"],
    queryFn: async () => {
      const { data: lecturerData } = await supabase.from("lecturers").select("id, user_id");
      if (!lecturerData || lecturerData.length === 0) return [];
      const userIds = lecturerData.map(l => l.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      return lecturerData.map(l => ({
        ...l,
        full_name: profiles?.find(p => p.user_id === l.user_id)?.full_name || "Unknown",
      }));
    },
  });

  // Get all timetable entries
  const { data: timetable = [], isLoading } = useQuery({
    queryKey: ["admin-timetable", filterCourse],
    queryFn: async () => {
      let query = supabase
        .from("timetable_entries")
        .select(`
          id, day_of_week, start_time, end_time, room_location, course_id, lecturer_id, module_id,
          course:courses(course_name, course_code),
          module:course_modules(title)
        `)
        .order("day_of_week")
        .order("start_time");

      if (filterCourse !== "all") {
        query = query.eq("course_id", filterCourse);
      }

      const { data } = await query;
      return data || [];
    },
  });

  // Get modules for selected course
  const { data: modules = [] } = useQuery({
    queryKey: ["course-modules-admin", form.course_id],
    queryFn: async () => {
      if (!form.course_id) return [];
      const { data } = await supabase.from("course_modules").select("id, title").eq("course_id", form.course_id).order("sort_order");
      return data || [];
    },
    enabled: !!form.course_id,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        course_id: form.course_id,
        lecturer_id: form.lecturer_id || null,
        day_of_week: parseInt(form.day_of_week),
        start_time: form.start_time,
        end_time: form.end_time,
        room_location: form.room_location || null,
        module_id: form.module_id || null,
        created_by: user!.id,
      };

      if (editingEntry) {
        const { error } = await supabase.from("timetable_entries").update(payload).eq("id", editingEntry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("timetable_entries").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingEntry ? "Timetable entry updated!" : "Timetable entry added!");
      queryClient.invalidateQueries({ queryKey: ["admin-timetable"] });
      closeDialog();
    },
    onError: (err: any) => toast.error(err.message || "Failed to save"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("timetable_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Timetable entry deleted!");
      queryClient.invalidateQueries({ queryKey: ["admin-timetable"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete"),
  });

  const openDialog = (entry?: any) => {
    if (entry) {
      setEditingEntry(entry);
      setForm({
        course_id: entry.course_id,
        lecturer_id: entry.lecturer_id || "",
        day_of_week: entry.day_of_week.toString(),
        start_time: entry.start_time,
        end_time: entry.end_time,
        room_location: entry.room_location || "",
        module_id: entry.module_id || "",
      });
    } else {
      setEditingEntry(null);
      setForm({
        course_id: "",
        lecturer_id: "",
        day_of_week: "1",
        start_time: "08:00",
        end_time: "10:00",
        room_location: "",
        module_id: "",
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingEntry(null);
  };

  // Group by day
  const groupedByDay = timetable.reduce((acc: any, entry: any) => {
    const day = entry.day_of_week;
    if (!acc[day]) acc[day] = [];
    acc[day].push(entry);
    return acc;
  }, {});

  const getLecturerName = (lecturerId: string | null) => {
    if (!lecturerId) return null;
    return lecturers.find((l: any) => l.id === lecturerId)?.full_name;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Timetable Management</h1>
            <p className="text-sm text-muted-foreground mt-1">Create and manage class schedules for all courses</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={filterCourse} onValueChange={setFilterCourse}>
              <SelectTrigger className="w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.course_code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => openDialog()} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Entry
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : timetable.length === 0 ? (
          <EmptyState icon={Calendar} title="No Timetable Entries" description="Click 'Add Entry' to create class schedules." />
        ) : (
          <div className="space-y-4">
            {DAYS.map((day, dayIndex) => {
              const entries = groupedByDay[dayIndex] || [];
              if (entries.length === 0) return null;

              return (
                <motion.div key={dayIndex} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: dayIndex * 0.05 }}>
                  <AnimatedCard delay={dayIndex * 0.03}>
                    <div className={`inline-block px-3 py-1.5 rounded-lg text-sm font-semibold border mb-4 ${DAY_COLORS[dayIndex]}`}>
                      {day}
                    </div>

                    <div className="space-y-3">
                      {entries.map((entry: any) => {
                        const course = entry.course as any;
                        const module = entry.module as any;
                        const lecturerName = getLecturerName(entry.lecturer_id);

                        return (
                          <div key={entry.id} className="flex items-start justify-between gap-4 p-3 rounded-xl bg-muted/30 border border-border/50">
                            <div className="flex items-start gap-4 flex-1">
                              <div className="flex flex-col items-center text-center min-w-[70px]">
                                <span className="text-xs font-semibold text-primary">{formatTime(entry.start_time)}</span>
                                <div className="w-px h-4 bg-border my-1" />
                                <span className="text-xs text-muted-foreground">{formatTime(entry.end_time)}</span>
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">{course?.course_name}</p>
                                <p className="text-xs text-muted-foreground">{course?.course_code}</p>

                                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                                  {module?.title && (
                                    <span className="flex items-center gap-1">
                                      <BookOpen className="w-3 h-3" />
                                      {module.title}
                                    </span>
                                  )}
                                  {lecturerName && (
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {lecturerName}
                                    </span>
                                  )}
                                  {entry.room_location && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      {entry.room_location}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openDialog(entry)}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(entry.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AnimatedCard>
                </motion.div>
              );
            })}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingEntry ? "Edit Timetable Entry" : "Add Timetable Entry"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Course *</Label>
                <Select value={form.course_id} onValueChange={v => setForm({ ...form, course_id: v, module_id: "" })}>
                  <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                  <SelectContent>
                    {courses.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.course_code} - {c.course_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Lecturer (optional)</Label>
                <Select value={form.lecturer_id} onValueChange={v => setForm({ ...form, lecturer_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select lecturer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No specific lecturer</SelectItem>
                    {lecturers.map((l: any) => (
                      <SelectItem key={l.id} value={l.id}>{l.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Day of Week</Label>
                <Select value={form.day_of_week} onValueChange={v => setForm({ ...form, day_of_week: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day, i) => (
                      <SelectItem key={i} value={i.toString()}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Room / Location (optional)</Label>
                <Input value={form.room_location} onChange={e => setForm({ ...form, room_location: e.target.value })} placeholder="e.g., Room 101, Lab A" />
              </div>

              {modules.length > 0 && (
                <div className="space-y-2">
                  <Label>Module (optional)</Label>
                  <Select value={form.module_id} onValueChange={v => setForm({ ...form, module_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No specific module</SelectItem>
                      {modules.map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={!form.course_id || saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editingEntry ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
