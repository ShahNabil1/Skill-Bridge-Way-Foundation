import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const idInput = (k: string) => z.object({ [k]: z.string().uuid() });

/** Public: emails the applicant only for a just-created pending application (address comes from the DB, never the caller). */
export const sendAdmissionReceivedEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => idInput("admissionId").parse(d) as { admissionId: string })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: a } = await supabaseAdmin
      .from("admissions")
      .select("id, full_name, email, status, created_at, courses(title)")
      .eq("id", data.admissionId)
      .eq("status", "pending")
      .gte("created_at", since)
      .maybeSingle();
    if (!a) return { sent: false };
    const { sendEmail, templates } = await import("./email.server");
    const course = (a.courses as { title: string } | null)?.title ?? null;
    return sendEmail(a.email, templates.received(a.full_name, `SBF-APP-${a.id.slice(0, 8).toUpperCase()}`, course));
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
      .select("full_name, email, status, courses(title), students(student_code)")
      .eq("id", data.admissionId)
      .maybeSingle();
    const st = a?.students as { student_code: string } | { student_code: string }[] | null | undefined;
    const code = Array.isArray(st) ? st[0]?.student_code : st?.student_code;
    if (!a || a.status !== "approved" || !code) return { sent: false };
    const { sendEmail, templates } = await import("./email.server");
    return sendEmail(a.email, templates.approved(a.full_name, code, (a.courses as { title: string } | null)?.title ?? null));
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
