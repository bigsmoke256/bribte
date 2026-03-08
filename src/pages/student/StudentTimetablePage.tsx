import { EmptyState } from "@/components/dashboard/DashboardParts";
import { Calendar } from "lucide-react";

export default function StudentTimetablePage() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold">Timetable</h1>
        <p className="text-sm text-muted-foreground mt-1">Your class schedule</p>
      </div>
      <EmptyState icon={Calendar} title="Coming Soon" description="Timetable feature is under development. Check back later!" />
    </div>
  );
}
