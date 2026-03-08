import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useRef } from "react";
import { AnimatedCard } from "@/components/dashboard/DashboardParts";
import { ShieldAlert, Download, Printer, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import bribteCrest from "@/assets/bribte-crest.png";

export default function StudentExamCardPage() {
  const { user } = useAuth();
  const [student, setStudent] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: studentData } = await supabase
        .from("students")
        .select("*, course:courses(*)")
        .eq("user_id", user.id)
        .maybeSingle();
      if (studentData) {
        setStudent(studentData);
        setCourse(studentData.course);
      }
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profileData) setProfile(profileData);
      setLoading(false);
    })();
  }, [user]);

  const isCleared = student && student.fee_balance <= 0;
  const balance = student?.fee_balance ?? 0;
  const initials = (profile?.full_name || user?.fullName || "")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `exam-card-${student?.registration_number || "student"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Examination card downloaded!");
    } catch {
      toast.error("Failed to download card");
    }
  };

  const handlePrint = () => {
    if (!cardRef.current) return;
    const printWin = window.open("", "_blank");
    if (!printWin) return;
    html2canvas(cardRef.current, { scale: 2, backgroundColor: null, useCORS: true }).then(
      (canvas) => {
        printWin.document.write(`
          <html><head><title>Examination Card</title>
          <style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#fff;}img{max-width:100%;}</style>
          </head><body><img src="${canvas.toDataURL("image/png")}" /></body></html>
        `);
        printWin.document.close();
        printWin.onload = () => { printWin.print(); };
      }
    );
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );

  return (
    <div className="space-y-6 max-w-[900px] mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold">Examination Card</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your official examination permit for the current semester
        </p>
      </div>

      {!isCleared ? (
        <FeeBlockedNotice balance={balance} />
      ) : (
        <>
          {/* Action buttons */}
          <div className="flex gap-3">
            <Button onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" /> Download Card
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
          </div>

          {/* The actual exam card */}
          <div className="flex justify-center">
            <ExamCard
              ref={cardRef}
              student={student}
              course={course}
              profile={profile}
              user={user}
              initials={initials}
            />
          </div>
        </>
      )}
    </div>
  );
}

/* ───── Fee Blocked Notice ───── */
function FeeBlockedNotice({ balance }: { balance: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-8 text-center space-y-5"
    >
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
        <ShieldAlert className="w-8 h-8 text-destructive" />
      </div>
      <div>
        <h2 className="font-display text-xl font-bold text-destructive">
          Examination Card Unavailable
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          You cannot access your examination card because you have an outstanding fee balance of{" "}
          <span className="font-bold text-destructive">UGX {balance.toLocaleString()}</span>.
        </p>
      </div>
      <Separator />
      <div className="text-sm text-muted-foreground space-y-2 max-w-lg mx-auto">
        <p className="font-semibold text-foreground">To resolve this:</p>
        <ol className="list-decimal list-inside text-left space-y-1.5">
          <li>Clear your outstanding fee balance through the <span className="font-medium text-primary">Fees & Payments</span> page</li>
          <li>Wait for your payment receipt to be verified and approved</li>
          <li>Return to this page to view and download your examination card</li>
        </ol>
        <p className="pt-3 text-xs italic text-muted-foreground/70">
          In case of any issues, please visit the <span className="font-semibold">Principal's Office</span> with your payment evidence for assistance.
        </p>
      </div>
    </motion.div>
  );
}

/* ───── Exam Card Component ───── */
import { forwardRef } from "react";

const ExamCard = forwardRef<
  HTMLDivElement,
  { student: any; course: any; profile: any; user: any; initials: string }
>(({ student, course, profile, user, initials }, ref) => {
  const currentYear = new Date().getFullYear();
  const academicYear = `${currentYear}/${currentYear + 1}`;
  const semesterLabel = student?.semester === 1 ? "Semester I" : "Semester II";

  return (
    <div
      ref={ref}
      className="w-[600px] bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-primary/20"
      style={{ fontFamily: "'Georgia', serif" }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-5 text-center text-white">
        <div className="flex items-center justify-center gap-3 mb-2">
          <img src={bribteCrest} alt="BRIBTE" className="w-12 h-12 object-contain drop-shadow-lg" />
          <div>
            <h2 className="text-lg font-bold tracking-wide uppercase">
              Bright Institute of Business,
            </h2>
            <p className="text-xs tracking-widest uppercase opacity-90">
              Technology & Education (BRIBTE)
            </p>
          </div>
        </div>
        <div className="mt-2 inline-block bg-white/20 backdrop-blur-sm rounded-full px-5 py-1.5">
          <p className="text-sm font-bold tracking-wider uppercase">Examination Permit</p>
        </div>
        <p className="text-xs mt-1.5 opacity-80">
          Academic Year: {academicYear} — {semesterLabel}
        </p>
      </div>

      {/* Body */}
      <div className="p-6">
        <div className="flex gap-6">
          {/* Photo */}
          <div className="flex-shrink-0">
            <div className="w-28 h-32 rounded-lg border-2 border-primary/20 overflow-hidden bg-muted flex items-center justify-center">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Student"
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary/60">{initials}</span>
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-3">
            <InfoRow label="Student Name" value={profile?.full_name || user?.fullName || "—"} bold />
            <InfoRow
              label="Registration No."
              value={student?.registration_number || "Not Assigned"}
            />
            <InfoRow label="Programme" value={course?.course_name || "—"} />
            <InfoRow label="Programme Level" value={course?.program_level || "—"} />
            <div className="grid grid-cols-3 gap-2">
              <InfoRow label="Year of Study" value={`Year ${student?.year_of_study || 1}`} small />
              <InfoRow label="Semester" value={semesterLabel} small />
              <InfoRow label="Study Mode" value={student?.study_mode || "Day"} small />
            </div>
          </div>
        </div>

        {/* Signature line */}
        <div className="mt-8 flex items-end justify-between">
          <div className="text-center">
            <div className="w-48 border-b-2 border-foreground/30 mb-1" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Student's Signature
            </p>
          </div>
          <div className="text-center">
            <div className="w-48 border-b-2 border-foreground/30 mb-1" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Principal's Signature & Stamp
            </p>
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-5 pt-3 border-t border-muted text-center">
          <p className="text-[9px] text-muted-foreground">
            This card is valid only for the {semesterLabel} examinations of the {academicYear} academic year.
            It must be presented at every examination session. Unauthorized use is strictly prohibited.
          </p>
        </div>
      </div>
    </div>
  );
});
ExamCard.displayName = "ExamCard";

function InfoRow({
  label,
  value,
  bold,
  small,
}: {
  label: string;
  value: string;
  bold?: boolean;
  small?: boolean;
}) {
  return (
    <div>
      <p className={`${small ? "text-[9px]" : "text-[10px]"} text-muted-foreground uppercase tracking-wide`}>
        {label}
      </p>
      <p
        className={`${small ? "text-xs" : "text-sm"} ${bold ? "font-bold text-foreground" : "font-medium text-foreground/90"}`}
      >
        {value}
      </p>
    </div>
  );
}
