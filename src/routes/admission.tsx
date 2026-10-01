import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ReactNode } from "react";
import type { ZodType } from "zod";
import { toast } from "sonner";
import { Check, CheckCircle2, Copy, FileText, Loader2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHero, seo } from "@/components/site/PageHero";
import { coursesQuery } from "@/lib/public-data";
import { ALLOWED_DOC_TYPES, MAX_DOC_BYTES, createAdmissionUploadUrl } from "@/lib/r2.functions";
import {
  DOC_SLOTS, EDUCATION_LEVELS, courseSchema, educationSchema, personalSchema,
  type AdmissionForm, type DocSlot,
} from "@/lib/admission-schema";

export const Route = createFileRoute("/admission")({
  head: () => seo("Free Admission | Skill Bridgeway Foundation", "Apply online for free admission to AI, freelancing and digital skills courses at Skill Bridgeway Foundation."),
  component: Admission,
});

const STEPS = ["Personal", "Education", "Course", "Documents", "Review"] as const;
const NO_COURSE = "undecided";
const empty: AdmissionForm = {
  full_name: "", email: "", phone: "", date_of_birth: "", gender: "" as AdmissionForm["gender"], address: "",
  education_level: "", institution: "", course_id: "", motivation: "",
};
type Errors = Partial<Record<string, string>>;
const selectCls = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [&>option]:bg-popover";

function Admission() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<AdmissionForm>(empty);
  const [files, setFiles] = useState<Partial<Record<DocSlot, File>>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState("");
  const [reference, setReference] = useState<string | null>(null);
  const courses = useQuery(coursesQuery());
  const getUploadUrl = useServerFn(createAdmissionUploadUrl);

  const set = (k: keyof AdmissionForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function check(schema: ZodType) {
    const r = schema.safeParse(form);
    if (r.success) { setErrors({}); return true; }
    const errs: Errors = {};
    for (const i of r.error.issues) errs[String(i.path[0])] ??= i.message;
    setErrors(errs);
    return false;
  }
  function checkDocs() {
    const errs: Errors = {};
    for (const s of DOC_SLOTS) if (s.required && !files[s.id]) errs[s.id] = "This document is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }
  function next() {
    const ok = [() => check(personalSchema), () => check(educationSchema), () => check(courseSchema), checkDocs][step]?.() ?? true;
    if (ok) { setStep((s) => s + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }
  }

  function pickFile(slot: DocSlot, f: File | undefined) {
    if (!f) return;
    if (!(ALLOWED_DOC_TYPES as readonly string[]).includes(f.type)) return setErrors((e) => ({ ...e, [slot]: "Only PDF, JPG, PNG or WEBP files" }));
    if (f.size > MAX_DOC_BYTES) return setErrors((e) => ({ ...e, [slot]: "File must be 5 MB or smaller" }));
    setErrors((e) => ({ ...e, [slot]: undefined }));
    setFiles((p) => ({ ...p, [slot]: f }));
  }

  async function submit() {
    if (!check(personalSchema.and(educationSchema).and(courseSchema)) || !checkDocs()) return;
    setSubmitting(true);
    try {
      const admissionId = crypto.randomUUID();
      const documentKeys: { type: DocSlot; key: string; name: string }[] = [];
      for (const slot of DOC_SLOTS) {
        const file = files[slot.id];
        if (!file) continue;
        setProgress(`Uploading ${slot.label}...`);
        const { uploadUrl, key } = await getUploadUrl({
          data: { admissionId, fileName: file.name, contentType: file.type as (typeof ALLOWED_DOC_TYPES)[number], size: file.size },
        });
        const res = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
        if (!res.ok) throw new Error(`Upload failed for ${slot.label}`);
        documentKeys.push({ type: slot.id, key, name: file.name });
      }
      setProgress("Saving your application...");
      const { error } = await supabase.from("admissions").insert({
        id: admissionId,
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        date_of_birth: form.date_of_birth,
        gender: form.gender,
        address: form.address.trim(),
        education_level: form.education_level,
        institution: form.institution.trim(),
        course_id: form.course_id === NO_COURSE ? null : form.course_id,
        motivation: form.motivation.trim(),
        document_keys: documentKeys,
        status: "pending",
      });
      if (error) throw new Error("Could not save your application");
      setReference(`SBF-APP-${admissionId.slice(0, 8).toUpperCase()}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
      setProgress("");
    }
  }

  if (reference) return <Success reference={reference} email={form.email} />;

  const courseName = form.course_id === NO_COURSE ? "Not sure yet — advise me" : courses.data?.find((c) => c.id === form.course_id)?.title ?? "";

  return (
    <>
      <PageHero eyebrow="Admission open" title="Free Admission">Five quick steps. No fees, ever.</PageHero>
      <section className="mx-auto max-w-3xl px-4 py-10 md:py-14">
        <ol className="grid grid-cols-5 gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className="min-w-0">
              <div className={`h-1.5 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
              <p className={`mt-2 hidden truncate text-xs sm:block ${i === step ? "text-primary" : "text-muted-foreground"}`}>{i + 1}. {s}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted-foreground sm:hidden">Step {step + 1} of 5 · {STEPS[step]}</p>

        <div className="glass mt-8 rounded-xl p-5 md:p-8">
          {step === 0 && (
            <Section title="Personal information">
              <Field label="Full name" error={errors.full_name}><Input value={form.full_name} onChange={set("full_name")} autoComplete="name" /></Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Email" error={errors.email}><Input type="email" value={form.email} onChange={set("email")} autoComplete="email" /></Field>
                <Field label="Mobile number" error={errors.phone}><Input type="tel" value={form.phone} onChange={set("phone")} placeholder="017XXXXXXXX" autoComplete="tel" /></Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Date of birth" error={errors.date_of_birth}><Input type="date" value={form.date_of_birth} onChange={set("date_of_birth")} /></Field>
                <Field label="Gender" error={errors.gender}>
                  <select className={selectCls} value={form.gender} onChange={set("gender")}>
                    <option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                  </select>
                </Field>
              </div>
              <Field label="Address" error={errors.address}><Textarea rows={3} value={form.address} onChange={set("address")} /></Field>
            </Section>
          )}

          {step === 1 && (
            <Section title="Education">
              <Field label="Highest education level" error={errors.education_level}>
                <select className={selectCls} value={form.education_level} onChange={set("education_level")}>
                  <option value="">Select</option>
                  {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </Field>
              <Field label="Institution name" error={errors.institution}><Input value={form.institution} onChange={set("institution")} /></Field>
            </Section>
          )}

          {step === 2 && (
            <Section title="Choose a course">
              {errors.course_id && <p className="text-xs text-destructive">{errors.course_id}</p>}
              <div className="grid gap-3">
                {courses.isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 bg-muted" />) : (
                  [...(courses.data ?? []).map((c) => ({ id: c.id, title: c.title, sub: [c.duration, c.level].filter(Boolean).join(" · ") })),
                   { id: NO_COURSE, title: "Not sure yet — advise me", sub: "Our team will suggest the best fit" }].map((c) => (
                    <button type="button" key={c.id} onClick={() => setForm((f) => ({ ...f, course_id: c.id }))}
                      className={`flex items-center justify-between gap-3 rounded-lg border p-4 text-left transition-colors ${form.course_id === c.id ? "border-primary bg-primary/10" : "hover:border-primary/60"}`}>
                      <span className="min-w-0"><span className="block font-medium">{c.title}</span>{c.sub && <span className="text-xs text-muted-foreground">{c.sub}</span>}</span>
                      {form.course_id === c.id && <Check className="h-5 w-5 shrink-0 text-primary" />}
                    </button>
                  ))
                )}
              </div>
              <Field label="Why do you want to join?" error={errors.motivation}><Textarea rows={4} value={form.motivation} onChange={set("motivation")} /></Field>
            </Section>
          )}

          {step === 3 && (
            <Section title="Upload documents">
              <p className="text-sm text-muted-foreground">PDF, JPG, PNG or WEBP · max 5 MB each.</p>
              {DOC_SLOTS.map((s) => {
                const f = files[s.id];
                return (
                  <div key={s.id}>
                    <p className="mb-2 text-sm font-medium">{s.label} {s.required ? <span className="text-highlight">*</span> : <span className="text-muted-foreground">(optional)</span>}</p>
                    {f ? (
                      <div className="flex items-center gap-3 rounded-lg border border-primary/50 p-3">
                        <FileText className="h-5 w-5 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1 truncate text-sm">{f.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                        <button type="button" aria-label="Remove file" onClick={() => setFiles((p) => ({ ...p, [s.id]: undefined }))} className="shrink-0 hover:text-destructive"><X className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                        <Upload className="h-6 w-6" />Tap to choose a file
                        <input type="file" className="sr-only" accept={ALLOWED_DOC_TYPES.join(",")} onChange={(e) => pickFile(s.id, e.target.files?.[0])} />
                      </label>
                    )}
                    {errors[s.id] && <p className="mt-1 text-xs text-destructive">{errors[s.id]}</p>}
                  </div>
                );
              })}
            </Section>
          )}

          {step === 4 && (
            <Section title="Review & submit">
              <Review title="Personal" onEdit={() => setStep(0)} rows={[["Name", form.full_name], ["Email", form.email], ["Mobile", form.phone], ["Date of birth", form.date_of_birth], ["Gender", form.gender], ["Address", form.address]]} />
              <Review title="Education" onEdit={() => setStep(1)} rows={[["Level", form.education_level], ["Institution", form.institution]]} />
              <Review title="Course" onEdit={() => setStep(2)} rows={[["Course", courseName], ["Motivation", form.motivation]]} />
              <Review title="Documents" onEdit={() => setStep(3)} rows={DOC_SLOTS.map((s) => [s.label, files[s.id]?.name ?? "—"])} />
            </Section>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button variant="outline" disabled={step === 0 || submitting} onClick={() => setStep((s) => s - 1)}>Back</Button>
            {step < 4 ? (
              <Button onClick={next}>Continue</Button>
            ) : (
              <Button disabled={submitting} onClick={submit} className="bg-highlight text-highlight-foreground hover:bg-highlight/90">
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{progress || "Submitting..."}</> : "Submit application"}
              </Button>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <div className="space-y-5"><h2 className="section-title text-lg">{title}</h2>{children}</div>;
}

function Field({ label, error, children }: { label: string; error?: string | undefined; children: ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}{error && <p className="text-xs text-destructive">{error}</p>}</div>;
}

function Review({ title, rows, onEdit }: { title: string; rows: string[][]; onEdit: () => void }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between"><h3 className="text-sm uppercase">{title}</h3><button type="button" onClick={onEdit} className="text-xs text-primary hover:underline">Edit</button></div>
      <dl className="mt-3 grid gap-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[120px_minmax(0,1fr)] gap-3"><dt className="text-muted-foreground">{k}</dt><dd className="break-words capitalize-first">{v || "—"}</dd></div>
        ))}
      </dl>
    </div>
  );
}

function Success({ reference, email }: { reference: string; email: string }) {
  return (
    <section className="bg-grid flex min-h-[70vh] items-center px-4 py-16">
      <div className="glass mx-auto w-full max-w-lg rounded-2xl p-8 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
        <h1 className="section-title mt-4 text-2xl md:text-3xl">Application received</h1>
        <p className="mt-3 text-muted-foreground">Thank you! Your application is now pending review. We'll contact you at <span className="text-foreground">{email}</span>.</p>
        <div className="mt-6 rounded-xl border border-primary/50 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Your reference number</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <p className="font-heading text-xl font-extrabold tracking-wider text-highlight md:text-2xl">{reference}</p>
            <button aria-label="Copy reference" className="hover:text-primary" onClick={() => { navigator.clipboard.writeText(reference); toast.success("Copied"); }}><Copy className="h-4 w-4" /></button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Save this number for any future enquiries.</p>
        </div>
        <Button asChild variant="outline" className="mt-6"><Link to="/">Back to home</Link></Button>
      </div>
    </section>
  );
}
