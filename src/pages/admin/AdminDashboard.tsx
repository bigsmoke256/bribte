import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Routes, Route } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
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
import AdminRecordsPage from "./AdminRecordsPage";
import AdminExamsPage from "./AdminExamsPage";
import AdminClearancePage from "./AdminClearancePage";
import AdminAcademicCalendarPage from "./AdminAcademicCalendarPage";
import AdminDocumentsPage from "./AdminDocumentsPage";
import AdminAlumniPage from "./AdminAlumniPage";
import AdminAuditLogPage from "./AdminAuditLogPage";
import AdminPoliciesPage from "./AdminPoliciesPage";
import ProfileSettingsPage from "../shared/ProfileSettingsPage";
import HelpSupportPage from "../shared/HelpSupportPage";

export default function AdminDashboard() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<AdminDashboardHome />} />
        <Route path="students" element={<AdminStudentsPage />} />
        <Route path="lecturers" element={<AdminLecturersPage />} />
        <Route path="courses" element={<AdminCoursesPage />} />
        <Route path="exams" element={<AdminExamsPage />} />
        <Route path="fees" element={<AdminFeesPage />} />
        <Route path="receipts" element={<AdminReceiptReviewPage />} />
        <Route path="enrollment" element={<AdminEnrollmentPage />} />
        <Route path="clearance" element={<AdminClearancePage />} />
        <Route path="timetable" element={<AdminTimetablePage />} />
        <Route path="scheduling" element={<AdminSchedulingPage />} />
        <Route path="attendance" element={<AdminAttendancePage />} />
        <Route path="calendar" element={<AdminAcademicCalendarPage />} />
        <Route path="documents" element={<AdminDocumentsPage />} />
        <Route path="announcements" element={<AdminAnnouncementsPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="records" element={<AdminRecordsPage />} />
        <Route path="alumni" element={<AdminAlumniPage />} />
        <Route path="audit-logs" element={<AdminAuditLogPage />} />
        <Route path="policies" element={<AdminPoliciesPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="profile" element={<ProfileSettingsPage />} />
      </Routes>
    </DashboardLayout>
  );
}
