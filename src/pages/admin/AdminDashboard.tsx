import { useAuth } from "@/lib/auth-context";
import { useLocation } from "react-router-dom";
import AdminDashboardHome from "./AdminDashboardHome";
import AdminStudentsPage from "./AdminStudentsPage";
import AdminLecturersPage from "./AdminLecturersPage";
import AdminCoursesPage from "./AdminCoursesPage";
import AdminFeesPage from "./AdminFeesPage";
import AdminEnrollmentPage from "./AdminEnrollmentPage";
import AdminTimetablePage from "./AdminTimetablePage";
import AdminSchedulingPage from "./AdminSchedulingPage";
import AdminAttendancePage from "./AdminAttendancePage";
import AdminAnnouncementsPage from "./AdminAnnouncementsPage";
import AdminReportsPage from "./AdminReportsPage";
import AdminSettingsPage from "./AdminSettingsPage";
import AdminReceiptReviewPage from "./AdminReceiptReviewPage";

export default function AdminDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return null;

  const path = location.pathname;

  if (path === "/admin/students") return <AdminStudentsPage />;
  if (path === "/admin/lecturers") return <AdminLecturersPage />;
  if (path === "/admin/courses") return <AdminCoursesPage />;
  if (path === "/admin/fees") return <AdminFeesPage />;
  if (path === "/admin/receipts") return <AdminReceiptReviewPage />;
  if (path === "/admin/enrollment") return <AdminEnrollmentPage />;
  if (path === "/admin/timetable") return <AdminTimetablePage />;
  if (path === "/admin/scheduling") return <AdminSchedulingPage />;
  if (path === "/admin/attendance") return <AdminAttendancePage />;
  if (path === "/admin/announcements") return <AdminAnnouncementsPage />;
  if (path === "/admin/reports") return <AdminReportsPage />;
  if (path === "/admin/settings") return <AdminSettingsPage />;

  return <AdminDashboardHome />;
}
