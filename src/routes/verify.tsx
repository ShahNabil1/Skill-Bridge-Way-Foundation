import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, FileDown, Loader2, Search, ShieldAlert, ShieldX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHero, seo } from "@/components/site/PageHero";
import { cdnUrl } from "@/lib/cdn";
import { formatDate } from "@/lib/public-data";

export const Route = createFileRoute("/verify")({ staticData: { sitemap: true },
  validateSearch: (s: Record<string, unknown>): { serial?: string } =>
    typeof s["serial"] === "string" && s["serial"] ? { serial: s["serial"].slice(0, 60) } : {},
  head: () => seo("Verify Certificate | Skill Bridgeway Foundation", "Verify a Skill Bridgeway Foundation certificate by serial number or QR code.", { path: "/verify" }),
  component: VerifyPage,
});

function VerifyPage() {
  const { serial } = Route.useSearch();
  const navigate = useNavigate({ from: "/verify" });
  const [input, setInput] = useState(serial ?? "");
  useEffect(() => setInput(serial ?? ""), [serial]);
  const clean = serial?.trim().toUpperCase() ?? "";

  const { data, isFetching, isError } = useQuery({
    queryKey: ["verify", clean],
    enabled: clean.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("verify_certificate", { _serial: clean });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = input.trim().toUpperCase();
    if (v) { trackEvent("certificate_verify"); navigate({ search: { serial: v } }); }
  }

  const pdf = cdnUrl(data?.pdf_key);

  return (
    <>
      <PageHero eyebrow="Verification portal" title="Verify Certificate" />
      <section className="bg-grid px-4 pb-20">
        <div className="mx-auto max-w-2xl">
          <form onSubmit={onSubmit} className="glass flex flex-col gap-3 rounded-md border-t-2 border-t-primary p-4 sm:flex-row">
            <label htmlFor="serial" className="sr-only">Certificate serial number</label>
            <Input id="serial" value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. SBF-CERT-2026-000001"
              className="h-12 font-mono uppercase tracking-wide" autoComplete="off" />
            <Button type="submit" className="h-12 gap-2 px-6"><Search className="h-4 w-4" /> Verify</Button>
          </form>
          <p className="mt-3 text-center text-sm text-muted-foreground">Enter the serial printed on the certificate, or scan its QR code.</p>

          <div className="mt-8" aria-live="polite">
            {clean && isFetching && (
              <div className="glass flex items-center justify-center gap-2 rounded-xl p-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Checking records...</div>
            )}
            {clean && !isFetching && isError && (
              <ResultShell icon={<ShieldAlert className="h-10 w-10 text-destructive" />} title="Verification unavailable" tone="destructive">
                We couldn't reach our records right now. Please try again in a moment.
              </ResultShell>
            )}
            {clean && !isFetching && !isError && !data && (
              <ResultShell icon={<ShieldX className="h-10 w-10 text-destructive" />} title="Certificate not found" tone="destructive">
                No certificate matches <span className="font-mono text-foreground">{clean}</span>. Check the serial for typos, or contact us if you believe this is an error.
              </ResultShell>
            )}
            {data && !isFetching && data.is_revoked && (
              <ResultShell icon={<ShieldAlert className="h-10 w-10 text-destructive" />} title="Certificate revoked" tone="destructive">
                Certificate <span className="font-mono text-foreground">{data.serial}</span> was issued but has since been revoked and is no longer valid.
              </ResultShell>
            )}
            {data && !isFetching && !data.is_revoked && (
               <div className="glass overflow-hidden rounded-md border-primary/40">
                <div className="flex items-center gap-3 border-b border-border bg-primary/10 px-6 py-4">
                  <BadgeCheck className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-heading text-lg font-extrabold uppercase tracking-wide text-primary">Verified Authentic</p>
                    <p className="text-xs text-muted-foreground">Issued by Skill Bridgeway Foundation</p>
                  </div>
                </div>
                <dl className="grid gap-5 p-6 sm:grid-cols-2">
                  <Field label="Student name" value={data.student_name} big />
                  <Field label="Student ID" value={data.student_code} mono />
                  <Field label="Course" value={data.course_title ?? "—"} />
                  <Field label="Issue date" value={formatDate(data.issued_at)} />
                  <Field label="Certificate serial" value={data.serial} mono />
                </dl>
                {pdf && (
                  <div className="border-t border-border p-6">
                    <Button asChild size="lg" className="w-full gap-2 sm:w-auto">
                      <a href={pdf} target="_blank" rel="noreferrer"><FileDown className="h-5 w-5" /> View / download certificate</a>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function Field({ label, value, big, mono }: { label: string; value: string; big?: boolean; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={`mt-1 text-foreground ${big ? "font-heading text-xl font-bold" : ""} ${mono ? "font-mono text-primary" : ""}`}>{value}</dd>
    </div>
  );
}

function ResultShell({ icon, title, children }: { icon: React.ReactNode; title: string; tone: "destructive"; children: React.ReactNode }) {
  return (
    <div className="glass flex flex-col items-center gap-3 rounded-xl border-destructive/40 p-8 text-center">
      {icon}
      <p className="font-heading text-lg font-extrabold uppercase text-foreground">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
