import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { UserRole } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, User, BookOpen, Shield, Eye, EyeOff, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import campusHero from "@/assets/campus-hero.jpg";
import bribteCrest from "@/assets/bribte-crest.png";

const roles: { value: UserRole; label: string; icon: React.ElementType; desc: string }[] = [
  { value: "student", label: "Student", icon: User, desc: "Courses, fees & results" },
  { value: "lecturer", label: "Lecturer", icon: BookOpen, desc: "Teaching & grading" },
  { value: "admin", label: "Admin", icon: Shield, desc: "System management" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

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
    if (success) navigate(`/${role}`);
    else setError("Invalid credentials");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - campus hero with overlay */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden">
        <img src={campusHero} alt="BRIBTE Campus" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/90 via-primary/80 to-primary-dark/90" />
        
        {/* Animated decorative circles */}
        <div className="absolute inset-0 overflow-hidden">
          {[1, 2, 3, 4].map(i => (
            <motion.div key={i} className="absolute rounded-full border border-primary-foreground/10"
              style={{ width: `${150 + i * 100}px`, height: `${150 + i * 100}px`, left: "55%", top: "45%", transform: "translate(-50%, -50%)" }}
              animate={{ scale: [1, 1.05, 1], opacity: [0.1, 0.2, 0.1] }}
              transition={{ duration: 4, repeat: Infinity, delay: i * 0.5, ease: "easeInOut" }}
            />
          ))}
        </div>

        <motion.div className="relative z-10 flex flex-col justify-between h-full p-10"
          initial="hidden" animate="visible" variants={containerVariants}>
          
          <motion.div variants={itemVariants} className="flex items-center gap-3">
            <img src={bribteCrest} alt="BRIBTE Crest" className="w-14 h-14 object-contain drop-shadow-lg" />
            <div>
              <h1 className="font-display text-xl font-bold text-primary-foreground tracking-tight">BRIBTE</h1>
              <p className="text-[11px] text-primary-foreground/60 font-medium tracking-wide uppercase">Digital Campus</p>
            </div>
          </motion.div>

          <div className="max-w-lg">
            <motion.h2 variants={itemVariants} className="font-display text-4xl font-extrabold text-primary-foreground leading-[1.15] mb-5">
              Buganda Royal Institute of Business & Technical Education
            </motion.h2>
            <motion.p variants={itemVariants} className="text-sm text-primary-foreground/75 leading-relaxed mb-10 max-w-md">
              Empowering over 10,000 students with world-class digital academic services. Access courses, track fees, submit assignments, and stay connected — all in one unified platform.
            </motion.p>
            <motion.div variants={itemVariants} className="grid grid-cols-3 gap-6">
              {[
                { num: "10,247", label: "Students", sub: "Active enrollment" },
                { num: "186", label: "Lecturers", sub: "Academic staff" },
                { num: "342", label: "Courses", sub: "Offered this year" },
              ].map(s => (
                <div key={s.label} className="relative">
                  <p className="font-display text-3xl font-extrabold text-primary-foreground">{s.num}</p>
                  <p className="text-sm font-semibold text-primary-foreground/90 mt-0.5">{s.label}</p>
                  <p className="text-[11px] text-primary-foreground/50">{s.sub}</p>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.p variants={itemVariants} className="text-[11px] text-primary-foreground/40">
            © 2026 Buganda Royal Institute of Business & Technical Education — Kampala, Uganda
          </motion.p>
        </motion.div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-background relative">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle, hsl(217,71%,45%) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

        <motion.div initial="hidden" animate="visible" variants={containerVariants}
          className="w-full max-w-[420px] relative z-10">
          
          {/* Mobile logo */}
          <motion.div variants={itemVariants} className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <img src={bribteCrest} alt="BRIBTE" className="w-14 h-14 object-contain" />
            <div>
              <h1 className="font-display text-xl font-bold">BRIBTE</h1>
              <p className="text-xs text-muted-foreground">Digital Campus</p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="mb-8">
            <h2 className="font-display text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1.5">Sign in to access your portal</p>
          </motion.div>

          {/* Role selector */}
          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-2.5 mb-7">
            {roles.map(r => (
              <button key={r.value} onClick={() => setRole(r.value)}
                className={`group flex flex-col items-center gap-2 p-3.5 rounded-xl border-2 transition-all duration-200 ${
                  role === r.value
                    ? "border-primary bg-primary/5 shadow-glow"
                    : "border-border hover:border-primary/30 hover:bg-muted/50"
                }`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
                  role === r.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                }`}>
                  <r.icon className="w-4 h-4" />
                </div>
                <div className="text-center">
                  <span className={`text-xs font-semibold block ${role === r.value ? "text-primary" : "text-foreground"}`}>{r.label}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{r.desc}</span>
                </div>
              </button>
            ))}
          </motion.div>

          <motion.form variants={itemVariants} onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-xl border border-destructive/20 font-medium">{error}</motion.div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address</Label>
              <Input id="email" type="email" placeholder="your.name@bribte.ac.ug" value={email} onChange={e => setEmail(e.target.value)}
                className="h-12 rounded-xl bg-muted/40 border-border/80 focus:bg-card focus:border-primary transition-all duration-200 placeholder:text-muted-foreground/50" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)}
                  className="h-12 rounded-xl pr-11 bg-muted/40 border-border/80 focus:bg-card focus:border-primary transition-all duration-200 placeholder:text-muted-foreground/50" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="rounded border-border accent-primary w-3.5 h-3.5" />
                <span className="text-muted-foreground text-xs group-hover:text-foreground transition-colors">Remember me</span>
              </label>
              <a href="#" className="text-primary text-xs font-semibold hover:underline underline-offset-2">Forgot password?</a>
            </div>

            <Button type="submit" className="w-full h-12 rounded-xl font-semibold text-sm mt-2 group">
              Sign In as {roles.find(r => r.value === role)?.label}
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.form>

          <motion.div variants={itemVariants} className="mt-8 pt-6 border-t border-border/60">
            <p className="text-center text-[11px] text-muted-foreground">
              Need help? Contact <a href="#" className="text-primary font-medium hover:underline">IT Support</a> or visit the registrar's office.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
