import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Megaphone, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHero, seo } from "@/components/site/PageHero";
import { EmptyState } from "@/components/site/ui-bits";
import { cdnImageSet } from "@/lib/cdn";
import { formatDate, noticesQuery } from "@/lib/public-data";

const TABS = [["all", "All"], ["notice", "Notices"], ["event", "Events"]] as const;

export const Route = createFileRoute("/notices/")({ staticData: { sitemap: true },
  validateSearch: (s: Record<string, unknown>): { type?: "notice" | "event" | undefined } => ({
    type: s["type"] === "notice" || s["type"] === "event" ? s["type"] : undefined,
  }),
  head: () => seo("Notices & Events | Skill Bridgeway Foundation", "Latest notices, announcements and upcoming events from Skill Bridgeway Foundation.", { path: "/notices" }),
  component: Notices,
});

function Notices() {
  const { type = "all" } = Route.useSearch();
  const navigate = useNavigate({ from: "/notices/" });
  const { data, isLoading, error } = useQuery(noticesQuery());
  const items = (data ?? []).filter((n) => type === "all" || n.type === type);
  return <>
    <PageHero eyebrow="Stay updated" title="Notices & Events" />
    <section className="mx-auto max-w-7xl px-4 py-12 md:py-16">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter notices">
        {TABS.map(([v, label]) => <Button key={v} variant={type === v ? "default" : "outline"} size="sm" onClick={() => navigate({ search: { type: v === "all" ? undefined : v } })}>{label}</Button>)}
      </div>
      {error && <p role="alert" className="mt-8 text-destructive">Could not load notices. Please try again.</p>}
      <div className="mt-8 grid gap-x-7 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="space-y-3 border-b border-border pb-6"><Skeleton className="aspect-video w-full bg-muted" /><Skeleton className="h-5 w-2/3 bg-muted" /><Skeleton className="h-4 w-full bg-muted" /></div>)
          : items.map((n) => {
            const Icon = n.type === "event" ? CalendarDays : Megaphone;
            return <article key={n.id} className="editorial-item group flex min-w-0 flex-col border-b border-border pb-6 transition-colors hover:border-primary">
              <Link to="/notices/$slug" params={{ slug: n.slug }} className="block overflow-hidden rounded-md bg-muted" aria-label={`Read ${n.title}`}>
                {n.cover_image_key ? <img {...cdnImageSet(n.cover_image_key)} alt={n.title} loading="lazy" decoding="async" width={640} height={360} className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="flex aspect-video items-center justify-center bg-grid"><Icon className="h-12 w-12 text-primary" /></div>}
              </Link>
              <p className="mt-5 flex items-center gap-2 text-xs font-semibold uppercase text-primary"><Icon className="h-4 w-4" />{n.type} · {formatDate(n.event_date ?? n.created_at)}</p>
              <h2 className="mt-2 text-lg leading-snug"><Link to="/notices/$slug" params={{ slug: n.slug }} className="hover:text-primary">{n.title}</Link></h2>
              {n.summary && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{n.summary}</p>}
              <Button asChild variant="link" className="mt-auto w-fit px-0"><Link to="/notices/$slug" params={{ slug: n.slug }}>Read more <ArrowUpRight className="h-4 w-4" /></Link></Button>
            </article>;
          })}
      </div>
      {!isLoading && !error && !items.length && <div className="mt-8"><EmptyState>Nothing posted here yet.</EmptyState></div>}
    </section>
  </>;
}