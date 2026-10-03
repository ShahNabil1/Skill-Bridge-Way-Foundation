import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin } from "lucide-react";
import { PageHero, seo } from "@/components/site/PageHero";
import { CONTACT_EMAIL, OFFICES } from "@/lib/site-info";

export const Route = createFileRoute("/contact")({ staticData: { sitemap: true },
  head: () => seo("Contact | Skill Bridgeway Foundation", "Get in touch with Skill Bridgeway Foundation about courses, admission or partnerships.", { path: "/contact" }),
  component: Contact,
});

function Contact() {
  return (
    <>
      <PageHero eyebrow="Talk to us" title="Contact">Questions about courses, admission or partnering with us? Reach us directly.</PageHero>
      <section className="mx-auto max-w-7xl px-4 py-16 md:py-24">
        <p className="editorial-kicker">Find us / Bangladesh & beyond</p>
        <div className="mt-8 grid gap-x-12 md:grid-cols-2">
          {OFFICES.map((o, i) => (
            <div key={o.label} className="editorial-item grid grid-cols-[2rem_minmax(0,1fr)] gap-5 border-t border-border py-8 transition-colors hover:border-primary">
              <span className="font-mono text-xs text-primary">0{i + 1}</span><div><MapPin className="mb-5 h-6 w-6 text-primary" /><h2 className="section-title text-lg">{o.label}</h2><p className="mt-2 text-sm text-muted-foreground">{o.address}</p></div>
            </div>
          ))}
          <div className="editorial-item grid grid-cols-[2rem_minmax(0,1fr)] gap-5 border-t border-border py-8 transition-colors hover:border-primary"><span className="font-mono text-xs text-primary">04</span><div><Mail className="mb-5 h-6 w-6 text-primary" /><h2 className="section-title text-lg">Email</h2><a href={`mailto:${CONTACT_EMAIL}`} className="mt-2 block break-all text-sm text-primary hover:underline">{CONTACT_EMAIL}</a></div></div>
        </div>
      </section>
    </>
  );
}
