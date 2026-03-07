import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, FileText, CreditCard, Calendar, Bell, Users,
  BarChart3, Settings, LogOut, Menu, X, GraduationCap, Upload, ClipboardList,
  CheckCircle, MessageSquare, ChevronDown, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
}

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
  { label: "Materials", icon: FileText, path: "/lecturer/materials" },
  { label: "Announcements", icon: MessageSquare, path: "/lecturer/announcements" },
];

const adminNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { label: "Students", icon: Users, path: "/admin/students" },
  { label: "Fee Management", icon: CreditCard, path: "/admin/fees" },
  { label: "Enrollment", icon: GraduationCap, path: "/admin/enrollment" },
  { label: "Announcements", icon: Bell, path: "/admin/announcements" },
  { label: "Reports", icon: BarChart3, path: "/admin/reports" },
  { label: "Settings", icon: Settings, path: "/admin/settings" },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const navItems = user.role === "student" ? studentNav : user.role === "lecturer" ? lecturerNav : adminNav;
  const roleLabel = user.role === "student" ? "Student Portal" : user.role === "lecturer" ? "Lecturer Portal" : "Admin Portal";
  const initials = user.name.split(" ").map(n => n[0]).join("").slice(0, 2);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg accent-gradient flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-accent-foreground" />
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <h1 className="font-display font-bold text-sm text-sidebar-foreground leading-tight">BRIBTE</h1>
              <p className="text-[10px] text-sidebar-foreground/60 leading-tight">{roleLabel}</p>
            </div>
          )}
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setMobileOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-all"
        >
          <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
          {sidebarOpen && <span>Sign Out</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col sidebar-gradient transition-all duration-300 ${sidebarOpen ? "w-60" : "w-16"}`}>
        <NavContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 sidebar-gradient flex flex-col">
            <NavContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="h-16 bg-card border-b flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button onClick={() => { if (window.innerWidth >= 1024) setSidebarOpen(!sidebarOpen); else setMobileOpen(true); }} className="p-2 rounded-lg hover:bg-muted transition-colors">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="hidden sm:flex items-center gap-2 bg-muted rounded-lg px-3 py-2 w-64">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search..." className="border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0 placeholder:text-muted-foreground" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium leading-tight">{user.name}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight capitalize">{user.role}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
