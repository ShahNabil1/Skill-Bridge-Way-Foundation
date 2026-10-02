import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMISSION_FROM = "Skill Bridgeway Admissions <admission@skillbridgeway.org>";

const idInput = (k: string) => z.object({ [k]: z.string().uuid() });

/** Public: emails the applicant only for a just-created pending application (address comes from the DB, never the caller). */
export const sendAdmissionReceivedEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => idInput("admissionId").parse(d) as { admissionId: string })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: a } = await supabaseAdmin
      .from("admissions")
      .select("id, full_name, email, status, created_at, access_token, courses(title)")
      .eq("id", data.admissionId)
      .eq("status", "pending")
      .gte("created_at", since)
      .maybeSingle();
    if (!a) return { sent: false };
    const { sendEmail, templates } = await import("./email.server");
    const course = (a.courses as { title: string } | null)?.title ?? null;
    return sendEmail(a.email, templates.received(a.full_name, `SBF-APP-${a.id.slice(0, 8).toUpperCase()}`, course, a.access_token), ADMISSION_FROM);
  });

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const sendApprovalEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput("admissionId").parse(d) as { admissionId: string })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: a } = await context.supabase
      .from("admissions")
      .select("full_name, email, status, access_token, courses(title), students(student_code)")
      .eq("id", data.admissionId)
      .maybeSingle();
    const st = a?.students as { student_code: string } | { student_code: string }[] | null | undefined;
    const code = Array.isArray(st) ? st[0]?.student_code : st?.student_code;
    if (!a || a.status !== "approved" || !code) return { sent: false };
    const { sendEmail, templates } = await import("./email.server");
    return sendEmail(a.email, templates.approved(a.full_name, code, (a.courses as { title: string } | null)?.title ?? null, a.access_token), ADMISSION_FROM);
  });

export const sendRejectionEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput("admissionId").parse(d) as { admissionId: string })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: a } = await context.supabase
      .from("admissions")
      .select("id, full_name, email, status, review_note, access_token, courses(title)")
      .eq("id", data.admissionId)
      .maybeSingle();
    if (!a || a.status !== "rejected") return { sent: false };
    const { sendEmail, templates } = await import("./email.server");
    return sendEmail(a.email, templates.rejected(a.full_name, `SBF-APP-${a.id.slice(0, 8).toUpperCase()}`, (a.courses as { title: string } | null)?.title ?? null, a.review_note, a.access_token), ADMISSION_FROM);
  });

export const sendCertificateEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput("certificateId").parse(d) as { certificateId: string })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: c } = await context.supabase
      .from("certificates")
      .select("serial, is_revoked, students(full_name, email), courses(title)")
      .eq("id", data.certificateId)
      .maybeSingle();
    const s = c?.students as { full_name: string; email: string } | null | undefined;
    if (!c || c.is_revoked || !s) return { sent: false };
    const { sendEmail, templates } = await import("./email.server");
    return sendEmail(s.email, templates.certificate(s.full_name, (c.courses as { title: string } | null)?.title ?? null, c.serial));
  });

type EnrollmentMail = { id: string; progress: number; learning_status: string; absence_reminders: boolean; students: { full_name: string; email: string } | null; courses: { title: string } | null };

/** Admin: emails a student their current progress + attendance. */
export const sendProgressEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput("enrollmentId").parse(d) as { enrollmentId: string })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: e } = await context.supabase.from("enrollments")
      .select("id, progress, learning_status, absence_reminders, students(full_name, email), courses(title), attendance(status, class_sessions(session_date))")
      .eq("id", data.enrollmentId).maybeSingle();
    const en = e as unknown as (EnrollmentMail & { attendance: never[] }) | null;
    if (!en?.students) return { sent: false };
    const { attendanceStats } = await import("./student");
    const { sendEmail, templates } = await import("./email.server");
    return sendEmail(en.students.email, templates.progress(en.students.full_name, en.courses?.title ?? null, en.progress, en.learning_status, attendanceStats(en.attendance ?? [])));
  });

/** Admin: after attendance is saved, emails absent students whose reminder toggle is on (once per class). */
export const sendAbsenceReminders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput("sessionId").parse(d) as { sessionId: string })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows } = await context.supabase.from("attendance")
      .select("id, class_sessions(session_date), enrollments(id, progress, learning_status, absence_reminders, students(full_name, email), courses(title), attendance(status, class_sessions(session_date)))")
      .eq("session_id", data.sessionId).eq("status", "absent").is("reminded_at", null);
    const { attendanceStats } = await import("./student");
    const { sendEmail, templates } = await import("./email.server");
    let sent = 0, skipped = 0;
    for (const r of (rows ?? []) as any[]) {
      const en = r.enrollments as (EnrollmentMail & { attendance: never[] }) | null;
      if (!en?.students || !en.absence_reminders || en.learning_status !== "active") { skipped++; continue; }
      const st = attendanceStats(en.attendance ?? []);
      const date = new Date(`${r.class_sessions?.session_date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      const res = await sendEmail(en.students.email, templates.absence(en.students.full_name, en.courses?.title ?? null, date, { ...st, progress: en.progress }));
      if (res.sent) { sent++; await context.supabase.from("attendance").update({ reminded_at: new Date().toISOString() }).eq("id", r.id); } else skipped++;
    }
    return { sent, skipped };
  });
