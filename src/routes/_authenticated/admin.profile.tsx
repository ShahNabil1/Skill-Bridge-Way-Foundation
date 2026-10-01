import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, UserCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OtpField, PageTitle, useCurrentUser, useMediaUpload } from "@/components/admin/shared";
import { cdnUrl } from "@/lib/cdn";
import { IMAGE_TYPES } from "@/lib/r2.functions";
import { checkNewPassword } from "@/lib/password";

export const Route = createFileRoute("/_authenticated/admin/profile")({ staticData: { sitemap: false }, component: ProfilePage });

const infoSchema = z.object({
  full_name: z.string().trim().min(2, "Name is too short").max(120),
  phone: z.string().trim().max(30).regex(/^[+\d\s-]*$/, "Invalid phone number"),
  address: z.string().trim().max(500),
});

function ProfilePage() {
  return (
    <>
      <PageTitle title="My Profile" />
      <div className="grid gap-6 lg:grid-cols-2">
        <BasicInfo />
        <div className="space-y-6"><ChangePassword /><ChangeEmail /></div>
      </div>
    </>
  );
}

function BasicInfo() {
  const user = useCurrentUser();
  const qc = useQueryClient();
  const upload = useMediaUpload();
  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()).data,
  });
  const [form, setForm] = useState({ full_name: "", phone: "", address: "" });
  const [avatarKey, setAvatarKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({ full_name: profile.full_name ?? "", phone: profile.phone ?? "", address: profile.address ?? "" });
      setAvatarKey(profile.avatar_key);
    }
  }, [profile]);

  async function save(next: Partial<{ full_name: string; phone: string; address: string; avatar_key: string | null }>) {
    const { error } = await supabase.from("profiles").upsert({ id: user.id, email: user.email ?? null, ...next });
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["profile", user.id] });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const r = infoSchema.safeParse(form);
    if (!r.success) { toast.error(r.error.issues[0]?.message); return; }
    setBusy(true);
    try { await save(r.data); toast.success("Profile saved"); } catch (err) { toast.error((err as Error).message); }
    setBusy(false);
  }

  async function onAvatar(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      const key = await upload(file, "avatars");
      await save({ avatar_key: key });
      setAvatarKey(key);
      toast.success("Avatar updated");
    } catch (err) { toast.error((err as Error).message); }
    setUploading(false);
  }

  const src = cdnUrl(avatarKey);
  return (
    <form onSubmit={onSubmit} className="glass space-y-4 rounded-xl p-6">
      <h2 className="font-heading text-lg font-bold uppercase text-foreground">Basic Info</h2>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
          {src ? <img src={src} alt="Avatar" className="h-full w-full object-cover" /> : <UserCircle className="h-10 w-10 text-muted-foreground" />}
        </div>
        <label className="cursor-pointer text-sm text-primary hover:underline">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Change avatar"}
          <input type="file" accept={IMAGE_TYPES.join(",")} className="hidden" disabled={uploading}
            onChange={(e) => { onAvatar(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      </div>
      <div className="space-y-2"><Label>Email</Label><Input value={user.email ?? ""} disabled /></div>
      <div className="space-y-2"><Label htmlFor="pn">Full name</Label><Input id="pn" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
      <div className="space-y-2"><Label htmlFor="pp">Phone</Label><Input id="pp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
      <div className="space-y-2"><Label htmlFor="pa">Address</Label><Textarea id="pa" rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
      <Button type="submit" disabled={busy}>{busy ? "Saving..." : "Save changes"}</Button>
    </form>
  );
}

function ChangePassword() {
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
    if (nonceNeeded) attrs["nonce"] = nonce;
    const { error } = await supabase.auth.updateUser(attrs as { password: string });
    if (error && /reauth|nonce/i.test(error.message) && !nonceNeeded) {
      await supabase.auth.reauthenticate();
      setNonceNeeded(true);
      setBusy(false);
      { toast.info("For security, we emailed you a 6-digit code. Enter it to confirm."); return; }
    }
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password changed");
    setCurrent(""); setPw(""); setConfirm(""); setNonce(""); setNonceNeeded(false);
  }

  return (
    <form onSubmit={onSubmit} className="glass space-y-4 rounded-xl p-6">
      <h2 className="font-heading text-lg font-bold uppercase text-foreground">Change Password</h2>
      <div className="space-y-2"><Label htmlFor="cp">Current password</Label><Input id="cp" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="np">New password</Label><Input id="np" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <p className="text-xs text-muted-foreground">Min 6 characters with uppercase, lowercase, number and symbol.</p></div>
      <div className="space-y-2"><Label htmlFor="cnp">Confirm new password</Label><Input id="cnp" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
      {nonceNeeded && <div className="space-y-2"><Label>Verification code</Label><OtpField value={nonce} onChange={setNonce} /></div>}
      <Button type="submit" disabled={busy}>{busy ? "Updating..." : "Update password"}</Button>
    </form>
  );
}

function ChangeEmail() {
  const user = useCurrentUser();
  const [newEmail, setNewEmail] = useState("");
  const [step, setStep] = useState<"enter" | "verify">("enter");
  const [oldCode, setOldCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function request(e: React.FormEvent) {
    e.preventDefault();
    const r = z.string().trim().email().max(255).safeParse(newEmail);
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
    if (oldCode.length !== 6 || newCode.length !== 6) { toast.error("Enter both 6-digit codes"); return; }
    setBusy(true);
    const a = await supabase.auth.verifyOtp({ email: user.email ?? "", token: oldCode, type: "email_change" });
    if (a.error) { setBusy(false); { toast.error(`Current email code: ${a.error.message}`); return; } }
    const b = await supabase.auth.verifyOtp({ email: newEmail.trim(), token: newCode, type: "email_change" });
    setBusy(false);
    if (b.error) { toast.error(`New email code: ${b.error.message}`); return; }
    await supabase.from("profiles").update({ email: newEmail.trim() }).eq("id", user.id);
    toast.success("Email changed. Sign in with your new email next time.");
    setStep("enter"); setNewEmail(""); setOldCode(""); setNewCode("");
  }

  return step === "enter" ? (
    <form onSubmit={request} className="glass space-y-4 rounded-xl p-6">
      <h2 className="font-heading text-lg font-bold uppercase text-foreground">Change Email</h2>
      <p className="text-sm text-muted-foreground">Current: <span className="text-foreground">{user.email}</span></p>
      <div className="space-y-2"><Label htmlFor="ne">New email</Label><Input id="ne" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} /></div>
      <Button type="submit" disabled={busy}>{busy ? "Sending..." : "Send verification codes"}</Button>
    </form>
  ) : (
    <form onSubmit={verify} className="glass space-y-4 rounded-xl p-6">
      <h2 className="font-heading text-lg font-bold uppercase text-foreground">Verify Email Change</h2>
      <div className="space-y-2"><Label>Code sent to {user.email}</Label><OtpField value={oldCode} onChange={setOldCode} /></div>
      <div className="space-y-2"><Label>Code sent to {newEmail}</Label><OtpField value={newCode} onChange={setNewCode} /></div>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>{busy ? "Verifying..." : "Confirm change"}</Button>
        <Button type="button" variant="ghost" onClick={() => setStep("enter")}>Cancel</Button>
      </div>
    </form>
  );
}
