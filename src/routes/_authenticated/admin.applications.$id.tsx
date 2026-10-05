import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Copy, FileDown, History, Loader2, Pencil, Phone, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AdminOnly } from "@/components/admin/shared";
import { ActivityFeed } from "@/components/admin/ActivityFeed";
import { confirmAction } from "@/components/ConfirmDialog";
import { AddressPicker, Field, PhoneInput, Select } from "@/components/admission/FormBits";
import { EducationFields } from "@/components/admission/EducationFields";
import { ApplicantAvatar, DocumentGrid, StatusBadge } from "@/components/admission/ApplicationParts";
import { FIELD_LABELS, composeAddress, copyText, docLabel, docsOf, refOf, type AppDoc, type ApplicationRecord } from "@/lib/application";
import { DOC_SLOTS } from "@/lib/admission-schema";
import { ALLOWED_DOC_TYPES, MAX_DOC_BYTES, createAdmissionUploadUrl } from "@/lib/r2.functions";
import { sendApprovalEmail, sendRejectionEmail } from "@/lib/email.functions";
import { seo } from "@/components/site/PageHero";

export const Route = createFileRoute("/_authenticated/admin/applications/$id")({ staticData: { sitemap: false },
  head: () => seo("Review Application | Skill Bridgeway Foundation", "Private admission review.", { noindex: true }),
  component: () => <AdminOnly><Review /></AdminOnly>,
});

const EDITABLE = ["full_name", "email", "phone", "date_of_birth", "gender", "occupation", "division", "district", "upazila", "union_name", "village", "address_line", "education_level", "institution", "education_board", "education_group", "education_result", "passing_year", "session", "course_id", "motivation", "digital_access", "attendance_commitment", "document_keys"] as const;
type Draft = Record<(typeof EDITABLE)[number], unknown>;
const pick = (a: ApplicationRecord): Draft => Object.fromEntries(EDITABLE.map((k) => [k, k === "document_keys" ? docsOf(a) : k === "digital_access" ? (a.digital_access ?? []) : k === "attendance_commitment" ? (a.attendance_commitment ? String(a.attendance_commitment) : "") : (a[k] ?? "")])) as Draft;
const norm = (d: Draft) => Object.fromEntries(EDITABLE.map((k) => {
  if (k === "document_keys") return [k, d[k]];
  if (k === "digital_access") { const v = (d[k] as string[] | null) ?? []; return [k, v.length ? v : null]; }
  if (k === "attendance_commitment") return [k, d[k] ? Number(d[k]) : null];
  return [k, typeof d[k] === "string" ? (d[k] as string).trim() || null : d[k]];
}));

function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.94.95-3.48-.22-.36a9.43 9.43 0 1 1 7.99 4.41zm8.02-17.45A11.32 11.32 0 0 0 12.05.75C5.8.75.72 5.83.72 12.08c0 2 .52 3.95 1.52 5.66L.62 23.25l5.64-1.48a11.3 11.3 0 0 0 5.79 1.48h.01c6.25 0 11.33-5.08 11.33-11.33 0-3.03-1.18-5.87-3.32-8.01z" /></svg>;
}

function Review() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [note, setNote] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const getUploadUrl = useServerFn(createAdmissionUploadUrl);
  const notifyApproved = useServerFn(sendApprovalEmail);
  const notifyRejected = useServerFn(sendRejectionEmail);
  const logged = useRef(false);

  const { data: app, isLoading } = useQuery({
    queryKey: ["admin-application", id],
    queryFn: async () => {
      const { data } = await supabase.from("admissions").select("*, courses(title), students(student_code)").eq("id", id).maybeSingle();
      if (!data) return null;
      const c = data.courses as { title: string } | null;
      const s = data.students as { student_code: string } | { student_code: string }[] | null;
      return { ...(data as unknown as ApplicationRecord), review_note: data.review_note, course_title: c?.title ?? null, student_code: Array.isArray(s) ? s[0]?.student_code : s?.student_code };
    },
  });
  const { data: courses = [] } = useQuery({ queryKey: ["admin-course-options"], queryFn: async () => (await supabase.from("courses").select("id, title, is_published").order("title")).data ?? [] });


  const log = async (action: string, detail: Record<string, unknown> = {}) => {
    await supabase.rpc("log_admission_activity", { _admission_id: id, _action: action, _detail: detail as never });
    qc.invalidateQueries({ queryKey: ["admission-activity", id] });
  };
  useEffect(() => { if (app && !logged.current) { logged.current = true; log("viewed"); } }, [app]); // eslint-disable-line react-hooks/exhaustive-deps

  const original = useMemo(() => (app ? pick(app) : null), [app]);
  const dirty = !!draft && !!original && JSON.stringify(norm(draft)) !== JSON.stringify(norm(original));
  const view = editing && draft ? draft : original;
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-application", id] }); qc.invalidateQueries({ queryKey: ["admin-admissions"] }); qc.invalidateQueries({ queryKey: ["admission-activity", id] }); qc.invalidateQueries({ queryKey: ["admin-stats"] }); };

  if (isLoading) return <p className="text-muted-foreground">Loading application...</p>;
  if (!app || !view) return <div className="glass rounded-xl p-8">Application not found. <Link to="/admin/applications" className="text-primary">Back to list</Link></div>;

  const ref = refOf(app.id);
  const s = (k: keyof Draft) => String(view[k] ?? "");
  const patch = (p: Partial<Record<keyof Draft, unknown>>) => setDraft((d) => (d ? { ...d, ...p } : d));
  const currentApp = { ...app, ...(view as object), course_title: courses.find((c) => c.id === view.course_id)?.title ?? app.course_title } as ApplicationRecord;

  function startEdit() { setDraft(pick(app!)); setNote(""); setEditing(true); }
  function cancelEdit() { setDraft(null); setNote(""); setEditing(false); }

  async function save() {
    if (!draft || !dirty) return;
    if (!/^01[3-9]\d{8}$/.test(String(draft.phone))) { toast.error("Enter a valid 11-digit mobile number"); return; }
    if (!/^\S+@\S+\.\S+$/.test(String(draft.email))) { toast.error("Enter a valid email"); return; }
    setBusy("save");
    const n = norm(draft);
    const { data, error } = await supabase.rpc("update_admission_with_log", { _admission_id: id, _patch: { ...n } as never, _note: note });
    if (!error) await supabase.from("admissions").update({ address: composeAddress(n as Partial<ApplicationRecord>) }).eq("id", id);
    setBusy(null);
    if (error) { toast.error(error.code === "23505" ? "Another active application already uses this email/phone for that course." : error.message); return; }
    toast.success(`Updated ${data} field${data === 1 ? "" : "s"}`);
    cancelEdit(); refresh();
  }

  async function replaceDoc(slot: string, file?: File) {
    if (!file || !draft) return;
    if (!(ALLOWED_DOC_TYPES as readonly string[]).includes(file.type)) { toast.error("Only PDF, JPG, PNG or WEBP files"); return; }
    if (file.size > MAX_DOC_BYTES) { toast.error("File must be 5 MB or smaller"); return; }
    setBusy(slot);
    try {
      const { uploadUrl, key } = await getUploadUrl({ data: { admissionId: id, fileName: file.name, contentType: file.type as (typeof ALLOWED_DOC_TYPES)[number], size: file.size } });
      const res = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } }).catch(() => null);
      if (!res?.ok) throw new Error();
      const docs = (draft.document_keys as AppDoc[]).filter((d) => d.type !== slot);
      patch({ document_keys: [...docs, { type: slot, key, name: file.name }] });
      toast.success(`${docLabel(slot)} replaced — click Update to save`);
    } catch { toast.error("Upload failed"); }
    setBusy(null);
  }

  async function pdf() {
    setBusy("pdf");
    try {
      const { downloadApplicationPdf } = await import("@/lib/application-pdf");
      await downloadApplicationPdf(app!, app!.access_token ? `${window.location.origin}/application/${app!.access_token}` : undefined);
      log("downloaded_pdf");
    } catch { toast.error("Could not create the PDF"); }
    setBusy(null);
  }

  async function approve() {
    if (!(await confirmAction({ title: "Approve this application?", description: "A Student ID will be created and the applicant will be emailed.", confirmText: "Approve" }))) return;
    setBusy("approve");
    const { data, error } = await supabase.rpc("approve_admission", { _admission_id: id });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Approved — Student ID ${data}`);
    log("approved", { student_code: data });
    notifyApproved({ data: { admissionId: id } }).then((r) => { if (!r.sent) toast.warning("Approval email could not be sent"); }).catch(() => toast.warning("Approval email could not be sent"));
    refresh();
  }
  async function reject() {
    if (!(await confirmAction({ title: "Reject this application?", description: "The applicant can apply again later.", confirmText: "Reject", destructive: true }))) return;
    setBusy("reject");
    const { error } = await supabase.from("admissions").update({ status: "rejected", review_note: rejectNote.trim().slice(0, 1000) || null, reviewed_at: new Date().toISOString() }).eq("id", id);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Application rejected");
    notifyRejected({ data: { admissionId: id } }).catch(() => {});
    log("rejected", { note: rejectNote.trim().slice(0, 300) });
    refresh();
  }

  const phone = String(app.phone);
  const intl = `88${phone}`;
  return (
    <div className="space-y-6 pb-24">
      <Link to="/admin/applications" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" />All applications</Link>
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="glass h-fit space-y-4 rounded-2xl p-6 text-center lg:sticky lg:top-20">
          <ApplicantAvatar app={currentApp} size="mx-auto h-32 w-32" />
          <div><h1 className="section-title text-xl">{app.full_name}</h1><div className="mt-2"><StatusBadge status={app.status} /></div></div>
          <button onClick={() => copyText(ref, "Reference number")} className="mx-auto flex items-center gap-2 rounded-lg border border-highlight/40 px-3 py-1.5 font-mono text-sm text-highlight transition hover:bg-highlight/10 active:scale-95">{ref}<Copy className="h-3.5 w-3.5" /></button>
          {app.student_code && <p className="text-sm">Student ID: <span className="font-semibold text-primary">{app.student_code}</span></p>}
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => copyText(`+${intl}`, "Phone number")} className="rounded-lg px-2 py-1 font-mono text-sm transition hover:bg-muted active:scale-95" title="Copy number">+88 {phone}</button>
            <a href={`tel:+${intl}`} onClick={() => toast("Calling +88 " + phone)} aria-label="Call" className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary transition hover:scale-110 hover:bg-primary/25 active:scale-90"><Phone className="h-4 w-4" /></a>
            <a href={`https://wa.me/${intl}`} target="_blank" rel="noreferrer" onClick={() => toast("Opening WhatsApp…")} aria-label="WhatsApp" className="flex h-9 w-9 items-center justify-center rounded-full bg-whatsapp/15 text-whatsapp transition hover:scale-110 hover:bg-whatsapp/25 active:scale-90"><WhatsAppIcon /></a>
          </div>
          <p className="break-all text-sm text-muted-foreground">{app.email}</p>
          <Button onClick={pdf} disabled={busy === "pdf"} className="w-full bg-highlight text-highlight-foreground hover:bg-highlight/90">{busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}Download PDF</Button>
          {!editing && <Button variant="outline" className="w-full" onClick={startEdit}><Pencil className="h-4 w-4" />Edit details</Button>}
        </aside>

        <div className="space-y-6">
          <Card title="Personal information">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Full name"><Input disabled={!editing} value={s("full_name")} onChange={(e) => patch({ full_name: e.target.value })} /></Field>
              <Field label="Email"><Input disabled={!editing} type="email" value={s("email")} onChange={(e) => patch({ email: e.target.value })} /></Field>
              <Field label="Mobile number"><PhoneInput disabled={!editing} value={s("phone")} onChange={(v) => patch({ phone: v })} /></Field>
              <Field label="Date of birth"><Input disabled={!editing} type="date" value={s("date_of_birth")} onChange={(e) => patch({ date_of_birth: e.target.value })} /></Field>
              <Field label="Gender"><Select disabled={!editing} value={s("gender")} options={["male", "female", "other"]} onChange={(v) => patch({ gender: v })} /></Field>
              <Field label="Occupation"><Select disabled={!editing} value={s("occupation")} options={[...OCCUPATIONS]} placeholder="Not provided" onChange={(v) => patch({ occupation: v })} /></Field>
            </div>
            <h3 className="mt-6 mb-3 text-sm uppercase text-muted-foreground">Address</h3>
            {!app.division && !editing && app.address && <p className="mb-3 text-sm text-muted-foreground">Legacy address: {app.address}</p>}
            <AddressPicker disabled={!editing} value={{ division: s("division"), district: s("district"), upazila: s("upazila"), union_name: s("union_name"), village: s("village"), address_line: s("address_line") }} onChange={patch} />
          </Card>
          <Card title="Education">
            <EducationFields disabled={!editing} value={{ education_level: s("education_level"), institution: s("institution"), education_board: s("education_board"), education_group: s("education_group"), education_result: s("education_result"), passing_year: s("passing_year"), session: s("session") }} onChange={patch} />
          </Card>
          <Card title="Course">
            <div className="space-y-5">
              <Field label="Course">
                <select disabled={!editing} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60" value={s("course_id")} onChange={(e) => patch({ course_id: e.target.value })}>
                  <option value="">Undecided</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}{c.is_published ? "" : " (inactive)"}</option>)}
                </select>
              </Field>
              <Field label="Motivation"><Textarea disabled={!editing} rows={4} value={s("motivation")} onChange={(e) => patch({ motivation: e.target.value })} /></Field>
              <Field label="Digital access (devices)">
                <DeviceChecks disabled={!editing} options={DIGITAL_DEVICES} value={(view.digital_access as string[] | null) ?? []} onChange={(v) => patch({ digital_access: v })} />
              </Field>
              <Field label="Attendance commitment (minimum)">
                <AttendancePicker disabled={!editing} options={ATTENDANCE_OPTIONS} value={s("attendance_commitment")} onChange={(v) => patch({ attendance_commitment: v })} />
              </Field>
            </div>
          </Card>
          <Card title="Documents">
            <DocumentGrid app={currentApp} onEvent={(action, d) => log(action, { type: d.type, label: docLabel(d.type) })} />
            {editing && <div className="mt-4 flex flex-wrap gap-2">
              {DOC_SLOTS.map((slot) => <label key={slot.id} className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground transition hover:border-primary hover:text-primary">
                {busy === slot.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}Replace {slot.label}
                <input type="file" className="sr-only" accept={ALLOWED_DOC_TYPES.join(",")} onChange={(e) => { replaceDoc(slot.id, e.target.files?.[0]); e.target.value = ""; }} />
              </label>)}
            </div>}
          </Card>

          {editing && <div className="glass sticky bottom-4 z-10 space-y-3 rounded-2xl border-primary/40 p-4">
            <div className="space-y-2"><Label htmlFor="edit-note">Reason for change (optional)</Label><Textarea id="edit-note" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Applicant called to correct their name" /></div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={cancelEdit} disabled={busy === "save"}>Cancel</Button>
              <Button onClick={save} disabled={!dirty || busy === "save"}>{busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />}Update</Button>
            </div>
          </div>}

          {!editing && app.status === "pending" && <Card title="Decision">
            <div className="space-y-3">
              <div className="space-y-2"><Label htmlFor="reject-note">Note (shown if rejected)</Label><Textarea id="reject-note" rows={2} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} /></div>
              <div className="flex flex-wrap gap-2">
                <Button disabled={!!busy} onClick={approve}>Approve & create Student ID</Button>
                <Button disabled={!!busy} variant="destructive" onClick={reject}>Reject</Button>
              </div>
            </div>
          </Card>}
          {app.status !== "pending" && (app as { review_note?: string | null }).review_note && <p className="text-sm text-muted-foreground">Review note: {(app as { review_note?: string | null }).review_note}</p>}

          <Card title="Activity log">
            <ActivityFeed table="admission_activity" column="admission_id" id={id} queryKey={["admission-activity", id]} render={(a) => <>
              <p className="text-sm"><span className="font-semibold text-foreground">{a.actor_name ?? "Admin"}</span> {describe(a.action, a.detail as Record<string, unknown>)}</p>
              {a.action === "edited" && <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                {(((a.detail as { changes?: { field: string; from: unknown; to: unknown }[] }).changes) ?? []).map((c, i) => <li key={i}>changed <span className="text-foreground">{FIELD_LABELS[c.field] ?? c.field}</span>{c.field === "document_keys" ? "" : <> from <span className="text-destructive">'{fmt(c.from, c.field, courses)}'</span> to <span className="text-primary">'{fmt(c.to, c.field, courses)}'</span></>}</li>)}
              </ul>}
              {a.note && <p className="mt-1 text-xs italic text-muted-foreground">Reason: {a.note}</p>}
            </>} />
          </Card>
        </div>
      </div>
    </div>
  );
}

function fmt(v: unknown, field: string, courses: { id: string; title: string }[]) {
  if (v == null || v === "") return "empty";
  if (field === "course_id") return courses.find((c) => c.id === v)?.title ?? "Undecided";
  return String(v);
}
function describe(action: string, d: Record<string, unknown>) {
  switch (action) {
    case "viewed": return "opened the review page";
    case "downloaded_pdf": return "downloaded the full application PDF";
    case "downloaded_document": return `downloaded ${String(d["label"] ?? "a document")}`;
    case "viewed_document": return `viewed ${String(d["label"] ?? "a document")}`;
    case "approved": return `approved the application${d["student_code"] ? ` (Student ID ${String(d["student_code"])})` : ""}`;
    case "rejected": return "rejected the application";
    case "edited": return "edited the application";
    default: return action;
  }
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="glass rounded-2xl p-6"><h2 className="section-title mb-5 text-lg">{title}</h2>{children}</section>;
}
