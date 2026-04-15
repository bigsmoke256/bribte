import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { AnimatedCard, EmptyState } from "@/components/dashboard/DashboardParts";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";

interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: string;
  created_at: string;
  target_group: string;
}

export default function StudentAnnouncementsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Announcement | null>(null);

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
    <>
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
                <AnimatedCard delay={0} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(a)}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={a.priority === "high" ? "destructive" : a.priority === "medium" ? "default" : "secondary"} className="text-[10px] h-5">
                      {a.priority}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] h-5">{a.target_group}</Badge>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {new Date(a.created_at).toLocaleDateString("en-UG", { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm">{a.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.message}</p>
                  <p className="text-xs text-primary mt-2 font-medium">Click to read full message →</p>
                </AnimatedCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">{selected?.title}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2">
                <Badge variant={selected.priority === "high" ? "destructive" : selected.priority === "medium" ? "default" : "secondary"}>
                  {selected.priority}
                </Badge>
                <Badge variant="outline">{selected.target_group}</Badge>
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(selected.created_at).toLocaleDateString("en-UG", {
                    weekday: "long", year: "numeric", month: "long", day: "numeric",
                  })}
                </span>
              </div>
              <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {selected.message}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
