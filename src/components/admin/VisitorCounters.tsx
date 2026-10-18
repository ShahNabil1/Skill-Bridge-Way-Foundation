import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, RefreshCw, TriangleAlert, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getVisitorReport } from "@/lib/ga-report.functions";
import { visitorRanges, type VisitorReport } from "@/lib/ga-report";

export function VisitorCounters() {
  const getReport = useServerFn(getVisitorReport);
  const query = useQuery({ queryKey: ["admin-ga4-visitors"], queryFn: () => getReport(), staleTime: 300_000, refetchInterval: 300_000, refetchIntervalInBackground: false, retry: false });
  return <VisitorCountersView report={query.data} pending={query.isPending} fetching={query.isFetching} failed={query.isError} refresh={() => { void query.refetch(); }} />;
}

export function VisitorCountersView({ report, pending, fetching, failed, refresh }: { report: VisitorReport | undefined; pending: boolean; fetching: boolean; failed: boolean; refresh: () => void }) {
  const ready = !failed && report?.status === "ready" ? report : undefined;
  return <section aria-labelledby="visitor-heading" className="visitor-module relative overflow-hidden border-y border-border px-4 pb-5 pt-12 sm:px-6">
    <svg className="visitor-wave pointer-events-none absolute inset-x-0 top-0 h-9 w-full" viewBox="0 0 1200 45" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0H1200V18C970 60 900 0 660 25S300 50 0 15Z" /></svg>
    <header className="mb-6 flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-xs font-semibold"><BarChart3 className="h-4 w-4" />GA4</span>
      <h2 id="visitor-heading" className="section-title text-xl sm:text-2xl">Visitor</h2>
      <Button className="visitor-refresh" variant="ghost" size="icon" aria-label="Refresh visitor data" title="Refresh visitor data" onClick={refresh} disabled={fetching}><RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin motion-reduce:animate-none" : ""}`} /></Button>
    </header>
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
      {visitorRanges.map((range, index) => <div key={range.key} className="visitor-counter min-w-0 overflow-hidden rounded-md" title={range.note}>
        <dt className="visitor-label flex h-11 items-center justify-center px-2 text-center text-sm font-semibold sm:text-base">{range.label}</dt>
        <dd className="visitor-value flex h-16 items-center justify-center px-2 font-heading text-2xl font-extrabold tabular-nums lg:text-3xl" aria-label={pending ? "Loading" : ready ? undefined : "Unavailable"}>
          {pending ? <span className="visitor-loading h-7 w-16 rounded-sm motion-safe:animate-pulse" /> : ready ? <span key={`${ready.fetchedAt}-${range.key}`} className="visitor-number">{new Intl.NumberFormat("en-US").format(ready.counts[index] ?? 0)}</span> : "—"}
        </dd>
        <p className="visitor-note mt-2 px-1 text-center text-[11px]">{range.note}</p>
      </div>)}
    </dl>
    <div className="visitor-note mt-5 space-y-1.5 text-xs" aria-live="polite">
      {pending ? <p>Fetching Google Analytics report…</p> : failed || report?.status === "unavailable" ? <p role="alert" className="flex items-start gap-2"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />{report?.status === "unavailable" ? report.message : "Visitor report could not be verified. Please refresh."}</p> : ready ? <>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1"><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />Fetched {new Date(ready.fetchedAt).toLocaleString("en-GB", { timeZone: ready.timeZone })} · {ready.timeZone}</span><a href={`https://analytics.google.com/analytics/web/#/p${ready.propertyId}/reports/intelligenthome`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Open GA4 ↗</a></p>
        {ready.limited && <p>Google marked this report as thresholded or sampled; counts may be incomplete.</p>}
      </> : null}
      <p>Unique users per period, not page views. GA4 reporting can take 24–48 hours; today's count is provisional.</p>
      <p>Total covers tracked history only. Untracked visits are not included; period totals must not be added together.</p>
    </div>
  </section>;
}