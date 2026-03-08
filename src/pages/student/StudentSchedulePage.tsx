import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedCard, EmptyState } from "@/components/dashboard/DashboardParts";
import { Calendar, Clock, Video, CheckCircle, Users, PlayCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, addDays, isToday, isSameDay, parseISO } from "date-fns";

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

export default function StudentSchedulePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("weekly");
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Get student record
  const { data: student } = useQuery({
    queryKey: ["student-record", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("students").select("id, course_id").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Get enrolled course IDs
  const { data: enrolledCourseIds = [] } = useQuery({
    queryKey: ["enrolled-course-ids", student?.id],
    queryFn: async () => {
      if (!student) return [];
      
      // Get direct course_id from student record
      const courseIds: string[] = [];
      if (student.course_id) courseIds.push(student.course_id);
      
      // Get additional enrollments
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("student_id", student.id)
        .eq("status", "approved");
      
      if (enrollments) {
        enrollments.forEach(e => {
          if (!courseIds.includes(e.course_id)) courseIds.push(e.course_id);
        });
      }
      
      return courseIds;
    },
    enabled: !!student,
  });

  // Get weekly schedules for enrolled courses
  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ["student-schedules", enrolledCourseIds],
    queryFn: async () => {
      if (enrolledCourseIds.length === 0) return [];
      
      const { data } = await supabase
        .from("course_schedules")
        .select(`
          id, day_of_week, start_time, end_time, meeting_link_or_room, course_id, lecturer_id,
          course:courses(course_name, course_code)
        `)
        .in("course_id", enrolledCourseIds)
        .order("day_of_week")
        .order("start_time");
      
      return data || [];
    },
    enabled: enrolledCourseIds.length > 0,
  });

  // Get class sessions for the current week
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["student-sessions", enrolledCourseIds, format(currentWeekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      if (enrolledCourseIds.length === 0) return [];
      
      const { data } = await supabase
        .from("class_sessions")
        .select(`
          id, session_date, start_time, end_time, meeting_link, status, course_id, lecturer_id,
          course:courses(course_name, course_code)
        `)
        .in("course_id", enrolledCourseIds)
        .gte("session_date", format(currentWeekStart, "yyyy-MM-dd"))
        .lte("session_date", format(weekEnd, "yyyy-MM-dd"))
        .order("session_date")
        .order("start_time");
      
      return data || [];
    },
    enabled: enrolledCourseIds.length > 0,
  });

  // Get lecturer names
  const lecturerIds = [...new Set([...schedules, ...sessions].map((s: any) => s.lecturer_id).filter(Boolean))];
  const { data: lecturerProfiles = [] } = useQuery({
    queryKey: ["lecturer-profiles-student", lecturerIds],
    queryFn: async () => {
      if (lecturerIds.length === 0) return [];
      const { data: lecturers } = await supabase.from("lecturers").select("id, user_id").in("id", lecturerIds);
      if (!lecturers) return [];
      const userIds = lecturers.map(l => l.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      return lecturers.map(l => ({
        lecturer_id: l.id,
        full_name: profiles?.find(p => p.user_id === l.user_id)?.full_name || "Unknown",
      }));
    },
    enabled: lecturerIds.length > 0,
  });

  // Record attendance when joining class
  const joinClassMutation = useMutation({
    mutationFn: async (session: any) => {
      if (!student) throw new Error("Student not found");
      
      const now = new Date();
      const sessionStart = new Date(`${session.session_date}T${session.start_time}`);
      const isLate = now > new Date(sessionStart.getTime() + 15 * 60000); // 15 min grace
      
      const { error } = await supabase.from("attendance").upsert({
        student_id: student.id,
        session_id: session.id,
        status: isLate ? "late" : "present",
        time_joined: now.toISOString(),
      }, {
        onConflict: "student_id,session_id",
      });
      
      if (error) throw error;
      
      // Open meeting link
      if (session.meeting_link) {
        window.open(session.meeting_link, "_blank");
      }
    },
    onSuccess: () => {
      toast.success("Attendance recorded! Joining class...");
      queryClient.invalidateQueries({ queryKey: ["student-attendance"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const getLecturerName = (lecturerId: string | null) => {
    if (!lecturerId) return null;
    return lecturerProfiles.find((l: any) => l.lecturer_id === lecturerId)?.full_name;
  };

  // Group schedules by day
  const groupedSchedules = schedules.reduce((acc: any, schedule: any) => {
    const day = schedule.day_of_week;
    if (!acc[day]) acc[day] = [];
    acc[day].push(schedule);
    return acc;
  }, {});

  // Group sessions by date
  const sessionsByDate = sessions.reduce((acc: any, session: any) => {
    const date = session.session_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(session);
    return acc;
  }, {});

  // Generate week days for the sessions view
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const isLoading = schedulesLoading || sessionsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div>
          <h1 className="font-display text-2xl font-bold">My Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">Your class schedule</p>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (enrolledCourseIds.length === 0) {
    return (
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div>
          <h1 className="font-display text-2xl font-bold">My Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">Your class schedule</p>
        </div>
        <EmptyState icon={Calendar} title="No Enrolled Courses" description="You need to be enrolled in courses to see your schedule." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold">My Schedule</h1>
        <p className="text-sm text-muted-foreground mt-1">View your weekly class schedule and upcoming sessions</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="weekly" className="gap-2">
            <Calendar className="w-4 h-4" />
            Weekly View
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-2">
            <Video className="w-4 h-4" />
            This Week's Classes
          </TabsTrigger>
        </TabsList>

        {/* Weekly Schedule Tab */}
        <TabsContent value="weekly" className="space-y-4 mt-4">
          {schedules.length === 0 ? (
            <EmptyState icon={Calendar} title="No Weekly Schedule" description="Your courses don't have a weekly schedule set up yet." />
          ) : (
            <div className="space-y-4">
              {DAYS.map((day, dayIndex) => {
                const daySchedules = groupedSchedules[dayIndex] || [];
                if (daySchedules.length === 0) return null;
                const todayIndex = new Date().getDay();

                return (
                  <motion.div key={dayIndex} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: dayIndex * 0.05 }}>
                    <AnimatedCard delay={dayIndex * 0.03}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${DAY_COLORS[dayIndex]}`}>
                          {day}
                        </div>
                        {dayIndex === todayIndex && <Badge variant="default" className="text-[10px] h-5">Today</Badge>}
                      </div>

                      <div className="space-y-3">
                        {daySchedules.map((schedule: any) => (
                          <div key={schedule.id} className="flex items-start gap-4 p-3 rounded-xl bg-muted/30 border border-border/50">
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
                                    <Video className="w-3 h-3" />
                                    {schedule.meeting_link_or_room}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AnimatedCard>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* This Week's Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}>
                Previous
              </Button>
              <span className="text-sm font-medium">
                {format(currentWeekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
              </span>
              <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}>
                Next
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
              Today
            </Button>
          </div>

          {sessions.length === 0 ? (
            <EmptyState icon={Video} title="No Sessions This Week" description="No class sessions scheduled for this week." />
          ) : (
            <div className="space-y-4">
              {weekDays.map((date, i) => {
                const dateStr = format(date, "yyyy-MM-dd");
                const daySessions = sessionsByDate[dateStr] || [];
                if (daySessions.length === 0) return null;

                return (
                  <AnimatedCard key={dateStr}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${isToday(date) ? "bg-primary text-primary-foreground border-primary" : DAY_COLORS[date.getDay()]}`}>
                        {format(date, "EEEE, MMM d")}
                      </div>
                      {isToday(date) && <Badge variant="secondary">Today</Badge>}
                    </div>

                    <div className="space-y-3">
                      {daySessions.map((session: any) => {
                        const canJoin = session.status === "live" || session.status === "scheduled";
                        
                        return (
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
                                    {session.status === "live" && <PlayCircle className="w-3 h-3 mr-1" />}
                                    {session.status}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{session.course?.course_code}</p>
                                {getLecturerName(session.lecturer_id) && (
                                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {getLecturerName(session.lecturer_id)}
                                  </p>
                                )}
                              </div>
                            </div>

                            {canJoin && session.meeting_link && (
                              <Button 
                                size="sm" 
                                onClick={() => joinClassMutation.mutate(session)}
                                disabled={joinClassMutation.isPending}
                                className="gap-2"
                              >
                                <Video className="w-4 h-4" />
                                Join Class
                              </Button>
                            )}
                            {session.status === "cancelled" && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Cancelled
                              </Badge>
                            )}
                            {session.status === "completed" && (
                              <Badge variant="outline" className="gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Completed
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </AnimatedCard>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
