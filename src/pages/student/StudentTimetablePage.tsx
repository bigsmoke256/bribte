import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedCard, EmptyState } from "@/components/dashboard/DashboardParts";
import { Calendar, Clock, MapPin, BookOpen, User, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import crestImg from "@/assets/bribte-crest.png";

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
const DAY_HEX = ["#e11d48", "#2563eb", "#059669", "#d97706", "#9333ea", "#0891b2", "#ec4899"];

function formatTime(time: string) {
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
}

function imgToBase64(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d")!.drawImage(img, 0, 0);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => resolve("");
    img.src = src;
  });
}

export default function StudentTimetablePage() {
  const { user } = useAuth();

  const { data: student } = useQuery({
    queryKey: ["student-record", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("id, course_id, registration_number, year_of_study, semester, study_mode, course:courses(course_name, course_code)")
        .eq("user_id", user!.id).maybeSingle();
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

  const groupedByDay = timetable.reduce((acc: any, entry: any) => {
    const day = entry.day_of_week;
    if (!acc[day]) acc[day] = [];
    acc[day].push(entry);
    return acc;
  }, {});

  const todayIndex = new Date().getDay();

  async function handleDownloadTimetable() {
    if (timetable.length === 0) { toast.error("No timetable to download"); return; }
    toast.loading("Generating timetable...");
    const base64Crest = await imgToBase64(crestImg);
    const now = new Date();
    const courseInfo = student?.course as any;

    // Build day sections
    const daySections = DAYS.map((day, dayIndex) => {
      const entries = groupedByDay[dayIndex] || [];
      if (entries.length === 0) return "";
      const color = DAY_HEX[dayIndex];
      const rows = entries.map((entry: any) => {
        const course = entry.course as any;
        const module = entry.module as any;
        const lecturerName = getLecturerName(entry);
        return `
          <tr>
            <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#1e293b;">${formatTime(entry.start_time)} – ${formatTime(entry.end_time)}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;">
              <span style="font-size:13px;font-weight:600;color:#1e293b;">${course?.course_name || "—"}</span>
              <br/><span style="font-size:11px;color:#6b7280;">${course?.course_code || ""}</span>
            </td>
            <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#6b7280;">${module?.title || "—"}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#6b7280;">${lecturerName || "—"}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#6b7280;">${entry.room_location || "—"}</td>
          </tr>`;
      }).join("");

      return `
        <div style="margin-bottom:20px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <div style="width:4px;height:28px;border-radius:4px;background:${color};"></div>
            <h3 style="margin:0;font-size:15px;font-weight:700;color:${color};">${day}</h3>
            <span style="font-size:11px;color:#9ca3af;">${entries.length} class${entries.length > 1 ? "es" : ""}</span>
          </div>
          <table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:8px 14px;text-align:left;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;width:160px;">Time</th>
                <th style="padding:8px 14px;text-align:left;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Course</th>
                <th style="padding:8px 14px;text-align:left;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Module</th>
                <th style="padding:8px 14px;text-align:left;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Lecturer</th>
                <th style="padding:8px 14px;text-align:left;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Room</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    }).filter(Boolean).join("");

    const totalClasses = timetable.length;
    const activeDays = Object.keys(groupedByDay).length;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Timetable</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f9fafb;">
<div style="max-width:820px;margin:20px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:30px 40px;color:#fff;position:relative;">
    <div style="position:absolute;top:0;right:0;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,0.04);transform:translate(40%,-40%);"></div>
    <div style="display:flex;align-items:center;gap:20px;position:relative;z-index:1;">
      ${base64Crest ? `<img src="${base64Crest}" style="width:65px;height:65px;object-fit:contain;border-radius:12px;background:rgba(255,255,255,0.15);padding:6px;" />` : ""}
      <div>
        <h1 style="margin:0;font-size:20px;font-weight:800;letter-spacing:-0.3px;">BRIBTE INSTITUTE OF TECHNOLOGY</h1>
        <p style="margin:4px 0 0;font-size:12px;opacity:0.8;letter-spacing:1px;">WEEKLY CLASS TIMETABLE</p>
      </div>
    </div>
  </div>

  <!-- Student Info -->
  <div style="padding:20px 40px;background:#f8fafc;border-bottom:2px solid #e5e7eb;">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:16px;">
      <div>
        <p style="margin:0;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Student Name</p>
        <p style="margin:3px 0 0;font-size:14px;font-weight:700;">${user?.fullName || "—"}</p>
      </div>
      <div>
        <p style="margin:0;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Reg. Number</p>
        <p style="margin:3px 0 0;font-size:14px;font-weight:700;">${student?.registration_number || "—"}</p>
      </div>
      <div>
        <p style="margin:0;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Programme</p>
        <p style="margin:3px 0 0;font-size:14px;font-weight:700;">${courseInfo?.course_name || "—"}</p>
      </div>
      <div>
        <p style="margin:0;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Year / Sem</p>
        <p style="margin:3px 0 0;font-size:14px;font-weight:700;">Year ${student?.year_of_study || "—"}, Sem ${student?.semester || "—"}</p>
      </div>
    </div>
    <div style="display:flex;gap:16px;margin-top:10px;">
      <div>
        <p style="margin:0;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Study Mode</p>
        <p style="margin:3px 0 0;font-size:13px;font-weight:600;">${student?.study_mode || "—"}</p>
      </div>
      <div>
        <p style="margin:0;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Total Classes/Week</p>
        <p style="margin:3px 0 0;font-size:13px;font-weight:600;">${totalClasses} classes across ${activeDays} days</p>
      </div>
    </div>
  </div>

  <!-- Schedule -->
  <div style="padding:24px 40px;">
    ${daySections}
  </div>

  <!-- Footer -->
  <div style="padding:18px 40px;background:#f8fafc;border-top:2px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
    <div>
      <p style="margin:0;font-size:10px;color:#9ca3af;">This timetable is subject to change. Always confirm with your department for the latest schedule.</p>
      <p style="margin:3px 0 0;font-size:10px;color:#9ca3af;">Generated on ${now.toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" })}</p>
    </div>
    <div style="text-align:right;">
      <p style="margin:0;font-size:11px;font-weight:600;color:#374151;">BRIBTE Institute of Technology</p>
      <p style="margin:2px 0 0;font-size:10px;color:#9ca3af;">Academic Affairs Office</p>
    </div>
  </div>
</div>
</body></html>`;

    toast.dismiss();
    const w = window.open("", "_blank", "width=880,height=900");
    if (!w) { toast.error("Please allow popups"); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
    toast.success("Timetable ready — use Save as PDF in the print dialog");
  }

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Timetable</h1>
          <p className="text-sm text-muted-foreground mt-1">Your class schedule for the week</p>
        </div>
        <Button onClick={handleDownloadTimetable} className="rounded-xl gap-2">
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Download Timetable</span>
          <span className="sm:hidden">PDF</span>
        </Button>
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
                  <span className="text-xs text-muted-foreground">{entries.length} class{entries.length > 1 ? "es" : ""}</span>
                </div>

                <div className="space-y-3">
                  {entries.map((entry: any) => {
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
                                <BookOpen className="w-3 h-3" />{module.title}
                              </span>
                            )}
                            {lecturerName && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />{lecturerName}
                              </span>
                            )}
                            {entry.room_location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />{entry.room_location}
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
