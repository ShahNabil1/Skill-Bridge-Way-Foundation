import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, Ban, Check, Clock, Copy, Globe, KeyRound, Laptop, Loader2, LogOut, MapPin, MonitorSmartphone, Pencil, Save, ShieldCheck, Smartphone, Trash2, UserCheck, UserCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { confirmAction } from "@/components/ConfirmDialog";
import { usePermissions, useMediaUpload } from "@/components/admin/shared";
import { deleteUserAccount, getUserDetail, resetUserPassword, revokeUserSession, setUserBan, setUserPermissions, updateUserAvatar, updateUserInfo } from "@/lib/users.functions";
import { profileInfoSchema, readProfileInfo, profileHasChanges, formatProfileAddress, strictPhoneInput } from "@/lib/profile-schema";
import { BdFlag } from "@/components/BdFlag";
import { AddressPicker } from "@/components/admission/FormBits";
import { AvatarCropper } from "@/components/auth/AvatarCropper";
import { ValidatedField } from "@/components/auth/ValidatedField";
import { PERMISSION_GROUPS, PRESETS, ALL_PERMISSIONS } from "@/lib/permissions";
import { cdnUrl } from "@/lib/cdn";
import { seo } from "@/components/site/PageHero";

export const Route = createFileRoute("/_authenticated/admin/users/$id")({ staticData: { sitemap: false },
  head: () => seo("Manage User | Skill Bridgeway Foundation", "Private user management.", { noindex: true }),
  component: ManageUser,
});

const dt = (s: string | null | undefined) => (s ? new Date(s).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—");
const dur = (sec: number) => { const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60); return h ? `${h}h ${m}m` : `${m}m`; };

function ManageUser() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const fetchDetail = useServerFn(getUserDetail);
  const { data: u, isLoading, error } = useQuery({ queryKey: ["admin-user", id], queryFn: () => fetchDetail({ data: { id } }) });
  const resetPw = useServerFn(resetUserPassword);
  const ban = useServerFn(setUserBan);
  const del = useServerFn(deleteUserAccount);
  const revoke = useServerFn(revokeUserSession);
  const [busy, setBusy] = useState<string | null>(null);
  const [newPw, setNewPw] = useState<{ password: string; emailed: boolean } | null>(null);

  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-user", id] }); qc.invalidateQueries({ queryKey: ["admin-users"] }); qc.invalidateQueries({ queryKey: ["user-sessions", id] }); qc.invalidateQueries({ queryKey: ["user-audit", id] }); };
  async function run(key: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(key);
    try { await fn(); toast.success(ok); refresh(); } catch (e) { toast.error((e as Error).message); }
    setBusy(null);
  }

  if (isLoading) return <p className="text-muted-foreground">Loading user...</p>;
  if (error || !u) return <div className="glass rounded-xl p-8 text-destructive">{(error as Error)?.message ?? "User not found"}</div>;
  const locked = u.isSuper || u.isSelf;

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-4 gap-1.5"><Link to="/admin/users"><ArrowLeft className="h-4 w-4" />All users</Link></Button>
      <section className="glass relative mb-6 overflow-hidden rounded-2xl p-5 md:p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-2xl font-bold text-primary ring-2 ring-primary/40">
              {u.avatar_key ? <img src={cdnUrl(u.avatar_key)!} alt="" className="h-full w-full object-cover" /> : (u.full_name || u.email)[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-heading text-xl font-extrabold text-foreground md:text-2xl">{u.full_name || "Unnamed user"}</h1>
              <p className="truncate text-sm text-muted-foreground">{u.email}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {u.isSuper && <Badge className="gap-1"><ShieldCheck className="h-3 w-3" />Super Admin</Badge>}
                {u.banned ? <Badge variant="destructive">Banned</Badge> : !u.last_sign_in_at ? <Badge variant="secondary">Invited</Badge> : <Badge className="bg-primary/15 text-primary hover:bg-primary/15">Active</Badge>}
                {u.isSelf && <Badge variant="outline">You</Badge>}
                <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Last sign-in {dt(u.last_sign_in_at)}</Badge>
              </div>
            </div>
          </div>
          {!locked && <div className="flex flex-wrap gap-2">
            {can("users.reset_password") && <Button variant="outline" className="gap-1.5" disabled={!!busy} onClick={async () => {
              if (!(await confirmAction({ title: "Reset password?", description: `A new password will be generated, emailed to ${u.email}, and all their sessions will be signed out.`, confirmText: "Reset password" }))) return;
              setBusy("pw");
              try { setNewPw(await resetPw({ data: { id } })); refresh(); } catch (e) { toast.error((e as Error).message); }
              setBusy(null);
            }}>{busy === "pw" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}Reset password</Button>}
            {can("users.ban") && (u.banned
              ? <Button variant="outline" className="gap-1.5" disabled={!!busy} onClick={() => run("ban", () => ban({ data: { id, ban: false } }), "User unbanned")}>{busy === "ban" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}Unban</Button>
              : <Button variant="outline" className="gap-1.5 border-highlight/50 text-highlight hover:bg-highlight/10" disabled={!!busy} onClick={async () => {
                  if (!(await confirmAction({ title: "Ban this user?", description: "They will be signed out immediately on every device and can't sign in until unbanned.", confirmText: "Ban user", destructive: true }))) return;
                  run("ban", () => ban({ data: { id, ban: true } }), "User banned and signed out");
                }}>{busy === "ban" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}Ban</Button>)}
            {can("users.delete") && <Button variant="destructive" className="gap-1.5" disabled={!!busy} onClick={async () => {
              if (!(await confirmAction({ title: "Delete this account permanently?", description: `${u.email} will be signed out immediately and the account removed. This can't be undone.`, confirmText: "Delete account", destructive: true }))) return;
              setBusy("del");
              try { await del({ data: { id } }); toast.success("Account deleted"); qc.invalidateQueries({ queryKey: ["admin-users"] }); navigate({ to: "/admin/users" }); } catch (e) { toast.error((e as Error).message); setBusy(null); }
            }}>{busy === "del" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Delete</Button>}
          </div>}
        </div>
        {locked && <p className="relative mt-4 text-xs text-muted-foreground">{u.isSuper ? "The Super Admin account is protected and can't be banned, deleted or have its access changed." : "You can't ban, delete or change permissions on your own account."}</p>}
      </section>

      <Tabs defaultValue="profile">
        <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          {can("users.sessions") && <TabsTrigger value="sessions">Sessions</TabsTrigger>}
          {can("users.activity") && <TabsTrigger value="activity">Activity & reports</TabsTrigger>}
          <TabsTrigger value="audit">Audit log</TabsTrigger>
        </TabsList>
        <TabsContent value="profile"><ProfileTab u={u} canEdit={can("users.edit") && !u.isSuper} onSaved={refresh} /></TabsContent>
        <TabsContent value="permissions"><PermissionsTab id={id} initial={u.permissions} locked={locked || !can("users.permissions")} lockedReason={u.isSuper ? "Super Admin always has full access." : u.isSelf ? "You can't change your own permissions." : "You don't have permission to change access."} onSaved={refresh} /></TabsContent>
        {can("users.sessions") && <TabsContent value="sessions"><SessionsTab id={id} canRevoke={!u.isSuper} revoke={(sessionId) => run(sessionId ?? "all", () => revoke({ data: { id, sessionId } }), sessionId ? "Session signed out" : "Signed out everywhere")} busy={busy} /></TabsContent>}
        {can("users.activity") && <TabsContent value="activity"><ActivityTab id={id} /></TabsContent>}
        <TabsContent value="audit"><AuditTab id={id} /></TabsContent>
      </Tabs>

      <Dialog open={!!newPw} onOpenChange={(o) => { if (!o) setNewPw(null); }}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} className="glass sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">New password created</DialogTitle>
            <DialogDescription>{newPw?.emailed ? `It was emailed to ${u.email}.` : "The email could not be sent. Share this password directly."} It is shown only once.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-background/60 p-3">
            <code className="min-w-0 flex-1 break-all font-mono text-lg font-bold tracking-wider text-primary" translate="no">{newPw?.password}</code>
            <Button size="sm" className="gap-1.5" onClick={async () => { await navigator.clipboard.writeText(newPw!.password); toast.success("Password copied"); }}><Copy className="h-4 w-4" />Copy</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

type Detail = Awaited<ReturnType<typeof getUserDetail>>;

function ProfileTab({ u, canEdit, onSaved }: { u: Detail; canEdit: boolean; onSaved: () => void }) {
  const save = useServerFn(updateUserInfo);
  const saveAvatar = useServerFn(updateUserAvatar);
  const upload = useMediaUpload();
  const readSaved = () => readProfileInfo({ full_name: u.full_name, phone: u.phone ?? "", address: u.canPersonal ? (u.address ?? "") : "" });
  const saved = readSaved();
  const [form, setForm] = useState(readSaved);
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [phoneWarning, setPhoneWarning] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<"first_name" | "last_name" | "phone", string>> & Record<string, string | undefined>>({});
  const changed = profileHasChanges(saved, form);
  const src = cdnUrl(u.avatar_key);
  useEffect(() => { if (!edit) setForm(readSaved()); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [u, edit]);
  function cancel() { setForm(saved); setEdit(false); setErrors({}); setPhoneWarning(false); }
  async function onAvatar(file: File) {
    setUploading(true);
    try {
      const key = await upload(file, "avatars");
      await saveAvatar({ data: { id: u.id, avatar_key: key } });
      onSaved();
      toast.success("Avatar updated");
    } catch (err) { toast.error((err as Error).message); }
    finally { setUploading(false); }
  }
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !changed) return;
    const schema = u.canPersonal ? profileInfoSchema : profileInfoSchema.pick({ first_name: true, last_name: true });
    const result = schema.safeParse(form);
    if (!result.success) {
      setErrors(Object.fromEntries(result.error.issues.map((issue) => [issue.path.join("."), issue.message])));
      toast.error(result.error.issues[0]?.message ?? "Check your details"); return;
    }
    const data = result.data as z.infer<typeof profileInfoSchema>;
    setBusy(true);
    try {
      await save({ data: { id: u.id, first_name: data.first_name, last_name: data.last_name, ...(u.canPersonal ? { phone: data.phone, address: data.address } : {}) } });
      toast.success("Changes saved");
      setEdit(false); setErrors({}); setPhoneWarning(false);
      onSaved();
    } catch (err) { toast.error((err as Error).message); }
    setBusy(false);
  }
  const rows: [string, string][] = [["First name", saved.first_name || "—"], ["Last name", saved.last_name || "—"], ["Email", u.email], ["Email confirmed", u.email_confirmed ? "Yes" : "No"],
    ...(u.canPersonal ? [["Phone", saved.phone ? `+88 ${saved.phone}` : "—"], ["Address", formatProfileAddress(saved.address) || "—"]] as [string, string][] : []),
    ["Joined", dt(u.created_at)], ["Last sign-in", dt(u.last_sign_in_at)]];
  return (
    <div className="glass rounded-xl p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-heading text-sm font-bold uppercase text-foreground">Basic info</h2>
        {canEdit && !edit && <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setForm(saved); setEdit(true); }}><Pencil className="h-4 w-4" />Edit info</Button>}
      </div>
      {!edit ? (
        <dl className="grid gap-4 sm:grid-cols-2">{rows.map(([k, v]) => <div key={k}><dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt><dd className="mt-1 break-words text-foreground">{v}</dd></div>)}</dl>
      ) : (
        <form onSubmit={onSubmit} className="space-y-6" aria-busy={busy || uploading}>
          <div className="flex flex-wrap items-center gap-4 border-b border-border pb-5">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary/40 bg-muted">
              {src ? <img src={cdnUrl(u.avatar_key)!} alt="" className="h-full w-full object-cover" /> : <UserCircle className="!h-8 !w-8 text-primary" />}
            </span>
            <AvatarCropper onSave={onAvatar} disabled={busy || uploading} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="mu-first">First Name</Label><ValidatedField id="mu-first" required autoComplete="given-name" maxLength={60} value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} />{errors.first_name && <p className="text-xs text-destructive">{errors.first_name}</p>}</div>
            <div className="space-y-2"><Label htmlFor="mu-last">Last Name</Label><ValidatedField id="mu-last" required autoComplete="family-name" maxLength={59} value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} />{errors.last_name && <p className="text-xs text-destructive">{errors.last_name}</p>}</div>
          </div>
          {u.canPersonal && <>
            <div className="max-w-md space-y-2"><Label htmlFor="mu-phone">Phone</Label>
              <div className="flex overflow-hidden rounded-md border border-input focus-within:ring-2 focus-within:ring-ring">
                <span className="flex shrink-0 items-center gap-2 border-r border-input bg-muted px-3"><BdFlag /><span>+88</span></span>
                <Input id="mu-phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="017XXXXXXXX" value={form.phone} className="min-w-0 rounded-none border-0 focus-visible:ring-0" aria-invalid={!!errors.phone} onChange={(e) => { const next = strictPhoneInput(e.target.value); setPhoneWarning(next.warning); setForm({ ...form, phone: next.value }); }} />
              </div>
              <p className="text-xs text-muted-foreground">11 digits · starts with 013–019</p>
              {phoneWarning && <p role="status" className="flex items-center gap-2 text-xs text-highlight"><AlertCircle className="h-4 w-4" />Use English digits only. Other characters are not accepted.</p>}
              {errors.phone && <p role="alert" className="text-xs text-destructive">{errors.phone}</p>}
            </div>
            <div className="space-y-4 border-t border-border pt-5"><h3 className="flex items-center gap-2 text-sm text-primary"><MapPin className="h-4 w-4" />Address</h3>
              <AddressPicker value={form.address} onChange={(patch) => setForm({ ...form, address: { ...form.address, ...patch } })} errors={Object.fromEntries(Object.entries(errors).filter(([key]) => key.startsWith("address.")).map(([key, value]) => [key.slice(8), value]))} />
            </div>
          </>}
          <div className="flex flex-wrap gap-3 border-t border-border pt-5">
            <Button type="submit" disabled={busy || uploading || !changed} className="gap-1.5">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{busy ? "Saving changes…" : "Save changes"}</Button>
            <Button type="button" variant="ghost" disabled={busy || uploading} onClick={cancel}><X className="h-4 w-4" />Cancel</Button>
          </div>
        </form>
      )}
    </div>
  );
}

function PermissionsTab({ id, initial, locked, lockedReason, onSaved }: { id: string; initial: string[]; locked: boolean; lockedReason: string; onSaved: () => void }) {
  const save = useServerFn(setUserPermissions);
  const [sel, setSel] = useState(() => new Set(initial));
  const [saving, setSaving] = useState(false);
  useEffect(() => { setSel(new Set(initial)); }, [initial]);
  const dirty = sel.size !== initial.length || initial.some((p) => !sel.has(p));
  const toggle = (k: string, on: boolean) => setSel((s) => { const n = new Set(s); on ? n.add(k) : n.delete(k); return n; });
  const preset = PRESETS.find((p) => p.perms.length === sel.size && p.perms.every((k) => sel.has(k)));
  return (
    <div className="space-y-4">
      <div className="glass rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-heading text-sm font-bold uppercase text-foreground">Access level</h2>
            <p className="text-sm text-muted-foreground">{preset ? preset.label : "Custom"} · {sel.size} of {ALL_PERMISSIONS.length} permissions</p></div>
          {!locked && <div className="flex flex-wrap gap-2">{PRESETS.map((p) => <Button key={p.key} size="sm" variant={preset?.key === p.key ? "default" : "outline"} title={p.description} onClick={() => setSel(new Set(p.perms))}>{p.label}</Button>)}</div>}
        </div>
        {locked && <p className="mt-3 text-xs text-muted-foreground">{lockedReason}</p>}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {PERMISSION_GROUPS.map((g) => {
          const on = g.perms.filter((p) => sel.has(p.key)).length;
          const all = on === g.perms.length;
          return (
            <fieldset key={g.key} className="glass rounded-xl p-4" disabled={locked}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <legend className="font-heading text-sm font-bold uppercase text-foreground">{g.label}</legend>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={all ? "border-primary/50 text-primary" : on ? "border-highlight/50 text-highlight" : ""}>{all ? "Full" : on ? "Partial" : "None"}</Badge>
                  {!locked && <button type="button" className="text-xs text-primary hover:underline" onClick={() => g.perms.forEach((p) => toggle(p.key, !all))}>{all ? "Clear" : "All"}</button>}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {g.perms.map((p) => (
                  <label key={p.key} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted/50 has-[:checked]:text-foreground">
                    <Checkbox checked={sel.has(p.key)} onCheckedChange={(v) => toggle(p.key, v === true)} />{p.label}
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}
      </div>
      {!locked && <div className="sticky bottom-4 flex justify-end gap-2">
        <Button variant="ghost" disabled={!dirty || saving} onClick={() => setSel(new Set(initial))}>Cancel</Button>
        <Button disabled={!dirty || saving} className="cta-shine gap-1.5" onClick={async () => {
          setSaving(true);
          try { const r = await save({ data: { id, permissions: [...sel] } }); toast.success(`Permissions updated (+${r.added} / −${r.removed})`); onSaved(); } catch (e) { toast.error((e as Error).message); }
          setSaving(false);
        }}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Save permissions</Button>
      </div>}
    </div>
  );
}

function SessionsTab({ id, canRevoke, revoke, busy }: { id: string; canRevoke: boolean; revoke: (sessionId?: string) => void; busy: string | null }) {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["user-sessions", id],
    queryFn: async () => {
      const { data, error } = await (supabase.from("user_sessions" as any) as any).select("*").eq("user_id", id).order("last_seen_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data as { id: string; ip: string | null; device: string | null; browser: string | null; os: string | null; city: string | null; region: string | null; country: string | null; created_at: string; last_seen_at: string; revoked_at: string | null; revoke_reason: string | null }[];
    },
    refetchInterval: 30_000,
  });
  useEffect(() => {
    const ch = supabase.channel(`admin-sessions-${id}`).on("postgres_changes", { event: "*", schema: "public", table: "user_sessions", filter: `user_id=eq.${id}` }, () => qc.invalidateQueries({ queryKey: ["user-sessions", id] })).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);
  const active = data.filter((s) => !s.revoked_at);
  const online = (s: { last_seen_at: string }) => Date.now() - new Date(s.last_seen_at).getTime() < 3 * 60_000;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{active.length} active session{active.length === 1 ? "" : "s"} · {data.length - active.length} ended</p>
        {canRevoke && active.length > 0 && <Button variant="outline" className="gap-1.5 border-destructive/50 text-destructive hover:bg-destructive/10" disabled={!!busy} onClick={async () => {
          if (await confirmAction({ title: "Sign out everywhere?", description: "Every device will be signed out immediately.", confirmText: "Sign out all", destructive: true })) revoke();
        }}>{busy === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}Sign out everywhere</Button>}
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Loading sessions...</p>}
      {!isLoading && !data.length && <div className="glass rounded-xl p-6 text-sm text-muted-foreground">No sessions recorded yet. Sessions appear after the user signs in to the admin panel.</div>}
      <div className="grid gap-3 md:grid-cols-2">
        {data.map((s) => {
          const Icon = s.device === "Mobile" ? Smartphone : s.device === "Tablet" ? MonitorSmartphone : Laptop;
          const place = [s.city, s.region, s.country].filter(Boolean).join(", ");
          return (
            <div key={s.id} className={`glass rounded-xl p-4 ${s.revoked_at ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"><Icon className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{s.browser ?? "Browser"} on {s.os ?? "Unknown"} <span className="text-xs text-muted-foreground">· {s.device}</span></p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground" translate="no"><Globe className="h-3 w-3" />{s.ip ?? "IP unavailable"}{place ? ` · ${place}` : ""}</p>
                  </div>
                </div>
                {s.revoked_at ? <Badge variant="secondary">Ended{s.revoke_reason ? ` · ${s.revoke_reason.replace("_", " ")}` : ""}</Badge>
                  : online(s) ? <Badge className="gap-1 bg-primary/15 text-primary hover:bg-primary/15"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />Online</Badge> : <Badge variant="outline">Idle</Badge>}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Started {dt(s.created_at)} · Last active {dt(s.last_seen_at)}</span>
                {canRevoke && !s.revoked_at && <Button size="sm" variant="ghost" className="h-7 gap-1 text-destructive hover:bg-destructive/10" disabled={!!busy} onClick={() => revoke(s.id)}>{busy === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}Sign out</Button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type Report = { total_seconds: number; sessions: number; actions: number; by_day: { day: string; seconds: number }[]; by_page: { page: string; seconds: number }[]; timeline: { at: string; source: string; action: string; detail: Record<string, unknown> }[] };

function rangeFor(key: string, from: string, to: string): [Date, Date] {
  const now = new Date(); const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = sod(now);
  switch (key) {
    case "today": return [today, now];
    case "yesterday": { const y = new Date(today); y.setDate(y.getDate() - 1); return [y, new Date(today.getTime() - 1)]; }
    case "week": { const w = new Date(today); w.setDate(w.getDate() - ((w.getDay() + 6) % 7)); return [w, now]; }
    case "month": return [new Date(now.getFullYear(), now.getMonth(), 1), now];
    case "last30": { const d = new Date(today); d.setDate(d.getDate() - 29); return [d, now]; }
    default: return [from ? new Date(from) : today, to ? new Date(new Date(to).getTime() + 86_399_999) : now];
  }
}

function ActivityTab({ id }: { id: string }) {
  const [range, setRange] = useState("week");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [shown, setShown] = useState(20);
  const [start, end] = useMemo(() => rangeFor(range, from, to), [range, from, to]);
  const { data, isLoading, error } = useQuery({
    queryKey: ["user-report", id, start.toISOString().slice(0, 13), end.toISOString().slice(0, 13)],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("user_activity_report" as any, { _user_id: id, _from: start.toISOString(), _to: end.toISOString() });
      if (error) throw error;
      return data as Report;
    },
  });
  const max = Math.max(1, ...(data?.by_day ?? []).map((d) => d.seconds));
  const pageMax = Math.max(1, ...(data?.by_page ?? []).map((d) => d.seconds));
  const ranges = [["today", "Today"], ["yesterday", "Yesterday"], ["week", "This week"], ["month", "This month"], ["last30", "Last 30 days"], ["custom", "Custom"]];
  return (
    <div className="space-y-4">
      <div className="glass flex flex-wrap items-end gap-2 rounded-xl p-4">
        {ranges.map(([k, l]) => <Button key={k} size="sm" variant={range === k ? "default" : "outline"} onClick={() => { setRange(k!); setShown(20); }}>{l}</Button>)}
        {range === "custom" && <div className="flex flex-wrap gap-2">
          <div><Label htmlFor="r-from" className="text-xs">From</Label><Input id="r-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" /></div>
          <div><Label htmlFor="r-to" className="text-xs">To</Label><Input id="r-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" /></div>
        </div>}
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Loading report...</p>}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
      {data && <>
        <div className="grid gap-3 sm:grid-cols-3">
          {[["Active time", dur(data.total_seconds)], ["Sessions", String(data.sessions)], ["Actions", String(data.actions)]].map(([k, v]) => (
            <div key={k} className="glass rounded-xl p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{k}</p><p className="mt-1 font-heading text-2xl font-extrabold text-primary">{v}</p></div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="glass rounded-xl p-4">
            <h3 className="mb-3 font-heading text-sm font-bold uppercase text-foreground">Daily active time</h3>
            {!data.by_day.length ? <p className="text-sm text-muted-foreground">No activity in this range.</p> : (
              <div className="flex h-44 items-end gap-1 overflow-x-auto">
                {data.by_day.map((d) => (
                  <div key={d.day} className="flex min-w-7 flex-1 flex-col items-center gap-1" title={`${d.day}: ${dur(d.seconds)}`}>
                    <div className="w-full rounded-t bg-gradient-to-t from-primary/60 to-primary transition-all" style={{ height: `${Math.max(4, (d.seconds / max) * 140)}px` }} />
                    <span className="text-[10px] text-muted-foreground">{new Date(d.day).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="glass rounded-xl p-4">
            <h3 className="mb-3 font-heading text-sm font-bold uppercase text-foreground">Time by page</h3>
            {!data.by_page.length ? <p className="text-sm text-muted-foreground">No pages visited.</p> : (
              <ul className="space-y-2">{data.by_page.map((p) => (
                <li key={p.page}><div className="flex justify-between text-xs"><span className="truncate text-foreground" translate="no">{p.page}</span><span className="text-muted-foreground">{dur(p.seconds)}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${(p.seconds / pageMax) * 100}%` }} /></div></li>
              ))}</ul>
            )}
          </div>
        </div>
        <div className="glass rounded-xl p-4">
          <h3 className="mb-3 font-heading text-sm font-bold uppercase text-foreground">What they did</h3>
          {!data.timeline.length ? <p className="text-sm text-muted-foreground">No actions in this range.</p> : (
            <ol className="relative space-y-3 border-l border-border pl-5">
              {data.timeline.slice(0, shown).map((t, i) => (
                <li key={i} className="relative">
                  <span className={`absolute -left-[25px] top-1.5 h-3 w-3 rounded-full ring-4 ring-background ${t.source === "page" ? "bg-muted-foreground" : "bg-primary"}`} />
                  <p className="text-sm text-foreground"><span className="capitalize">{t.action.replace(/_/g, " ")}</span>{t.source === "page" ? <span className="text-muted-foreground" translate="no"> {String(t.detail?.["page"] ?? "")}</span> : <span className="text-muted-foreground"> · {t.source}</span>}</p>
                  <p className="text-xs text-muted-foreground">{dt(t.at)}</p>
                </li>
              ))}
            </ol>
          )}
          {data.timeline.length > shown && <Button size="sm" variant="outline" className="mt-3" onClick={() => setShown((n) => n + 20)}>See more</Button>}
        </div>
      </>}
    </div>
  );
}

function AuditTab({ id }: { id: string }) {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["user-audit", id],
    queryFn: async () => {
      const { data, error } = await (supabase.from("user_admin_audit" as any) as any).select("*").eq("target_user_id", id).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data as { id: string; actor_name: string | null; action: string; detail: any; created_at: string }[];
    },
  });
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  if (!data.length) return <div className="glass rounded-xl p-6 text-sm text-muted-foreground">No changes recorded for this account yet.</div>;
  return (
    <ol className="glass relative space-y-3 rounded-xl border-l border-border p-5 pl-8">
      {data.map((a) => (
        <li key={a.id} className="relative">
          <span className="absolute -left-[25px] top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
          <p className="text-sm text-foreground"><b>{a.actor_name ?? "Admin"}</b> <span className="text-muted-foreground">{a.action.replace(/_/g, " ")}</span>
            {a.detail?.added?.length || a.detail?.removed?.length ? <span className="text-xs text-muted-foreground"> (+{a.detail.added?.length ?? 0} / −{a.detail.removed?.length ?? 0})</span> : null}</p>
          <p className="text-xs text-muted-foreground">{dt(a.created_at)}</p>
        </li>
      ))}
    </ol>
  );
}
