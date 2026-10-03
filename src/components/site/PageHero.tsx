import type { ReactNode } from "react";

export function PageHero({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <section className="page-intro bg-grid relative overflow-hidden border-b">
      <div className="relative mx-auto max-w-7xl px-4 py-14 md:py-20">
        {eyebrow && <p className="editorial-kicker">{eyebrow}</p>}
        <h1 className="section-title mt-5 max-w-5xl text-4xl leading-tight md:text-6xl">{title}</h1>
        {children && <div className="mt-6 max-w-2xl border-l border-primary/60 pl-5 text-base text-muted-foreground md:text-lg">{children}</div>}
      </div>
    </section>
  );
}

export function ComingSoon({ phase }: { phase: string }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <div className="glass rounded-xl p-8 text-muted-foreground">This section is being built in {phase}.</div>
    </div>
  );
}

export const SITE_URL = "https://skillbridgeway.org";

type SeoOpts = { path?: string; image?: string | null; noindex?: boolean; type?: string };

export function seo(title: string, description: string, opts: SeoOpts = {}) {
  const url = opts.path ? SITE_URL + (opts.path === "/" ? "/" : opts.path) : undefined;
  const meta: Record<string, string>[] = [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: opts.type ?? "website" },
    { property: "og:site_name", content: "Skill Bridgeway Foundation" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];
  if (url) meta.push({ property: "og:url", content: url });
  if (opts.image) meta.push({ property: "og:image", content: opts.image }, { name: "twitter:image", content: opts.image });
  if (opts.noindex) meta.push({ name: "robots", content: "noindex, nofollow" });
  return { meta, links: url && !opts.noindex ? [{ rel: "canonical", href: url }] : [] };
}
