import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { profileAddressSchema } from "./profile-schema";
import { ALL_PERMISSIONS } from "@/lib/permissions";

const SUPER = "toolsai674@gmail.com";
type Ctx = { supabase: any; userId: string; claims: any };

async function need(ctx: Ctx, perm: string) {
  const { data } = await ctx.supabase.rpc("has_permission", { _user_id: ctx.userId, _perm: perm });
  if (!data) throw new Error("You don't have permission to do this.");
}
async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}
async function getTarget(id: string) {
  const sb = await admin();
  const { data, error } = await sb.auth.admin.getUserById(id);
  if (error || !data.user) throw new Error("User not found");
  return data.user;
}
function guardTarget(ctx: Ctx, user: { id: string; email?: string }, allowSelf = false) {
  if ((user.email ?? "").toLowerCase() === SUPER) throw new Error("The Super Admin account can't be changed.");
  if (!allowSelf && user.id === ctx.userId) throw new Error("You can't do this to your own account.");
}
async function audit(ctx: Ctx, target: string, action: string, detail: Record<string, unknown> = {}) {
  const sb = await admin();
  const { data: p } = await sb.from("profiles").select("full_name, email").eq("id", ctx.userId).maybeSingle();
  await sb.from("user_admin_audit").insert({ actor_id: ctx.userId, actor_name: p?.full_name || p?.email || "Admin", target_user_id: target, action, detail: detail as any });
}
async function endSessions(userId: string, reason: string, rowId?: string) {
  const sb = await admin();
  let authSession: string | null = null;
  if (rowId) {
    const { data } = await sb.from("user_sessions").select("auth_session_id").eq("id", rowId).eq("user_id", userId).maybeSingle();
    authSession = data?.auth_session_id ?? null;
    await sb.from("user_sessions").update({ revoked_at: new Date().toISOString(), revoke_reason: reason }).eq("id", rowId).is("revoked_at", null);
    if (authSession) await sb.rpc("admin_end_auth_sessions", { _user_id: userId, _session_id: authSession });
  } else {
    await sb.from("user_sessions").update({ revoked_at: new Date().toISOString(), revoke_reason: reason }).eq("user_id", userId).is("revoked_at", null);
    await sb.rpc("admin_end_auth_sessions", { _user_id: userId });
  }
}
const isBanned = (u: { banned_until?: string | null }) => !!u.banned_until && new Date(u.banned_until) > new Date();

export const listUsers = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await need(context, "users.view");
  const sb = await admin();
  const { data, error } = await sb.auth.admin.listUsers({ perPage: 500 });
  if (error) throw new Error(error.message);
  const [{ data: perms }, { data: profiles }] = await Promise.all([
    sb.from("user_permissions").select("user_id"),
    sb.from("profiles").select("id, full_name, avatar_key"),
  ]);
  const count = new Map<string, number>();
  (perms ?? []).forEach((p) => count.set(p.user_id, (count.get(p.user_id) ?? 0) + 1));
  const prof = new Map((profiles ?? []).map((p) => [p.id, p]));
  return data.users.map((u) => {
    const isSuper = (u.email ?? "").toLowerCase() === SUPER;
    return {
      id: u.id, email: u.email ?? "", full_name: prof.get(u.id)?.full_name ?? "", avatar_key: prof.get(u.id)?.avatar_key ?? null,
      created_at: u.created_at, last_sign_in_at: u.last_sign_in_at ?? null,
      invited: !u.last_sign_in_at, banned: isBanned(u as any), isSuper,
      permissionCount: isSuper ? ALL_PERMISSIONS.length : count.get(u.id) ?? 0,
    };
  });
});

const idInput = z.object({ id: z.string().uuid() });

export const getUserDetail = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    await need(context, "users.manage");
    const { data: canPersonal } = await context.supabase.rpc("has_permission", { _user_id: context.userId, _perm: "users.personal" });
    const u = await getTarget(data.id);
    const sb = await admin();
    const [{ data: p }, { data: perms }] = await Promise.all([
      sb.from("profiles").select("full_name, phone, address, avatar_key").eq("id", data.id).maybeSingle(),
      sb.from("user_permissions").select("permission").eq("user_id", data.id),
    ]);
    const isSuper = (u.email ?? "").toLowerCase() === SUPER;
    return {
      id: u.id, email: u.email ?? "", created_at: u.created_at, last_sign_in_at: u.last_sign_in_at ?? null,
      email_confirmed: !!u.email_confirmed_at, banned: isBanned(u as any), banned_until: (u as any).banned_until ?? null,
      isSuper, isSelf: u.id === context.userId,
      full_name: p?.full_name ?? "", avatar_key: p?.avatar_key ?? null,
      phone: canPersonal ? p?.phone ?? "" : null, address: canPersonal ? p?.address ?? "" : null, canPersonal: !!canPersonal,
      permissions: isSuper ? ALL_PERMISSIONS : (perms ?? []).map((r) => r.permission),
    };
  });

export const inviteUser = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    email: z.string().trim().email().max(255), full_name: z.string().trim().min(2).max(120),
    permissions: z.array(z.string()).max(100),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await need(context, "users.invite");
    const perms = data.permissions.filter((p) => ALL_PERMISSIONS.includes(p));
    if (perms.length) await need(context, "users.permissions");
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const origin = getRequestHeader("origin") ?? "https://skillbridgeway.org";
    const sb = await admin();
    const { data: res, error } = await sb.auth.admin.inviteUserByEmail(data.email, { data: { full_name: data.full_name }, redirectTo: `${origin}/auth?mode=invite` });
    if (error) throw new Error(error.message);
    if (res.user && perms.length) {
      await sb.from("user_permissions").insert(perms.map((permission) => ({ user_id: res.user!.id, permission, granted_by: context.userId })));
      await sb.from("user_roles").upsert({ user_id: res.user.id, role: "admin" }, { onConflict: "user_id,role", ignoreDuplicates: true });
    }
    if (res.user) await audit(context, res.user.id, "invited", { email: data.email, permissions: perms.length });
    return { ok: true };
  });

export const setUserPermissions = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), permissions: z.array(z.string()).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    await need(context, "users.permissions");
    const u = await getTarget(data.id);
    guardTarget(context, u);
    const next = [...new Set(data.permissions.filter((p) => ALL_PERMISSIONS.includes(p)))];
    const sb = await admin();
    const { data: cur } = await sb.from("user_permissions").select("permission").eq("user_id", data.id);
    const before = new Set((cur ?? []).map((r) => r.permission));
    const added = next.filter((p) => !before.has(p));
    const removed = [...before].filter((p) => !next.includes(p));
    if (removed.length) await sb.from("user_permissions").delete().eq("user_id", data.id).in("permission", removed);
    if (added.length) await sb.from("user_permissions").insert(added.map((permission) => ({ user_id: data.id, permission, granted_by: context.userId })));
    if (next.length) await sb.from("user_roles").upsert({ user_id: data.id, role: "admin" }, { onConflict: "user_id,role", ignoreDuplicates: true });
    else await sb.from("user_roles").delete().eq("user_id", data.id).eq("role", "admin");
    if (added.length || removed.length) await audit(context, data.id, "permissions_changed", { added, removed });
    return { added: added.length, removed: removed.length };
  });

export const updateUserInfo = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    first_name: z.string().max(60),
    last_name: z.string().max(59),
    phone: z.string().max(11).optional(),
    address: profileAddressSchema.optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await need(context, "users.edit");
    const u = await getTarget(data.id);
    guardTarget(context, u, true);
    if (data.phone !== undefined || data.address !== undefined) await need(context, "users.personal");
    const base = profileInfoSchema.pick({ first_name: true, last_name: true, phone: true }).partial({ phone: true })
      .parse({ first_name: data.first_name, last_name: data.last_name, phone: data.phone });
    const patch: Record<string, string> = { full_name: `${base.first_name} ${base.last_name}` };
    if (base.phone !== undefined) patch.phone = base.phone;
    if (data.address !== undefined) patch.address = JSON.stringify(data.address);
    const sb = await admin();
    const { error } = await sb.from("profiles").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context, data.id, "info_edited", { fields: Object.keys(patch) });
    return { ok: true };
  });

export const updateUserAvatar = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), avatar_key: z.string().max(300).nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    await need(context, "users.edit");
    const u = await getTarget(data.id);
    guardTarget(context, u, true);
    const sb = await admin();
    const { error } = await sb.from("profiles").update({ avatar_key: data.avatar_key }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context, data.id, "info_edited", { fields: ["avatar_key"] });
    return { ok: true };
  });

function strongPassword() {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "!@#$%&*?"];
  const all = sets.join("");
  const rnd = (n: number) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0]! % n; };
  const chars = sets.map((s) => s[rnd(s.length)]!);
  while (chars.length < 14) chars.push(all[rnd(all.length)]!);
  for (let i = chars.length - 1; i > 0; i--) { const j = rnd(i + 1); [chars[i], chars[j]] = [chars[j]!, chars[i]!]; }
  return chars.join("");
}

export const resetUserPassword = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    await need(context, "users.reset_password");
    const u = await getTarget(data.id);
    guardTarget(context, u);
    const password = strongPassword();
    const sb = await admin();
    const { error } = await sb.auth.admin.updateUserById(data.id, { password });
    if (error) throw new Error(error.message);
    await endSessions(data.id, "password_reset");
    const { data: p } = await sb.from("profiles").select("full_name").eq("id", data.id).maybeSingle();
    const { sendEmail, adminPasswordResetEmail } = await import("@/lib/email.server");
    const mail = await sendEmail(u.email!, adminPasswordResetEmail(p?.full_name ?? "", password));
    await audit(context, data.id, "password_reset", { emailed: mail.sent });
    return { password, emailed: mail.sent };
  });

export const setUserBan = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), ban: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await need(context, "users.ban");
    const u = await getTarget(data.id);
    guardTarget(context, u);
    const sb = await admin();
    const { error } = await sb.auth.admin.updateUserById(data.id, { ban_duration: data.ban ? "876000h" : "none" } as any);
    if (error) throw new Error(error.message);
    if (data.ban) await endSessions(data.id, "banned");
    await audit(context, data.id, data.ban ? "banned" : "unbanned");
    return { ok: true };
  });

export const deleteUserAccount = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    await need(context, "users.delete");
    const u = await getTarget(data.id);
    guardTarget(context, u);
    await endSessions(data.id, "deleted");
    await audit(context, data.id, "deleted", { email: u.email });
    const sb = await admin();
    await sb.from("user_permissions").delete().eq("user_id", data.id);
    await sb.from("profiles").delete().eq("id", data.id);
    const { error } = await sb.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeUserSession = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), sessionId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await need(context, "users.sessions");
    const u = await getTarget(data.id);
    guardTarget(context, u, true);
    await endSessions(data.id, "revoked", data.sessionId);
    await audit(context, data.id, data.sessionId ? "session_revoked" : "all_sessions_revoked");
    return { ok: true };
  });

/* ---------- session heartbeat (any signed-in admin user) ---------- */
function parseUA(ua: string) {
  const os = /Windows/i.test(ua) ? "Windows" : /Android/i.test(ua) ? "Android" : /iPhone|iPad|iOS/i.test(ua) ? "iOS" : /Mac OS X|Macintosh/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : "Unknown";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Unknown";
  const device = /iPad|Tablet/i.test(ua) ? "Tablet" : /Mobi|Android|iPhone/i.test(ua) ? "Mobile" : "Desktop";
  return { os, browser, device };
}

export const sessionHeartbeat = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ page: z.string().max(200), seconds: z.number().int().min(0).max(120), pageView: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const sid = (context.claims as any)?.session_id as string | undefined;
    if (!sid) return { revoked: null as string | null, sessionRow: null as string | null };
    const sb = await admin();
    const { data: existing } = await sb.from("user_sessions").select("id, revoked_at, revoke_reason").eq("auth_session_id", sid).maybeSingle();
    if (existing?.revoked_at) return { revoked: existing.revoke_reason ?? "revoked", sessionRow: existing.id };
    let rowId = existing?.id ?? null;
    if (!rowId) {
      const { getRequestHeader } = await import("@tanstack/react-start/server");
      const ua = getRequestHeader("user-agent") ?? "";
      const ip = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-real-ip") ?? getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
      const { data: row } = await sb.from("user_sessions").upsert({
        user_id: context.userId, auth_session_id: sid, ip, user_agent: ua.slice(0, 400), ...parseUA(ua),
        city: getRequestHeader("cf-ipcity") ?? null, region: getRequestHeader("cf-region") ?? null, country: getRequestHeader("cf-ipcountry") ?? null,
      }, { onConflict: "auth_session_id" }).select("id").single();
      rowId = row?.id ?? null;
    } else {
      await sb.from("user_sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", rowId);
    }
    const rows: any[] = [];
    if (data.seconds > 0) rows.push({ user_id: context.userId, session_id: rowId, kind: "heartbeat", page: data.page, seconds: data.seconds });
    if (data.pageView) rows.push({ user_id: context.userId, session_id: rowId, kind: "page", page: data.page, seconds: 0 });
    if (rows.length) await sb.from("user_activity").insert(rows);
    return { revoked: null, sessionRow: rowId };
  });
