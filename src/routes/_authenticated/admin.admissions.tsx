import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminOnly, PageTitle } from "@/components/admin/shared";
import { cdnUrl } from "@/lib/cdn";
import { formatDate } from "@/lib/public-data";

export const Route = createFileRoute("/_authenticated/admin/admissions")({ staticData: { sitemap: false },
  component: () => <AdminOnly><AdmissionsAdmin /></AdminOnly>,
});

type Status = "pending" | "approved" | "rejected";
type Doc = { type?: string; key?: string; name?: string };

function AdmissionsAdmin() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-admissions", status],
    queryFn: async () => (await supabase.from("admissions").select("*, courses(title), students(student_code)").eq("status", status).order("created_at", { ascending: false })).data ?? [],
  });
  const selected = rows.find((r) => r.id === selectedId) ?? null;
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-admissions"] }); qc.invalidateQueries({ queryKey: ["admin-stats"] }); };

  async function approve(id: string) {
    setBusy(true);
    const { data, error } = await supabase.rpc("approve_admission", { _admission_id: id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Approved — Student ID ${data}`);
    setSelectedId(null); refresh();
  }

  async function reject(id: string) {
    setBusy(true);
    const { error } = await supabase.from("admissions").update({ status: "rejected", review_note: note.trim().slice(0, 1000) || null, reviewed_at: new Date().toISOString() }).eq("id", id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Application rejected");
    setSelectedId(null); setNote(""); refresh();
  }

  const ref = (id: string) => `SBF-APP-${id.slice(0, 8).toUpperCase()}`;
  const docs = (selected?.document_keys as Doc[] | null) ?? [];
  const student = selected?.students as { student_code: string } | { student_code: string }[] | null | undefined;
  const studentCode = Array.isArray(student) ? student[0]?.student_code : student?.student_code;

  return (
    <>
      <PageTitle title="Admissions">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)} className="capitalize">{s}</Button>
        ))}
      </PageTitle>
      <div className="glass overflow-x-auto rounded-xl">
        <Table>
          <TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>Applicant</TableHead><TableHead>Course</TableHead><TableHead>Applied</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-muted-foreground">Loading...</TableCell></TableRow>}
            {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-muted-foreground">No {status} applications.</TableCell></TableRow>}
            {rows.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{ref(a.id)}</TableCell>
                <TableCell><p className="font-medium text-foreground">{a.full_name}</p><p className="text-xs text-muted-foreground">{a.email}</p></TableCell>
                <TableCell className="text-muted-foreground">{(a.courses as { title: string } | null)?.title ?? "Undecided"}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(a.created_at)}</TableCell>
                <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => { setSelectedId(a.id); setNote(a.review_note ?? ""); }}>Review</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <DialogHeader><DialogTitle>{selected.full_name} <span className="ml-2 font-mono text-xs text-muted-foreground">{ref(selected.id)}</span></DialogTitle></DialogHeader>
              <div className="flex flex-wrap gap-2">
                <Badge variant={selected.status === "approved" ? "default" : selected.status === "rejected" ? "destructive" : "secondary"} className="capitalize">{selected.status}</Badge>
                {studentCode && <Badge variant="outline">Student ID: {studentCode}</Badge>}
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {([
                  ["Email", selected.email], ["Phone", selected.phone], ["Date of birth", selected.date_of_birth], ["Gender", selected.gender],
                  ["Education", selected.education_level], ["Institution", selected.institution],
                  ["Course", (selected.courses as { title: string } | null)?.title ?? "Undecided"], ["Address", selected.address],
                ] as const).map(([k, v]) => (
                  <div key={k}><dt className="text-xs uppercase text-muted-foreground">{k}</dt><dd className="text-foreground">{v || "—"}</dd></div>
                ))}
                <div className="sm:col-span-2"><dt className="text-xs uppercase text-muted-foreground">Motivation</dt><dd className="whitespace-pre-wrap text-foreground">{selected.motivation || "—"}</dd></div>
              </dl>
              <div>
                <p className="mb-2 text-xs uppercase text-muted-foreground">Documents</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {docs.length === 0 && <p className="text-sm text-muted-foreground">No documents.</p>}
                  {docs.map((d, i) => {
                    const url = cdnUrl(d.key);
                    const isImg = /\.(jpe?g|png|webp)$/i.test(d.key ?? "");
                    return url ? (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="glass block overflow-hidden rounded-md text-sm hover:border-primary/50">
                        {isImg ? <img src={url} alt={d.type ?? "document"} className="h-28 w-full object-cover" /> : <div className="flex h-28 items-center justify-center"><FileText className="h-8 w-8 text-primary" /></div>}
                        <p className="truncate p-2 capitalize text-muted-foreground">{d.type ?? d.name}</p>
                      </a>
                    ) : null;
                  })}
                </div>
              </div>
              {selected.status === "pending" ? (
                <div className="space-y-3 border-t border-border pt-4">
                  <div className="space-y-2"><Label>Note (shown if rejected)</Label><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></div>
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={busy} onClick={() => approve(selected.id)}>Approve & create Student ID</Button>
                    <Button disabled={busy} variant="destructive" onClick={() => reject(selected.id)}>Reject</Button>
                  </div>
                </div>
              ) : selected.review_note ? <p className="text-sm text-muted-foreground">Note: {selected.review_note}</p> : null}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
