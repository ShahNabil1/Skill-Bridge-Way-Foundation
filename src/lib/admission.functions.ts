import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const opt = (n: number) => z.string().trim().max(n).nullable();
const input = z.object({
  captcha: z.string().min(10).max(4096),
  row: z.object({
    id: z.string().uuid(),
    access_token: z.string().min(12).max(32).regex(/^[A-Za-z0-9_-]+$/),
    full_name: z.string().trim().min(3).max(120),
    email: z.string().trim().email().max(255),
    phone: z.string().regex(/^01[3-9]\d{8}$/),
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    gender: z.enum(["male", "female", "other"]),
    division: z.string().min(1).max(60), district: z.string().min(1).max(60), upazila: z.string().min(1).max(80),
    address_line: z.string().trim().min(3).max(300), post_office: z.string().trim().min(2).max(100), postal_code: z.string().regex(/^\d{4}$/),
    address: z.string().max(800),
    education_level: z.string().min(1).max(80), institution: z.string().trim().min(2).max(200),
    education_board: z.string().min(1).max(80), education_group: opt(100), education_result: opt(50), passing_year: opt(4), session: opt(20),
    course_id: z.string().uuid().nullable(),
    motivation: z.string().trim().min(20).max(1500),
    document_keys: z.array(z.object({ type: z.enum(["photo", "nid", "certificate"]), key: z.string().max(300).startsWith("admissions/"), name: z.string().max(200) })).max(3),
  }),
});

/** Verifies Cloudflare Turnstile server-side, then saves the application as pending. */
export const submitAdmission = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data }) => {
    const secret = process.env["TURNSTILE_SECRET_KEY"];
    if (!secret) { console.error("TURNSTILE_SECRET_KEY missing"); return { ok: false as const, error: "captcha" as const }; }
    const v = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", body: new URLSearchParams({ secret, response: data.captcha }),
    }).then((r) => r.json() as Promise<{ success: boolean }>).catch(() => ({ success: false }));
    if (!v.success) return { ok: false as const, error: "captcha" as const };
    if (data.row.document_keys.some((d) => !d.key.startsWith(`admissions/${data.row.id}/`))) throw new Error("Invalid documents");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("admissions").insert({ ...data.row, email: data.row.email.toLowerCase(), status: "pending" });
    if (error?.code === "23505") return { ok: false as const, error: "duplicate" as const };
    if (error) { console.error(error.message); return { ok: false as const, error: "save" as const }; }
    return { ok: true as const };
  });
