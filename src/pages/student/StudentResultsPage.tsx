import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useMemo } from "react";
import { AnimatedCard, SectionHeader, EmptyState } from "@/components/dashboard/DashboardParts";
import { BarChart3, Award, TrendingUp, Download, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { toast } from "sonner";
import crestImg from "@/assets/bribte-crest.png";

function imgToBase64(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d")!.drawImage(img, 0, 0);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => resolve("");
    img.src = src;
  });
}

function getLetterGrade(pct: number) {
  if (pct >= 80) return { grade: "A", label: "Distinction", color: "#16a34a" };
  if (pct >= 70) return { grade: "B+", label: "Credit", color: "#2563eb" };
  if (pct >= 60) return { grade: "B", label: "Good", color: "#2563eb" };
  if (pct >= 50) return { grade: "C", label: "Pass", color: "#ca8a04" };
  if (pct >= 40) return { grade: "D", label: "Marginal", color: "#ea580c" };
  return { grade: "F", label: "Fail", color: "#dc2626" };
}

export default function StudentResultsPage() {
  const { user } = useAuth();
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) loadData(); }, [user]);

  async function loadData() {
    const { data: student } = await supabase
      .from("students")
      .select("id, registration_number, year_of_study, semester, study_mode, course:courses(course_name, course_code)")
      .eq("user_id", user!.id)
      .maybeSingle();
    if (!student) { setLoading(false); return; }
    setStudentInfo(student);

    const { data } = await supabase
      .from("submissions")
      .select("id, grade, status, feedback, submitted_at, assignment:assignments(title, max_grade, course:courses(course_name, course_code))")
      .eq("student_id", student.id)
      .eq("status", "graded");

    setSubmissions((data as any[]) || []);
    setLoading(false);
  }

  const stats = useMemo(() => {
    if (submissions.length === 0) return { avg: 0, highest: 0, lowest: 0, count: 0 };
    const percentages = submissions.map(s => (s.grade / s.assignment.max_grade) * 100);
    return {
      avg: percentages.reduce((a, b) => a + b, 0) / percentages.length,
      highest: Math.max(...percentages),
      lowest: Math.min(...percentages),
      count: submissions.length,
    };
  }, [submissions]);

  async function handleDownloadReport() {
    if (submissions.length === 0) { toast.error("No results to download"); return; }
    toast.loading("Generating report card...");

    const base64Crest = await imgToBase64(crestImg);
    const now = new Date();

    const rows = submissions.map(s => {
      const pct = (s.grade / s.assignment.max_grade) * 100;
      const lg = getLetterGrade(pct);
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;">${s.assignment.course?.course_code || ""}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;">${s.assignment.title}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px;">${s.grade}/${s.assignment.max_grade}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px;">${pct.toFixed(1)}%</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">
            <span style="background:${lg.color}15;color:${lg.color};padding:3px 10px;border-radius:12px;font-weight:700;font-size:12px;">${lg.grade}</span>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:12px;color:#6b7280;">${lg.label}</td>
        </tr>`;
    }).join("");

    const overallGrade = getLetterGrade(stats.avg);

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Results Report Card</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f9fafb;">
<div style="max-width:780px;margin:20px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:32px 40px;color:#fff;position:relative;">
    <div style="position:absolute;top:0;right:0;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,0.04);transform:translate(40%,-40%);"></div>
    <div style="display:flex;align-items:center;gap:20px;position:relative;z-index:1;">
      ${base64Crest ? `<img src="${base64Crest}" style="width:70px;height:70px;object-fit:contain;border-radius:12px;background:rgba(255,255,255,0.15);padding:6px;" />` : ""}
      <div>
        <h1 style="margin:0;font-size:22px;font-weight:800;letter-spacing:-0.3px;">BRIBTE INSTITUTE OF TECHNOLOGY</h1>
        <p style="margin:4px 0 0;font-size:12px;opacity:0.8;letter-spacing:1px;">ACADEMIC RESULTS REPORT CARD</p>
      </div>
    </div>
  </div>

  <!-- Student Info -->
  <div style="padding:24px 40px;background:#f8fafc;border-bottom:2px solid #e5e7eb;">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:16px;">
      <div>
        <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Student Name</p>
        <p style="margin:4px 0 0;font-size:15px;font-weight:700;">${user?.fullName || "—"}</p>
      </div>
      <div>
        <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Registration No.</p>
        <p style="margin:4px 0 0;font-size:15px;font-weight:700;">${studentInfo?.registration_number || "—"}</p>
      </div>
      <div>
        <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Programme</p>
        <p style="margin:4px 0 0;font-size:15px;font-weight:700;">${studentInfo?.course?.course_name || "—"}</p>
      </div>
      <div>
        <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Study Mode</p>
        <p style="margin:4px 0 0;font-size:15px;font-weight:700;">${studentInfo?.study_mode || "—"}</p>
      </div>
    </div>
    <div style="display:flex;gap:16px;margin-top:12px;">
      <div>
        <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Year</p>
        <p style="margin:4px 0 0;font-size:14px;font-weight:600;">${studentInfo?.year_of_study || "—"}</p>
      </div>
      <div>
        <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Semester</p>
        <p style="margin:4px 0 0;font-size:14px;font-weight:600;">${studentInfo?.semester || "—"}</p>
      </div>
      <div>
        <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Date Issued</p>
        <p style="margin:4px 0 0;font-size:14px;font-weight:600;">${now.toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" })}</p>
      </div>
    </div>
  </div>

  <!-- Results Table -->
  <div style="padding:24px 40px;">
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Code</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Assessment</th>
          <th style="padding:10px 12px;text-align:center;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Marks</th>
          <th style="padding:10px 12px;text-align:center;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Percentage</th>
          <th style="padding:10px 12px;text-align:center;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Grade</th>
          <th style="padding:10px 12px;text-align:center;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Remark</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <!-- Summary -->
  <div style="padding:0 40px 24px;">
    <div style="display:flex;gap:16px;flex-wrap:wrap;">
      <div style="flex:1;min-width:140px;background:linear-gradient(135deg,#2563eb10,#2563eb05);border:1px solid #2563eb20;border-radius:12px;padding:16px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#6b7280;">Average Score</p>
        <p style="margin:6px 0 0;font-size:24px;font-weight:800;color:#2563eb;">${stats.avg.toFixed(1)}%</p>
      </div>
      <div style="flex:1;min-width:140px;background:linear-gradient(135deg,#16a34a10,#16a34a05);border:1px solid #16a34a20;border-radius:12px;padding:16px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#6b7280;">Highest Score</p>
        <p style="margin:6px 0 0;font-size:24px;font-weight:800;color:#16a34a;">${stats.highest.toFixed(1)}%</p>
      </div>
      <div style="flex:1;min-width:140px;background:${overallGrade.color}10;border:1px solid ${overallGrade.color}20;border-radius:12px;padding:16px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#6b7280;">Overall Grade</p>
        <p style="margin:6px 0 0;font-size:24px;font-weight:800;color:${overallGrade.color};">${overallGrade.grade}</p>
        <p style="margin:2px 0 0;font-size:11px;color:#6b7280;">${overallGrade.label}</p>
      </div>
      <div style="flex:1;min-width:140px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:16px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#6b7280;">Assessments</p>
        <p style="margin:6px 0 0;font-size:24px;font-weight:800;">${stats.count}</p>
      </div>
    </div>
  </div>

  <!-- Grading Key -->
  <div style="padding:0 40px 24px;">
    <p style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px;">Grading Scale</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      ${[
        { range: "80-100%", g: "A", l: "Distinction", c: "#16a34a" },
        { range: "70-79%", g: "B+", l: "Credit", c: "#2563eb" },
        { range: "60-69%", g: "B", l: "Good", c: "#2563eb" },
        { range: "50-59%", g: "C", l: "Pass", c: "#ca8a04" },
        { range: "40-49%", g: "D", l: "Marginal", c: "#ea580c" },
        { range: "0-39%", g: "F", l: "Fail", c: "#dc2626" },
      ].map(k => `<span style="font-size:10px;padding:4px 10px;background:${k.c}10;color:${k.c};border-radius:8px;font-weight:600;">${k.g}: ${k.range} (${k.l})</span>`).join("")}
    </div>
  </div>

  <!-- Footer -->
  <div style="padding:20px 40px;background:#f8fafc;border-top:2px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
    <div>
      <p style="margin:0;font-size:10px;color:#9ca3af;">This is a computer-generated document. For official transcripts, contact the Registrar's Office.</p>
      <p style="margin:4px 0 0;font-size:10px;color:#9ca3af;">Generated on ${now.toLocaleString("en-UG")}</p>
    </div>
    <div style="text-align:right;">
      <p style="margin:0;font-size:11px;font-weight:600;color:#374151;">BRIBTE Institute of Technology</p>
      <p style="margin:2px 0 0;font-size:10px;color:#9ca3af;">Academic Records Office</p>
    </div>
  </div>

</div>
</body></html>`;

    toast.dismiss();
    const w = window.open("", "_blank", "width=850,height=900");
    if (!w) { toast.error("Please allow popups"); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
    toast.success("Report card ready — use Save as PDF in the print dialog");
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Results & GPA</h1>
          <p className="text-sm text-muted-foreground mt-1">View your graded work and performance</p>
        </div>
        {submissions.length > 0 && (
          <Button onClick={handleDownloadReport} className="rounded-xl gap-2">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download Report Card</span>
            <span className="sm:hidden">PDF</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedCard delay={0}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Average Score</p><p className="font-display text-xl font-bold">{stats.avg.toFixed(1)}%</p></div>
          </div>
        </AnimatedCard>
        <AnimatedCard delay={0.05}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center"><Award className="w-5 h-5 text-success" /></div>
            <div><p className="text-xs text-muted-foreground">Highest Score</p><p className="font-display text-xl font-bold">{stats.highest.toFixed(1)}%</p></div>
          </div>
        </AnimatedCard>
        <AnimatedCard delay={0.1}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-info" /></div>
            <div><p className="text-xs text-muted-foreground">Graded Work</p><p className="font-display text-xl font-bold">{stats.count}</p></div>
          </div>
        </AnimatedCard>
        <AnimatedCard delay={0.15}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${getLetterGrade(stats.avg).color}15` }}>
              <span className="text-lg font-bold" style={{ color: getLetterGrade(stats.avg).color }}>{getLetterGrade(stats.avg).grade}</span>
            </div>
            <div><p className="text-xs text-muted-foreground">Overall Grade</p><p className="font-display text-sm font-bold">{getLetterGrade(stats.avg).label}</p></div>
          </div>
        </AnimatedCard>
      </div>

      <AnimatedCard delay={0.2}>
        <SectionHeader title="Graded Work" icon={BarChart3} />
        {submissions.length === 0 ? (
          <EmptyState icon={BarChart3} title="No Results" description="No graded assignments yet." />
        ) : (
          <div className="space-y-3 mt-4">
            {submissions.map((s, i) => {
              const pct = (s.grade / s.assignment.max_grade) * 100;
              const lg = getLetterGrade(pct);
              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">{s.assignment.title}</p>
                      <p className="text-xs text-muted-foreground">{s.assignment.course?.course_code} — {s.assignment.course?.course_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{ background: `${lg.color}15`, color: lg.color }}>{lg.grade}</span>
                      <Badge variant={pct >= 70 ? "default" : pct >= 50 ? "secondary" : "destructive"} className="text-xs">
                        {s.grade}/{s.assignment.max_grade}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-muted-foreground">{pct.toFixed(1)}% — {lg.label}</span>
                    {s.feedback && <span className="text-[10px] text-muted-foreground italic max-w-[60%] truncate">"{s.feedback}"</span>}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatedCard>
    </div>
  );
}