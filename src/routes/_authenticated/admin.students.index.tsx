import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BellOff, Loader2, RefreshCw, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useRefreshAllCertificates } from "@/lib/use-issue-certificate";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminOnly, PageTitle, selectCls } from "@/components/admin/shared";
import { ApplicantAvatar } from "@/components/admission/ApplicationParts";
import { LEARNING_STATUSES, learningBadge } from "@/lib/student";
import { formatDate } from "@/lib/public-data";
import { seo } from "@/components/site/PageHero";
import { confirmAction } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/_authenticated/admin/students/")({ staticData: { sitemap: false },
  head: () => seo("Students | Skill Bridgeway Foundation", "Private student records and certificates.", { noindex: true }),
  component: () => <AdminOnly><StudentsList /></AdminOnly>,
});

type Row = {
  id: string; created_at: string; course_id: string; batch_id: string | null; progress: number; learning_status: string; absence_reminders: boolean;
  students: { id: string; full_name: string; student_code: string; email: string; phone: string | null; admissions: { document_keys: unknown } | null } | null;
  courses: { title: string } | null; batches: { name: string } | null;
  certificates: { id: string; is_revoked: boolean }[] | { id: string; is_revoked: boolean } | null;
};
const init = { q: "", course: "", batch: "", status: "", cert: "", reminders: "" };

function StudentsList() {
  const [f, setF] = useState(init);
  const set = (p: Partial<typeof init>) => setF((c) => ({ ...c, ...p }));
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-enrollments"],
    queryFn: async () => ((await supabase.from("enrollments")
      .select("id, created_at, course_id, batch_id, progress, learning_status, absence_reminders, students(id, full_name, student_code, email, phone, admissions(document_keys)), courses(title), batches(name), certificates(id, is_revoked)")
      .order("created_at", { ascending: false }).limit(1000)).data ?? []) as unknown as Row[],
  });
  const { data: courses = [] } = useQuery({ queryKey: ["admin-course-options"], queryFn: async () => (await supabase.from("courses").select("id, title, is_published").order("title")).data ?? [] });
  const { data: batches = [] } = useQuery({ queryKey: ["admin-batches"], queryFn: async () => (await supabase.from("batches").select("id, name, course_id, class_days, class_time, is_active").order("name")).data ?? [] });

  const filtered = useMemo(() => {
    const q = f.q.trim().toLowerCase(); const qd = q.replace(/\D/g, "");
    return rows.filter((r) => {
      const s = r.students;
      if (q && !(s?.full_name.toLowerCase().includes(q) || s?.student_code.toLowerCase().includes(q) || s?.email.toLowerCase().includes(q) || (qd.length >= 3 && (s?.phone ?? "").includes(qd)))) return false;
      if (f.course && r.course_id !== f.course) return false;
      if (f.batch && (f.batch === "none" ? r.batch_id !== null : r.batch_id !== f.batch)) return false;
      if (f.status && r.learning_status !== f.status) return false;
      const hasCert = hasActiveCert(r.certificates);
      if (f.cert && (f.cert === "issued") !== hasCert) return false;
      if (f.reminders && (f.reminders === "on") !== r.absence_reminders) return false;
      return true;
    });
  }, [rows, f]);
  const active = JSON.stringify(f) !== JSON.stringify(init);

  return (
    <>
      <PageTitle title="Students"><RefreshCertsButton /><Button asChild variant="outline"><Link to="/admin/attendance">Take attendance</Link></Button></PageTitle>
      <div className="glass mb-4 space-y-3 rounded-xl p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search students" placeholder="Search name, Student ID, email or phone" value={f.q} onChange={(e) => set({ q: e.target.value })} className="h-11 pl-9" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <select className={selectCls} aria-label="Course" value={f.course} onChange={(e) => set({ course: e.target.value, batch: "" })}>
            <option value="">All courses</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <select className={selectCls} aria-label="Batch" value={f.batch} onChange={(e) => set({ batch: e.target.value })}>
            <option value="">All batches</option><option value="none">No batch</option>
            {batches.filter((b) => !f.course || b.course_id === f.course).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select className={selectCls} aria-label="Learning status" value={f.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="">All learning statuses</option>{LEARNING_STATUSES.map((s) => <option key={s} value={s}>{s[0]!.toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select className={selectCls} aria-label="Certificate" value={f.cert} onChange={(e) => set({ cert: e.target.value })}>
            <option value="">Certificate: any</option><option value="issued">Certificate issued</option><option value="none">Not issued</option>
          </select>
          <select className={selectCls} aria-label="Reminders" value={f.reminders} onChange={(e) => set({ reminders: e.target.value })}>
            <option value="">Absence reminders: any</option><option value="on">Reminders on</option><option value="off">Reminders off</option>
          </select>
          <Button variant="outline" disabled={!active} onClick={() => setF(init)}><X className="h-4 w-4" />Clear filters</Button>
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} of {rows.length} enrollments</p>
      </div>
      <div className="glass overflow-x-auto rounded-xl">
        <Table>
          <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Course / Batch</TableHead><TableHead>Progress</TableHead><TableHead>Status</TableHead><TableHead>Enrolled</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-muted-foreground">Loading...</TableCell></TableRow>}
            {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-muted-foreground">No students match. Approving an application with a course enrolls the student.</TableCell></TableRow>}
            {filtered.map((r) => r.students && (
              <TableRow key={r.id}>
                <TableCell><div className="flex items-center gap-3"><ApplicantAvatar app={{ document_keys: r.students.admissions?.document_keys ?? [], full_name: r.students.full_name }} size="h-10 w-10" /><div className="min-w-0"><p className="font-medium">{r.students.full_name}</p><p className="font-mono text-xs text-primary">{r.students.student_code}</p></div></div></TableCell>
                <TableCell><p className="text-sm">{r.courses?.title}</p><p className="text-xs text-muted-foreground">{r.batches?.name ?? "No batch"}</p></TableCell>
                <TableCell className="min-w-32"><div className="flex items-center gap-2"><Progress value={r.progress} className="h-2" /><span className="text-xs">{r.progress}%</span></div></TableCell>
                <TableCell><div className="flex items-center gap-2"><span className={`inline-flex rounded-full border px-3 py-0.5 text-xs font-semibold uppercase tracking-wider ${learningBadge(r.learning_status)}`}>{r.learning_status}</span>{!r.absence_reminders && <BellOff className="h-3.5 w-3.5 text-muted-foreground" aria-label="Reminders off" />}{hasActiveCert(r.certificates) && <span className="text-xs text-primary">🎓</span>}</div></TableCell>
                <TableCell className="text-muted-foreground">{formatDate(r.created_at)}</TableCell>
                <TableCell className="text-right"><Button asChild size="sm" variant="outline"><Link to="/admin/students/$id" params={{ id: r.students.id }}>Open profile</Link></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function RefreshCertsButton() {
  const refresh = useRefreshAllCertificates();
  const [progress, setProgress] = useState<string | null>(null);
  const run = async () => {
    const ok = await confirmAction({
      title: "Update all certificates?",
      description: "Re-create all issued certificate PDFs with the latest design and signatures. Serial numbers stay the same.",
      confirmText: "Update all",
    });
    if (!ok) return;
    setProgress("0");
    try {
      const r = await refresh((d, t) => setProgress(`${d}/${t}`));
      if (r.failed) toast.warning(`${r.total - r.failed} of ${r.total} certificates updated`);
      else toast.success(`${r.total} certificates updated`);
    } catch { toast.error("Could not update certificates"); }
    setProgress(null);
  };
  return (
    <Button variant="outline" onClick={run} disabled={progress !== null}>
      {progress !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      {progress !== null ? `Updating ${progress}` : "Update all certificates"}
    </Button>
  );
}

/** A one-to-one relation comes back as an object, not an array — accept both. */
function hasActiveCert(c: Row["certificates"]) {
  const list = c ? (Array.isArray(c) ? c : [c]) : [];
  return list.some((x) => !x.is_revoked);
}
