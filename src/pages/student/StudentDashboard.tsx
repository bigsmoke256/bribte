import { Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import StudentDashboardHome from "./StudentDashboardHome";
import StudentCoursesPage from "./StudentCoursesPage";
import StudentAssignmentsPage from "./StudentAssignmentsPage";
import StudentFeesPage from "./StudentFeesPage";
import StudentResultsPage from "./StudentResultsPage";
import StudentTimetablePage from "./StudentTimetablePage";
import StudentAnnouncementsPage from "./StudentAnnouncementsPage";

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
        <Route path="announcements" element={<StudentAnnouncementsPage />} />
      </Routes>
    </DashboardLayout>
  );
}
