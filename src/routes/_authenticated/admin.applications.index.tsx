import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminOnly, PageTitle } from "@/components/admin/shared";
import { Select } from "@/components/admission/FormBits";
import { ApplicantAvatar, StatusBadge } from "@/components/admission/ApplicationParts";
import { refOf } from "@/lib/application";
import { EDUCATION_LEVELS } from "@/lib/admission-schema";
import { BD_LOCATIONS, DIVISIONS } from "@/lib/bd-locations";
import { formatDate } from "@/lib/public-data";
import { seo } from "@/components/site/PageHero";

export const Route = createFileRoute("/_authenticated/admin/applications/")({ staticData: { sitemap: false },
  head: () => seo("Applications | Skill Bridgeway Foundation", "Private admission review.", { noindex: true }),
  component: () => <AdminOnly><ApplicationsList /></AdminOnly>,
});

const init = { q: "", status: "", course: "", division: "", district: "", level: "", from: "", to: "" };

function ApplicationsList() {
  const [f, setF] = useState(init);
  const set = (p: Partial<typeof init>) => setF((c) => ({ ...c, ...p }));
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-admissions", "all"],
    queryFn: async () => (await supabase.from("admissions").select("id, full_name, email, phone, status, created_at, course_id, division, district, education_level, document_keys, courses(title)").order("created_at", { ascending: false }).limit(1000)).data ?? [],
  });
  const { data: courses = [] } = useQuery({
    queryKey: ["admin-course-options"],
    queryFn: async () => (await supabase.from("courses").select("id, title, is_published").order("title")).data ?? [],
  });
  const courseLabel = (c: { title: string; is_published: boolean }) => `${c.title}${c.is_published ? "" : " (inactive)"}`;
  const filtered = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    const qd = q.replace(/\D/g, "");
    return rows.filter((r) => {
      if (q && !(refOf(r.id).toLowerCase().includes(q) || r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || (qd.length >= 3 && r.phone.replace(/\D/g, "").includes(qd)))) return false;
      if (f.status && r.status !== f.status) return false;
      if (f.course && (f.course === "none" ? r.course_id !== null : r.course_id !== f.course)) return false;
      if (f.division && r.division !== f.division) return false;
      if (f.district && r.district !== f.district) return false;
      if (f.level && r.education_level !== f.level) return false;
      if (f.from && r.created_at < f.from) return false;
      if (f.to && r.created_at.slice(0, 10) > f.to) return false;
      return true;
    });
  }, [rows, f]);
  const active = JSON.stringify(f) !== JSON.stringify(init);

  return (
    <>
      <PageTitle title="Applications" />
      <div className="glass mb-4 space-y-3 rounded-xl p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search applications" placeholder="Search reference, name, email or phone" value={f.q} onChange={(e) => set({ q: e.target.value })} className="h-11 pl-9" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={f.status} onChange={(e) => set({ status: e.target.value })} aria-label="Status">
            <option value="">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
          </select>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={f.course} onChange={(e) => set({ course: e.target.value })} aria-label="Course">
            <option value="">All courses</option><option value="none">Undecided</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{courseLabel(c)}</option>)}
          </select>
          <Select value={f.division} options={DIVISIONS} placeholder="All divisions" onChange={(v) => set({ division: v, district: "" })} />
          <Select value={f.district} disabled={!f.division} options={f.division ? Object.keys(BD_LOCATIONS[f.division] ?? {}) : []} placeholder="All districts" onChange={(v) => set({ district: v })} />
          <Select value={f.level} options={EDUCATION_LEVELS} placeholder="All education levels" onChange={(v) => set({ level: v })} />
          <Input type="date" aria-label="From date" value={f.from} onChange={(e) => set({ from: e.target.value })} />
          <Input type="date" aria-label="To date" value={f.to} onChange={(e) => set({ to: e.target.value })} />
          <Button variant="outline" disabled={!active} onClick={() => setF(init)}><X className="h-4 w-4" />Clear filters</Button>
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} of {rows.length} applications</p>
      </div>
      <div className="glass overflow-x-auto rounded-xl">
        <Table>
          <TableHeader><TableRow><TableHead>Applicant</TableHead><TableHead>Reference</TableHead><TableHead>Course</TableHead><TableHead>Status</TableHead><TableHead>Applied</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-muted-foreground">Loading...</TableCell></TableRow>}
            {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-muted-foreground">No applications match.</TableCell></TableRow>}
            {filtered.map((a) => (
              <TableRow key={a.id}>
                <TableCell><div className="flex items-center gap-3"><ApplicantAvatar app={a} size="h-10 w-10" /><div className="min-w-0"><p className="font-medium">{a.full_name}</p><p className="text-xs text-muted-foreground">{a.email} · {a.phone}</p></div></div></TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{refOf(a.id)}</TableCell>
                <TableCell className="text-muted-foreground">{(a.courses as { title: string } | null)?.title ?? "Undecided"}</TableCell>
                <TableCell><StatusBadge status={a.status} /></TableCell>
                <TableCell className="text-muted-foreground">{formatDate(a.created_at)}</TableCell>
                <TableCell className="text-right"><Button asChild size="sm" variant="outline"><Link to="/admin/applications/$id" params={{ id: a.id }}>Review</Link></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
