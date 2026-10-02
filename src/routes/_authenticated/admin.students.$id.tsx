import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Award, Copy, FileDown, Loader2, Phone, RefreshCw, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { AdminOnly, selectCls } from "@/components/admin/shared";
import { confirmAction } from "@/components/ConfirmDialog";
import { ApplicantAvatar } from "@/components/admission/ApplicationParts";
import { ActivityFeed, type ActivityRow } from "@/components/admin/ActivityFeed";
import { copyText } from "@/lib/application";
import { cdnUrl } from "@/lib/cdn";
import { formatDate } from "@/lib/public-data";
import { LEARNING_STATUSES, attendanceStats, learningBadge, type AttRow } from "@/lib/student";
import { useIssueCertificate } from "@/lib/use-issue-certificate";
import { sendProgressEmail } from "@/lib/email.functions";
import { seo } from "@/components/site/PageHero";

export const Route = createFileRoute("/_authenticated/admin/students/$id")({ staticData: { sitemap: false },
  head: () => seo("Student Profile | Skill Bridgeway Foundation", "Private student profile.", { noindex: true }),
  component: () => <AdminOnly><StudentProfile /></AdminOnly>,
});

type Cert = { id: string; serial: string; pdf_key: string | null; issued_at: string; is_revoked: boolean };
type Enr = {
  id: string; created_at: string; completed_at: string | null; course_id: string; batch_id: string | null; progress: number; learning_status: string; absence_reminders: boolean;
  courses: { title: string } | null; certificates: Cert[] | null; attendance: AttRow[] | null;
};

function StudentProfile() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const logged = useRef(false);
  const { data: st, isLoading } = useQuery({
    queryKey: ["admin-student", id],
    queryFn: async () => (await supabase.from("students").select("id, student_code, full_name, email, phone, created_at, admission_id, admissions(document_keys, access_token)").eq("id", id).maybeSingle()).data,
  });
  const { data: enrollments = [] } = useQuery({
    queryKey: ["admin-student-enrollments", id],
    queryFn: async () => ((await supabase.from("enrollments")
      .select("id, created_at, completed_at, course_id, batch_id, progress, learning_status, absence_reminders, courses(title), certificates(id, serial, pdf_key, issued_at, is_revoked), attendance(status, class_sessions(session_date))")
      .eq("student_id", id).order("created_at")).data ?? []) as unknown as Enr[],
  });
  const log = async (action: string, detail: Record<string, unknown> = {}) => {
    await supabase.rpc("log_student_activity", { _student_id: id, _action: action, _detail: detail as never });
    qc.invalidateQueries({ queryKey: ["student-activity", id] });
  };
  useEffect(() => { if (st && !logged.current) { logged.current = true; log("viewed"); } }, [st]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <p className="text-muted-foreground">Loading student...</p>;
  if (!st) return <div className="glass rounded-xl p-8">Student not found. <Link to="/admin/students" className="text-primary">Back to list</Link></div>;
  const adm = st.admissions as { document_keys: unknown; access_token: string } | null;
  const phone = st.phone ?? "";
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-student-enrollments", id] }); qc.invalidateQueries({ queryKey: ["admin-enrollments"] }); qc.invalidateQueries({ queryKey: ["student-activity", id] }); };

  return (
    <div className="space-y-6 pb-24">
      <Link to="/admin/students" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" />All students</Link>
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="glass h-fit space-y-4 rounded-2xl p-6 text-center lg:sticky lg:top-20">
          <ApplicantAvatar app={{ document_keys: adm?.document_keys ?? [], full_name: st.full_name }} size="mx-auto h-32 w-32" />
          <h1 className="section-title text-xl">{st.full_name}</h1>
          <button onClick={() => copyText(st.student_code, "Student ID")} className="mx-auto flex items-center gap-2 rounded-lg border border-highlight/40 px-3 py-1.5 font-mono text-sm text-highlight transition hover:bg-highlight/10 active:scale-95">{st.student_code}<Copy className="h-3.5 w-3.5" /></button>
          {phone && <div className="flex items-center justify-center gap-2">
            <button onClick={() => copyText(`+88${phone}`, "Phone number")} className="rounded-lg px-2 py-1 font-mono text-sm hover:bg-muted">+88 {phone}</button>
            <a href={`tel:+88${phone}`} aria-label="Call" className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary transition hover:scale-110"><Phone className="h-4 w-4" /></a>
            <a href={`https://wa.me/88${phone}`} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="flex h-9 w-9 items-center justify-center rounded-full bg-whatsapp/15 text-sm font-bold text-whatsapp transition hover:scale-110">W</a>
          </div>}
          <p className="break-all text-sm text-muted-foreground">{st.email}</p>
          <p className="text-xs text-muted-foreground">Student since {formatDate(st.created_at)}</p>
          {st.admission_id && <Button asChild variant="outline" className="w-full"><Link to="/admin/applications/$id" params={{ id: st.admission_id }}>View application</Link></Button>}
        </aside>
        <div className="space-y-6">
          {enrollments.length === 0 && <div className="glass rounded-2xl p-6 text-muted-foreground">No course enrollments.</div>}
          {enrollments.map((e) => <EnrollmentCard key={e.id} e={e} student={st} log={log} onChange={refresh} />)}
          <section className="glass rounded-2xl p-6">
            <h2 className="section-title mb-5 text-lg">Activity log</h2>
            <ActivityFeed table="student_activity" column="student_id" id={id} queryKey={["student-activity", id]} render={(a) => <Line a={a} />} />
          </section>
        </div>
      </div>
    </div>
  );
}

function EnrollmentCard({ e, student, log, onChange }: { e: Enr; student: { id: string; full_name: string; student_code: string }; log: (a: string, d?: Record<string, unknown>) => Promise<void>; onChange: () => void }) {
  const [progress, setProgress] = useState(e.progress);
  const [status, setStatus] = useState(e.learning_status);
  const [batch, setBatch] = useState(e.batch_id ?? "");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const issue = useIssueCertificate();
  const sendProgress = useServerFn(sendProgressEmail);
  const { data: batches = [] } = useQuery({ queryKey: ["admin-batches"], queryFn: async () => (await supabase.from("batches").select("id, name, course_id, class_days, class_time, is_active").order("name")).data ?? [] });
  const stats = attendanceStats(e.attendance ?? []);
  const cert = e.certificates?.[0] ?? null;
  const pdf = cdnUrl(cert?.pdf_key);
  const dirty = progress !== e.progress || status !== e.learning_status || batch !== (e.batch_id ?? "");
  const course = e.courses?.title ?? "Course";

  async function save() {
    setBusy("save");
    const { error } = await supabase.from("enrollments").update({ progress, learning_status: status, batch_id: batch || null }).eq("id", e.id);
    if (error) { setBusy(null); toast.error(error.message); return; }
    const changes: Record<string, unknown>[] = [];
    if (progress !== e.progress) changes.push({ field: "Progress", from: `${e.progress}%`, to: `${progress}%` });
    if (status !== e.learning_status) changes.push({ field: "Learning status", from: e.learning_status, to: status });
    if (batch !== (e.batch_id ?? "")) changes.push({ field: "Batch", from: batches.find((b) => b.id === e.batch_id)?.name ?? "none", to: batches.find((b) => b.id === batch)?.name ?? "none" });
    await log("updated_learning", { course, changes });
    if (notify && (progress !== e.progress || status !== e.learning_status)) {
      const r = await sendProgress({ data: { enrollmentId: e.id } }).catch(() => ({ sent: false }));
      if (r.sent) { toast.success("Saved & student notified"); await log("emailed_progress", { course, progress }); } else toast.warning("Saved, but the email could not be sent");
    } else toast.success("Saved");
    setBusy(null); onChange();
  }

  async function toggleReminders(v: boolean) {
    const { error } = await supabase.from("enrollments").update({ absence_reminders: v }).eq("id", e.id);
    if (error) { toast.error(error.message); return; }
    toast.success(v ? "Absence reminders on" : "Absence reminders off");
    await log(v ? "reminders_on" : "reminders_off", { course }); onChange();
  }

  async function doIssue() {
    if (!cert && !(await confirmAction({ title: "Complete course & issue certificate?", description: `Mark "${course}" completed for ${student.full_name}, issue a certificate and email it.`, confirmText: "Issue certificate" }))) return;
    setBusy("issue");
    try { const serial = await issue({ id: e.id, studentId: student.id, studentName: student.full_name, studentCode: student.student_code, courseTitle: course, hadPdf: !!cert?.pdf_key }); toast.success(`Certificate ${serial} ready`); }
    catch (err) { toast.error((err as Error).message); }
    setBusy(null); onChange();
  }

  async function toggleRevoke(c: Cert) {
    if (!(await confirmAction(c.is_revoked ? { title: "Restore this certificate?", description: "It will verify as authentic again.", confirmText: "Restore" } : { title: "Revoke this certificate?", description: "Verification will show it as revoked.", confirmText: "Revoke", destructive: true }))) return;
    const { error } = await supabase.from("certificates").update({ is_revoked: !c.is_revoked }).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    await log(c.is_revoked ? "certificate_restored" : "certificate_revoked", { serial: c.serial }); onChange();
  }

  return (
    <section className="glass space-y-5 rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="section-title text-lg">{course}</h2><p className="text-xs text-muted-foreground">Enrolled {formatDate(e.created_at)}{e.completed_at ? ` · Completed ${formatDate(e.completed_at)}` : ""}</p></div>
        <span className={`inline-flex rounded-full border px-3 py-0.5 text-xs font-semibold uppercase tracking-wider ${learningBadge(e.learning_status)}`}>{e.learning_status}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Classes held", stats.held], ["Attended", stats.attended], ["Missed", stats.missed], ["Attendance", stats.rate == null ? "—" : `${stats.rate}%`]].map(([k, v]) => <div key={k} className="rounded-xl border border-border bg-background/40 p-3 text-center"><p className="text-xs uppercase text-muted-foreground">{k}</p><p className="mt-1 text-xl font-bold">{v}</p></div>)}
      </div>
      {stats.streak >= 2 && <p className="rounded-lg border border-highlight/40 bg-highlight/10 px-3 py-2 text-sm text-highlight">Missed the last {stats.streak} classes in a row.</p>}
      <div className="space-y-2">
        <div className="flex justify-between text-sm"><span>Course progress</span><span className="font-semibold text-primary">{progress}%</span></div>
        <Slider value={[progress]} max={100} step={5} onValueChange={(v) => setProgress(v[0] ?? 0)} aria-label="Progress" />
        <div className="flex flex-wrap gap-2">{[25, 50, 75, 100].map((p) => <Button key={p} size="sm" variant="outline" onClick={() => setProgress(p)}>{p}%</Button>)}<Button size="sm" variant="outline" onClick={() => setProgress((p) => Math.min(100, p + 10))}>+10%</Button></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm"><span className="text-muted-foreground">Learning status</span>
          <select className={selectCls} value={status} onChange={(ev) => setStatus(ev.target.value)}>{LEARNING_STATUSES.map((s) => <option key={s} value={s}>{s[0]!.toUpperCase() + s.slice(1)}</option>)}</select></label>
        <label className="space-y-1 text-sm"><span className="text-muted-foreground">Batch</span>
          <select className={selectCls} value={batch} onChange={(ev) => setBatch(ev.target.value)}><option value="">No batch</option>{batches.filter((b) => b.course_id === e.course_id).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={notify} onCheckedChange={(v) => setNotify(!!v)} />Email the student about progress changes</label>
        <Button onClick={save} disabled={!dirty || busy === "save"}>{busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Save</Button>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
        <div><p className="text-sm font-medium">Auto absence email reminders</p><p className="text-xs text-muted-foreground">When on, the student is emailed each time they're marked absent.</p></div>
        <Switch checked={e.absence_reminders} onCheckedChange={toggleReminders} aria-label="Absence reminders" />
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        {cert && <div className="mr-auto space-y-1"><p className="font-mono text-xs text-primary">{cert.serial}</p><div className="flex gap-3 text-xs">{pdf && <a href={pdf} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><FileDown className="h-3 w-3" />PDF</a>}<button className="text-muted-foreground hover:text-destructive" onClick={() => toggleRevoke(cert)}>{cert.is_revoked ? "Restore" : "Revoke"}</button>{cert.is_revoked && <span className="text-destructive">Revoked</span>}</div></div>}
        <Button className={cert ? "" : "bg-highlight text-highlight-foreground hover:bg-highlight/90"} variant={cert ? "outline" : "default"} disabled={busy === "issue"} onClick={doIssue}>
          {busy === "issue" ? <Loader2 className="h-4 w-4 animate-spin" /> : cert ? <RefreshCw className="h-4 w-4" /> : <Award className="h-4 w-4" />}{cert ? (cert.pdf_key ? "Regenerate PDF" : "Generate PDF") : "Complete & issue certificate"}
        </Button>
      </div>
      <Progress value={progress} className="h-1.5" />
    </section>
  );
}

function Line({ a }: { a: ActivityRow }) {
  const d = (a.detail ?? {}) as Record<string, any>;
  const text: Record<string, string> = {
    viewed: "opened the student profile",
    updated_learning: `updated learning for ${d.course ?? "a course"}`,
    emailed_progress: `emailed a progress update (${d.progress}%)`,
    reminders_on: `turned absence reminders ON for ${d.course ?? ""}`,
    reminders_off: `turned absence reminders OFF for ${d.course ?? ""}`,
    attendance: `marked ${d.status} for ${d.date}${d.from ? ` (was ${d.from})` : ""}${d.course ? ` · ${d.course}` : ""}`,
    certificate_issued: `completed the course & issued certificate ${d.serial ?? ""}`,
    certificate_regenerated: `regenerated certificate ${d.serial ?? ""}`,
    certificate_revoked: `revoked certificate ${d.serial ?? ""}`,
    certificate_restored: `restored certificate ${d.serial ?? ""}`,
  };
  return <>
    <p className="text-sm"><span className="font-semibold text-foreground">{a.actor_name ?? "Admin"}</span> {text[a.action] ?? a.action}</p>
    {Array.isArray(d.changes) && <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">{d.changes.map((c: any, i: number) => <li key={i}>changed <span className="text-foreground">{c.field}</span> from <span className="text-destructive">'{c.from}'</span> to <span className="text-primary">'{c.to}'</span></li>)}</ul>}
  </>;
}
