import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/courses", label: "Courses" },
  { to: "/notices", label: "Notices" },
  { to: "/gallery", label: "Gallery" },
  { to: "/verify", label: "Verify" },
  { to: "/contact", label: "Contact" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 glass border-x-0 border-t-0">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="font-heading text-sm font-extrabold uppercase tracking-wider">
          Skill <span className="text-primary">Bridgeway</span>
        </Link>
        <nav className="hidden items-center gap-6 lg:flex">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="text-sm text-muted-foreground transition-colors hover:text-primary" activeProps={{ className: "text-primary" }} activeOptions={{ exact: n.to === "/" }}>
              {n.label}
            </Link>
          ))}
          <Button asChild className="bg-highlight text-highlight-foreground hover:bg-highlight/90">
            <Link to="/admission">Apply Free</Link>
          </Button>
        </nav>
        <button className="lg:hidden" aria-label="Toggle menu" onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <nav className="flex flex-col gap-1 border-t px-4 py-3 lg:hidden">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="py-2 text-muted-foreground hover:text-primary">
              {n.label}
            </Link>
          ))}
          <Button asChild className="mt-2 bg-highlight text-highlight-foreground hover:bg-highlight/90">
            <Link to="/admission" onClick={() => setOpen(false)}>Apply Free</Link>
          </Button>
        </nav>
      )}
    </header>
  );
}
