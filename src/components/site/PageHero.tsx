import type { ReactNode } from "react";

export function PageHero({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <section className="bg-grid border-b">
      <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">{eyebrow}</p>}
        <h1 className="section-title mt-3 text-3xl md:text-5xl">{title}</h1>
        {children && <div className="mt-4 max-w-2xl text-muted-foreground">{children}</div>}
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

export function seo(title: string, description: string) {
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  };
}
