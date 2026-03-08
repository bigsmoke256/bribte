import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, User, BookOpen, Shield, Eye, EyeOff, ArrowRight, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import campusHero from "@/assets/campus-hero.jpg";
import bribteCrest from "@/assets/bribte-crest.png";
import { toast } from "@/hooks/use-toast";

type Mode = "login" | "signup";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const { login, signup, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  if (isAuthenticated && user?.role) {
    navigate(`/${user.role}`, { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill in all fields"); return; }
    if (mode === "signup" && !fullName) { setError("Please enter your full name"); return; }

    setLoading(true);
    try {
      if (mode === "login") {
        const { error: loginError } = await login(email, password);
        if (loginError) { setError(loginError); setLoading(false); return; }
      } else {
        const { error: signupError } = await signup(email, password, fullName);
        if (signupError) { setError(signupError); setLoading(false); return; }
        toast({ title: "Account created!", description: "Please check your email to confirm your account, or sign in if auto-confirm is enabled." });
        setMode("login");
        setLoading(false);
        return;
      }
    } catch {
      setError("An unexpected error occurred");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - campus hero */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden">
        <img src={campusHero} alt="BRIBTE Campus" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/90 via-primary/80 to-primary-dark/90" />
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
              Empowering over 10,000 students with world-class digital academic services.
            </motion.p>
          </div>
          <motion.p variants={itemVariants} className="text-[11px] text-primary-foreground/40">
            © 2026 Buganda Royal Institute of Business & Technical Education — Kampala, Uganda
          </motion.p>
        </motion.div>
      </div>

      {/* Right panel - login/signup form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-background relative">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle, hsl(217,71%,45%) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="w-full max-w-[420px] relative z-10">
          {/* Mobile logo */}
          <motion.div variants={itemVariants} className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <img src={bribteCrest} alt="BRIBTE" className="w-14 h-14 object-contain" />
            <div>
              <h1 className="font-display text-xl font-bold">BRIBTE</h1>
              <p className="text-xs text-muted-foreground">Digital Campus</p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="mb-8">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              {mode === "login" ? "Welcome back" : "Create Student Account"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              {mode === "login" ? "Sign in to access your portal" : "Register as a new student"}
            </p>
          </motion.div>

          <motion.form variants={itemVariants} onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-xl border border-destructive/20 font-medium">{error}</motion.div>
            )}

            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                <Input id="fullName" placeholder="Enter your full name" value={fullName} onChange={e => setFullName(e.target.value)}
                  className="h-12 rounded-xl bg-muted/40 border-border/80 focus:bg-card focus:border-primary transition-all duration-200" />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address</Label>
              <Input id="email" type="email" placeholder="your.name@bribte.ac.ug" value={email} onChange={e => setEmail(e.target.value)}
                className="h-12 rounded-xl bg-muted/40 border-border/80 focus:bg-card focus:border-primary transition-all duration-200" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)}
                  className="h-12 rounded-xl pr-11 bg-muted/40 border-border/80 focus:bg-card focus:border-primary transition-all duration-200" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-12 rounded-xl font-semibold text-sm mt-2 group" disabled={loading}>
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
              {!loading && <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />}
            </Button>
          </motion.form>

          <motion.div variants={itemVariants} className="mt-6 text-center">
            {mode === "login" ? (
              <p className="text-sm text-muted-foreground">
                New student?{" "}
                <button onClick={() => { setMode("signup"); setError(""); }} className="text-primary font-semibold hover:underline">
                  Create an account
                </button>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <button onClick={() => { setMode("login"); setError(""); }} className="text-primary font-semibold hover:underline">
                  Sign in
                </button>
              </p>
            )}
          </motion.div>

          <motion.div variants={itemVariants} className="mt-8 pt-6 border-t border-border/60">
            <p className="text-center text-[11px] text-muted-foreground">
              Lecturers & Admins: Your accounts are created by the administration.
              <br />Need help? Contact <a href="#" className="text-primary font-medium hover:underline">IT Support</a>.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
