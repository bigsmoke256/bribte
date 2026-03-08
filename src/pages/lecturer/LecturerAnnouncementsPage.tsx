import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedCard } from "@/components/dashboard/DashboardParts";
import { Bell, PlusCircle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function LecturerAnnouncementsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("medium");
  const [targetGroup, setTargetGroup] = useState("all");

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["lecturer-announcements-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Get author profiles
  const authorIds = [...new Set(announcements.map(a => a.author_id))];
  const { data: authorProfiles = [] } = useQuery({
    queryKey: ["announcement-authors", authorIds],
    queryFn: async () => {
      if (authorIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", authorIds);
      return data || [];
    },
    enabled: authorIds.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("announcements").insert({
        title,
        message,
        priority,
        target_group: targetGroup,
        author_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lecturer-announcements-all"] });
      toast.success("Announcement posted");
      setOpen(false);
      setTitle(""); setMessage(""); setPriority("medium"); setTargetGroup("all");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lecturer-announcements-all"] });
      toast.success("Announcement deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Announcements</h1>
          <p className="text-sm text-muted-foreground mt-1">Post and view announcements</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl"><PlusCircle className="w-4 h-4 mr-2" />Post Announcement</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title" />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Write your announcement..." rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Target</Label>
                  <Select value={targetGroup} onValueChange={setTargetGroup}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Everyone</SelectItem>
                      <SelectItem value="students">Students Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={!title || !message || createMutation.isPending} className="w-full rounded-xl">
                {createMutation.isPending ? "Posting..." : "Post Announcement"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : announcements.length === 0 ? (
        <AnimatedCard><p className="text-center text-muted-foreground py-8">No announcements yet.</p></AnimatedCard>
      ) : (
        <div className="space-y-3">
          {announcements.map((a, i) => {
            const author = authorProfiles.find(p => p.user_id === a.author_id);
            const isOwn = a.author_id === user?.id;
            return (
              <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <AnimatedCard delay={i * 0.03}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={a.priority === "high" ? "destructive" : a.priority === "medium" ? "secondary" : "outline"} className="text-[10px]">
                          {a.priority}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{a.target_group}</Badge>
                      </div>
                      <h3 className="font-semibold mt-1">{a.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{a.message}</p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                        <span>{author?.full_name || "Unknown"}</span>
                        <span>·</span>
                        <span>{new Date(a.created_at).toLocaleDateString("en-UG", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                    </div>
                    {isOwn && (
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive flex-shrink-0"
                        onClick={() => { if (confirm("Delete this announcement?")) deleteMutation.mutate(a.id); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </AnimatedCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
