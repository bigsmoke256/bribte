import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { UserRole } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, User, BookOpen, Shield, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

const roles: { value: UserRole; label: string; icon: React.ElementType; desc: string }[] = [
  { value: "student", label: "Student", icon: User, desc: "Access courses, fees, results" },
  { value: "lecturer", label: "Lecturer", icon: BookOpen, desc: "Manage courses & grading" },
  { value: "admin", label: "Administrator", icon: Shield, desc: "System administration" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    const success = login(email, password, role);
    if (success) {
      navigate(`/${role}`);
    } else {
      setError("Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-[45%] sidebar-gradient relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="absolute rounded-full border border-primary-foreground/20" style={{
              width: `${200 + i * 120}px`, height: `${200 + i * 120}px`,
              left: "50%", top: "50%", transform: "translate(-50%, -50%)",
            }} />
          ))}
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 text-primary-foreground">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-14 h-14 rounded-xl accent-gradient flex items-center justify-center">
                <GraduationCap className="w-8 h-8 text-accent-foreground" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold">BRIBTE</h1>
                <p className="text-xs opacity-70">Digital Campus</p>
              </div>
            </div>
            <h2 className="font-display text-3xl font-bold leading-tight mb-4">
              Buganda Royal Institute of Business & Technical Education
            </h2>
            <p className="text-sm opacity-80 leading-relaxed max-w-md">
              Your gateway to academic excellence. Access courses, track fees, submit assignments, and stay connected — all in one place.
            </p>
            <div className="mt-10 grid grid-cols-3 gap-4">
              {[
                { num: "10,000+", label: "Students" },
                { num: "186", label: "Lecturers" },
                { num: "342", label: "Courses" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="font-display text-xl font-bold">{s.num}</p>
                  <p className="text-xs opacity-60">{s.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md">
          
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 rounded-xl accent-gradient flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">BRIBTE</h1>
              <p className="text-xs text-muted-foreground">Digital Campus</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1">Sign in to your portal</p>
          </div>

          {/* Role selector */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {roles.map((r) => (
              <button key={r.value} onClick={() => setRole(r.value)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                  role === r.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}>
                <r.icon className={`w-5 h-5 ${role === r.value ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-xs font-medium ${role === r.value ? "text-primary" : "text-muted-foreground"}`}>{r.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm px-4 py-2.5 rounded-lg">{error}</div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
              <Input id="email" type="email" placeholder="your.name@bribte.ac.ug" value={email} onChange={e => setEmail(e.target.value)} className="h-11" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} className="h-11 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-border" />
                <span className="text-muted-foreground">Remember me</span>
              </label>
              <a href="#" className="text-primary font-medium hover:underline">Forgot password?</a>
            </div>

            <Button type="submit" className="w-full h-11 font-semibold">
              Sign In as {roles.find(r => r.value === role)?.label}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            © 2026 BRIBTE — Kampala, Uganda
          </p>
        </motion.div>
      </div>
    </div>
  );
}
