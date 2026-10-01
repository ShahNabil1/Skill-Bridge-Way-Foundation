import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Award, FileDown, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminOnly, PageTitle } from "@/components/admin/shared";
import { createMediaUploadUrl } from "@/lib/r2.functions";
import { cdnUrl } from "@/lib/cdn";
import { formatDate } from "@/lib/public-data";

export const Route = createFileRoute("/_authenticated/admin/students")({
  component: () => <AdminOnly><StudentsAdmin /></AdminOnly>,
});

type Cert = { id: string; serial: string; pdf_key: string | null; issued_at: string; is_revoked: boolean };
type Row = {
  id: string;
  completed_at: string | null;
  students: { full_name: string; student_code: string; email: string } | null;
  courses: { title: string } | null;
  certificates: Cert | Cert[] | null;
};

function StudentsAdmin() {
  const qc = useQueryClient();
  const sign = useServerFn(createMediaUploadUrl);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("id, completed_at, students(full_name, student_code, email), courses(title), certificates(id, serial, pdf_key, issued_at, is_revoked)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const certOf = (r: Row) => (Array.isArray(r.certificates) ? r.certificates[0] : r.certificates) ?? null;

  async function issue(r: Row) {
    if (!r.students || !r.courses) return toast.error("Missing student or course");
    if (!certOf(r) && !confirm(`Mark "${r.courses.title}" completed for ${r.students.full_name} and issue a certificate?`)) return;
    setBusyId(r.id);
    try {
      const { data, error } = await supabase.rpc("issue_certificate", { _enrollment_id: r.id });
      if (error) throw error;
      const cert = data?.[0];
      if (!cert) throw new Error("Certificate was not created");
      const { data: full } = await supabase.from("certificates").select("issued_at").eq("id", cert.certificate_id).single();
      const { generateCertificatePdf } = await import("@/lib/certificate-pdf");
      const bytes = await generateCertificatePdf({
        serial: cert.serial,
        studentName: r.students.full_name,
        studentCode: r.students.student_code,
        courseTitle: r.courses.title,
        issuedAt: full?.issued_at ?? new Date().toISOString(),
      });
      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      const { uploadUrl, key } = await sign({ data: { folder: "certificates", fileName: `${cert.serial}.pdf`, contentType: "application/pdf", size: blob.size } });
      const res = await fetch(uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": "application/pdf" } }).catch(() => null);
      if (!res?.ok) throw new Error("PDF upload to storage failed");
      const { error: upErr } = await supabase.from("certificates").update({ pdf_key: key }).eq("id", cert.certificate_id);
      if (upErr) throw upErr;
      toast.success(`Certificate ${cert.serial} issued`);
    } catch (err) {
      toast.error((err as Error).message);
    }
    setBusyId(null);
    qc.invalidateQueries({ queryKey: ["admin-enrollments"] });
  }

  async function toggleRevoke(c: Cert) {
    if (!confirm(c.is_revoked ? "Restore this certificate?" : "Revoke this certificate? Verification will show it as revoked.")) return;
    const { error } = await supabase.from("certificates").update({ is_revoked: !c.is_revoked }).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin-enrollments"] });
  }

  const term = q.trim().toLowerCase();
  const filtered = term
    ? rows.filter((r) => [r.students?.full_name, r.students?.student_code, r.courses?.title, certOf(r)?.serial].some((v) => v?.toLowerCase().includes(term)))
    : rows;

  return (
    <>
      <PageTitle title="Students & Certificates">
        <Input placeholder="Search name, ID, serial..." value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
      </PageTitle>
      <div className="glass overflow-x-auto rounded-xl">
        <Table>
          <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Course</TableHead><TableHead>Status</TableHead><TableHead>Certificate</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-muted-foreground">Loading...</TableCell></TableRow>}
            {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-muted-foreground">No enrollments yet. Approve an admission with a chosen course to enroll a student.</TableCell></TableRow>}
            {filtered.map((r) => {
              const c = certOf(r);
              const pdf = cdnUrl(c?.pdf_key);
              return (
                <TableRow key={r.id}>
                  <TableCell><p className="font-medium text-foreground">{r.students?.full_name}</p><p className="font-mono text-xs text-muted-foreground">{r.students?.student_code}</p></TableCell>
                  <TableCell className="text-muted-foreground">{r.courses?.title}</TableCell>
                  <TableCell>{r.completed_at ? <Badge>Completed {formatDate(r.completed_at)}</Badge> : <Badge variant="secondary">In progress</Badge>}</TableCell>
                  <TableCell>
                    {c ? (
                      <div className="space-y-1">
                        <p className="font-mono text-xs text-primary">{c.serial}</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {pdf && <a href={pdf} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><FileDown className="h-3 w-3" /> PDF</a>}
                          <button className="text-muted-foreground hover:text-destructive" onClick={() => toggleRevoke(c)}>{c.is_revoked ? "Restore" : "Revoke"}</button>
                          {c.is_revoked && <Badge variant="destructive">Revoked</Badge>}
                        </div>
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {!c ? (
                      <Button size="sm" disabled={busyId === r.id} onClick={() => issue(r)}>
                        {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />} Complete & issue
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={() => issue(r)}>
                        {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} {c.pdf_key ? "Regenerate PDF" : "Generate PDF"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
