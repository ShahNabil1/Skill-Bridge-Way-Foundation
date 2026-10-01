import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Public: the Turnstile site key is not secret; it's stored in project secrets for easy rotation. */
export const getTurnstileSiteKey = createServerFn({ method: "GET" }).handler(async () => {
  return process.env["NEXT_PUBLIC_TURNSTILE_SITE_KEY"] ?? process.env["TURNSTILE_SITE_KEY"] ?? null;
});

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    if (error) throw new Error(error.message);
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const admins = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
    return data.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      invited: !u.last_sign_in_at,
      isAdmin: admins.has(u.id),
      isSuper: (u.email ?? "").toLowerCase() === "toolsai674@gmail.com",
    }));
  });

const inviteInput = z.object({
  email: z.string().trim().email().max(255),
  full_name: z.string().trim().min(2).max(120),
  makeAdmin: z.boolean(),
});

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inviteInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const origin = getRequestHeader("origin") ?? "https://skillbridgeway.org";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: res, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      data: { full_name: data.full_name },
      redirectTo: `${origin}/auth?mode=invite`,
    });
    if (error) throw new Error(error.message);
    if (data.makeAdmin && res.user) {
      await supabaseAdmin.from("user_roles").insert({ user_id: res.user.id, role: "admin" });
    }
    return { ok: true };
  });
