import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { seo } from "@/components/site/PageHero";
import { Turnstile } from "@/components/auth/Turnstile";
import { checkNewPassword } from "@/lib/password";
import { PasswordField } from "@/components/auth/PasswordField";
import { ValidatedField } from "@/components/auth/ValidatedField";
import { OtpField } from "@/components/admin/shared";
import { emailSchema } from "@/lib/form-input";

export const Route = createFileRoute("/auth")({ staticData: { sitemap: false },
  validateSearch: (s: Record<string, unknown>) => z.object({ mode: z.enum(["invite"]).optional() }).parse({ mode: s["mode"] === "invite" ? "invite" : undefined }),
  head: () => seo("Admin Sign In | Skill Bridgeway Foundation", "Sign in to the Skill Bridgeway Foundation admin area.", { path: "/auth", noindex: true }),
  component: AuthPage,
});

type Mode = "login" | "forgot" | "sent" | "reset" | "invite";

function PasswordPair({ pw, setPw, confirm, setConfirm }: { pw: string; setPw: (v: string) => void; confirm: string; setConfirm: (v: string) => void }) {
  return (
    <>
      <PasswordField id="new-pw" label="New password" autoComplete="new-password" required strength value={pw} onChange={setPw} />
      <PasswordField id="confirm-pw" label="Confirm new password" autoComplete="new-password" required value={confirm} onChange={setConfirm} />
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
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (mode !== "invite") return;
    supabase.auth.getSession().then(({ data }) => setInviteReady(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setInviteReady(!!s));
    return () => data.subscription.unsubscribe();
  }, [mode]);

  const freshCaptcha = () => { setCaptcha(null); setCaptchaReset((n) => n + 1); };

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const validEmail = emailSchema.safeParse(email);
    if (!validEmail.success) { toast.error(validEmail.error.issues[0]?.message); return; }
    if (!password) { toast.error("Enter your password"); return; }
    if (!captcha) { toast.error("Please complete the security check"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: validEmail.data, password, options: { captchaToken: captcha } });
    setLoading(false);
    freshCaptcha();
    if (error) { toast.error(error.message); return; }
    navigate({ to: "/admin" });
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    const validEmail = emailSchema.safeParse(email);
    if (!validEmail.success) { toast.error(validEmail.error.issues[0]?.message); return; }
    if (!captcha) { toast.error("Please complete the security check"); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(validEmail.data, { captchaToken: captcha });
    setLoading(false);
    freshCaptcha();
    if (error) { toast.error(error.message); return; }
    setMode("sent");
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

  const card = "glass relative w-full max-w-[430px] space-y-5 overflow-hidden rounded-lg border border-primary/20 p-5 shadow-[0_0_40px_color-mix(in_oklab,var(--primary)_12%,transparent)] transition-[border-color,box-shadow] duration-300 hover:border-primary/40 hover:shadow-[0_0_52px_color-mix(in_oklab,var(--primary)_20%,transparent)] sm:p-8";
  const back = (to: Mode) => <Button type="button" variant="ghost" className="h-9 gap-2 px-0 text-primary hover:bg-transparent hover:text-foreground" onClick={() => setMode(to)}><ArrowLeft className="h-4 w-4" />Back {to === "login" ? "to sign in" : "to email"}</Button>;

  return (
    <div className="bg-grid flex min-h-dvh w-full items-center justify-center px-4 py-8 sm:px-6">
      <AnimatePresence mode="wait" initial={false}>
      <motion.div key={mode} className="w-full max-w-[430px]" initial={reduceMotion ? false : { opacity: 0, y: 12, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduceMotion ? {} : { opacity: 0, y: -8, scale: .99 }} transition={{ duration: .22, ease: "easeOut" }}>
      {mode === "login" && (
        <form onSubmit={login} className={card}>
          <h1 className="section-title text-2xl">Admin Sign In</h1>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
             <ValidatedField id="email" type="email" mode="ascii" autoComplete="email" required maxLength={255} value={email} onChange={setEmail} />
          </div>
          <PasswordField id="password" label="Password" autoComplete="current-password" required value={password} onChange={setPassword}
            trailingAction={<Button type="button" variant="link" className="h-auto p-0 text-sm" onClick={() => setMode("forgot")}>Forgot password?</Button>} />
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
             <ValidatedField id="femail" type="email" mode="ascii" autoComplete="email" required maxLength={255} value={email} onChange={setEmail} />
          </div>
          <Turnstile onToken={setCaptcha} resetKey={captchaReset} />
          <Button type="submit" disabled={loading || !captcha} className="w-full">{loading ? "Sending..." : "Send code"}</Button>
           {back("login")}
        </form>
      )}

      {mode === "sent" && <div className={card}>
        <KeyRound className="h-8 w-8 text-primary" aria-hidden="true" />
        <h1 className="section-title text-2xl">Check your email</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">If an account exists for {email}, a 6-digit code has been sent. Check your inbox and spam folder.</p>
        <Button type="button" className="w-full" onClick={() => setMode("reset")}>I have a code</Button>
        <div className="flex flex-wrap items-center justify-between gap-2">{back("forgot")}{back("login")}</div>
      </div>}

      {mode === "reset" && (
        <form onSubmit={resetPassword} className={card}>
          <h1 className="section-title text-2xl">Reset Password</h1>
          <p className="text-sm text-muted-foreground">Enter the code sent to <span className="text-foreground">{email}</span>.</p>
          <div className="space-y-2"><Label>Verification code</Label><OtpField label="Password reset code" value={otp} onChange={setOtp} /></div>
          <PasswordPair pw={pw} setPw={setPw} confirm={confirm} setConfirm={setConfirm} />
          <Button type="submit" disabled={loading} className="w-full">{loading ? "Saving..." : "Set new password"}</Button>
          <div className="flex flex-wrap items-center justify-between gap-2">{back("forgot")}{back("login")}</div>
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
      </motion.div>
      </AnimatePresence>
    </div>
  );
}
