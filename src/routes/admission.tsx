import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Turnstile } from "@/components/auth/Turnstile";
import { submitAdmission } from "@/lib/admission.functions";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ReactNode } from "react";
import { AddressPicker, AttendancePicker, DeviceChecks, Field, PhoneInput } from "@/components/admission/FormBits";
import { EducationFields } from "@/components/admission/EducationFields";
import { attendanceText, composeAddress, devicesText, refOf } from "@/lib/application";
import type { ZodType } from "zod";
import { toast } from "sonner";
import { Check, CheckCircle2, Copy, FileText, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHero, seo } from "@/components/site/PageHero";
import { coursesQuery, isPreviewOnlyCourse, TEST_ENROLLMENT_SLUG } from "@/lib/public-data";
import { sendAdmissionReceivedEmail } from "@/lib/email.functions";
import { ALLOWED_DOC_TYPES, MAX_DOC_BYTES, createAdmissionUploadUrl } from "@/lib/r2.functions";
import {
  ATTENDANCE_OPTIONS, DIGITAL_DEVICES, DOC_SLOTS, OCCUPATIONS, courseSchema, educationSchema, personalSchema,
  type AdmissionForm, type DocSlot,
} from "@/lib/admission-schema";

export const Route = createFileRoute("/admission")({ staticData: { sitemap: true },
  validateSearch: (s: Record<string, unknown>): { course?: string } => typeof s["course"] === "string" ? { course: s["course"] } : {},
  beforeLoad: ({ search }) => { if (!search.course) throw redirect({ to: "/courses", search: {} }); },
  head: () => seo("Free Admission | Skill Bridgeway Foundation", "Apply online for free admission to AI, freelancing and digital skills courses at Skill Bridgeway Foundation.", { path: "/admission" }),
  component: Admission,
});

const STEPS = ["Personal", "Education", "Course", "Documents", "Review"] as const;
const NO_COURSE = "undecided";
const empty: AdmissionForm = {
  full_name: "", email: "", phone: "", date_of_birth: "", gender: "" as AdmissionForm["gender"], occupation: "",
  division: "", district: "", upazila: "", union_name: "", village: "", address_line: "",
  education_level: "", institution: "", education_board: "", education_group: "", education_result: "", passing_year: "", session: "",
  course_id: "", motivation: "", digital_access: [], attendance_commitment: "",
};
type Errors = Partial<Record<keyof AdmissionForm | DocSlot, string>>;
const selectCls = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [&>option]:bg-popover";

function Admission() {
  const { course: requestedCourse } = Route.useSearch();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<AdmissionForm>(() => ({ ...empty, course_id: requestedCourse ?? "" }));
  const [files, setFiles] = useState<Partial<Record<DocSlot, File>>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState("");
  const [reference, setReference] = useState<{ ref: string; token: string } | null>(null);
  const patch = (p: Partial<AdmissionForm>) => setForm((f) => ({ ...f, ...p }));
  const courses = useQuery(coursesQuery());
  useEffect(() => {
    if (requestedCourse) setForm((current) => ({ ...current, course_id: requestedCourse }));
  }, [requestedCourse]);
  const getUploadUrl = useServerFn(createAdmissionUploadUrl);
  const sendReceived = useServerFn(sendAdmissionReceivedEmail);
  const save = useServerFn(submitAdmission);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  const set = (k: keyof AdmissionForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function check(schema: ZodType) {
    const r = schema.safeParse(form);
    if (r.success) { setErrors({}); return true; }
    const errs: Errors = {};
    for (const i of r.error.issues) errs[i.path[0] as keyof Errors] ??= i.message;
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
    const selected = courses.data?.find((c) => c.id === form.course_id);
    if (form.course_id !== NO_COURSE && (!selected || isPreviewOnlyCourse(selected.slug))) {
      setErrors((e) => ({ ...e, course_id: "This course is not available for admission." }));
      setStep(2);
      return;
    }
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
        const res = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } }).catch(() => null);
        if (!res?.ok) throw new Error(`Upload failed for ${slot.label}`);
        documentKeys.push({ type: slot.id, key, name: file.name });
      }
      setProgress("Saving your application...");
      const tokenBytes = crypto.getRandomValues(new Uint8Array(9));
      const accessToken = btoa(String.fromCharCode(...tokenBytes)).replace(/\+/g, "-").replace(/\//g, "_");
      const res = await save({ data: { captcha: captcha ?? "", row: {
        id: admissionId,
        access_token: accessToken,
        division: form.division, district: form.district, upazila: form.upazila,
        union_name: form.union_name.trim(), village: form.village.trim(),
        address_line: form.address_line.trim() || null,
        occupation: form.occupation,
        digital_access: form.digital_access,
        attendance_commitment: Number(form.attendance_commitment),
        education_board: form.education_board, education_group: form.education_group || null,
        education_result: form.education_result.trim() || null, passing_year: form.passing_year || null, session: form.session.trim() || null,
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        date_of_birth: form.date_of_birth,
        gender: form.gender,
        address: composeAddress(form),
        education_level: form.education_level,
        institution: form.institution.trim(),
        course_id: form.course_id === NO_COURSE ? null : form.course_id,
        motivation: form.motivation.trim(),
        document_keys: documentKeys,
      } } });
      if (!res.ok && res.error === "captcha") { setCaptchaReset((n) => n + 1); throw new Error("Security check failed. Please complete the check again."); }
      if (!res.ok && res.error === "duplicate") throw new Error("You have already applied for this course with this email or phone number. Please check your email for your reference number.");
      if (!res.ok && res.error === "closed") throw new Error("Applications for this course are not open right now.");
      if (!res.ok) throw new Error("Could not save your application");
      sendReceived({ data: { admissionId } }).catch(() => undefined);
      setReference({ ref: refOf(admissionId), token: accessToken });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setCaptchaReset((n) => n + 1);
      toast.error(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
      setProgress("");
    }
  }

  if (reference) return <Success reference={reference.ref} token={reference.token} email={form.email} />;

  const courseName = form.course_id === NO_COURSE ? "Not sure yet — advise me" : courses.data?.find((c) => c.id === form.course_id)?.title ?? "";

  return (
    <>
      <PageHero eyebrow="Admission open" title="Free Admission">Five quick steps. No fees, ever.</PageHero>
      <section className="mx-auto max-w-3xl px-4 py-10 md:py-14">
        <ol className="grid grid-cols-5 gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className="min-w-0">
              <div className={`h-1.5 rounded-full transition-colors duration-300 ${i <= step ? "bg-primary" : "bg-muted"}`} />
              <p className={`mt-2 hidden truncate text-xs sm:block ${i === step ? "text-primary" : "text-muted-foreground"}`}>{i + 1}. {s}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted-foreground sm:hidden">Step {step + 1} of 5 · {STEPS[step]}</p>

        <div className="glass mt-8 rounded-md border-t-2 border-t-primary p-5 md:p-8">
          {step === 0 && (
            <Section title="Personal information">
              <Field label="Full name" error={errors.full_name}><Input value={form.full_name} onChange={set("full_name")} autoComplete="name" /></Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Email" error={errors.email}><Input type="email" value={form.email} onChange={set("email")} autoComplete="email" /></Field>
                <Field label="Mobile number" error={errors.phone} hint="Use an active number that also has WhatsApp — recommended so we can reach you quickly."><PhoneInput value={form.phone} onChange={(v) => patch({ phone: v })} /></Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Date of birth" error={errors.date_of_birth}><Input type="date" value={form.date_of_birth} onChange={set("date_of_birth")} /></Field>
                <Field label="Gender" error={errors.gender}>
                  <select className={selectCls} value={form.gender} onChange={set("gender")}>
                    <option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                  </select>
                </Field>
              </div>
              <Field label="Occupation" error={errors.occupation}>
                <select className={selectCls} value={form.occupation} onChange={set("occupation")}>
                  <option value="">Select your current occupation</option>
                  {OCCUPATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
              <h3 className="pt-2 text-sm uppercase text-muted-foreground">Present address</h3>
              <AddressPicker value={form} onChange={patch} errors={errors} />
            </Section>
          )}

          {step === 1 && (
            <Section title="Education">
              <EducationFields value={form} onChange={patch} errors={errors} />
            </Section>
          )}

          {step === 2 && (
            <Section title="Choose a course">
              {errors.course_id && <p className="text-xs text-destructive">{errors.course_id}</p>}
              <div className="grid gap-3">
                {courses.isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 bg-muted" />) : (
                  [...(courses.data ?? []).filter((c) => !isPreviewOnlyCourse(c.slug)).map((c) => ({ id: c.id, title: c.title, sub: [c.slug === TEST_ENROLLMENT_SLUG ? "Demo · test applications only" : "", c.duration, c.level].filter(Boolean).join(" · ") })),
                   { id: NO_COURSE, title: "Not sure yet — advise me", sub: "Our team will suggest the best fit" }].map((c) => (
                    <Button type="button" variant="outline" key={c.id} onClick={() => setForm((f) => ({ ...f, course_id: c.id }))}
                      className={`h-auto min-h-16 w-full justify-between gap-3 whitespace-normal rounded-md p-4 text-left transition-colors ${form.course_id === c.id ? "border-primary bg-primary/10" : "hover:border-primary/60"}`}>
                      <span className="min-w-0"><span className="block font-medium">{c.title}</span>{c.sub && <span className="text-xs text-muted-foreground">{c.sub}</span>}</span>
                      {form.course_id === c.id && <Check className="h-5 w-5 shrink-0 text-primary" />}
                    </Button>
                  ))
                )}
              </div>
              <Field label="Why do you want to join?" error={errors.motivation}><Textarea rows={4} value={form.motivation} onChange={set("motivation")} /></Field>
              <h3 className="pt-2 text-sm uppercase text-muted-foreground">Learning readiness</h3>
              <Field label="Which devices can you use for learning?" error={errors.digital_access} hint="Select all that apply.">
                <DeviceChecks options={DIGITAL_DEVICES} value={form.digital_access} onChange={(v) => patch({ digital_access: v })} />
              </Field>
              <Field label="Do you agree to attend classes regularly? Choose your minimum attendance." error={errors.attendance_commitment} hint="Regular attendance is required to complete the course and earn a certificate.">
                <AttendancePicker options={ATTENDANCE_OPTIONS} value={form.attendance_commitment} onChange={(v) => patch({ attendance_commitment: v })} />
              </Field>
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
                        <Button type="button" variant="ghost" size="icon" aria-label="Remove file" onClick={() => setFiles((p) => ({ ...p, [s.id]: undefined }))} className="shrink-0 hover:text-destructive"><X className="h-4 w-4" /></Button>
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
              <Review title="Personal" onEdit={() => setStep(0)} rows={[["Name", form.full_name], ["Email", form.email], ["Mobile", form.phone], ["Date of birth", form.date_of_birth], ["Gender", form.gender], ["Occupation", form.occupation], ["Address", composeAddress(form)]]} />
              <Review title="Education" onEdit={() => setStep(1)} rows={[["Level", form.education_level], ["Board", form.education_board], ["Institution", form.institution], ["Group", form.education_group], [form.session ? "Session" : "Passing year", form.session || form.passing_year], ["Result", form.education_result]]} />
              <Review title="Course" onEdit={() => setStep(2)} rows={[["Course", courseName], ["Motivation", form.motivation], ["Devices", devicesText(form.digital_access)], ["Attendance", attendanceText(form.attendance_commitment)]]} />
              <Review title="Documents" onEdit={() => setStep(3)} rows={DOC_SLOTS.map((s) => [s.label, files[s.id]?.name ?? "—"])} />
            </Section>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button variant="outline" disabled={step === 0 || submitting} onClick={() => setStep((s) => s - 1)}>Back</Button>
            {step < 4 ? (
              <Button onClick={next}>Continue</Button>
            ) : (
              <div className="flex flex-col items-stretch gap-3 sm:items-end">
              <Turnstile onToken={setCaptcha} resetKey={captchaReset} />
              <Button disabled={submitting || !captcha} onClick={submit} className="bg-highlight text-highlight-foreground hover:bg-highlight/90">
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{progress || "Submitting..."}</> : "Submit application"}
              </Button>
              </div>
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

function Review({ title, rows, onEdit }: { title: string; rows: string[][]; onEdit: () => void }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between"><h3 className="text-sm uppercase">{title}</h3><button type="button" onClick={onEdit} className="text-xs text-primary hover:underline">Edit</button></div>
      <dl className="mt-3 grid gap-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[120px_minmax(0,1fr)] gap-3"><dt className="text-muted-foreground">{k}</dt><dd className="break-words">{v || "—"}</dd></div>
        ))}
      </dl>
    </div>
  );
}

function Success({ reference, token, email }: { reference: string; token: string; email: string }) {
  return (
    <section className="bg-grid flex min-h-[70vh] items-center px-4 py-16">
       <div className="glass mx-auto w-full max-w-lg rounded-md border-t-2 border-t-primary p-8 text-center">
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
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild><Link to="/application/$token" params={{ token }}>View my application</Link></Button>
          <Button asChild variant="outline"><Link to="/">Back to home</Link></Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Bookmark your private application link — anyone with it can view your application.</p>
      </div>
    </section>
  );
}
