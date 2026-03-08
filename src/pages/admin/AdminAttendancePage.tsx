import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedCard, EmptyState } from "@/components/dashboard/DashboardParts";
import { Calendar, Users, CheckCircle, XCircle, Clock, Filter, Download } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { format } from "date-fns";

const STATUS_STYLES: Record<string, string> = {
  present: "bg-green-100 text-green-700",
  absent: "bg-red-100 text-red-700",
  late: "bg-amber-100 text-amber-700",
};

const STATUS_ICONS: Record<string, any> = {
  present: CheckCircle,
  absent: XCircle,
  late: Clock,
};

export default function AdminAttendancePage() {
  const [filterCourse, setFilterCourse] = useState<string>("all");
  const [filterSession, setFilterSession] = useState<string>("all");

  // Get all courses
  const { data: courses = [] } = useQuery({
    queryKey: ["all-courses-attendance"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, course_name, course_code").order("course_code");
      return data || [];
    },
  });

  // Get class sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ["class-sessions-attendance", filterCourse],
    queryFn: async () => {
      let query = supabase
        .from("class_sessions")
        .select("id, session_date, start_time, course_id, course:courses(course_name, course_code)")
        .order("session_date", { ascending: false });

      if (filterCourse !== "all") {
        query = query.eq("course_id", filterCourse);
      }

      const { data } = await query;
      return data || [];
    },
  });

  // Get attendance records
  const { data: attendance = [], isLoading } = useQuery({
    queryKey: ["attendance-records", filterCourse, filterSession],
    queryFn: async () => {
      let query = supabase
        .from("attendance")
        .select(`
          id, status, time_joined,
          student:students(id, user_id, registration_number),
          session:class_sessions(id, session_date, start_time, course_id, course:courses(course_name, course_code))
        `)
        .order("created_at", { ascending: false });

      if (filterSession !== "all") {
        query = query.eq("session_id", filterSession);
      }

      const { data } = await query;
      
      // Filter by course if needed
      if (filterCourse !== "all" && data) {
        return data.filter((a: any) => a.session?.course_id === filterCourse);
      }
      
      return data || [];
    },
  });

  // Get student profiles
  const studentUserIds = [...new Set(attendance.map((a: any) => a.student?.user_id).filter(Boolean))];
  const { data: studentProfiles = [] } = useQuery({
    queryKey: ["student-profiles-attendance", studentUserIds],
    queryFn: async () => {
      if (studentUserIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", studentUserIds);
      return data || [];
    },
    enabled: studentUserIds.length > 0,
  });

  const getStudentName = (userId: string) => {
    return studentProfiles.find((p: any) => p.user_id === userId)?.full_name || "Unknown";
  };

  // Calculate stats
  const stats = {
    total: attendance.length,
    present: attendance.filter((a: any) => a.status === "present").length,
    late: attendance.filter((a: any) => a.status === "late").length,
    absent: attendance.filter((a: any) => a.status === "absent").length,
  };

  const attendanceRate = stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 0;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Attendance Tracking</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor student attendance across all classes</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={filterCourse} onValueChange={(v) => { setFilterCourse(v); setFilterSession("all"); }}>
            <SelectTrigger className="w-[180px]">
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
          <Select value={filterSession} onValueChange={setFilterSession}>
            <SelectTrigger className="w-[200px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by session" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sessions</SelectItem>
              {sessions.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.course?.course_code} - {format(new Date(s.session_date), "MMM d")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AnimatedCard>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Records</p>
            </div>
          </div>
        </AnimatedCard>
        <AnimatedCard>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.present}</p>
              <p className="text-xs text-muted-foreground">Present</p>
            </div>
          </div>
        </AnimatedCard>
        <AnimatedCard>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.late}</p>
              <p className="text-xs text-muted-foreground">Late</p>
            </div>
          </div>
        </AnimatedCard>
        <AnimatedCard>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{attendanceRate}%</p>
              <p className="text-xs text-muted-foreground">Attendance Rate</p>
            </div>
          </div>
        </AnimatedCard>
      </div>

      {/* Attendance Table */}
      <AnimatedCard>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : attendance.length === 0 ? (
          <EmptyState icon={Users} title="No Attendance Records" description="Attendance will appear here when students join class sessions." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Reg. Number</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Session Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.map((record: any) => {
                  const StatusIcon = STATUS_ICONS[record.status];
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {getStudentName(record.student?.user_id)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {record.student?.registration_number || "N/A"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{record.session?.course?.course_code}</p>
                          <p className="text-xs text-muted-foreground">{record.session?.course?.course_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.session?.session_date && format(new Date(record.session.session_date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge className={`gap-1 ${STATUS_STYLES[record.status]}`}>
                          <StatusIcon className="w-3 h-3" />
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {record.time_joined ? format(new Date(record.time_joined), "h:mm a") : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </AnimatedCard>
    </div>
  );
}
