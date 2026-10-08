import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserCircle, Pencil, Save, X, Loader2, LockKeyhole, Mail, ArrowUpRight, Phone, MapPin, AlertCircle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BdFlag } from "@/components/BdFlag";
import { AddressPicker } from "@/components/admission/FormBits";
import { Input } from "@/components/ui/input";
import { profileInfoSchema, readProfileInfo, profileHasChanges, formatProfileAddress, strictPhoneInput } from "@/lib/profile-schema";
import { saveProfileInfo } from "@/lib/profile.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { OtpField, PageTitle, useCurrentUser, useMediaUpload } from "@/components/admin/shared";
import { cdnUrl } from "@/lib/cdn";
import { checkNewPassword } from "@/lib/password";
import { PasswordField } from "@/components/auth/PasswordField";
import { ValidatedField } from "@/components/auth/ValidatedField";
import { AvatarCropper } from "@/components/auth/AvatarCropper";
import { emailSchema } from "@/lib/form-input";
import { seo } from "@/components/site/PageHero";

export const Route = createFileRoute("/_authenticated/admin/profile")({ staticData: { sitemap: false }, head: () => seo("My Profile | Skill Bridgeway Foundation", "Private profile and account settings.", { noindex: true }), component: ProfilePage });

function ProfilePage() {
  return <div className="profile-settings mx-auto max-w-5xl">
    <PageTitle title="My Profile" />
    <BasicInfo />
    <section className="mt-8 border-t border-border pt-7">
      <h2 className="mb-5 text-base text-muted-foreground">Account security</h2>
      <div className="grid gap-4 sm:grid-cols-2"><AccountAction kind="password" /><AccountAction kind="email" /></div>
    </section>
  </div>;
}

function AccountAction({ kind }: { kind: "password" | "email" }) {
  const [open, setOpen] = useState(false);
  const password = kind === "password";
  const Icon = password ? LockKeyhole : Mail;
  return <>
    <Button variant="outline" className="profile-action h-auto min-h-24 w-full justify-between gap-3 whitespace-normal px-5 py-5 text-left" onClick={() => setOpen(true)}>
      <span className="flex min-w-0 items-center gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="!h-6 !w-6" /></span><span className="font-heading text-base font-bold">{password ? "Change Password" : "Change Email"}</span></span><ArrowUpRight className="text-primary" />
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="profile-dialog max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogTitle className="pr-6">{password ? "Change Password" : "Change Email"}</DialogTitle>
        <DialogDescription>{password ? "Confirm your identity to update your password." : "Verify your current and new email to update your account."}</DialogDescription>
        {password ? <ChangePassword onDone={() => setOpen(false)} /> : <ChangeEmail onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  </>;
}

function BasicInfo() {
  const user = useCurrentUser();
  const qc = useQueryClient();
  const upload = useMediaUpload();
  const saveInfo = useServerFn(saveProfileInfo);
  const { data: profile, isLoading, error: loadError } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const saved = readProfileInfo(profile ?? {});
  const [form, setForm] = useState(() => readProfileInfo({}));
  const [editing, setEditing] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [phoneWarning, setPhoneWarning] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<"first_name" | "last_name" | "phone", string>> & Record<string, string | undefined>>({});
  const changed = profileHasChanges(saved, form);
  const src = cdnUrl(profile?.avatar_key);
  function cancel() { setForm(readProfileInfo(profile ?? {})); setEditing(false); setErrors({}); setPhoneWarning(false); }
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !changed) return;
    const result = profileInfoSchema.safeParse(form);
    if (!result.success) {
      setErrors(Object.fromEntries(result.error.issues.map((issue) => [issue.path.join("."), issue.message])));
      toast.error(result.error.issues[0]?.message ?? "Check your details"); return;
    }
    setBusy(true);
    try {
      const updated = await saveInfo({ data: result.data });
      qc.setQueryData(["profile", user.id], updated);
      setForm(readProfileInfo(updated)); setEditing(false); setErrors({});
      toast.success("Profile saved");
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }
  async function onAvatar(file: File) {
    setUploading(true);
    try {
      const key = await upload(file, "avatars");
      const { data, error } = await supabase.from("profiles").upsert({ id: user.id, avatar_key: key }).select("*").single();
      if (error) throw error;
      qc.setQueryData(["profile", user.id], data);
      toast.success("Avatar updated");
    } finally { setUploading(false); }
  }
  if (isLoading) return <div className="flex min-h-56 items-center justify-center gap-2" role="status"><Loader2 className="h-5 w-5 animate-spin text-primary" />Loading profile…</div>;
  if (loadError) return <p role="alert">Couldn't load your profile. Please refresh and try again.</p>;
  return <>
    <form onSubmit={onSubmit} className="profile-info space-y-6 border-y border-border py-6 sm:py-8" aria-busy={busy}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-lg"><span className="h-6 w-1 rounded-full bg-primary" />Basic Info</h2>
        {!editing && <Button type="button" className="profile-action" onClick={() => { setForm(readProfileInfo(profile ?? {})); setEditing(true); }}><Pencil />Edit Info</Button>}
      </div>
      <div className="flex flex-wrap items-center gap-5 border-b border-border pb-6">
        <Button type="button" variant="ghost" aria-label="View avatar" disabled={!src || uploading} onClick={() => setAvatarOpen(true)} className="profile-avatar h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-primary/40 bg-muted p-0">
          {src ? <img src={src} alt="Your avatar" className="h-full w-full object-cover" /> : <UserCircle className="!h-12 !w-12 text-primary" />}
        </Button>
        <div className="min-w-0 space-y-2"><p className="break-words font-heading text-lg font-bold">{profile?.full_name || "My Profile"}</p><AvatarCropper onSave={onAvatar} disabled={uploading || busy} /></div>
      </div>
      <div><p className="mb-1 text-xs font-bold uppercase text-primary">Email</p><p className="break-all">{user.email}</p></div>
      {editing ? <fieldset disabled={busy || uploading} className="space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="first-name">First Name</Label><ValidatedField id="first-name" required autoComplete="given-name" maxLength={60} value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} />{errors.first_name && <p className="text-xs text-destructive">{errors.first_name}</p>}</div>
          <div className="space-y-2"><Label htmlFor="last-name">Last Name</Label><ValidatedField id="last-name" required autoComplete="family-name" maxLength={59} value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} />{errors.last_name && <p className="text-xs text-destructive">{errors.last_name}</p>}</div>
        </div>
        <div className="max-w-md space-y-2"><Label htmlFor="profile-phone">Phone</Label>
          <div className="flex overflow-hidden rounded-md border border-input focus-within:ring-2 focus-within:ring-ring">
            <span className="flex shrink-0 items-center gap-2 border-r border-input bg-muted px-3"><BdFlag /><span>+88</span></span>
            <Input id="profile-phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="017XXXXXXXX" value={form.phone} className="min-w-0 rounded-none border-0 focus-visible:ring-0" aria-invalid={!!errors.phone} aria-describedby="profile-phone-hint" onChange={(e) => { const next = strictPhoneInput(e.target.value); setPhoneWarning(next.warning); setForm({ ...form, phone: next.value }); }} />
          </div>
          <p id="profile-phone-hint" className="text-xs text-muted-foreground">11 digits · starts with 013–019</p>
          {phoneWarning && <p role="status" className="flex items-center gap-2 text-xs text-highlight"><AlertCircle className="h-4 w-4" />Use English digits only. Other characters are not accepted.</p>}
          {errors.phone && <p role="alert" className="text-xs text-destructive">{errors.phone}</p>}
        </div>
        <div className="space-y-4 border-t border-border pt-5"><h3 className="flex items-center gap-2 text-sm text-primary"><MapPin className="h-4 w-4" />Address</h3>
          <AddressPicker value={form.address} onChange={(patch) => setForm({ ...form, address: { ...form.address, ...patch } })} errors={Object.fromEntries(Object.entries(errors).filter(([key]) => key.startsWith("address.")).map(([key, value]) => [key.slice(8), value]))} />
        </div>
      </fieldset> : <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        <div><dt className="mb-1 text-xs font-bold uppercase text-primary">First Name</dt><dd>{saved.first_name || "Not added"}</dd></div>
        <div><dt className="mb-1 text-xs font-bold uppercase text-primary">Last Name</dt><dd>{saved.last_name || "Not added"}</dd></div>
        <div><dt className="mb-1 flex items-center gap-2 text-xs font-bold uppercase text-primary"><Phone className="h-3.5 w-3.5" />Phone</dt><dd>{saved.phone ? `+88 ${saved.phone}` : "Not added"}</dd></div>
        <div><dt className="mb-1 flex items-center gap-2 text-xs font-bold uppercase text-primary"><MapPin className="h-3.5 w-3.5" />Address</dt><dd className="break-words">{formatProfileAddress(saved.address) || "Not added"}</dd></div>
      </dl>}
      {editing && <div className="flex flex-wrap gap-3 border-t border-border pt-5"><Button type="submit" className="profile-action min-w-40" disabled={busy || uploading || !changed}>{busy ? <Loader2 className="animate-spin" /> : <Save />}{busy ? "Saving changes…" : "Save Changes"}</Button><Button type="button" className="profile-action" variant="outline" onClick={cancel} disabled={busy || uploading}><X />Cancel</Button></div>}
    </form>
    <Dialog open={avatarOpen} onOpenChange={setAvatarOpen}><DialogContent className="profile-dialog w-[calc(100%-2rem)] rounded-lg"><DialogTitle>Profile photo</DialogTitle><DialogDescription>{profile?.full_name || "Your avatar"}</DialogDescription>{src && <img src={src} alt="Your full profile photo" className="max-h-[65dvh] w-full object-contain" />}</DialogContent></Dialog>
  </>;
}

function ChangePassword({ onDone }: { onDone: () => void }) {
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [nonceNeeded, setNonceNeeded] = useState(false);
  const [nonce, setNonce] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!current) { toast.error("Enter your current password"); return; }
    const problem = checkNewPassword(pw, confirm, current);
    if (problem) { toast.error(problem); return; }
    setBusy(true);
    const attrs: Record<string, string> = { password: pw, current_password: current };
    if (nonceNeeded) {
      if (!/^[0-9]{6}$/.test(nonce)) { toast.error("Enter the 6-digit verification code"); setBusy(false); return; }
      attrs["nonce"] = nonce;
    }
    const { error } = await supabase.auth.updateUser(attrs as { password: string });
    if (error && /reauth|nonce/i.test(error.message) && !nonceNeeded) {
      const { error: reauthError } = await supabase.auth.reauthenticate();
      if (reauthError) { setBusy(false); toast.error(reauthError.message); return; }
      setNonceNeeded(true);
      setBusy(false);
      { toast.info("For security, we emailed you a 6-digit code. Enter it to confirm."); return; }
    }
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password changed");
    setCurrent(""); setPw(""); setConfirm(""); setNonce(""); setNonceNeeded(false); onDone();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      
      <PasswordField id="cp" label="Current password" autoComplete="current-password" value={current} onChange={setCurrent} />
      <PasswordField id="np" label="New password" autoComplete="new-password" strength value={pw} onChange={setPw} />
      <PasswordField id="cnp" label="Confirm new password" autoComplete="new-password" value={confirm} onChange={setConfirm} />
      {nonceNeeded && <div className="space-y-2"><Label>Verification code</Label><OtpField value={nonce} onChange={setNonce} /></div>}
      <div className="flex flex-wrap gap-2 pt-2"><Button type="submit" className="profile-action" disabled={busy || !current || !pw || !confirm}>{busy ? <Loader2 className="animate-spin" /> : <LockKeyhole />}{busy ? "Updating…" : "Update password"}</Button><Button type="button" variant="outline" className="profile-action" disabled={busy} onClick={onDone}>Cancel</Button></div>
    </form>
  );
}

function ChangeEmail({ onDone }: { onDone: () => void }) {
  const user = useCurrentUser();
  const [newEmail, setNewEmail] = useState("");
  const [step, setStep] = useState<"enter" | "verify">("enter");
  const [oldCode, setOldCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function request(e: React.FormEvent) {
    e.preventDefault();
    const r = emailSchema.safeParse(newEmail);
    if (!r.success) { toast.error("Enter a valid email"); return; }
    if (r.data.toLowerCase() === user.email?.toLowerCase()) { toast.error("That's already your email"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ email: r.data });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setStep("verify");
    toast.success("Codes sent to both your current and new email.");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[0-9]{6}$/.test(oldCode) || !/^[0-9]{6}$/.test(newCode)) { toast.error("Enter both 6-digit codes"); return; }
    setBusy(true);
    const a = await supabase.auth.verifyOtp({ email: user.email ?? "", token: oldCode, type: "email_change" });
    if (a.error) { setBusy(false); { toast.error(`Current email code: ${a.error.message}`); return; } }
    const b = await supabase.auth.verifyOtp({ email: newEmail.trim(), token: newCode, type: "email_change" });
    if (b.error) { setBusy(false); toast.error(`New email code: ${b.error.message}`); return; }
    const { error: profileError } = await supabase.from("profiles").update({ email: newEmail.trim() }).eq("id", user.id);
    setBusy(false);
    if (profileError) toast.warning("Your account email changed, but profile sync couldn't finish. Please refresh.");
    toast.success("Email changed. Sign in with your new email next time.");
    setStep("enter"); setNewEmail(""); setOldCode(""); setNewCode(""); onDone();
  }

  return step === "enter" ? (
    <form onSubmit={request} className="space-y-4">
      
      <p className="text-sm text-muted-foreground">Current: <span className="text-foreground">{user.email}</span></p>
      <div className="space-y-2"><Label htmlFor="ne">New email</Label><ValidatedField id="ne" type="email" mode="ascii" maxLength={255} value={newEmail} onChange={setNewEmail} /></div>
      <div className="flex flex-wrap gap-2 pt-2"><Button type="submit" className="profile-action whitespace-normal" disabled={busy || !newEmail.trim()}>{busy ? <Loader2 className="animate-spin" /> : <Mail />}{busy ? "Sending…" : "Send verification codes"}</Button><Button type="button" variant="outline" className="profile-action" disabled={busy} onClick={onDone}>Cancel</Button></div>
    </form>
  ) : (
    <form onSubmit={verify} className="space-y-4">
      <h2 className="font-heading text-lg font-bold uppercase text-foreground">Verify Email Change</h2>
      <div className="space-y-2"><Label>Code sent to {user.email}</Label><OtpField label="Current email code" value={oldCode} onChange={setOldCode} /></div>
      <div className="space-y-2"><Label>Code sent to {newEmail}</Label><OtpField label="New email code" value={newCode} onChange={setNewCode} /></div>
      <div className="flex gap-2">
        <Button type="submit" className="profile-action" disabled={busy || oldCode.length !== 6 || newCode.length !== 6}>{busy && <Loader2 className="animate-spin" />}{busy ? "Verifying…" : "Confirm change"}</Button>
        <Button type="button" className="profile-action" variant="outline" disabled={busy} onClick={() => setStep("enter")}>Back</Button>
      </div>
    </form>
  );
}
