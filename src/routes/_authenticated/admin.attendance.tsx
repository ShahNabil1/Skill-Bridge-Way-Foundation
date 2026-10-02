import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarDays, CheckCheck, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AdminOnly, PageTitle, selectCls } from "@/components/admin/shared";
import { ApplicantAvatar } from "@/components/admission/ApplicationParts";
import { ATTENDANCE, WEEKDAYS, WEEKDAY_LABEL, todayISO, weekdayOf, type AttendanceStatus } from "@/lib/student";
import { sendAbsenceReminders } from "@/lib/email.functions";
import { seo } from "@/components/site/PageHero";

export const Route = createFileRoute("/_authenticated/admin/attendance")({ staticData: { sitemap: false },
  head: () => seo("Attendance | Skill Bridgeway Foundation", "Private class attendance.", { noindex: true }),
  component: () => <AdminOnly><Attendance /></AdminOnly>,
});

type Batch = { id: string; name: string; course_id: string; class_days: string[]; class_time: string | null; is_active: boolean };
const COLORS: Record<AttendanceStatus, string> = { present: "bg-primary text-primary-foreground", late: "bg-highlight text-highlight-foreground", absent: "bg-destructive text-destructive-foreground", excused: "bg-muted text-foreground" };

function Attendance() {
  const qc = useQueryClient();
  const remind = useServerFn(sendAbsenceReminders);
  const [course, setCourse] = useState("");
  const [batchId, setBatchId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);

  const { data: courses = [] } = useQuery({ queryKey: ["admin-course-options"], queryFn: async () => (await supabase.from("courses").select("id, title, is_published").order("title")).data ?? [] });
  const { data: batches = [] } = useQuery({ queryKey: ["admin-batches"], queryFn: async () => ((await supabase.from("batches").select("id, name, course_id, class_days, class_time, is_active").order("name")).data ?? []) as Batch[] });
  const batch = batches.find((b) => b.id === batchId);
  const courseTitle = (id: string) => courses.find((c) => c.id === id)?.title ?? "";
  const todays = batches.filter((b) => b.is_active && b.class_days.includes(weekdayOf(todayISO())));

  const { data: roster = [], isLoading: rosterLoading } = useQuery({
    queryKey: ["batch-roster", batchId], enabled: !!batchId,
    queryFn: async () => ((await supabase.from("enrollments").select("id, learning_status, absence_reminders, students(id, full_name, student_code, admissions(document_keys))").eq("batch_id", batchId).neq("learning_status", "dropped")).data ?? []) as any[],
  });
  const { data: session } = useQuery({
    queryKey: ["batch-session", batchId, date], enabled: !!batchId,
    queryFn: async () => {
      const { data: s } = await supabase.from("class_sessions").select("id").eq("batch_id", batchId).eq("session_date", date).maybeSingle();
      if (!s) return { id: null as string | null, rows: [] as { enrollment_id: string; status: string }[] };
      const { data: rows } = await supabase.from("attendance").select("enrollment_id, status").eq("session_id", s.id);
      return { id: s.id as string | null, rows: rows ?? [] };
    },
  });
  const { data: recent = [] } = useQuery({ queryKey: ["batch-recent", batchId], enabled: !!batchId, queryFn: async () => (await supabase.from("class_sessions").select("session_date").eq("batch_id", batchId).order("session_date", { ascending: false }).limit(8)).data ?? [] });

  const saved = useMemo(() => Object.fromEntries((session?.rows ?? []).map((r) => [r.enrollment_id, r.status as AttendanceStatus])), [session]);
  useEffect(() => { setMarks(Object.fromEntries(roster.map((r) => [r.id, saved[r.id] ?? "present"]))); }, [roster, saved]);
  const counts = ATTENDANCE.map((s) => [s, Object.values(marks).filter((m) => m === s).length] as const);
  const changed = roster.some((r) => marks[r.id] !== saved[r.id]);

  async function save() {
    if (!batch) return;
    setSaving(true);
    try {
      const { data: s, error } = await supabase.from("class_sessions").upsert({ batch_id: batch.id, session_date: date }, { onConflict: "batch_id,session_date" }).select("id").single();
      if (error) throw error;
      const { data: u } = await supabase.auth.getUser();
      const rows = roster.map((r) => ({ session_id: s.id, enrollment_id: r.id, status: marks[r.id] ?? "present", marked_by: u.user?.id, marked_at: new Date().toISOString() }));
      const { error: aErr } = await supabase.from("attendance").upsert(rows, { onConflict: "session_id,enrollment_id" });
      if (aErr) throw aErr;
      const course = courseTitle(batch.course_id);
      await Promise.all(roster.filter((r) => marks[r.id] !== saved[r.id] && r.students).map((r) => supabase.rpc("log_student_activity", { _student_id: r.students.id, _action: "attendance", _detail: { status: marks[r.id], from: saved[r.id] ?? null, date, course, batch: batch.name } as never })));
      const absent = rows.filter((r) => r.status === "absent").length;
      toast.success(`Attendance saved for ${rows.length} students`);
      if (absent) {
        const res = await remind({ data: { sessionId: s.id } }).catch(() => null);
        if (res) toast(res.sent ? `${res.sent} absence reminder${res.sent > 1 ? "s" : ""} emailed` : "No reminder emails sent (reminders off or already sent)");
      }
      qc.invalidateQueries({ queryKey: ["batch-session", batchId, date] }); qc.invalidateQueries({ queryKey: ["batch-recent", batchId] });
      qc.invalidateQueries({ queryKey: ["admin-student-enrollments"] });
    } catch (err) { toast.error((err as Error).message); }
    setSaving(false);
  }

  return (
    <>
      <PageTitle title="Attendance" />
      {todays.length > 0 && <section className="glass mb-4 rounded-xl p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase text-muted-foreground"><CalendarDays className="h-4 w-4" />Today's classes</h2>
        <div className="flex flex-wrap gap-2">{todays.map((b) => <Button key={b.id} size="sm" variant={b.id === batchId && date === todayISO() ? "default" : "outline"} onClick={() => { setCourse(b.course_id); setBatchId(b.id); setDate(todayISO()); }}>{courseTitle(b.course_id)} · {b.name}{b.class_time ? ` · ${b.class_time}` : ""}</Button>)}</div>
      </section>}
      <div className="glass mb-4 grid gap-3 rounded-xl p-4 sm:grid-cols-3">
        <select className={selectCls} aria-label="Course" value={course} onChange={(e) => { setCourse(e.target.value); setBatchId(""); }}>
          <option value="">Choose course</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <select className={selectCls} aria-label="Batch" value={batchId} disabled={!course} onChange={(e) => setBatchId(e.target.value)}>
          <option value="">Choose batch</option>{batches.filter((b) => b.course_id === course).map((b) => <option key={b.id} value={b.id}>{b.name}{b.is_active ? "" : " (inactive)"}</option>)}
        </select>
        <Input type="date" aria-label="Class date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value || todayISO())} />
        {recent.length > 0 && <div className="flex flex-wrap items-center gap-2 sm:col-span-3"><span className="text-xs text-muted-foreground">Recent classes:</span>{recent.map((r) => <button key={r.session_date} onClick={() => setDate(r.session_date)} className={`rounded-full border px-2.5 py-0.5 text-xs ${r.session_date === date ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>{r.session_date}</button>)}</div>}
      </div>

      {batch && <section className="glass mb-6 rounded-xl p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="section-title text-lg">{batch.name}</h2><p className="text-xs text-muted-foreground">{date} · {WEEKDAY_LABEL[weekdayOf(date)]}{batch.class_days.length && !batch.class_days.includes(weekdayOf(date)) ? " · not a scheduled class day" : ""}{session?.id ? " · already recorded" : ""}</p></div>
          <div className="flex flex-wrap gap-2 text-xs">{counts.map(([s, n]) => <span key={s} className="rounded-full border border-border px-2.5 py-0.5 capitalize">{s}: {n}</span>)}</div>
        </div>
        {rosterLoading ? <p className="text-sm text-muted-foreground">Loading students...</p> : roster.length === 0 ? <p className="text-sm text-muted-foreground">No students in this batch yet. Assign a batch from a student's profile.</p> : <>
          <div className="mb-3 flex justify-end"><Button size="sm" variant="outline" onClick={() => setMarks(Object.fromEntries(roster.map((r) => [r.id, "present"])))}><CheckCheck className="h-4 w-4" />Mark all present</Button></div>
          <ul className="divide-y divide-border">
            {roster.map((r) => r.students && <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3"><ApplicantAvatar app={{ document_keys: r.students.admissions?.document_keys ?? [], full_name: r.students.full_name }} size="h-10 w-10" /><div><p className="font-medium">{r.students.full_name}</p><p className="font-mono text-xs text-muted-foreground">{r.students.student_code}{r.absence_reminders ? "" : " · reminders off"}</p></div></div>
              <div className="flex gap-1" role="radiogroup" aria-label={`Attendance for ${r.students.full_name}`}>
                {ATTENDANCE.map((s) => <button key={s} role="radio" aria-checked={marks[r.id] === s} onClick={() => setMarks((m) => ({ ...m, [r.id]: s }))} className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition active:scale-95 ${marks[r.id] === s ? COLORS[s] : "border border-border text-muted-foreground hover:text-foreground"}`}>{s}</button>)}
              </div>
            </li>)}
          </ul>
          <div className="sticky bottom-4 mt-4 flex justify-end"><Button onClick={save} disabled={saving || (!changed && !!session?.id)} className="shadow-lg">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{session?.id ? "Update attendance" : "Save attendance"}</Button></div>
        </>}
      </section>}

      <BatchManager course={course} courses={courses} batches={batches} />
    </>
  );
}

function BatchManager({ course, courses, batches }: { course: string; courses: { id: string; title: string }[]; batches: Batch[] }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ course_id: "", name: "", class_days: [] as string[], class_time: "", start_date: "" });
  useEffect(() => { if (course) setF((c) => ({ ...c, course_id: course })); }, [course]);
  const list = batches.filter((b) => !course || b.course_id === course);
  async function create() {
    if (!f.course_id || f.name.trim().length < 2) { toast.error("Choose a course and enter a batch name"); return; }
    const { error } = await supabase.from("batches").insert({ course_id: f.course_id, name: f.name.trim(), class_days: f.class_days, class_time: f.class_time.trim() || null, start_date: f.start_date || null });
    if (error) { toast.error(error.message); return; }
    toast.success("Batch created"); setF((c) => ({ ...c, name: "", class_days: [], class_time: "", start_date: "" }));
    qc.invalidateQueries({ queryKey: ["admin-batches"] });
  }
  async function toggle(b: Batch) {
    await supabase.from("batches").update({ is_active: !b.is_active }).eq("id", b.id);
    qc.invalidateQueries({ queryKey: ["admin-batches"] });
  }
  return (
    <section className="glass rounded-xl p-4">
      <h2 className="section-title mb-4 text-lg">Batches & class days</h2>
      <div className="mb-4 space-y-2">{list.length === 0 ? <p className="text-sm text-muted-foreground">No batches yet.</p> : list.map((b) => <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
        <div><p className="font-medium">{b.name} <span className="text-xs text-muted-foreground">· {courses.find((c) => c.id === b.course_id)?.title}</span></p><p className="text-xs text-muted-foreground">{b.class_days.map((d) => WEEKDAY_LABEL[d]).join(", ") || "No fixed days"}{b.class_time ? ` · ${b.class_time}` : ""}</p></div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">Active<Switch checked={b.is_active} onCheckedChange={() => toggle(b)} /></label>
      </div>)}</div>
      <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
        <select className={selectCls} aria-label="Batch course" value={f.course_id} onChange={(e) => setF({ ...f, course_id: e.target.value })}><option value="">Course</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
        <Input placeholder="Batch name, e.g. Batch 01 – Morning" value={f.name} maxLength={80} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input placeholder="Class time, e.g. 10:00 AM" value={f.class_time} maxLength={40} onChange={(e) => setF({ ...f, class_time: e.target.value })} />
        <Input type="date" aria-label="Start date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} />
        <div className="flex flex-wrap gap-1 sm:col-span-2 lg:col-span-3">{WEEKDAYS.map((d) => { const on = f.class_days.includes(d); return <button key={d} type="button" onClick={() => setF({ ...f, class_days: on ? f.class_days.filter((x) => x !== d) : [...f.class_days, d] })} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${on ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}>{WEEKDAY_LABEL[d]}</button>; })}</div>
        <Button onClick={create}><Plus className="h-4 w-4" />Add batch</Button>
      </div>
    </section>
  );
}
