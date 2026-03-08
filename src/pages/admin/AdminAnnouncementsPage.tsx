import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AnimatedCard, EmptyState } from "@/components/dashboard/DashboardParts";
import {
  Bell, Search, PlusCircle, Edit2, Trash2, Megaphone, Users,
  GraduationCap, BookOpen, AlertTriangle, Info, CheckCircle2,
  Eye, Calendar, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";

/* ─── Types ─── */
interface AnnouncementRow {
  id: string;
  title: string;
  message: string;
  priority: string;
  target_group: string;
  target_course_id: string | null;
  created_at: string;
  updated_at: string;
  author_id: string;
  author_name?: string;
  course_name?: string;
}

const emptyForm = { title: "", message: "", priority: "medium", target_group: "all", target_course_id: "" };

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  high: { label: "Urgent", color: "text-destructive", bg: "bg-destructive/10", icon: AlertTriangle },
  medium: { label: "Important", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", icon: Info },
  low: { label: "Info", color: "text-primary", bg: "bg-primary/10", icon: CheckCircle2 },
};

const TARGET_CONFIG: Record<string, { label: string; icon: any }> = {
  all: { label: "Everyone", icon: Megaphone },
  students: { label: "All Students", icon: GraduationCap },
  lecturers: { label: "Lecturers", icon: Users },
  course: { label: "Course Students", icon: BookOpen },
};

export default function AdminAnnouncementsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [courses, setCourses] = useState<{ id: string; course_code: string; course_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");

  // Form
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<AnnouncementRow | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Detail
  const [detailAnn, setDetailAnn] = useState<AnnouncementRow | null>(null);

  /* ─── Fetch ─── */
  const fetchAnnouncements = async () => {
    setLoading(true);
    const { data } = await supabase.from("announcements")
      .select("*, course:courses!announcements_target_course_id_fkey(course_name, course_code)")
      .order("created_at", { ascending: false });
    if (data) {
      // Get author names
      const authorIds = [...new Set(data.map((a: any) => a.author_id))];
      const { data: profiles } = await supabase.from("profiles")
        .select("user_id, full_name").in("user_id", authorIds.length ? authorIds : ["_"]);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));
      setAnnouncements(data.map((a: any) => {
        const course = Array.isArray(a.course) ? a.course[0] : a.course;
        return {
          ...a,
          author_name: profileMap.get(a.author_id) || "Admin",
          course_name: course ? `${course.course_code} – ${course.course_name}` : null,
        };
      }));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAnnouncements();
    supabase.from("courses").select("id, course_code, course_name").order("course_code").then(({ data }) => { if (data) setCourses(data); });
  }, []);

  /* ─── Stats ─── */
  const stats = useMemo(() => ({
    total: announcements.length,
    high: announcements.filter(a => a.priority === "high").length,
    thisWeek: announcements.filter(a => {
      const d = new Date(a.created_at);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return d >= weekAgo;
    }).length,
    targets: {
      all: announcements.filter(a => a.target_group === "all").length,
      students: announcements.filter(a => a.target_group === "students" || a.target_group === "course").length,
      lecturers: announcements.filter(a => a.target_group === "lecturers").length,
    },
  }), [announcements]);

  /* ─── CRUD ─── */
  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialog(true); };
  const openEdit = (a: AnnouncementRow) => {
    setEditing(a);
    setForm({
      title: a.title, message: a.message, priority: a.priority,
      target_group: a.target_course_id ? "course" : a.target_group,
      target_course_id: a.target_course_id || "",
    });
    setDialog(true);
  };

  const save = async () => {
    if (!form.title || !form.message) { toast.error("Title and message required"); return; }
    if (form.target_group === "course" && !form.target_course_id) { toast.error("Select a target course"); return; }
    const payload = {
      title: form.title,
      message: form.message,
      priority: form.priority,
      target_group: form.target_group === "course" ? "course" : form.target_group,
      target_course_id: form.target_group === "course" ? form.target_course_id : null,
      author_id: user?.id || "",
    };
    const { error } = editing
      ? await supabase.from("announcements").update(payload).eq("id", editing.id)
      : await supabase.from("announcements").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(editing ? "Updated" : "Announcement posted!"); setDialog(false); fetchAnnouncements(); }
  };

  const deleteAnn = async (a: AnnouncementRow) => {
    if (!confirm(`Delete "${a.title}"?`)) return;
    const { error } = await supabase.from("announcements").delete().eq("id", a.id);
    if (!error) { toast.success("Deleted"); fetchAnnouncements(); } else toast.error(error.message);
  };

  /* ─── Filters ─── */
  const filtered = announcements.filter(a => {
    const q = search.toLowerCase();
    const matchesSearch = !q || a.title.toLowerCase().includes(q) || a.message.toLowerCase().includes(q);
    const matchesPriority = priorityFilter === "all" || a.priority === priorityFilter;
    const matchesTarget = targetFilter === "all" || a.target_group === targetFilter ||
      (targetFilter === "course" && a.target_course_id);
    return matchesSearch && matchesPriority && matchesTarget;
  });

  const getRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-UG", { month: "short", day: "numeric" });
  };

  if (!user) return null;

  return (
      <div className="space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">Announcements</h1>
            <p className="text-sm text-muted-foreground mt-1">Campus communication hub</p>
          </div>
          <Button onClick={openCreate} className="rounded-xl"><PlusCircle className="w-4 h-4 mr-2" /> New Announcement</Button>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats.total, icon: Megaphone, color: "text-primary", bg: "bg-primary/10" },
            { label: "This Week", value: stats.thisWeek, icon: Calendar, color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10" },
            { label: "Urgent", value: stats.high, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
            { label: "Audience Reach", value: `${stats.targets.all + stats.targets.students + stats.targets.lecturers}`, icon: Users, color: "text-primary", bg: "bg-primary/10", sub: `${stats.targets.all} all · ${stats.targets.students} students · ${stats.targets.lecturers} lecturers` },
          ].map((card, i) => (
            <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <AnimatedCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                    <card.icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                    <p className="font-display text-xl font-bold">{card.value}</p>
                    {(card as any).sub && <p className="text-[10px] text-muted-foreground">{(card as any).sub}</p>}
                  </div>
                </div>
              </AnimatedCard>
            </motion.div>
          ))}
        </div>

        {/* Filters & List */}
        <AnimatedCard>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-3.5 py-2 w-full sm:w-72 border border-transparent focus-within:border-primary/20">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search announcements..." value={search} onChange={e => setSearch(e.target.value)}
                className="border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0" />
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-36 rounded-xl text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">🔴 Urgent</SelectItem>
                <SelectItem value="medium">🟡 Important</SelectItem>
                <SelectItem value="low">🔵 Info</SelectItem>
              </SelectContent>
            </Select>
            <Select value={targetFilter} onValueChange={setTargetFilter}>
              <SelectTrigger className="w-full sm:w-40 rounded-xl text-xs"><SelectValue placeholder="Target" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Targets</SelectItem>
                <SelectItem value="all">Everyone</SelectItem>
                <SelectItem value="students">Students</SelectItem>
                <SelectItem value="lecturers">Lecturers</SelectItem>
                <SelectItem value="course">Course-specific</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Bell} title="No announcements" description="Post an announcement using the button above." />
          ) : (
            <div className="space-y-3">
              {filtered.map((a, i) => {
                const pConfig = PRIORITY_CONFIG[a.priority] || PRIORITY_CONFIG.low;
                const tConfig = TARGET_CONFIG[a.target_course_id ? "course" : a.target_group] || TARGET_CONFIG.all;
                const PIcon = pConfig.icon;
                const TIcon = tConfig.icon;
                return (
                  <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className={`p-4 rounded-xl border transition-all hover:shadow-sm cursor-pointer ${a.priority === "high" ? "border-destructive/20 bg-destructive/5" : "bg-muted/20 hover:bg-muted/40"}`}
                    onClick={() => setDetailAnn(a)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3 flex-1 min-w-0">
                        <div className={`h-9 w-9 rounded-xl ${pConfig.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <PIcon className={`w-4 h-4 ${pConfig.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold ${pConfig.bg} ${pConfig.color}`}>{pConfig.label}</span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted text-muted-foreground">
                              <TIcon className="w-3 h-3" />{a.target_course_id ? a.course_name || "Course" : tConfig.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{getRelativeTime(a.created_at)}</span>
                          </div>
                          <p className="text-sm font-semibold">{a.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-1.5">By {a.author_name}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => openEdit(a)} title="Edit"><Edit2 className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg text-destructive hover:bg-destructive/10" onClick={() => deleteAnn(a)} title="Delete"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatedCard>
      </div>

      {/* ─── Create/Edit Dialog ─── */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader><DialogTitle className="font-display">{editing ? "Edit" : "New"} Announcement</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="e.g. Exam Schedule Released" />
            </div>
            <div>
              <Label className="text-xs font-semibold">Message *</Label>
              <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} className="mt-1.5 rounded-xl min-h-[120px]" placeholder="Write your announcement message here..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🔵 Info</SelectItem>
                    <SelectItem value="medium">🟡 Important</SelectItem>
                    <SelectItem value="high">🔴 Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Target Audience</Label>
                <Select value={form.target_group} onValueChange={v => setForm(f => ({ ...f, target_group: v, target_course_id: v === "course" ? f.target_course_id : "" }))}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">📢 Everyone</SelectItem>
                    <SelectItem value="students">🎓 All Students</SelectItem>
                    <SelectItem value="lecturers">👨‍🏫 Lecturers</SelectItem>
                    <SelectItem value="course">📚 Specific Course</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.target_group === "course" && (
              <div>
                <Label className="text-xs font-semibold">Target Course *</Label>
                <Select value={form.target_course_id} onValueChange={v => setForm(f => ({ ...f, target_course_id: v }))}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Select course" /></SelectTrigger>
                  <SelectContent>
                    {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.course_code} – {c.course_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={save} className="rounded-xl">{editing ? "Save Changes" : "Post Announcement"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Detail Dialog ─── */}
      <Dialog open={!!detailAnn} onOpenChange={o => { if (!o) setDetailAnn(null); }}>
        <DialogContent className="max-w-lg rounded-2xl">
          {detailAnn && (() => {
            const pConfig = PRIORITY_CONFIG[detailAnn.priority] || PRIORITY_CONFIG.low;
            const tConfig = TARGET_CONFIG[detailAnn.target_course_id ? "course" : detailAnn.target_group] || TARGET_CONFIG.all;
            const PIcon = pConfig.icon;
            const TIcon = tConfig.icon;
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl ${pConfig.bg} flex items-center justify-center`}>
                      <PIcon className={`w-5 h-5 ${pConfig.color}`} />
                    </div>
                    <div>
                      <DialogTitle className="font-display">{detailAnn.title}</DialogTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold ${pConfig.bg} ${pConfig.color}`}>{pConfig.label}</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-muted text-muted-foreground">
                          <TIcon className="w-3 h-3" />{detailAnn.target_course_id ? detailAnn.course_name : tConfig.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </DialogHeader>
                <div className="mt-4 space-y-4">
                  <div className="p-4 rounded-xl bg-muted/30 border">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{detailAnn.message}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Posted by {detailAnn.author_name}</span>
                    <span>{new Date(detailAnn.created_at).toLocaleDateString("en-UG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setDetailAnn(null); openEdit(detailAnn); }} className="rounded-xl">
                    <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
                  </Button>
                  <Button variant="destructive" onClick={() => { deleteAnn(detailAnn); setDetailAnn(null); }} className="rounded-xl">
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
  );
}
