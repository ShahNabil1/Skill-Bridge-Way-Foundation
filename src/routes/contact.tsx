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
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:grid-cols-2">
        {OFFICES.map((o) => (
          <div key={o.label} className="glass flex gap-4 rounded-xl p-6"><MapPin className="h-6 w-6 shrink-0 text-primary" /><div><h2 className="section-title text-sm">{o.label}</h2><p className="mt-1 text-sm text-muted-foreground">{o.address}</p></div></div>
        ))}
        <div className="glass flex gap-4 rounded-xl p-6"><Mail className="h-6 w-6 shrink-0 text-primary" /><div><h2 className="section-title text-sm">Email</h2><a href={`mailto:${CONTACT_EMAIL}`} className="mt-1 block text-sm text-muted-foreground hover:text-primary">{CONTACT_EMAIL}</a></div></div>
      </section>
    </>
  );
}
