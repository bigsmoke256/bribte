import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Routes, Route } from "react-router-dom";
import LecturerDashboardHome from "./LecturerDashboardHome";
import LecturerCoursesPage from "./LecturerCoursesPage";
import LecturerAssignmentsPage from "./LecturerAssignmentsPage";
import LecturerSubmissionsPage from "./LecturerSubmissionsPage";
import LecturerGradesPage from "./LecturerGradesPage";
import LecturerTimetablePage from "./LecturerTimetablePage";
import LecturerAnnouncementsPage from "./LecturerAnnouncementsPage";
import ProfileSettingsPage from "../shared/ProfileSettingsPage";
import HelpSupportPage from "../shared/HelpSupportPage";

export default function LecturerDashboard() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<LecturerDashboardHome />} />
        <Route path="courses" element={<LecturerCoursesPage />} />
        <Route path="assignments" element={<LecturerAssignmentsPage />} />
        <Route path="submissions" element={<LecturerSubmissionsPage />} />
        <Route path="grades" element={<LecturerGradesPage />} />
        <Route path="timetable" element={<LecturerTimetablePage />} />
        <Route path="announcements" element={<LecturerAnnouncementsPage />} />
        <Route path="profile" element={<ProfileSettingsPage />} />
        <Route path="help" element={<HelpSupportPage />} />
      </Routes>
    </DashboardLayout>
  );
}
