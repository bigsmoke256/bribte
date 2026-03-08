import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { AnimatedCard, EmptyState } from "@/components/dashboard/DashboardParts";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export default function StudentAnnouncementsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) loadData(); }, [user]);

  async function loadData() {
    const { data } = await supabase
      .from("announcements")
      .select("id, title, message, priority, created_at, target_group")
      .in("target_group", ["all", "students"])
      .order("created_at", { ascending: false });
    setAnnouncements(data || []);
    setLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold">Announcements</h1>
        <p className="text-sm text-muted-foreground mt-1">Latest news and notices</p>
      </div>

      {announcements.length === 0 ? (
        <EmptyState icon={Bell} title="No Announcements" description="There are no announcements at this time." />
      ) : (
        <div className="space-y-3">
          {announcements.map((a, i) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <AnimatedCard delay={0}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={a.priority === "urgent" ? "destructive" : a.priority === "important" ? "default" : "secondary"} className="text-[10px] h-5">
                    {a.priority}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] h-5">{a.target_group}</Badge>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(a.created_at).toLocaleDateString("en-UG", { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                </div>
                <h3 className="font-semibold text-sm">{a.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{a.message}</p>
              </AnimatedCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
