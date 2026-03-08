import { Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import StudentDashboardHome from "./StudentDashboardHome";
import StudentCoursesPage from "./StudentCoursesPage";
import StudentAssignmentsPage from "./StudentAssignmentsPage";
import StudentFeesPage from "./StudentFeesPage";
import StudentResultsPage from "./StudentResultsPage";
import StudentTimetablePage from "./StudentTimetablePage";
import StudentSchedulePage from "./StudentSchedulePage";
import StudentAnnouncementsPage from "./StudentAnnouncementsPage";
import StudentExamCardPage from "./StudentExamCardPage";
import StudentClearancePage from "./StudentClearancePage";
import ProfileSettingsPage from "../shared/ProfileSettingsPage";

export default function StudentDashboard() {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<StudentDashboardHome />} />
        <Route path="courses" element={<StudentCoursesPage />} />
        <Route path="assignments" element={<StudentAssignmentsPage />} />
        <Route path="fees" element={<StudentFeesPage />} />
        <Route path="results" element={<StudentResultsPage />} />
        <Route path="timetable" element={<StudentTimetablePage />} />
        <Route path="schedule" element={<StudentSchedulePage />} />
        <Route path="announcements" element={<StudentAnnouncementsPage />} />
        <Route path="exam-card" element={<StudentExamCardPage />} />
        <Route path="clearance" element={<StudentClearancePage />} />
        <Route path="profile" element={<ProfileSettingsPage />} />
      </Routes>
    </DashboardLayout>
  );
}
