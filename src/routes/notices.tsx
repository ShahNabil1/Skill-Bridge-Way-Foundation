import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Megaphone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHero, seo } from "@/components/site/PageHero";
import { EmptyState } from "@/components/site/ui-bits";
import { formatDate, noticesQuery } from "@/lib/public-data";

const TABS = [["all", "All"], ["notice", "Notices"], ["event", "Events"]] as const;

export const Route = createFileRoute("/notices")({
  validateSearch: (s: Record<string, unknown>): { type?: "notice" | "event" } => ({
    type: s["type"] === "notice" || s["type"] === "event" ? s["type"] : undefined,
  }),
  head: () => seo("Notices & Events | Skill Bridgeway Foundation", "Latest notices, announcements and upcoming events from Skill Bridgeway Foundation."),
  component: Notices,
});

function Notices() {
  const { type = "all" } = Route.useSearch();
  const navigate = useNavigate({ from: "/notices" });
  const { data, isLoading } = useQuery(noticesQuery());
  const items = (data ?? []).filter((n) => type === "all" || n.type === type);

  return (
    <>
      <PageHero eyebrow="Stay updated" title="Notices & Events" />
      <section className="mx-auto max-w-4xl px-4 py-12">
        <div className="flex gap-2">
          {TABS.map(([v, l]) => (
            <button key={v} onClick={() => navigate({ search: { type: v === "all" ? undefined : v } })}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${type === v ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:border-primary hover:text-primary"}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="mt-8 space-y-4">
          {isLoading ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass space-y-3 rounded-xl p-6"><Skeleton className="h-5 w-2/3 bg-muted" /><Skeleton className="h-4 w-full bg-muted" /><Skeleton className="h-3 w-1/4 bg-muted" /></div>
          )) : items.length ? items.map((n) => {
            const Icon = n.type === "event" ? CalendarDays : Megaphone;
            return (
              <article key={n.id} className="glass flex gap-4 rounded-xl p-6">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border text-primary"><Icon className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {n.type === "event" ? `Event · ${formatDate(n.event_date ?? n.created_at)}` : `Notice · ${formatDate(n.created_at)}`}
                  </p>
                  <h2 className="mt-1 text-lg">{n.title}</h2>
                  {n.body && <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{n.body}</p>}
                </div>
              </article>
            );
          }) : <EmptyState>Nothing posted here yet.</EmptyState>}
        </div>
      </section>
    </>
  );
}
