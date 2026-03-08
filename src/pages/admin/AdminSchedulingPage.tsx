import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedCard, EmptyState } from "@/components/dashboard/DashboardParts";
import { Calendar, Clock, MapPin, Plus, Trash2, Edit2, Video, Users, PlayCircle, CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { toast } from "sonner";
import { format, addWeeks, startOfWeek, addDays } from "date-fns";

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

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  live: "bg-green-100 text-green-700 border-green-200 animate-pulse",
  completed: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

function formatTime(time: string) {
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
}

export default function AdminSchedulingPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("schedules");
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [filterCourse, setFilterCourse] = useState<string>("all");
  
  // Form states
  const [scheduleForm, setScheduleForm] = useState({
    course_id: "",
    day_of_week: 1,
    start_time: "08:00",
    end_time: "10:00",
    lecturer_id: "",
    meeting_link_or_room: "",
  });
  
  const [generateForm, setGenerateForm] = useState({
    course_id: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    weeks: 12,
  });

  // Get all courses
  const { data: courses = [] } = useQuery({
    queryKey: ["all-courses-scheduling"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, course_name, course_code, duration_years").order("course_code");
      return data || [];
    },
  });

  // Get all lecturers
  const { data: lecturers = [] } = useQuery({
    queryKey: ["all-lecturers-scheduling"],
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

  // Get course schedules
  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ["course-schedules", filterCourse],
    queryFn: async () => {
      let query = supabase
        .from("course_schedules")
        .select(`
          id, day_of_week, start_time, end_time, meeting_link_or_room, course_id, lecturer_id,
          course:courses(course_name, course_code)
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

  // Get class sessions
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["class-sessions", filterCourse],
    queryFn: async () => {
      let query = supabase
        .from("class_sessions")
        .select(`
          id, session_date, start_time, end_time, meeting_link, status, course_id, lecturer_id,
          course:courses(course_name, course_code)
        `)
        .order("session_date")
        .order("start_time");

      if (filterCourse !== "all") {
        query = query.eq("course_id", filterCourse);
      }

      const { data } = await query;
      return data || [];
    },
  });

  // Check conflicts before saving
  const checkConflicts = async () => {
    const { data, error } = await supabase.rpc("check_schedule_conflicts", {
      p_course_id: scheduleForm.course_id,
      p_day_of_week: scheduleForm.day_of_week,
      p_start_time: scheduleForm.start_time,
      p_end_time: scheduleForm.end_time,
      p_lecturer_id: scheduleForm.lecturer_id || null,
      p_meeting_room: scheduleForm.meeting_link_or_room || null,
      p_exclude_id: editingSchedule?.id || null,
    });

    if (error) {
      console.error("Conflict check error:", error);
      return [];
    }
    return data || [];
  };

  // Save schedule mutation
  const saveScheduleMutation = useMutation({
    mutationFn: async () => {
      // Check for conflicts first
      const conflicts = await checkConflicts();
      if (conflicts.length > 0) {
        throw new Error(conflicts.map((c: any) => c.conflict_details).join("\n"));
      }

      const payload = {
        course_id: scheduleForm.course_id,
        day_of_week: scheduleForm.day_of_week,
        start_time: scheduleForm.start_time,
        end_time: scheduleForm.end_time,
        lecturer_id: scheduleForm.lecturer_id || null,
        meeting_link_or_room: scheduleForm.meeting_link_or_room || null,
      };

      if (editingSchedule) {
        const { error } = await supabase.from("course_schedules").update(payload).eq("id", editingSchedule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("course_schedules").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingSchedule ? "Schedule updated!" : "Schedule created!");
      queryClient.invalidateQueries({ queryKey: ["course-schedules"] });
      closeScheduleDialog();
    },
    onError: (err: any) => toast.error(err.message || "Failed to save schedule"),
  });

  // Generate sessions mutation
  const generateSessionsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("generate_class_sessions", {
        p_course_id: generateForm.course_id,
        p_start_date: generateForm.start_date,
        p_weeks: generateForm.weeks,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (count) => {
      toast.success(`Generated ${count} class sessions!`);
      queryClient.invalidateQueries({ queryKey: ["class-sessions"] });
      setGenerateDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message || "Failed to generate sessions"),
  });

  // Delete schedule
  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("course_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Schedule deleted!");
      queryClient.invalidateQueries({ queryKey: ["course-schedules"] });
    },
  });

  // Update session status
  const updateSessionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "scheduled" | "live" | "completed" | "cancelled" }) => {
      const { error } = await supabase.from("class_sessions").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Session updated!");
      queryClient.invalidateQueries({ queryKey: ["class-sessions"] });
    },
  });

  // Delete session
  const deleteSessionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("class_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Session deleted!");
      queryClient.invalidateQueries({ queryKey: ["class-sessions"] });
    },
  });

  const openScheduleDialog = (schedule?: any) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setScheduleForm({
        course_id: schedule.course_id,
        day_of_week: schedule.day_of_week,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        lecturer_id: schedule.lecturer_id || "",
        meeting_link_or_room: schedule.meeting_link_or_room || "",
      });
    } else {
      setEditingSchedule(null);
      setScheduleForm({
        course_id: "",
        day_of_week: 1,
        start_time: "08:00",
        end_time: "10:00",
        lecturer_id: "",
        meeting_link_or_room: "",
      });
    }
    setScheduleDialogOpen(true);
  };

  const closeScheduleDialog = () => {
    setScheduleDialogOpen(false);
    setEditingSchedule(null);
  };

  const getLecturerName = (lecturerId: string | null) => {
    if (!lecturerId) return null;
    return lecturers.find((l: any) => l.id === lecturerId)?.full_name;
  };

  // Group schedules by day
  const groupedSchedules = schedules.reduce((acc: any, schedule: any) => {
    const day = schedule.day_of_week;
    if (!acc[day]) acc[day] = [];
    acc[day].push(schedule);
    return acc;
  }, {});

  // Group sessions by date
  const groupedSessions = sessions.reduce((acc: any, session: any) => {
    const date = session.session_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(session);
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Course Scheduling</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage weekly schedules and generate class sessions</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterCourse} onValueChange={setFilterCourse}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.course_code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="schedules" className="gap-2">
            <Calendar className="w-4 h-4" />
            Weekly Schedules
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-2">
            <Video className="w-4 h-4" />
            Class Sessions
          </TabsTrigger>
        </TabsList>

        {/* Weekly Schedules Tab */}
        <TabsContent value="schedules" className="space-y-4 mt-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setGenerateDialogOpen(true)} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Generate Sessions
            </Button>
            <Button onClick={() => openScheduleDialog()} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Schedule
            </Button>
          </div>

          {schedulesLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : schedules.length === 0 ? (
            <EmptyState icon={Calendar} title="No Schedules" description="Create weekly schedules for courses." />
          ) : (
            <div className="space-y-4">
              {DAYS.map((day, dayIndex) => {
                const daySchedules = groupedSchedules[dayIndex] || [];
                if (daySchedules.length === 0) return null;

                return (
                  <AnimatedCard key={dayIndex} delay={dayIndex * 0.03}>
                    <div className={`inline-block px-3 py-1.5 rounded-lg text-sm font-semibold border mb-4 ${DAY_COLORS[dayIndex]}`}>
                      {day}
                    </div>

                    <div className="space-y-3">
                      {daySchedules.map((schedule: any) => (
                        <div key={schedule.id} className="flex items-start justify-between gap-4 p-3 rounded-xl bg-muted/30 border border-border/50">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="flex flex-col items-center text-center min-w-[70px]">
                              <span className="text-xs font-semibold text-primary">{formatTime(schedule.start_time)}</span>
                              <div className="w-px h-4 bg-border my-1" />
                              <span className="text-xs text-muted-foreground">{formatTime(schedule.end_time)}</span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm">{schedule.course?.course_name}</p>
                              <p className="text-xs text-muted-foreground">{schedule.course?.course_code}</p>
                              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                                {getLecturerName(schedule.lecturer_id) && (
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {getLecturerName(schedule.lecturer_id)}
                                  </span>
                                )}
                                {schedule.meeting_link_or_room && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {schedule.meeting_link_or_room}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openScheduleDialog(schedule)}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteScheduleMutation.mutate(schedule.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AnimatedCard>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Class Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4 mt-4">
          {sessionsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : sessions.length === 0 ? (
            <EmptyState icon={Video} title="No Sessions" description="Generate sessions from weekly schedules." />
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedSessions).map(([date, dateSessions]: [string, any]) => (
                <AnimatedCard key={date}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="px-3 py-1.5 rounded-lg text-sm font-semibold border bg-primary/10 border-primary/20 text-primary">
                      {format(new Date(date), "EEEE, MMM d, yyyy")}
                    </div>
                    <Badge variant="outline">{dateSessions.length} session{dateSessions.length !== 1 ? "s" : ""}</Badge>
                  </div>

                  <div className="space-y-3">
                    {dateSessions.map((session: any) => (
                      <div key={session.id} className="flex items-start justify-between gap-4 p-3 rounded-xl bg-muted/30 border border-border/50">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="flex flex-col items-center text-center min-w-[70px]">
                            <span className="text-xs font-semibold text-primary">{formatTime(session.start_time)}</span>
                            <div className="w-px h-4 bg-border my-1" />
                            <span className="text-xs text-muted-foreground">{formatTime(session.end_time)}</span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm">{session.course?.course_name}</p>
                              <Badge className={STATUS_STYLES[session.status]}>
                                {session.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{session.course?.course_code}</p>
                            {session.meeting_link && (
                              <a href={session.meeting_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                                <Video className="w-3 h-3" />
                                Join Meeting
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Select
                            value={session.status}
                            onValueChange={(status: "scheduled" | "live" | "completed" | "cancelled") => updateSessionMutation.mutate({ id: session.id, status })}
                          >
                            <SelectTrigger className="w-[120px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="scheduled">Scheduled</SelectItem>
                              <SelectItem value="live">Live</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteSessionMutation.mutate(session.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </AnimatedCard>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSchedule ? "Edit Schedule" : "Create Weekly Schedule"}</DialogTitle>
            <DialogDescription>
              Define when this course meets each week. The system will check for conflicts automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Course *</Label>
              <Select value={scheduleForm.course_id} onValueChange={v => setScheduleForm({ ...scheduleForm, course_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.course_code} - {c.course_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Day of Week *</Label>
              <Select value={String(scheduleForm.day_of_week)} onValueChange={v => setScheduleForm({ ...scheduleForm, day_of_week: parseInt(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((day, i) => (
                    <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time *</Label>
                <Input type="time" value={scheduleForm.start_time} onChange={e => setScheduleForm({ ...scheduleForm, start_time: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End Time *</Label>
                <Input type="time" value={scheduleForm.end_time} onChange={e => setScheduleForm({ ...scheduleForm, end_time: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Lecturer (optional)</Label>
              <Select value={scheduleForm.lecturer_id || "none"} onValueChange={v => setScheduleForm({ ...scheduleForm, lecturer_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select lecturer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific lecturer</SelectItem>
                  {lecturers.map((l: any) => (
                    <SelectItem key={l.id} value={l.id}>{l.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Meeting Link / Room</Label>
              <Input 
                placeholder="e.g., Room 101 or https://zoom.us/..." 
                value={scheduleForm.meeting_link_or_room} 
                onChange={e => setScheduleForm({ ...scheduleForm, meeting_link_or_room: e.target.value })} 
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeScheduleDialog}>Cancel</Button>
            <Button onClick={() => saveScheduleMutation.mutate()} disabled={!scheduleForm.course_id || saveScheduleMutation.isPending}>
              {saveScheduleMutation.isPending ? "Saving..." : editingSchedule ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Sessions Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Class Sessions</DialogTitle>
            <DialogDescription>
              Automatically create class sessions based on the weekly schedule for a course.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Course *</Label>
              <Select value={generateForm.course_id} onValueChange={v => setGenerateForm({ ...generateForm, course_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.course_code} - {c.course_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input type="date" value={generateForm.start_date} onChange={e => setGenerateForm({ ...generateForm, start_date: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Number of Weeks *</Label>
              <Input type="number" min={1} max={52} value={generateForm.weeks} onChange={e => setGenerateForm({ ...generateForm, weeks: parseInt(e.target.value) || 12 })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => generateSessionsMutation.mutate()} disabled={!generateForm.course_id || generateSessionsMutation.isPending}>
              {generateSessionsMutation.isPending ? "Generating..." : "Generate Sessions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
