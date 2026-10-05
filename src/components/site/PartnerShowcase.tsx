import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { partnersQuery } from "@/lib/public-data";
import { cdnUrl } from "@/lib/cdn";
import { PARTNER_TIERS } from "@/lib/partners";

type Partner = { id: string; name: string; tier: string; partner_type: string | null; logo_key: string | null; website_url: string | null; description: string | null };

function PartnerCard({ p, large }: { p: Partner; large?: boolean }) {
  const logo = cdnUrl(p.logo_key);
  const inner = (
    <>
      <div className={`flex w-full items-center justify-center rounded-lg bg-foreground/95 p-4 ${large ? "h-28" : "h-20"}`}>
        {logo ? <img src={logo} alt={`${p.name} logo`} loading="lazy" className="max-h-full max-w-full object-contain" />
          : <span className="font-heading text-lg font-bold text-background">{p.name}</span>}
      </div>
      <div className="mt-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-heading text-sm font-bold text-foreground">{p.name}</p>
          {p.partner_type && <p className="text-xs text-muted-foreground">{p.partner_type}</p>}
        </div>
        {p.website_url && <ArrowUpRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />}
      </div>
      {large && p.description && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{p.description}</p>}
    </>
  );
  const cls = "group glass flex h-full flex-col rounded-xl p-4 transition-all hover:-translate-y-1 hover:border-primary/60";
  return p.website_url
    ? <a href={p.website_url} target="_blank" rel="noopener noreferrer sponsored" className={cls} aria-label={`Visit ${p.name}`}>{inner}</a>
    : <div className={cls}>{inner}</div>;
}

/** Published partners grouped by tier; managed from Admin → Partners. */
export function PartnerShowcase({ compact = false }: { compact?: boolean }) {
  const { data, isLoading } = useQuery(partnersQuery());
  if (isLoading) return <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl bg-muted" />)}</div>;
  const partners = data ?? [];
  if (!partners.length) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-primary/40 p-8 text-center sm:p-10">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/50 text-primary"><Plus className="h-5 w-5" /></span>
        <p className="font-heading text-lg font-bold">Your organization could be featured here</p>
        <p className="max-w-md text-sm text-muted-foreground">Join as our first founding partner and be recognized alongside our mission to build a digitally skilled Bangladesh.</p>
        <Link to="/partner" className="text-sm font-semibold text-primary hover:underline">Become a founding partner →</Link>
      </div>
    );
  }
  return (
    <div className="space-y-10">
      {PARTNER_TIERS.map((t) => {
        const list = partners.filter((p) => p.tier === t.id);
        if (!list.length) return null;
        const large = !compact && (t.id === "platinum" || t.id === "gold");
        return (
          <div key={t.id}>
            <div className="mb-4 flex items-center gap-3">
              <p className={`text-xs font-semibold uppercase tracking-wider ${t.id === "platinum" ? "text-highlight" : "text-primary"}`}>{t.id === "partner" ? "Partners" : `${t.label}s`}</p>
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className={`grid gap-4 ${large ? "sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"}`}>
              {list.map((p) => <PartnerCard key={p.id} p={p} large={large} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
