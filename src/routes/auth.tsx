import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { seo } from "@/components/site/PageHero";
import { Turnstile } from "@/components/auth/Turnstile";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { checkNewPassword } from "@/lib/password";

export const Route = createFileRoute("/auth")({ staticData: { sitemap: false },
  validateSearch: (s: Record<string, unknown>) => z.object({ mode: z.enum(["invite"]).optional() }).parse({ mode: s["mode"] === "invite" ? "invite" : undefined }),
  head: () => seo("Admin Sign In | Skill Bridgeway Foundation", "Sign in to the Skill Bridgeway Foundation admin area.", { path: "/auth", noindex: true }),
  component: AuthPage,
});

type Mode = "login" | "forgot" | "reset" | "invite";

function PasswordPair({ pw, setPw, confirm, setConfirm }: { pw: string; setPw: (v: string) => void; confirm: string; setConfirm: (v: string) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="new-pw">New password</Label>
        <Input id="new-pw" type="password" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} />
        <p className="text-xs text-muted-foreground">Min 6 characters with uppercase, lowercase, number and symbol.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-pw">Confirm new password</Label>
        <Input id="confirm-pw" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
    </>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<Mode>(search.mode === "invite" ? "invite" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [inviteReady, setInviteReady] = useState(false);

  useEffect(() => {
    if (mode !== "invite") return;
    supabase.auth.getSession().then(({ data }) => setInviteReady(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setInviteReady(!!s));
    return () => data.subscription.unsubscribe();
  }, [mode]);

  const freshCaptcha = () => { setCaptcha(null); setCaptchaReset((n) => n + 1); };

  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (!captcha) { toast.error("Please complete the security check"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken: captcha } });
    setLoading(false);
    freshCaptcha();
    if (error) { toast.error(error.message); return; }
    navigate({ to: "/admin" });
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!captcha) { toast.error("Please complete the security check"); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { captchaToken: captcha });
    setLoading(false);
    freshCaptcha();
    if (error) { toast.error(error.message); return; }
    toast.success("If that email has an account, a 6-digit code is on its way.");
    setMode("reset");
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) { toast.error("Enter the 6-digit code"); return; }
    const problem = checkNewPassword(pw, confirm);
    if (problem) { toast.error(problem); return; }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: "recovery" });
    if (error) { setLoading(false); { toast.error(error.message); return; } }
    const { error: upErr } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (upErr) { toast.error(upErr.message); return; }
    toast.success("Password updated");
    navigate({ to: "/admin" });
  }

  async function setInvitePassword(e: React.FormEvent) {
    e.preventDefault();
    const problem = checkNewPassword(pw, confirm);
    if (problem) { toast.error(problem); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Welcome aboard! Your password is set.");
    navigate({ to: "/admin" });
  }

  const card = "glass w-full max-w-sm space-y-4 rounded-xl p-8";
  const link = "text-sm text-primary hover:underline";

  return (
    <div className="bg-grid flex min-h-[70vh] items-center justify-center px-4 py-16">
      {mode === "login" && (
        <form onSubmit={login} className={card}>
          <h1 className="section-title text-2xl">Admin Sign In</h1>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <button type="button" className={link} onClick={() => setMode("forgot")}>Forgot password?</button>
            </div>
            <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Turnstile onToken={setCaptcha} resetKey={captchaReset} />
          <Button type="submit" disabled={loading || !captcha} className="w-full">{loading ? "Signing in..." : "Sign in"}</Button>
          <p className="text-xs text-muted-foreground">Accounts are created by administrators only.</p>
        </form>
      )}

      {mode === "forgot" && (
        <form onSubmit={sendCode} className={card}>
          <h1 className="section-title text-2xl">Forgot Password</h1>
          <p className="text-sm text-muted-foreground">We'll email you a 6-digit code (valid for 10 minutes).</p>
          <div className="space-y-2">
            <Label htmlFor="femail">Email</Label>
            <Input id="femail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Turnstile onToken={setCaptcha} resetKey={captchaReset} />
          <Button type="submit" disabled={loading || !captcha} className="w-full">{loading ? "Sending..." : "Send code"}</Button>
          <button type="button" className={link} onClick={() => setMode("login")}>Back to sign in</button>
        </form>
      )}

      {mode === "reset" && (
        <form onSubmit={resetPassword} className={card}>
          <h1 className="section-title text-2xl">Reset Password</h1>
          <p className="text-sm text-muted-foreground">Enter the code sent to <span className="text-foreground">{email}</span>.</p>
          <InputOTP maxLength={6} value={otp} onChange={setOtp} inputMode="numeric">
            <InputOTPGroup>{[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
          </InputOTP>
          <PasswordPair pw={pw} setPw={setPw} confirm={confirm} setConfirm={setConfirm} />
          <Button type="submit" disabled={loading} className="w-full">{loading ? "Saving..." : "Set new password"}</Button>
          <button type="button" className={link} onClick={() => setMode("forgot")}>Resend code</button>
        </form>
      )}

      {mode === "invite" && (
        <form onSubmit={setInvitePassword} className={card}>
          <h1 className="section-title text-2xl">Set Your Password</h1>
          {inviteReady ? (
            <>
              <PasswordPair pw={pw} setPw={setPw} confirm={confirm} setConfirm={setConfirm} />
              <Button type="submit" disabled={loading} className="w-full">{loading ? "Saving..." : "Save password"}</Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Open this page from your invitation email link. If the link expired, ask an admin to invite you again.</p>
          )}
        </form>
      )}
    </div>
  );
}
