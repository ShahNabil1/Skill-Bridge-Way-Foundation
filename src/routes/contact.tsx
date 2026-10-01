import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, Mail, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHero, seo } from "@/components/site/PageHero";

export const Route = createFileRoute("/contact")({
  head: () => seo("Contact | Skill Bridgeway Foundation", "Get in touch with Skill Bridgeway Foundation about courses, admission or partnerships."),
  component: Contact,
});

const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(30).optional(),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(1, "Please write a message").max(5000),
});
type Form = z.infer<typeof schema>;
const empty: Form = { name: "", email: "", phone: "", subject: "", message: "" };

function Contact() {
  const [form, setForm] = useState<Form>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: typeof errors = {};
      for (const i of parsed.error.issues) errs[i.path[0] as keyof Form] = i.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setSending(true);
    const d = parsed.data;
    const { error } = await supabase.from("contact_messages").insert({
      name: d.name, email: d.email, phone: d.phone || null, subject: d.subject || null, message: d.message,
    });
    setSending(false);
    if (error) {
      toast.error("Could not send your message. Please try again.");
      return;
    }
    setSent(true);
    setForm(empty);
  }

  const field = (k: keyof Form, label: string, type = "text") => (
    <div className="space-y-2">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} type={type} value={form[k] ?? ""} onChange={set(k)} aria-invalid={!!errors[k]} />
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <>
      <PageHero eyebrow="Talk to us" title="Contact">Questions about courses, admission or partnering with us? Send a message.</PageHero>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-14 lg:grid-cols-[1fr_1.6fr]">
        <div className="space-y-4">
          <div className="glass flex gap-4 rounded-xl p-6"><MapPin className="h-6 w-6 shrink-0 text-primary" /><div><h2 className="section-title text-sm">Address</h2><p className="mt-1 text-sm text-muted-foreground">Dhaka, Bangladesh</p></div></div>
          <div className="glass flex gap-4 rounded-xl p-6"><Mail className="h-6 w-6 shrink-0 text-primary" /><div><h2 className="section-title text-sm">Email</h2><a href="mailto:info@skillbridgeway.org" className="mt-1 block text-sm text-muted-foreground hover:text-primary">info@skillbridgeway.org</a></div></div>
        </div>
        <div className="glass rounded-xl p-6 md:p-8">
          {sent ? (
            <div className="flex flex-col items-center py-10 text-center">
              <CheckCircle2 className="h-12 w-12 text-primary" />
              <h2 className="section-title mt-4 text-xl">Message sent</h2>
              <p className="mt-2 text-muted-foreground">Thank you — we'll get back to you soon.</p>
              <Button variant="outline" className="mt-6" onClick={() => setSent(false)}>Send another</Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">{field("name", "Full name")}{field("email", "Email", "email")}</div>
              <div className="grid gap-5 sm:grid-cols-2">{field("phone", "Phone (optional)", "tel")}{field("subject", "Subject (optional)")}</div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" rows={6} value={form.message} onChange={set("message")} aria-invalid={!!errors.message} />
                {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
              </div>
              <Button type="submit" disabled={sending} className="w-full sm:w-auto">{sending ? "Sending..." : "Send message"}</Button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
