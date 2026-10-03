import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, Clock3, GraduationCap, Image, Plus, RefreshCw, Users, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminOnly } from "@/components/admin/shared";
import { ApplicantAvatar, StatusBadge } from "@/components/admission/ApplicationParts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/public-data";
import { refOf } from "@/lib/application";
import { todayISO, weekdayOf } from "@/lib/student";
import { seo } from "@/components/site/PageHero";

export const Route = createFileRoute("/_authenticated/admin/")({ staticData: { sitemap: false },
  head: () => seo("Admin Overview | Skill Bridgeway Foundation", "Private administrative overview.", { noindex: true }),
  component: () => <AdminOnly><Overview /></AdminOnly>,
});

const LANES = [
  { status: "pending", label: "Needs review", icon: Clock3, accent: "text-highlight", rule: "border-highlight" },
  { status: "approved", label: "Approved", icon: CheckCircle2, accent: "text-primary", rule: "border-primary" },
  { status: "rejected", label: "Rejected", icon: XCircle, accent: "text-destructive", rule: "border-destructive" },
] as const;
const PREVIEW_LIMIT = 6;
type Status = (typeof LANES)[number]["status"];
type Application = { id: string; full_name: string; created_at: string; status: string; document_keys: unknown; courses: { title: string } | null };
type LaneData = { status: Status; count: number; rows: Application[] };
type Batch = { id: string; name: string; course_id: string; class_days: string[]; class_time: string | null; courses: { title: string } | null };

async function getOverview() {
  const [lanes, studentsResult, coursesResult, batchesResult] = await Promise.all([
    Promise.all(LANES.map(async ({ status }): Promise<LaneData> => {
      const { data, count, error } = await supabase.from("admissions")
        .select("id,full_name,created_at,status,document_keys,courses(title)", { count: "exact" })
        .eq("status", status).order("created_at", { ascending: false }).limit(PREVIEW_LIMIT);
      if (error) throw error;
      return { status, count: count ?? 0, rows: (data ?? []) as Application[] };
    })),
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase.from("courses").select("id", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("batches").select("id,name,course_id,class_days,class_time,courses(title)").eq("is_active", true).order("class_time"),
  ]);
  if (studentsResult.error) throw studentsResult.error;
  if (coursesResult.error) throw coursesResult.error;
  if (batchesResult.error) throw batchesResult.error;
  return {
    lanes,
    students: studentsResult.count ?? 0,
    courses: coursesResult.count ?? 0,
    batches: (batchesResult.data ?? []) as Batch[],
  };
}

function Overview() {
  const qc = useQueryClient();
  const { data, isPending, isFetching, isError, refetch } = useQuery({
    queryKey: ["admin-overview"], queryFn: getOverview, staleTime: 30_000, refetchInterval: 60_000,
  });
  const today = todayISO();
  const todaysClasses = (data?.batches ?? []).filter((b) => b.class_days.includes(weekdayOf(today)));
  const pending = data?.lanes.find((lane) => lane.status === "pending")?.count ?? 0;

  return <div className="space-y-9 pb-10">
    <header className="flex flex-wrap items-end justify-between gap-5 border-b border-border pb-7">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Workspace / Overview</p>
        <h1 className="section-title mt-2 text-3xl md:text-4xl">Admissions desk</h1>
        <p className="mt-2 text-sm text-muted-foreground">Review applications, check today's classes and keep learning moving.</p>
      </div>
      <Button variant="outline" size="sm" onClick={() => { void qc.invalidateQueries({ queryKey: ["admin-overview"] }); }} disabled={isFetching}>
        <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />Refresh
      </Button>
    </header>

    {isError && !data ? <div role="alert" className="border-l-2 border-destructive bg-destructive/10 p-5">
      <p className="font-medium">Overview couldn't load.</p><p className="mt-1 text-sm text-muted-foreground">Your data hasn't changed. Please try again.</p>
      <Button variant="outline" size="sm" className="mt-4" onClick={() => { void refetch(); }}>Try again</Button>
    </div> : <>
      <section aria-label="Key figures" className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Needs review", value: pending, icon: Clock3, to: "/admin/applications" as const, suffix: "Applications awaiting a decision", accent: "text-highlight" },
          { label: "Students", value: data?.students ?? 0, icon: Users, to: "/admin/students" as const, suffix: "Student records", accent: "text-primary" },
          { label: "Live courses", value: data?.courses ?? 0, icon: BookOpen, to: "/admin/courses" as const, suffix: "Published programmes", accent: "text-primary" },
          { label: "Classes today", value: todaysClasses.length, icon: CalendarDays, to: "/admin/attendance" as const, suffix: "Active scheduled batches", accent: "text-highlight" },
        ].map((item) => <Link key={item.label} to={item.to} preload="intent" className="group min-w-0 bg-background p-5 transition-colors hover:bg-card focus-visible:outline-2 focus-visible:outline-primary">
          <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</span><item.icon className={`h-5 w-5 ${item.accent}`} aria-hidden="true" /></div>
          {isPending ? <Skeleton className="mt-5 h-10 w-20" /> : <p className="mt-3 font-heading text-4xl font-extrabold tabular-nums text-foreground">{item.value}</p>}
          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{item.suffix}</span><ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden="true" /></div>
        </Link>)}
      </section>

      <section aria-labelledby="board-heading">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-widest text-primary">Application pipeline</p><h2 id="board-heading" className="section-title mt-1 text-xl md:text-2xl">Review board</h2></div>
          <Button asChild variant="outline" size="sm"><Link to="/admin/applications" preload="intent">All applications <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {LANES.map((lane) => {
            const info = data?.lanes.find((l) => l.status === lane.status);
            return <section key={lane.status} aria-label={lane.label} className={`flex min-w-0 flex-col rounded-md border border-border border-t-2 ${lane.rule} bg-card/30`}>
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4">
                <div className="flex items-center gap-2"><lane.icon className={`h-4 w-4 ${lane.accent}`} aria-hidden="true" /><h3 className="font-heading text-sm font-bold uppercase">{lane.label}</h3></div>
                <span className="rounded-sm bg-background px-2 py-0.5 font-mono text-xs tabular-nums text-muted-foreground" aria-label={`${info?.count ?? 0} applications`}>{isPending ? "—" : info?.count ?? 0}</span>
              </div>
              <div className="flex-1 space-y-2 p-3">
                {isPending ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-32 w-full" />) : info?.rows.length ? info.rows.map((app) => <Link key={app.id} to="/admin/applications/$id" params={{ id: app.id }} preload="intent" className="group block min-w-0 rounded-md border border-border bg-background p-4 transition-colors hover:border-primary/60 focus-visible:outline-2 focus-visible:outline-primary">
                  <div className="flex min-w-0 items-start gap-3"><ApplicantAvatar app={{ document_keys: app.document_keys, full_name: app.full_name }} size="h-10 w-10" /><div className="min-w-0 flex-1"><p className="truncate font-medium text-foreground group-hover:text-primary">{app.full_name}</p><p className="mt-0.5 font-mono text-xs text-muted-foreground">{refOf(app.id)}</p></div><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden="true" /></div>
                  <p className="mt-3 truncate text-xs text-muted-foreground">{app.courses?.title ?? "Course undecided"}</p>
                  <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">Applied {formatDate(app.created_at)}</p>
                </Link>) : <div className="flex min-h-32 flex-col items-center justify-center px-4 text-center"><lane.icon className={`mb-2 h-5 w-5 ${lane.accent}`} aria-hidden="true" /><p className="text-sm text-muted-foreground">No {lane.status} applications.</p></div>}
              </div>
              <Button asChild variant="ghost" className="m-3 mt-0 justify-between border border-border text-xs"><Link to="/admin/applications" preload="intent">View all {lane.status} <ArrowRight className="h-4 w-4" /></Link></Button>
            </section>;
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Showing the latest {PREVIEW_LIMIT} applications per column. Open an application to review or change its status.</p>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section aria-labelledby="classes-heading" className="min-w-0 border-t border-border pt-5">
          <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-primary">Today · {formatDate(today)}</p><h2 id="classes-heading" className="section-title mt-1 text-lg">Class schedule</h2></div><Button asChild size="sm" variant="outline"><Link to="/admin/attendance">Attendance <ArrowRight className="h-4 w-4" /></Link></Button></div>
          {isPending ? <Skeleton className="h-24 w-full" /> : todaysClasses.length ? <ul className="divide-y divide-border border-y border-border">{todaysClasses.map((b) => <li key={b.id} className="flex min-w-0 items-center justify-between gap-3 py-4"><div className="min-w-0"><p className="truncate text-sm font-semibold">{b.name}</p><p className="truncate text-xs text-muted-foreground">{b.courses?.title ?? "Course"}</p></div><span className="shrink-0 font-mono text-xs text-primary">{b.class_time?.slice(0, 5) ?? "Time not set"}</span></li>)}</ul> : <p className="border-y border-border py-6 text-sm text-muted-foreground">No active classes scheduled for today.</p>}
        </section>
        <section aria-labelledby="shortcuts-heading" className="border-t border-border pt-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Create & manage</p><h2 id="shortcuts-heading" className="section-title mt-1 text-lg">Quick actions</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {[
              { label: "New course", to: "/admin/courses/$id" as const, params: { id: "new" }, icon: Plus },
              { label: "New notice", to: "/admin/notices/$id" as const, params: { id: "new" }, icon: Plus },
            ].map((action) => <Button key={action.label} asChild variant="outline" className="justify-start"><Link to={action.to} params={action.params} preload="intent"><action.icon className="h-4 w-4 text-primary" />{action.label}</Link></Button>)}
            <Button asChild variant="outline" className="justify-start"><Link to="/admin/students" preload="intent"><GraduationCap className="h-4 w-4 text-primary" />Students</Link></Button>
            <Button asChild variant="outline" className="justify-start"><Link to="/admin/gallery" preload="intent"><Image className="h-4 w-4 text-primary" />Gallery</Link></Button>
          </div>
        </section>
      </div>
    </>}
  </div>;
}
