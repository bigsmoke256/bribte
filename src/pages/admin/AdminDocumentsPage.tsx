import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { FileText, Download, Search, Printer, GraduationCap } from "lucide-react";
import html2canvas from "html2canvas";
import bribteCrest from "@/assets/bribte-crest.png";

interface Student {
  id: string; user_id: string; registration_number: string | null; status: string;
  study_mode: string; year_of_study: number; semester: number; fee_balance: number;
  admission_date: string | null; course_id: string | null;
  profile?: { full_name: string; email: string; phone: string | null };
  course?: { course_name: string; course_code: string; program_level: string };
}

type DocType = "transcript" | "admission_letter" | "fee_statement" | "recommendation_letter";

const DOC_TYPES: { value: DocType; label: string; desc: string }[] = [
  { value: "transcript", label: "Academic Transcript", desc: "Official transcript with all exam results and GPA" },
  { value: "admission_letter", label: "Admission Letter", desc: "Official admission letter for the student" },
  { value: "fee_statement", label: "Fee Statement", desc: "Complete financial statement with all payments" },
  { value: "recommendation_letter", label: "Recommendation Letter", desc: "Academic recommendation letter template" },
];

export default function AdminDocumentsPage() {
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Student | null>(null);
  const [docType, setDocType] = useState<DocType>("transcript");
  const [generating, setGenerating] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);

  // Document data
  const [examResults, setExamResults] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  const searchStudents = async () => {
    if (!search.trim()) return;
    setLoading(true);
    const { data } = await supabase.from("students").select("id, user_id, registration_number, status, study_mode, year_of_study, semester, fee_balance, admission_date, course_id, courses!students_course_id_fkey(course_name, course_code, program_level)").limit(50);
    if (!data) { setLoading(false); return; }

    const userIds = data.map((s: any) => s.user_id);
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email, phone").in("user_id", userIds);
    const pMap: Record<string, any> = {};
    (profiles || []).forEach((p: any) => { pMap[p.user_id] = p; });

    const results = data.map((s: any) => ({
      ...s,
      profile: pMap[s.user_id],
      course: Array.isArray(s.courses) ? s.courses[0] : s.courses,
    })).filter((s: any) => {
      const q = search.toLowerCase();
      return s.profile?.full_name?.toLowerCase().includes(q) || s.registration_number?.toLowerCase().includes(q);
    });

    setStudents(results);
    setLoading(false);
  };

  const loadDocData = async (student: Student) => {
    setSelected(student);
    const [resultsRes, paymentsRes] = await Promise.all([
      supabase.from("exam_results").select("*, exams!exam_results_exam_id_fkey(title, exam_type, exam_date, semester, academic_year, max_marks, courses!exams_course_id_fkey(course_name, course_code))").eq("student_id", student.id).order("created_at"),
      supabase.from("payments").select("*").eq("student_id", student.id).eq("payment_status", "approved").order("payment_date"),
    ]);
    setExamResults((resultsRes.data || []).map((r: any) => ({ ...r, exam: Array.isArray(r.exams) ? r.exams[0] : r.exams })));
    setPayments(paymentsRes.data || []);
  };

  const downloadDoc = async () => {
    if (!docRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(docRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = `${docType}_${selected?.registration_number || "doc"}.png`;
      link.href = canvas.toDataURL();
      link.click();
      toast.success("Document downloaded");
    } catch { toast.error("Failed to generate"); }
    setGenerating(false);
  };

  const printDoc = () => { window.print(); };

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);

  // Calculate GPA
  const validResults = examResults.filter(r => r.grade_points !== null);
  const gpa = validResults.length > 0 ? (validResults.reduce((s, r) => s + Number(r.grade_points), 0) / validResults.length).toFixed(2) : "N/A";

  const today = format(new Date(), "dd MMMM yyyy");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Document Generation</h1>
        <p className="text-sm text-muted-foreground">Generate official documents — transcripts, admission letters, fee statements</p>
      </div>

      {/* Step 1: Find student */}
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-sm">Step 1: Find Student</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name or registration number..." value={search}
                onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && searchStudents()} className="pl-10 rounded-xl" />
            </div>
            <Button onClick={searchStudents} className="rounded-xl">Search</Button>
          </div>
          {loading && <p className="text-sm text-muted-foreground mt-3">Searching...</p>}
          {students.length > 0 && (
            <div className="mt-3 space-y-2">
              {students.slice(0, 10).map(s => (
                <button key={s.id} onClick={() => loadDocData(s)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${selected?.id === s.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{s.profile?.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{s.registration_number || "No Reg #"} • {s.course?.course_name}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{s.status}</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <>
          {/* Step 2: Choose document type */}
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-sm">Step 2: Choose Document</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {DOC_TYPES.map(d => (
                  <button key={d.value} onClick={() => setDocType(d.value)}
                    className={`p-4 rounded-xl border text-left transition-colors ${docType === d.value ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                    <FileText className="w-5 h-5 text-primary mb-2" />
                    <p className="font-semibold text-sm">{d.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{d.desc}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Preview & Download */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-sm">Step 3: Preview & Download</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={printDoc} className="rounded-xl gap-1"><Printer className="w-4 h-4" />Print</Button>
                <Button size="sm" onClick={downloadDoc} disabled={generating} className="rounded-xl gap-1"><Download className="w-4 h-4" />{generating ? "Generating..." : "Download"}</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-xl p-1 bg-white overflow-auto">
                <div ref={docRef} className="p-8 min-w-[700px]" style={{ fontFamily: "serif", color: "#1a1a1a" }}>
                  {/* Header */}
                  <div style={{ textAlign: "center", marginBottom: 24, borderBottom: "3px double #1a365d", paddingBottom: 16 }}>
                    <img src={bribteCrest} alt="BRIBTE" style={{ width: 64, height: 64, margin: "0 auto 8px" }} />
                    <h1 style={{ fontSize: 18, fontWeight: "bold", color: "#1a365d", margin: 0 }}>BUGANDA ROYAL INSTITUTE OF BUSINESS AND TECHNICAL EDUCATION</h1>
                    <p style={{ fontSize: 11, color: "#666", margin: "4px 0" }}>P.O. Box XXXX, Kampala, Uganda</p>
                    <h2 style={{ fontSize: 15, fontWeight: "bold", marginTop: 12, textTransform: "uppercase", letterSpacing: 2 }}>
                      {DOC_TYPES.find(d => d.value === docType)?.label}
                    </h2>
                  </div>

                  {/* Student Info */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20, fontSize: 12 }}>
                    <p><strong>Student Name:</strong> {selected.profile?.full_name}</p>
                    <p><strong>Registration No:</strong> {selected.registration_number || "N/A"}</p>
                    <p><strong>Programme:</strong> {selected.course?.course_name}</p>
                    <p><strong>Study Mode:</strong> {selected.study_mode}</p>
                    <p><strong>Year / Semester:</strong> Year {selected.year_of_study}, Semester {selected.semester}</p>
                    <p><strong>Date Issued:</strong> {today}</p>
                  </div>

                  {/* Document body */}
                  {docType === "transcript" && (
                    <div>
                      <p style={{ fontSize: 12, marginBottom: 8 }}><strong>Cumulative GPA:</strong> {gpa} / 5.00 (NCHE Uganda Scale)</p>
                      {examResults.length === 0 ? (
                        <p style={{ fontSize: 12, color: "#999" }}>No exam results on record.</p>
                      ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginTop: 8 }}>
                          <thead>
                            <tr style={{ borderBottom: "2px solid #1a365d", textAlign: "left" }}>
                              <th style={{ padding: "6px 4px" }}>Course</th>
                              <th style={{ padding: "6px 4px" }}>Exam</th>
                              <th style={{ padding: "6px 4px" }}>Semester</th>
                              <th style={{ padding: "6px 4px" }}>Marks</th>
                              <th style={{ padding: "6px 4px" }}>Grade</th>
                              <th style={{ padding: "6px 4px" }}>Points</th>
                            </tr>
                          </thead>
                          <tbody>
                            {examResults.map((r, i) => (
                              <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
                                <td style={{ padding: "5px 4px" }}>{r.exam?.courses?.course_name || "—"}</td>
                                <td style={{ padding: "5px 4px" }}>{r.exam?.title || "—"}</td>
                                <td style={{ padding: "5px 4px" }}>S{r.exam?.semester} {r.exam?.academic_year}</td>
                                <td style={{ padding: "5px 4px" }}>{r.marks_obtained}/{r.exam?.max_marks}</td>
                                <td style={{ padding: "5px 4px", fontWeight: "bold" }}>{r.grade}</td>
                                <td style={{ padding: "5px 4px" }}>{r.grade_points}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {docType === "admission_letter" && (
                    <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                      <p>Dear <strong>{selected.profile?.full_name}</strong>,</p>
                      <p style={{ marginTop: 12 }}>
                        We are pleased to inform you that you have been admitted to <strong>Buganda Royal Institute of Business and Technical Education</strong> to pursue a programme in <strong>{selected.course?.course_name} ({selected.course?.course_code})</strong> under the <strong>{selected.course?.program_level}</strong> level, studying on <strong>{selected.study_mode}</strong> mode.
                      </p>
                      {selected.admission_date && (
                        <p>Your admission is effective from <strong>{format(new Date(selected.admission_date), "dd MMMM yyyy")}</strong>.</p>
                      )}
                      <p style={{ marginTop: 12 }}>Please ensure all required documents are submitted and fees are paid before the commencement of classes. We look forward to welcoming you to BRIBTE.</p>
                      <div style={{ marginTop: 40 }}>
                        <p>Yours faithfully,</p>
                        <div style={{ marginTop: 30, borderBottom: "1px solid #333", width: 200 }}></div>
                        <p style={{ marginTop: 4 }}><strong>Academic Registrar</strong></p>
                        <p>BRIBTE</p>
                      </div>
                    </div>
                  )}

                  {docType === "fee_statement" && (
                    <div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16, fontSize: 12 }}>
                        <p><strong>Total Paid:</strong> UGX {totalPaid.toLocaleString()}</p>
                        <p><strong>Outstanding Balance:</strong> UGX {Number(selected.fee_balance).toLocaleString()}</p>
                      </div>
                      {payments.length === 0 ? (
                        <p style={{ fontSize: 12, color: "#999" }}>No approved payments on record.</p>
                      ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginTop: 8 }}>
                          <thead>
                            <tr style={{ borderBottom: "2px solid #1a365d", textAlign: "left" }}>
                              <th style={{ padding: "6px 4px" }}>Date</th>
                              <th style={{ padding: "6px 4px" }}>Amount (UGX)</th>
                              <th style={{ padding: "6px 4px" }}>Semester</th>
                              <th style={{ padding: "6px 4px" }}>Academic Year</th>
                              <th style={{ padding: "6px 4px" }}>Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payments.map(p => (
                              <tr key={p.id} style={{ borderBottom: "1px solid #eee" }}>
                                <td style={{ padding: "5px 4px" }}>{format(new Date(p.payment_date), "dd MMM yyyy")}</td>
                                <td style={{ padding: "5px 4px", fontWeight: "bold" }}>{Number(p.amount).toLocaleString()}</td>
                                <td style={{ padding: "5px 4px" }}>{p.semester || "—"}</td>
                                <td style={{ padding: "5px 4px" }}>{p.academic_year || "—"}</td>
                                <td style={{ padding: "5px 4px" }}>{p.notes || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {docType === "recommendation_letter" && (
                    <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                      <p><strong>TO WHOM IT MAY CONCERN</strong></p>
                      <p style={{ marginTop: 12 }}>
                        This is to certify that <strong>{selected.profile?.full_name}</strong>, Registration Number <strong>{selected.registration_number || "N/A"}</strong>, is a bona fide student of <strong>Buganda Royal Institute of Business and Technical Education</strong>, currently enrolled in the <strong>{selected.course?.course_name}</strong> programme.
                      </p>
                      <p style={{ marginTop: 12 }}>
                        During their time at the Institute, {selected.profile?.full_name} has demonstrated dedication, discipline, and academic excellence. We have no hesitation in recommending them for any opportunity they may seek.
                      </p>
                      <p style={{ marginTop: 12 }}>For any further information, please do not hesitate to contact the Institute.</p>
                      <div style={{ marginTop: 40 }}>
                        <p>Yours faithfully,</p>
                        <div style={{ marginTop: 30, borderBottom: "1px solid #333", width: 200 }}></div>
                        <p style={{ marginTop: 4 }}><strong>Principal</strong></p>
                        <p>BRIBTE</p>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{ marginTop: 40, borderTop: "1px solid #ddd", paddingTop: 8, fontSize: 10, color: "#999", textAlign: "center" }}>
                    <p>This document is computer-generated by the BRIBTE Digital Campus Management System.</p>
                    <p>Generated on {today}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
