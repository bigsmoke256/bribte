import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedCard, EmptyState } from "@/components/dashboard/DashboardParts";
import { Calendar, Clock, MapPin, BookOpen, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function StudentTimetablePage() {
  const { user } = useAuth();

  const { data: student } = useQuery({
    queryKey: ["student-record", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("students").select("id, course_id").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: timetable = [], isLoading } = useQuery({
    queryKey: ["student-timetable", student?.course_id],
    queryFn: async () => {
      if (!student?.course_id) return [];
      const { data } = await supabase
        .from("timetable_entries")
        .select(`
          id, day_of_week, start_time, end_time, room_location,
          course:courses(course_name, course_code),
          module:course_modules(title),
          lecturer:lecturers(user_id)
        `)
        .eq("course_id", student.course_id)
        .order("day_of_week")
        .order("start_time");
      return data || [];
    },
    enabled: !!student?.course_id,
  });

  // Get lecturer names
  const lecturerUserIds = [...new Set(timetable.map((t: any) => t.lecturer?.user_id).filter(Boolean))];
  const { data: lecturerProfiles = [] } = useQuery({
    queryKey: ["lecturer-profiles", lecturerUserIds],
    queryFn: async () => {
      if (lecturerUserIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", lecturerUserIds);
      return data || [];
    },
    enabled: lecturerUserIds.length > 0,
  });

  const getLecturerName = (entry: any) => {
    if (!entry.lecturer?.user_id) return null;
    return lecturerProfiles.find((p: any) => p.user_id === entry.lecturer.user_id)?.full_name;
  };

  // Group by day
  const groupedByDay = timetable.reduce((acc: any, entry: any) => {
    const day = entry.day_of_week;
    if (!acc[day]) acc[day] = [];
    acc[day].push(entry);
    return acc;
  }, {});

  const todayIndex = new Date().getDay();

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div>
          <h1 className="font-display text-2xl font-bold">Timetable</h1>
          <p className="text-sm text-muted-foreground mt-1">Your class schedule</p>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (timetable.length === 0) {
    return (
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div>
          <h1 className="font-display text-2xl font-bold">Timetable</h1>
          <p className="text-sm text-muted-foreground mt-1">Your class schedule</p>
        </div>
        <EmptyState icon={Calendar} title="No Timetable Yet" description="Your course timetable hasn't been set up by the admin or lecturer yet. Check back later!" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold">Timetable</h1>
        <p className="text-sm text-muted-foreground mt-1">Your class schedule for the week</p>
      </div>

      <div className="space-y-4">
        {DAYS.map((day, dayIndex) => {
          const entries = groupedByDay[dayIndex] || [];
          if (entries.length === 0) return null;

          const isToday = dayIndex === todayIndex;

          return (
            <motion.div key={dayIndex} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: dayIndex * 0.05 }}>
              <AnimatedCard delay={dayIndex * 0.03}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${DAY_COLORS[dayIndex]}`}>
                    {day}
                  </div>
                  {isToday && <Badge variant="default" className="text-[10px] h-5">Today</Badge>}
                </div>

                <div className="space-y-3">
                  {entries.map((entry: any, i: number) => {
                    const course = entry.course as any;
                    const module = entry.module as any;
                    const lecturerName = getLecturerName(entry);

                    return (
                      <div key={entry.id} className="flex items-start gap-4 p-3 rounded-xl bg-muted/30 border border-border/50">
                        <div className="flex flex-col items-center text-center min-w-[70px]">
                          <span className="text-xs font-semibold text-primary">{formatTime(entry.start_time)}</span>
                          <div className="w-px h-4 bg-border my-1" />
                          <span className="text-xs text-muted-foreground">{formatTime(entry.end_time)}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-sm">{course?.course_name || "Course"}</p>
                              <p className="text-xs text-muted-foreground">{course?.course_code}</p>
                            </div>
                          </div>

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
                    );
                  })}
                </div>
              </AnimatedCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
