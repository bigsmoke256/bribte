import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, FileText, CreditCard, Calendar, Bell, Users,
  BarChart3, Settings, LogOut, Menu, GraduationCap, Upload, ClipboardList,
  CheckCircle, MessageSquare, ChevronDown, Search, PanelLeftClose, PanelLeft, UserCog
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import bribteCrest from "@/assets/bribte-crest.png";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
interface NavItem { label: string; icon: React.ElementType; path: string; }

const studentNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/student" },
  { label: "My Courses", icon: BookOpen, path: "/student/courses" },
  { label: "Assignments", icon: FileText, path: "/student/assignments" },
  { label: "Fees & Payments", icon: CreditCard, path: "/student/fees" },
  { label: "Results & GPA", icon: BarChart3, path: "/student/results" },
  { label: "Timetable", icon: Calendar, path: "/student/timetable" },
  { label: "Announcements", icon: Bell, path: "/student/announcements" },
];

const lecturerNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/lecturer" },
  { label: "My Courses", icon: BookOpen, path: "/lecturer/courses" },
  { label: "Assignments", icon: ClipboardList, path: "/lecturer/assignments" },
  { label: "Submissions", icon: Upload, path: "/lecturer/submissions" },
  { label: "Grade Entry", icon: CheckCircle, path: "/lecturer/grades" },
  { label: "Announcements", icon: MessageSquare, path: "/lecturer/announcements" },
];

const adminNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { label: "Students", icon: Users, path: "/admin/students" },
  { label: "Lecturers", icon: UserCog, path: "/admin/lecturers" },
  { label: "Courses", icon: BookOpen, path: "/admin/courses" },
  { label: "Fee Management", icon: CreditCard, path: "/admin/fees" },
  { label: "Enrollment", icon: GraduationCap, path: "/admin/enrollment" },
  { label: "Announcements", icon: Bell, path: "/admin/announcements" },
  { label: "Reports", icon: BarChart3, path: "/admin/reports" },
  { label: "Settings", icon: Settings, path: "/admin/settings" },
];

interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: string;
  created_at: string;
  target_group: string;
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    const stored = localStorage.getItem("read_notifications");
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  useEffect(() => {
    supabase.from("announcements").select("id, title, message, priority, created_at, target_group")
      .order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => { if (data) setNotifications(data); });
  }, []);

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  const markAllRead = () => {
    const allIds = new Set(notifications.map(n => n.id));
    setReadIds(allIds);
    localStorage.setItem("read_notifications", JSON.stringify([...allIds]));
  };

  const markRead = (id: string) => {
    const updated = new Set(readIds).add(id);
    setReadIds(updated);
    localStorage.setItem("read_notifications", JSON.stringify([...updated]));
  };

  if (!user) return null;

  const navItems = user.role === "student" ? studentNav : user.role === "lecturer" ? lecturerNav : adminNav;
  const roleLabel = user.role === "student" ? "Student Portal" : user.role === "lecturer" ? "Lecturer Portal" : "Admin Portal";
  const roleColor = user.role === "student" ? "bg-info" : user.role === "lecturer" ? "bg-success" : "bg-accent";
  const initials = user.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const NavContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <>
      <div className="p-4 mb-2">
        <div className="flex items-center gap-3">
          <img src={bribteCrest} alt="BRIBTE" className="w-9 h-9 object-contain flex-shrink-0 drop-shadow-md" />
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0">
              <h1 className="font-display font-bold text-sm text-sidebar-foreground leading-tight tracking-tight">BRIBTE</h1>
              <p className="text-[10px] text-sidebar-foreground/50 font-medium tracking-wider uppercase">{roleLabel}</p>
            </motion.div>
          )}
        </div>
      </div>
      <div className="px-3 mb-3"><div className="h-px bg-sidebar-border/50" /></div>
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item, i) => {
          const active = location.pathname === item.path;
          return (
            <motion.button key={item.path} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              onClick={() => { navigate(item.path); setMobileOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-200 ${
                active ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-sm" : "text-sidebar-foreground/60 hover:bg-sidebar-muted hover:text-sidebar-foreground"
              }`} title={collapsed ? item.label : undefined}>
              <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${active ? "text-sidebar-primary" : ""}`} />
              {!collapsed && <span>{item.label}</span>}
              {active && !collapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary" />}
            </motion.button>
          );
        })}
      </nav>
      <div className="p-3 mt-2">
        <div className="h-px bg-sidebar-border/50 mb-3" />
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-sidebar-foreground/50 hover:bg-sidebar-muted hover:text-sidebar-foreground transition-all duration-200"
          title={collapsed ? "Sign Out" : undefined}>
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background">
      <motion.aside initial={false} animate={{ width: sidebarOpen ? 250 : 72 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="hidden lg:flex flex-col sidebar-gradient relative z-30 overflow-hidden flex-shrink-0">
        <NavContent collapsed={!sidebarOpen} />
      </motion.aside>

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute left-0 top-0 bottom-0 w-[270px] sidebar-gradient flex flex-col shadow-2xl">
              <NavContent />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-card/80 backdrop-blur-lg border-b flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <button onClick={() => { if (window.innerWidth >= 1024) setSidebarOpen(!sidebarOpen); else setMobileOpen(true); }}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted transition-colors">
              <AnimatePresence mode="wait">
                {window.innerWidth < 1024 ? (
                  <Menu className="w-5 h-5 text-muted-foreground" />
                ) : sidebarOpen ? (
                  <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                    <PanelLeftClose className="w-5 h-5 text-muted-foreground" />
                  </motion.div>
                ) : (
                  <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                    <PanelLeft className="w-5 h-5 text-muted-foreground" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
            <div className="hidden md:flex items-center gap-2 bg-muted/60 rounded-xl px-3.5 py-2 w-72 border border-transparent focus-within:border-primary/20 focus-within:bg-card transition-all duration-200">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Input placeholder="Search..." className="border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0 placeholder:text-muted-foreground/50" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted transition-colors">
              <Bell className="w-[18px] h-[18px] text-muted-foreground" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full ring-2 ring-card" />
            </button>
            <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 py-1.5 px-2 rounded-xl hover:bg-muted transition-colors">
                  <Avatar className="w-8 h-8 ring-2 ring-primary/20">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-semibold leading-tight">{user.fullName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${roleColor}`} />
                      <p className="text-[11px] text-muted-foreground leading-tight capitalize">{user.role}</p>
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5">
                <DropdownMenuItem className="rounded-lg text-sm py-2">Profile Settings</DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg text-sm py-2">Help & Support</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="rounded-lg text-sm py-2 text-destructive focus:text-destructive">Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
