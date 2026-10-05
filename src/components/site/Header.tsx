import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BrandName } from "@/components/site/BrandName";
import logo from "@/assets/sbf-logo.jpeg.asset.json";

export const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/courses", label: "Courses" },
  { to: "/notices", label: "Notices" },
  { to: "/gallery", label: "Gallery" },
  { to: "/partner", label: "Partner" },
  { to: "/verify", label: "Verify" },
  { to: "/contact", label: "Contact" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header sticky top-0 z-50 glass border-x-0 border-t-0">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <img src={logo.url} alt="Skill Bridgeway Foundation logo" width={40} height={40} className="h-10 w-10 shrink-0 rounded-full" />
          <BrandName stacked className="min-w-0 font-heading text-sm font-extrabold uppercase leading-tight" />
        </Link>
        <nav className="hidden items-center gap-5 lg:flex">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="text-sm text-muted-foreground transition-colors hover:text-primary" activeProps={{ className: "text-primary" }} activeOptions={{ exact: n.to === "/" }}>
              {n.label}
            </Link>
          ))}
          <Button asChild className="bg-highlight text-highlight-foreground hover:bg-highlight/90">
            <Link to="/courses" search={{}}>Apply Free</Link>
          </Button>
        </nav>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </Button>
      </div>
      {open && (
        <nav className="site-mobile-nav flex flex-col gap-1 border-t px-4 py-3 lg:hidden">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="py-2 text-muted-foreground hover:text-primary">
              {n.label}
            </Link>
          ))}
          <Button asChild className="mt-2 bg-highlight text-highlight-foreground hover:bg-highlight/90">
            <Link to="/courses" search={{}} onClick={() => setOpen(false)}>Apply Free</Link>
          </Button>
        </nav>
      )}
    </header>
  );
}
