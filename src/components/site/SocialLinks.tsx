import { FaFacebookF, FaInstagram, FaLinkedinIn } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { SOCIAL_LINKS } from "@/lib/site-info";

const icons = { Facebook: FaFacebookF, Instagram: FaInstagram, LinkedIn: FaLinkedinIn };

export function SocialLinks({ labeled = false }: { labeled?: boolean }) {
  return (
    <nav className="flex flex-wrap items-center gap-3" aria-label="Skill Bridgeway Foundation social media">
      {SOCIAL_LINKS.map(({ name, href }) => {
        const Icon = icons[name];
        return (
          <Button key={name} asChild variant="outline" size={labeled ? "default" : "icon"} className="group border-border bg-background/40 text-foreground transition-colors hover:border-primary hover:bg-accent hover:text-foreground">
            <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Skill Bridgeway Foundation on ${name}`} title={name}>
              <Icon aria-hidden="true" className={`h-5 w-5 shrink-0 ${name === "Facebook" ? "text-brand-facebook" : name === "Instagram" ? "text-brand-instagram" : "text-brand-linkedin"}`} />
              {labeled && <span>{name}</span>}
            </a>
          </Button>
        );
      })}
    </nav>
  );
}