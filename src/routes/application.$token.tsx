import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { seo } from "@/components/site/PageHero";
import { composeAddress, copyText, refOf, type ApplicationRecord } from "@/lib/application";
import { formatDate } from "@/lib/public-data";
import { ApplicantAvatar, DocumentGrid, InfoGrid, StatusBadge } from "@/components/admission/ApplicationParts";

export const Route = createFileRoute("/application/$token")({ staticData: { sitemap: false }, ssr: false,
  head: () => seo("My Application | Skill Bridgeway Foundation", "Your private admission application.", { noindex: true }),
  component: ApplicationPage,
});

function ApplicationPage() {
  const { token } = Route.useParams();
  const [busy, setBusy] = useState(false);
  const { data: app, isLoading } = useQuery({
    queryKey: ["application", token],
    queryFn: async () => (await supabase.rpc("get_application_by_token", { _token: token })).data as ApplicationRecord | null,
  });

  if (isLoading) return <section className="mx-auto max-w-4xl space-y-4 px-4 py-12"><Skeleton className="h-40 bg-muted" /><Skeleton className="h-80 bg-muted" /></section>;
  if (!app) return <section className="bg-grid flex min-h-[60vh] items-center px-4"><div className="glass mx-auto max-w-md rounded-2xl p-8 text-center">
    <h1 className="section-title text-2xl">Application not found</h1><p className="mt-3 text-muted-foreground">This link is invalid. Check the link from your confirmation page.</p>
    <Button asChild className="mt-6" variant="outline"><Link to="/">Back to home</Link></Button></div></section>;

  const ref = refOf(app.id);
  async function pdf() {
    setBusy(true);
    try { const { downloadApplicationPdf } = await import("@/lib/application-pdf"); await downloadApplicationPdf(app!, window.location.href); }
    catch { toast.error("Could not create the PDF. Please try again."); }
    setBusy(false);
  }
  return (
    <section className="bg-grid px-4 py-10 md:py-14">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="glass flex flex-col items-center gap-5 rounded-md border-t-2 border-t-primary p-6 text-center sm:flex-row sm:text-left">
          <ApplicantAvatar app={app} />
          <div className="min-w-0 flex-1">
            <StatusBadge status={app.status} />
            <h1 className="section-title mt-2 text-2xl md:text-3xl">{app.full_name}</h1>
            <button onClick={() => copyText(ref, "Reference number")} className="mt-2 inline-flex items-center gap-2 font-heading font-bold tracking-wider text-highlight transition active:scale-95">{ref}<Copy className="h-4 w-4" /></button>
            <p className="mt-1 text-xs text-muted-foreground">Submitted {formatDate(app.created_at)}</p>
          </div>
          <Button onClick={pdf} disabled={busy} className="bg-highlight text-highlight-foreground hover:bg-highlight/90">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}Download PDF</Button>
        </div>
        <Card title="Personal"><InfoGrid rows={[["Email", app.email], ["Mobile", `+88 ${app.phone}`], ["Date of birth", app.date_of_birth], ["Gender", app.gender], ["Occupation", app.occupation], ["Address", composeAddress(app)]]} /></Card>
        <Card title="Education"><InfoGrid rows={[["Level", app.education_level], ["Board / University", app.education_board], ["Institution", app.institution], ["Group / Subject", app.education_group], [app.session ? "Session" : "Passing year", app.session || app.passing_year], ["Result", app.education_result]]} /></Card>
        <Card title="Course"><InfoGrid rows={[["Course", app.course_title ?? "Not decided — advise me"], ["Motivation", app.motivation], ["Devices", devicesText(app.digital_access)], ["Attendance", attendanceText(app.attendance_commitment)]]} /></Card>
        <Card title="Documents"><DocumentGrid app={app} /></Card>
      </div>
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
   return <div className="glass rounded-md border-l-2 border-l-primary p-6"><h2 className="section-title mb-4 text-lg">{title}</h2>{children}</div>;
}
